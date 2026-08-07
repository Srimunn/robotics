"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { cleanPhone } from "./utils";

const importedProjectSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().default(""),
  location: z.string().default(""),
  natureOfWork: z.string().default("General Waterproofing"),
  leakageType: z.string().optional().nullable(),
  scheduledDate: z.preprocess(
    (v) => (v ? new Date(v as string | Date) : new Date()),
    z.date()
  ),
  projectValue: z.number().default(0),
  receivedAmount: z.number().default(0),
  balanceAmount: z.number().default(0),
  paymentStatus: z.enum(["Pending", "Partial", "Paid", "Overdue"]).default("Pending"),
  status: z.enum(["Waiting", "Scheduled", "Ongoing", "Completed", "Closed"]).default("Completed"),
  remarks: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

const importProjectsInput = z.object({
  projects: z.array(importedProjectSchema),
});

export const importProjects = createServerFn({ method: "POST" })
  .validator((input: { projects: z.infer<typeof importedProjectSchema>[] }) =>
    importProjectsInput.parse(input)
  )
  .handler(async ({ data }) => {
    const { projects } = data;
    if (!projects || projects.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const year = new Date().getFullYear();

    // 1. Fetch existing projects for deduplication check
    const existingProjects = await db.project.findMany({
      select: {
        customerName: true,
        scheduledDate: true,
        projectValue: true,
      },
    });

    const makeKey = (name: string, date: Date, val: number) => {
      const dStr =
        date instanceof Date && !isNaN(date.getTime())
          ? date.toISOString().split("T")[0]
          : "";
      return `${name.trim().toLowerCase()}_${dStr}_${Number(val)}`;
    };

    const existingSet = new Set(
      existingProjects.map((p) =>
        makeKey(p.customerName, p.scheduledDate, Number(p.projectValue))
      )
    );

    let currentCount = await db.project.count();
    let skippedCount = 0;

    const projectsToInsert: any[] = [];
    const statusHistoriesToInsert: any[] = [];
    const activitiesToInsert: any[] = [];

    for (const item of projects) {
      const dateObj =
        item.scheduledDate instanceof Date && !isNaN(item.scheduledDate.getTime())
          ? item.scheduledDate
          : new Date();

      const key = makeKey(item.customerName, dateObj, item.projectValue);
      if (existingSet.has(key)) {
        skippedCount++;
        continue;
      }

      existingSet.add(key);
      currentCount++;

      const id = `PRJ-${year}-${String(currentCount).padStart(3, "0")}`;
      const phoneCleaned = cleanPhone(item.phone || "");

      projectsToInsert.push({
        id,
        customerName: item.customerName.trim(),
        phone: phoneCleaned,
        location: item.location ? item.location.trim() : "Not specified",
        natureOfWork: item.natureOfWork ? item.natureOfWork.trim() : "General Waterproofing",
        leakageType: item.leakageType ? item.leakageType.trim() : item.natureOfWork,
        projectValue: item.projectValue,
        receivedAmount: item.receivedAmount,
        balanceAmount: item.balanceAmount,
        paymentStatus: item.paymentStatus,
        status: item.status,
        scheduledDate: dateObj,
        remarks: item.remarks || "Excel Import Record",
        internalNotes: item.internalNotes || "Imported via CEO Excel Utility",
      });

      statusHistoriesToInsert.push({
        projectId: id,
        status: item.status,
        note: `Initial status set via Excel Import (${item.status})`,
      });

      activitiesToInsert.push({
        projectId: id,
        event: "Project Created via Excel Import",
        actor: "CEO / Super Admin",
        details: `Imported project record ${id} for ${item.customerName.trim()} with value ₹${item.projectValue}`,
      });
    }

    if (projectsToInsert.length > 0) {
      // 2. Batch insert projects
      await db.project.createMany({
        data: projectsToInsert,
        skipDuplicates: true,
      });

      // 3. Batch insert status history
      await db.projectStatusHistory.createMany({
        data: statusHistoriesToInsert,
      });

      // 4. Batch insert activity logs
      await db.projectActivity.createMany({
        data: activitiesToInsert,
      });
    }

    return { inserted: projectsToInsert.length, skipped: skippedCount };
  });

const importedMachineSchema = z.object({
  toolName: z.string().min(1),
  category: z.string().default("General Tools"),
  brand: z.string().default("Local"),
  attachment: z.string().optional().nullable(),
  currentStock: z.number().default(1),
  availableQuantity: z.number().default(1),
  unit: z.string().default("Nos"),
  condition: z.enum(["Good", "Damaged", "RepairRequired", "Lost"]).default("Good"),
  remarks: z.string().optional().nullable(),
});

const importMachinesInput = z.object({
  machines: z.array(importedMachineSchema),
});

export const importMachines = createServerFn({ method: "POST" })
  .validator((input: { machines: z.infer<typeof importedMachineSchema>[] }) =>
    importMachinesInput.parse(input)
  )
  .handler(async ({ data }) => {
    const { machines } = data;
    if (!machines || machines.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const year = new Date().getFullYear();
    let currentCount = await db.machine.count();

    const machinesToInsert: any[] = [];
    const auditLogsToInsert: any[] = [];

    for (const item of machines) {
      currentCount++;
      const id = `MCH-${year}-${String(currentCount).padStart(3, "0")}`;

      const stock = Math.max(1, item.currentStock || 1);
      const avail = item.availableQuantity !== undefined ? item.availableQuantity : stock;
      const cond = item.condition as "Good" | "Damaged" | "RepairRequired" | "Lost";

      machinesToInsert.push({
        id,
        toolName: item.toolName.trim(),
        category: item.category ? item.category.trim() : "General Tools",
        attachment: item.attachment ? item.attachment.trim() : null,
        brand: item.brand ? item.brand.trim() : "Local",
        currentStock: stock,
        availableQuantity: avail,
        issuedQuantity: 0,
        repairQuantity: cond === "RepairRequired" ? stock : 0,
        lostQuantity: cond === "Lost" ? stock : 0,
        unit: item.unit || "Nos",
        condition: cond,
        remarks: item.remarks || "Excel Import Machine Record",
      });

      auditLogsToInsert.push({
        id: `SAL-${year}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`,
        itemType: "Machine",
        itemId: id,
        itemName: item.toolName.trim(),
        actionType: "StockAddition",
        quantity: stock,
        previousAvailable: 0,
        newAvailable: avail,
        issuedByOrActor: "CEO / Super Admin",
        condition: cond,
        notes: `Initial stock imported from Excel (${item.category})`,
      });
    }

    if (machinesToInsert.length > 0) {
      await db.machine.createMany({
        data: machinesToInsert,
        skipDuplicates: true,
      });

      await db.stockAuditLog.createMany({
        data: auditLogsToInsert,
      });
    }

    return { inserted: machinesToInsert.length, skipped: 0 };
  });

