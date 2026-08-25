"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AttendanceStatus, VerificationStatus } from "@prisma/client";
import { db } from "~/lib/db";
import { cleanPhone, toNumber, toNullableNumber } from "./utils";
import { calculateHoursFromTimes, calculateEarnedWage } from "./calculations";
import { assertCanEdit } from "./permissions";

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
  quotationPdfUrl: z.string().optional().nullable(),
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
  .validator((input: { id: string; updates: z.infer<typeof projectUpdate>; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const parsed = projectUpdate.parse(data.updates);
    return db.$transaction(async (tx) => {
      const current = await tx.project.findUnique({ where: { id: data.id } });
      if (!current) throw new Error("Project not found");

      const newValue = parsed.projectValue !== undefined ? parsed.projectValue : Number(current.projectValue);
      const received = Number(current.receivedAmount);
      const balance = Math.max(0, newValue - received);
      const paymentStatus = received >= newValue && newValue > 0 ? "Paid" : received > 0 ? "Partial" : "Pending";

      let engName: string | null | undefined = parsed.assignedEngineerName;
      let engId: string | null | undefined = parsed.assignedEngineerId;

      if (engId) {
        const eng = await tx.engineer.findUnique({ where: { id: engId } });
        if (eng) {
          engName = eng.name;
        } else {
          engId = null;
        }
      } else if (engId === "") {
        engId = null;
        engName = null;
      }

      if (!engId && engName) {
        const eng = await tx.engineer.findFirst({ where: { name: engName } });
        if (eng) engId = eng.id;
      }

      const projectUpdateData: any = {
        ...parsed,
        phone: parsed.phone ? cleanPhone(parsed.phone) : undefined,
        balanceAmount: balance,
        paymentStatus,
      };
      if (parsed.assignedEngineerId !== undefined || engId !== undefined) projectUpdateData.assignedEngineerId = engId;
      if (parsed.assignedEngineerName !== undefined || engName !== undefined) projectUpdateData.assignedEngineerName = engName;

      const updated = await tx.project.update({
        where: { id: data.id },
        data: projectUpdateData,
      });

      // Sync back to linked Enquiry
      const linkedEnq = await tx.enquiry.findFirst({ where: { projectId: data.id } });
      if (linkedEnq) {
        const enqUpdateData: any = {
          customerName: parsed.customerName ?? undefined,
          phone: parsed.phone ? cleanPhone(parsed.phone) : undefined,
          location: parsed.location ?? undefined,
          leadSource: parsed.leadSource ?? undefined,
          leakageType: parsed.leakageType ?? parsed.natureOfWork ?? undefined,
          siteVisitDate: parsed.siteVisitDate ?? undefined,
          siteVisitStatus: parsed.siteVisitStatus ?? undefined,
          quotationDate: parsed.quotationDate ?? undefined,
          quotationAmount: parsed.quotationAmount ?? parsed.projectValue ?? undefined,
          quotationPdfUrl: parsed.quotationPdfUrl ?? undefined,
          workCommittedDate: parsed.workCommittedDate ?? undefined,
          actualWorkStartedDate: parsed.actualWorkStartedDate ?? undefined,
          remarks: parsed.remarks ?? undefined,
          customerDecision: parsed.customerDecision ?? undefined,
          cancellationReason: parsed.cancellationReason ?? undefined,
        };
        if (parsed.assignedEngineerId !== undefined || engId !== undefined) enqUpdateData.assignedEngineerId = engId;
        if (parsed.assignedEngineerName !== undefined || engName !== undefined) enqUpdateData.assignedEngineerName = engName;

        await tx.enquiry.update({
          where: { id: linkedEnq.id },
          data: enqUpdateData,
        });
      }

      return formatProject(updated);
    }, { timeout: 30000, maxWait: 10000 });
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator((input: { id: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    await db.project.delete({ where: { id: data.id } });
    return { ok: true };
  });

export const updateProjectStatus = createServerFn({ method: "POST" })
  .validator((input: { id: string; status: "Waiting" | "Scheduled" | "Ongoing" | "Completed" | "Closed"; note?: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
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
    }, { timeout: 30000, maxWait: 10000 });
  });

/** Assign labours to a project (with per-labour daily wage, conflict-checked). */
export const assignLaboursToProject = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; assignments: Array<{ labourId: string; weeklyWage?: number; dailyWage?: number; assignedDate?: string }>; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
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

        const asgnDate = asgn.assignedDate ? new Date(asgn.assignedDate) : today;
        const asgnDailyWage = asgn.dailyWage ?? (asgn.weeklyWage ? Math.round(asgn.weeklyWage / 6) : (lab.dailyWage ?? Math.round(lab.defaultWeeklyWage / 6)));
        const asgnWeeklyWage = asgn.weeklyWage ?? (asgnDailyWage * 6);

        // Deactivate any active assignments on other projects for this labourer
        await tx.projectLabourAssignment.updateMany({
          where: {
            labourId: asgn.labourId,
            NOT: { projectId: data.projectId },
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        // Upsert the assignment
        await tx.projectLabourAssignment.upsert({
          where: { projectId_labourId: { projectId: data.projectId, labourId: asgn.labourId } },
          create: {
            projectId: data.projectId,
            labourId: asgn.labourId,
            labourName: lab.name,
            labourType: lab.type,
            weeklyWage: asgnWeeklyWage,
            assignedDate: asgnDate,
            isActive: true,
          },
          update: { weeklyWage: asgnWeeklyWage, assignedDate: asgnDate, isActive: true },
        });

        await tx.labourWageHistory.create({
          data: {
            labourId: asgn.labourId,
            projectId: data.projectId,
            projectName: project.customerName,
            weeklyWage: asgnWeeklyWage,
            assignedDate: asgnDate,
          },
        });

        await tx.labour.update({ where: { id: asgn.labourId }, data: { status: "Assigned" } });
        results.push({ labourId: asgn.labourId, ok: true });
      }

      await tx.projectActivity.create({
        data: {
          projectId: data.projectId,
          event: "Labour Assigned",
          actor: "System",
          details: `Assigned ${results.filter((r) => r.ok).length}/${data.assignments.length} labours`,
        },
      });

      return { results };
    }, { timeout: 30000, maxWait: 10000 });
  });

/** Unassign a labour from a project without deleting the ProjectLabourAssignment record (sets isActive: false). */
export const unassignLabourFromProject = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; labourId: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    return db.$transaction(async (tx) => {
      const existing = await tx.projectLabourAssignment.findFirst({
        where: { projectId: data.projectId, labourId: data.labourId },
      });
      if (!existing) throw new Error("Labour assignment not found");

      await tx.projectLabourAssignment.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      // Check if labour has any remaining active assignments across all projects
      const activeCount = await tx.projectLabourAssignment.count({
        where: { labourId: data.labourId, isActive: true },
      });

      if (activeCount === 0) {
        await tx.labour.update({
          where: { id: data.labourId },
          data: { status: "Available" },
        });
      }

      await tx.projectActivity.create({
        data: {
          projectId: data.projectId,
          event: "Labour Unassigned",
          actor: "System",
          details: `Unassigned labour ${existing.labourName} (${data.labourId}) from project`,
        },
      });

      return { ok: true };
    }, { timeout: 30000, maxWait: 10000 });
  });

