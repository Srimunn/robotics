"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { cleanPhone, toNumber, toNullableNumber } from "./utils";
import { calculateHoursFromTimes, calculateEarnedWage } from "./calculations";

function formatProject<T extends Record<string, any>>(p: T | null) {
  if (!p) return null;
  return {
    ...p,
    quotationAmount: toNullableNumber(p.quotationAmount),
    projectValue: toNumber(p.projectValue),
    receivedAmount: toNumber(p.receivedAmount),
    balanceAmount: toNumber(p.balanceAmount),
  };
}

const projectUpdate = z.object({
  customerName: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  leadSource: z.string().optional().nullable(),
  leakageType: z.string().optional().nullable(),
  natureOfWork: z.string().optional(),
  assignedEngineerId: z.string().optional().nullable(),
  assignedEngineerName: z.string().optional().nullable(),
  siteVisitDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  siteVisitStatus: z.enum(["Pending", "Assigned", "Visited", "Completed"]).optional(),
  quotationDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  quotationAmount: z.number().optional().nullable(),
  projectValue: z.number().optional(),
  scheduledDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional()),
  workCommittedDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  actualWorkStartedDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  customerDecision: z.enum(["FollowUp", "Thinking", "Approved", "Cancelled"]).optional(),
  cancellationReason: z.string().optional().nullable(),
  remarks: z.string().optional(),
  beforeWorkPhotoUrl: z.string().optional().nullable(),
  afterWorkPhotoUrl: z.string().optional().nullable(),
  internalNotes: z.string().optional(),
});

/** updateProject with bi-directional sync back to linked Enquiry. */
export const updateProject = createServerFn({ method: "POST" })
  .validator((input: { id: string; updates: z.infer<typeof projectUpdate> }) => input)
  .handler(async ({ data }) => {
    const parsed = projectUpdate.parse(data.updates);
    return db.$transaction(async (tx) => {
      const current = await tx.project.findUnique({ where: { id: data.id } });
      if (!current) throw new Error("Project not found");

      const newValue = parsed.projectValue !== undefined ? parsed.projectValue : Number(current.projectValue);
      const received = Number(current.receivedAmount);
      const balance = Math.max(0, newValue - received);
      const paymentStatus = received >= newValue && newValue > 0 ? "Paid" : received > 0 ? "Partial" : "Pending";

      const updated = await tx.project.update({
        where: { id: data.id },
        data: {
          ...parsed,
          phone: parsed.phone ? cleanPhone(parsed.phone) : undefined,
          balanceAmount: balance,
          paymentStatus,
        } as any,
      });

      // Sync back to linked Enquiry
      const linkedEnq = await tx.enquiry.findFirst({ where: { projectId: data.id } });
      if (linkedEnq) {
        await tx.enquiry.update({
          where: { id: linkedEnq.id },
          data: {
            customerName: parsed.customerName ?? undefined,
            phone: parsed.phone ? cleanPhone(parsed.phone) : undefined,
            location: parsed.location ?? undefined,
            leadSource: parsed.leadSource ?? undefined,
            leakageType: parsed.leakageType ?? parsed.natureOfWork ?? undefined,
            assignedEngineerId: parsed.assignedEngineerId ?? undefined,
            assignedEngineerName: parsed.assignedEngineerName ?? undefined,
            siteVisitDate: parsed.siteVisitDate ?? undefined,
            siteVisitStatus: parsed.siteVisitStatus ?? undefined,
            quotationDate: parsed.quotationDate ?? undefined,
            quotationAmount: parsed.quotationAmount ?? parsed.projectValue ?? undefined,
            workCommittedDate: parsed.workCommittedDate ?? undefined,
            actualWorkStartedDate: parsed.actualWorkStartedDate ?? undefined,
            remarks: parsed.remarks ?? undefined,
            customerDecision: parsed.customerDecision ?? undefined,
            cancellationReason: parsed.cancellationReason ?? undefined,
          },
        });
      }

      return formatProject(updated);
    });
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.project.delete({ where: { id: data.id } });
    return { ok: true };
  });

export const updateProjectStatus = createServerFn({ method: "POST" })
  .validator((input: { id: string; status: "Waiting" | "Scheduled" | "Ongoing" | "Completed" | "Closed"; note?: string }) => input)
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const proj = await tx.project.findUnique({ where: { id: data.id } });
      if (!proj) throw new Error("Project not found");

      if (data.status === "Closed") {
        if (Number(proj.balanceAmount) > 0) throw new Error(`Cannot close: outstanding balance ₹${Number(proj.balanceAmount).toLocaleString("en-IN")}`);
        if (proj.status !== "Completed") throw new Error("Project must be Completed before Closed");
      }

      const updated = await tx.project.update({
        where: { id: data.id },
        data: { status: data.status },
      });
      await tx.projectStatusHistory.create({
        data: { projectId: data.id, status: data.status, note: data.note || `Status changed to ${data.status}` },
      });
      await tx.projectActivity.create({
        data: {
          projectId: data.id,
          event: data.status === "Completed" ? "Project Completed" : `Status Changed to ${data.status}`,
          actor: "Manager",
          details: data.note || `Project status updated to ${data.status}`,
        },
      });
      return formatProject(updated);
    });
  });

