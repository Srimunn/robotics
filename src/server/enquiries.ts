"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { cleanPhone, toNumber, toNullableNumber } from "./utils";

function formatEnquiry<T extends Record<string, any>>(e: T | null) {
  if (!e) return null;
  return {
    ...e,
    quotationAmount: toNullableNumber(e.quotationAmount),
  };
}

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

const enquiryCreate = z.object({
  enquiryDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date()),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  location: z.string().min(1),
  leadSource: z.string(),
  referredBy: z.string().optional().nullable(),
  leakageType: z.string(),
  assignedEngineerId: z.string().optional().nullable(),
  assignedEngineerName: z.string().optional().nullable(),
  siteVisitDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  quotationDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  quotationAmount: z.preprocess((v) => (v === "" || v === null || v === undefined || (typeof v === "string" && v.trim() === "") || Number.isNaN(Number(v)) ? undefined : Number(v)), z.number().optional().nullable()),
  quotationPdfUrl: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  workCommittedDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  actualWorkStartedDate: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional().nullable()),
  customerStatus: z.string().optional().nullable(),
});

export const addEnquiry = createServerFn({ method: "POST" })
  .validator((input: unknown) => enquiryCreate.parse(input))
  .handler(async ({ data }) => {
    const year = new Date().getFullYear();
    let count = (await db.enquiry.count()) + 1;
    let id = `ENQ-${year}-${String(count).padStart(3, "0")}`;
    while (await db.enquiry.findUnique({ where: { id } })) {
      count++;
      id = `ENQ-${year}-${String(count).padStart(3, "0")}`;
    }

    let engName = data.assignedEngineerName ?? undefined;
    if (data.assignedEngineerId) {
      const eng = await db.engineer.findUnique({ where: { id: data.assignedEngineerId } });
      if (eng) engName = eng.name;
    }

    const created = await db.enquiry.create({
      data: {
        id,
        enquiryDate: data.enquiryDate,
        customerName: data.customerName,
        phone: cleanPhone(data.phone),
        location: data.location,
        leadSource: data.leadSource,
        referredBy: data.referredBy ?? undefined,
        leakageType: data.leakageType,
        assignedEngineerId: data.assignedEngineerId ?? undefined,
        assignedEngineerName: engName,
        siteVisitDate: data.siteVisitDate ?? undefined,
        siteVisitStatus: data.assignedEngineerId ? "Assigned" : "Pending",
        quotationDate: data.quotationDate ?? undefined,
        quotationAmount: data.quotationAmount ?? undefined,
        quotationPdfUrl: data.quotationPdfUrl ?? undefined,
        remarks: data.remarks ?? undefined,
        workCommittedDate: data.workCommittedDate ?? undefined,
        actualWorkStartedDate: data.actualWorkStartedDate ?? undefined,
        customerDecision: "FollowUp",
        customerStatus: data.customerStatus ?? "Prospective",
      },
    });
    return formatEnquiry(created);
  });

const enquiryUpdate = enquiryCreate.partial().extend({
  customerDecision: z.enum(["FollowUp", "Thinking", "Approved", "Cancelled"]).optional(),
  siteVisitStatus: z.enum(["Pending", "Assigned", "Visited", "Completed"]).optional(),
  cancellationReason: z.string().optional().nullable(),
});

export const updateEnquiry = createServerFn({ method: "POST" })
  .validator((input: { id: string; updates: z.infer<typeof enquiryUpdate> }) => input)
  .handler(async ({ data }) => {
    const { id, updates } = data;
    const parsed = enquiryUpdate.parse(updates);

    return db.$transaction(async (tx) => {
      let engName: string | undefined = parsed.assignedEngineerName ?? undefined;
      if (parsed.assignedEngineerId) {
        const eng = await tx.engineer.findUnique({ where: { id: parsed.assignedEngineerId } });
        if (eng) engName = eng.name;
      }

      const updated = await tx.enquiry.update({
        where: { id },
        data: {
          ...parsed,
          phone: parsed.phone ? cleanPhone(parsed.phone) : undefined,
          assignedEngineerName: engName,
        },
      });

      // Bi-directional auto-sync to linked Project
      const linkedProject = await tx.project.findFirst({ where: { enquiry: { id } } });
      if (linkedProject) {
        const newValue =
          parsed.quotationAmount !== undefined ? parsed.quotationAmount : Number(linkedProject.projectValue);
        const received = Number(linkedProject.receivedAmount);
        const balance = Math.max(0, Number(newValue) - received);

        let newStatus = linkedProject.status;
        if (parsed.workCommittedDate && linkedProject.status === "Waiting") {
          newStatus = "Scheduled";
        }

        await tx.project.update({
          where: { id: linkedProject.id },
          data: {
            customerName: parsed.customerName ?? undefined,
            phone: parsed.phone ? cleanPhone(parsed.phone) : undefined,
            location: parsed.location ?? undefined,
            leadSource: parsed.leadSource ?? undefined,
            leakageType: parsed.leakageType ?? undefined,
            natureOfWork: parsed.leakageType ?? undefined,
            assignedEngineerId: parsed.assignedEngineerId ?? undefined,
            assignedEngineerName: engName,
            siteVisitDate: parsed.siteVisitDate ?? undefined,
            siteVisitStatus: parsed.siteVisitStatus ?? undefined,
            quotationDate: parsed.quotationDate ?? undefined,
            quotationAmount: parsed.quotationAmount ?? undefined,
            projectValue: newValue ?? undefined,
            balanceAmount: balance,
            workCommittedDate: parsed.workCommittedDate ?? undefined,
            actualWorkStartedDate: parsed.actualWorkStartedDate ?? undefined,
            remarks: parsed.remarks ?? undefined,
            customerDecision: parsed.customerDecision ?? undefined,
            cancellationReason: parsed.cancellationReason ?? undefined,
            status: newStatus,
          },
        });
        await tx.projectActivity.create({
          data: {
            projectId: linkedProject.id,
            event: "Enquiry Bi-Directional Auto-Sync",
            actor: "ERP Workflow Engine",
            details: `Synchronized Enquiry ${id} updates automatically to Project ${linkedProject.id}`,
          },
        });
      }

      return formatEnquiry(updated);
    }, { timeout: 30000, maxWait: 10000 });
  });