const updateLabourLogInput = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  requestedByRole: z.string().optional().nullable(),
  requestedBySubRole: z.string().optional().nullable(),
  log: z.object({
    labourId: z.string().min(1, "Labour ID is required"),
    date: z.string().min(1, "Date is required"),
    inTime: z.string().optional().nullable(),
    outTime: z.string().optional().nullable(),
    weeklyWage: z.number().int().min(0, "Weekly wage must be a non-negative integer").optional().nullable(),
    dailyWage: z.number().int().min(0, "Daily wage must be a non-negative integer").optional().nullable(),
    attendance: z.string().optional().nullable(),
    workDescription: z.string().default("On-site servicing"),
    remarks: z.string().optional().nullable(),
    inPhotoUrl: z.string().optional().nullable(),
    outPhotoUrl: z.string().optional().nullable(),
    inLocation: z.any().optional().nullable(),
    outLocation: z.any().optional().nullable(),
    verificationStatus: z.string().optional().nullable(),
    isGpsWarning: z.boolean().optional().nullable(),
  }),
});

const mapVerStatusToDb = (v?: string | null): VerificationStatus | undefined => {
  if (!v) return undefined;
  if (v === "Pending Verification" || v === "PendingVerification") return "PendingVerification";
  if (v === "Verified") return "Verified";
  if (v === "Rejected") return "Rejected";
  return undefined;
};

const mapAttendanceStatusToDb = (v?: string | null): AttendanceStatus => {
  if (v === "Absent") return "Absent";
  if (v === "Leave") return "Leave";
  if (v === "HalfDay" || v === "Half Day") return "HalfDay";
  if (v === "Overtime") return "Overtime";
  return "Present";
};