/** Assign labours to a project (with per-labour weekly wage, conflict-checked). */
export const assignLaboursToProject = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; assignments: Array<{ labourId: string; weeklyWage: number }> }) => input)
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!project) throw new Error("Project not found");
      const today = new Date();

      const results: Array<{ labourId: string; ok: boolean; reason?: string }> = [];

      for (const asgn of data.assignments) {
        const lab = await tx.labour.findUnique({ where: { id: asgn.labourId } });
        if (!lab) {
          results.push({ labourId: asgn.labourId, ok: false, reason: "Labour not found" });
          continue;
        }

        // Conflict check: labour on another active project
        const conflict = await tx.projectLabourAssignment.findFirst({
          where: {
            labourId: asgn.labourId,
            NOT: { projectId: data.projectId },
            project: { status: { in: ["Ongoing", "Scheduled"] } },
          },
          include: { project: true },
        });
        if (conflict) {
          results.push({ labourId: asgn.labourId, ok: false, reason: `Already on ${conflict.projectId}` });
          continue;
        }

        // Upsert the assignment
        await tx.projectLabourAssignment.upsert({
          where: { projectId_labourId: { projectId: data.projectId, labourId: asgn.labourId } },
          create: {
            projectId: data.projectId,
            labourId: asgn.labourId,
            labourName: lab.name,
            labourType: lab.type,
            weeklyWage: asgn.weeklyWage,
            assignedDate: today,
          },
          update: { weeklyWage: asgn.weeklyWage, assignedDate: today },
        });

        await tx.labourWageHistory.create({
          data: {
            labourId: asgn.labourId,
            projectId: data.projectId,
            projectName: project.customerName,
            weeklyWage: asgn.weeklyWage,
            assignedDate: today,
          },
        });

        await tx.labour.update({ where: { id: asgn.labourId }, data: { status: "Assigned" } });
        results.push({ labourId: asgn.labourId, ok: true });
      }

      await tx.projectActivity.create({
        data: {
          projectId: data.projectId,
          event: "Labour Assigned",
          actor: "Project Manager",
          details: `Assigned ${results.filter((r) => r.ok).length}/${data.assignments.length} labours`,
        },
      });

      return { results };
    });
  });

/** Record/update a labour's daily log — auto-derives attendance, hours, earnings; also syncs central AttendanceRecord. */
export const updateProjectLabourLog = createServerFn({ method: "POST" })
  .validator(
    (input: {
      projectId: string;
      log: {
        labourId: string;
        date: string;
        inTime?: string;
        outTime?: string;
        weeklyWage: number;
        workDescription: string;
        remarks?: string;
      };
    }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const proj = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!proj) throw new Error("Project not found");
      const lab = await tx.labour.findUnique({ where: { id: data.log.labourId } });
      if (!lab) throw new Error("Labour not found");

      const hasIn = Boolean(data.log.inTime && data.log.inTime.trim());
      const hours = hasIn ? calculateHoursFromTimes(data.log.inTime, data.log.outTime) : 0;
      const earned = calculateEarnedWage(data.log.weeklyWage, hours);
      const attendance = hasIn ? "Present" : "Absent";
      const date = new Date(data.log.date);

      const logRec = await tx.projectLabourLog.upsert({
        where: { projectId_labourId_date: { projectId: data.projectId, labourId: data.log.labourId, date } },
        create: {
          projectId: data.projectId,
          labourId: data.log.labourId,
          labourName: lab.name,
          labourType: lab.type,
          weeklyWage: data.log.weeklyWage,
          dailyWage: Math.round(data.log.weeklyWage / 6),
          date,
          inTime: data.log.inTime,
          outTime: data.log.outTime,
          attendance,
          hoursWorked: hours,
          earnedMoney: earned,
          workDescription: data.log.workDescription,
          remarks: data.log.remarks,
        },
        update: {
          inTime: data.log.inTime,
          outTime: data.log.outTime,
          attendance,
          hoursWorked: hours,
          earnedMoney: earned,
          workDescription: data.log.workDescription,
          remarks: data.log.remarks,
          weeklyWage: data.log.weeklyWage,
        },
      });

      // Auto-sync central AttendanceRecord
      await tx.attendanceRecord.upsert({
        where: { labourId_date: { labourId: data.log.labourId, date } },
        create: {
          id: `${data.log.labourId}_${data.log.date}`,
          labourId: data.log.labourId,
          labourName: lab.name,
          projectId: data.projectId,
          projectName: proj.customerName,
          date,
          status: attendance,
          inTime: data.log.inTime,
          outTime: data.log.outTime,
          hoursWorked: hours,
          earnedMoney: earned,
          workDescription: data.log.workDescription,
          weeklyWage: data.log.weeklyWage,
          remarks: data.log.remarks,
        },
        update: {
          inTime: data.log.inTime,
          outTime: data.log.outTime,
          status: attendance,
          hoursWorked: hours,
          earnedMoney: earned,
          workDescription: data.log.workDescription,
          weeklyWage: data.log.weeklyWage,
          remarks: data.log.remarks,
        },
      });

      await tx.projectActivity.create({
        data: {
          projectId: data.projectId,
          event: "Attendance Logged",
          actor: "Site Supervisor",
          details: `${lab.name}: ${data.log.inTime || "-"} → ${data.log.outTime || "-"} = ${hours} hrs (₹${earned})`,
        },
      });

      return logRec;
    });
  });