export const deleteEnquiry = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.enquiry.delete({ where: { id: data.id } });
    return { ok: true };
  });

/** One-click: Approved Enquiry → new Project (inherits all fields, seeds activity log, links back). */
export const approveAndConvertEnquiryToProject = createServerFn({ method: "POST" })
  .validator((input: { enquiryId: string }) => input)
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const enq = await tx.enquiry.findUnique({ where: { id: data.enquiryId } });
      if (!enq) throw new Error("Enquiry not found");
      if (enq.customerDecision !== "Approved") throw new Error("Customer decision must be Approved");
      if (enq.projectId) {
        const existing = await tx.project.findUnique({ where: { id: enq.projectId } });
        if (existing) return formatProject(existing);
      }

      const year = new Date().getFullYear();
      let projCount = (await tx.project.count()) + 1;
      let newProjectId = `PRJ-${year}-${String(projCount).padStart(3, "0")}`;
      while (await tx.project.findUnique({ where: { id: newProjectId } })) {
        projCount++;
        newProjectId = `PRJ-${year}-${String(projCount).padStart(3, "0")}`;
      }
      const costValue = enq.quotationAmount ? Number(enq.quotationAmount) : 0;

      const project = await tx.project.create({
        data: {
          id: newProjectId,
          customerName: enq.customerName,
          phone: enq.phone,
          location: enq.location,
          leadSource: enq.leadSource,
          referredBy: enq.referredBy,
          leakageType: enq.leakageType,
          natureOfWork: enq.leakageType,
          assignedEngineerId: enq.assignedEngineerId,
          assignedEngineerName: enq.assignedEngineerName ?? "",
          siteVisitDate: enq.siteVisitDate,
          siteVisitStatus: enq.siteVisitStatus,
          quotationDate: enq.quotationDate,
          quotationAmount: enq.quotationAmount ?? undefined,
          projectValue: costValue,
          scheduledDate: enq.siteVisitDate ?? new Date(),
          workCommittedDate: enq.workCommittedDate,
          actualWorkStartedDate: enq.actualWorkStartedDate,
          customerDecision: "Approved",
          remarks: enq.remarks ?? `Inherited from Enquiry ${enq.id}`,
          status: "Scheduled",
          receivedAmount: 0,
          balanceAmount: costValue,
          paymentStatus: "Pending",
          internalNotes: `Auto-inherited from Approved Enquiry ${enq.id}.`,
        },
      });

      // Seed initial activity log
      const activities = [
        { event: "Enquiry Created", actor: "System", details: `Logged ${enq.id} via ${enq.leadSource}` },
        { event: "Engineer Assigned", actor: "Service Lead", details: `Assigned ${enq.assignedEngineerName || "Unassigned"}` },
        { event: "Site Visit Done", actor: enq.assignedEngineerName || "Service Engineer", details: `Site visit completed (${enq.siteVisitStatus})` },
        { event: "Quotation Sent", actor: "System", details: `Quotation Amount: ₹${costValue.toLocaleString("en-IN")}` },
        { event: "Customer Approved", actor: "Client", details: "Quotation approved by customer" },
        { event: "Project Created", actor: "ERP Workflow Engine", details: `Generated ${newProjectId} inheriting Enquiry details` },
      ];
      await tx.projectActivity.createMany({
        data: activities.map((a) => ({ projectId: newProjectId, ...a })),
      });

      await tx.projectStatusHistory.create({
        data: {
          projectId: newProjectId,
          status: "Scheduled",
          note: `Project created automatically from Approved Enquiry ${enq.id}`,
        },
      });

      await tx.enquiry.update({ where: { id: enq.id }, data: { projectId: newProjectId } });
      return formatProject(project);
    }, { timeout: 30000, maxWait: 10000 });
  });