/** Record/update a labour's daily log — auto-derives attendance, hours, earnings; also syncs central AttendanceRecord. */
export const updateProjectLabourLog = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateLabourLogInput.parse(input))
  .handler(async ({ data }) => {
    assertCanEdit(data);
    return db.$transaction(async (tx) => {
      const proj = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!proj) throw new Error("Project not found");
      const lab = await tx.labour.findUnique({ where: { id: data.log.labourId } });
      if (!lab) throw new Error("Labour not found");

      const hasIn = Boolean(data.log.inTime && data.log.inTime.trim());
      const hours = hasIn ? calculateHoursFromTimes(data.log.inTime, data.log.outTime) : 0;
      const attendanceRaw = data.log.attendance || (hasIn ? "Present" : "Absent");
      const attendanceEnum = mapAttendanceStatusToDb(attendanceRaw);
      const recordedDailyWage = data.log.dailyWage ?? (data.log.weeklyWage ? Math.round(data.log.weeklyWage / 6) : (lab.dailyWage ?? Math.round(lab.defaultWeeklyWage / 6)));
      const recordedWeeklyWage = data.log.weeklyWage ?? (recordedDailyWage * 6);
      const earned = calculateEarnedWage(recordedDailyWage, attendanceRaw, hours);
      const date = new Date(data.log.date);

      const verStatus = mapVerStatusToDb(data.log.verificationStatus);

      const safeInLocation = data.log.inLocation ? JSON.parse(JSON.stringify(data.log.inLocation)) : undefined;
      const safeOutLocation = data.log.outLocation ? JSON.parse(JSON.stringify(data.log.outLocation)) : undefined;

      const logRec = await tx.projectLabourLog.upsert({
        where: { projectId_labourId_date: { projectId: data.projectId, labourId: data.log.labourId, date } },
        create: {
          projectId: data.projectId,
          labourId: data.log.labourId,
          labourName: lab.name,
          labourType: lab.type,
          weeklyWage: recordedWeeklyWage,
          dailyWage: recordedDailyWage,
          date,
          inTime: data.log.inTime ?? undefined,
          outTime: data.log.outTime ?? undefined,
          attendance: attendanceEnum,
          hoursWorked: Number(hours),
          earnedMoney: Math.round(Number(earned)),
          workDescription: data.log.workDescription,
          remarks: data.log.remarks ?? undefined,
          inPhotoUrl: data.log.inPhotoUrl ?? undefined,
          outPhotoUrl: data.log.outPhotoUrl ?? undefined,
          inLocation: safeInLocation,
          outLocation: safeOutLocation,
          verificationStatus: verStatus,
          isGpsWarning: data.log.isGpsWarning ?? undefined,
        },
        update: {
          inTime: data.log.inTime ?? undefined,
          outTime: data.log.outTime ?? undefined,
          attendance: attendanceEnum,
          hoursWorked: Number(hours),
          earnedMoney: Math.round(Number(earned)),
          workDescription: data.log.workDescription,
          remarks: data.log.remarks ?? undefined,
          weeklyWage: recordedWeeklyWage,
          dailyWage: recordedDailyWage,
          inPhotoUrl: data.log.inPhotoUrl ? data.log.inPhotoUrl : undefined,
          outPhotoUrl: data.log.outPhotoUrl ? data.log.outPhotoUrl : undefined,
          inLocation: safeInLocation,
          outLocation: safeOutLocation,
          verificationStatus: verStatus,
          isGpsWarning: data.log.isGpsWarning ?? undefined,
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
          status: attendanceEnum,
          inTime: data.log.inTime ?? undefined,
          outTime: data.log.outTime ?? undefined,
          hoursWorked: Number(hours),
          earnedMoney: Math.round(Number(earned)),
          workDescription: data.log.workDescription,
          weeklyWage: recordedWeeklyWage,
          remarks: data.log.remarks ?? undefined,
          inPhotoUrl: data.log.inPhotoUrl ?? undefined,
          outPhotoUrl: data.log.outPhotoUrl ?? undefined,
          inLocation: safeInLocation,
          outLocation: safeOutLocation,
          verificationStatus: verStatus,
          isGpsWarning: data.log.isGpsWarning ?? undefined,
        },
        update: {
          inTime: data.log.inTime ?? undefined,
          outTime: data.log.outTime ?? undefined,
          status: attendanceEnum,
          hoursWorked: Number(hours),
          earnedMoney: Math.round(Number(earned)),
          workDescription: data.log.workDescription,
          weeklyWage: recordedWeeklyWage,
          remarks: data.log.remarks ?? undefined,
          inPhotoUrl: data.log.inPhotoUrl ? data.log.inPhotoUrl : undefined,
          outPhotoUrl: data.log.outPhotoUrl ? data.log.outPhotoUrl : undefined,
          inLocation: safeInLocation,
          outLocation: safeOutLocation,
          verificationStatus: verStatus,
          isGpsWarning: data.log.isGpsWarning ?? undefined,
        },
      });

      console.log(`[DB SUCCESS] Persisted ProjectLabourLog & synced AttendanceRecord for ${data.log.labourId} on ${data.log.date}:`, {
        projectId: data.projectId,
        inPhotoUrl: logRec.inPhotoUrl || null,
        outPhotoUrl: logRec.outPhotoUrl || null,
        verificationStatus: logRec.verificationStatus || null,
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
    }, { timeout: 30000, maxWait: 10000 });
  });

export const updateFollowUpTag = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; followUpTag?: string | null; requestedByRole?: string | null; requestedBySubRole?: string | null }) =>
    z.object({
      projectId: z.string(),
      followUpTag: z.string().optional().nullable(),
      requestedByRole: z.string().optional().nullable(),
      requestedBySubRole: z.string().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const updated = await db.project.update({
      where: { id: data.projectId },
      data: { followUpTag: data.followUpTag || null },
    });
    return formatProject(updated);
  });
