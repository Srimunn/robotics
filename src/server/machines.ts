"use server";

export * from "./machines-basic";

import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import { generateSafeId } from "./utils";
import type { MachineCondition, StockActionType } from "@prisma/client";

export const issueMachineToProject = createServerFn({ method: "POST" })
  .validator(
    (input: {
      machineId: string;
      projectId: string;
      quantity: number;
      issueDate: string;
      expectedReturnDate?: string | null;
      issuedBy: string;
      remarks?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const machine = await tx.machine.findUnique({ where: { id: data.machineId } });
      if (!machine) throw new Error("Machine not found");
      if (machine.availableQuantity < data.quantity) throw new Error("Insufficient available quantity");
      const project = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!project) throw new Error("Project not found");

      const year = new Date().getFullYear();
      const id = await generateSafeId(tx.machineIssueRecord, `MIR-${year}`);

      const record = await tx.machineIssueRecord.create({
        data: {
          id,
          machineId: machine.id,
          machineName: machine.toolName,
          category: machine.category,
          brand: machine.brand,
          projectId: project.id,
          projectName: project.customerName,
          customerName: project.customerName,
          quantity: data.quantity,
          issueDate: new Date(data.issueDate),
          expectedReturnDate: (data.expectedReturnDate ? new Date(data.expectedReturnDate) : null) as any,
          issuedBy: data.issuedBy,
          status: "Issued",
          remarks: data.remarks,
        },
      });

      const prevAvail = machine.availableQuantity;
      await tx.machine.update({
        where: { id: machine.id },
        data: {
          availableQuantity: prevAvail - data.quantity,
          issuedQuantity: machine.issuedQuantity + data.quantity,
        },
      });

      await tx.projectActivity.create({
        data: {
          projectId: project.id,
          event: "Machine Issued",
          actor: data.issuedBy,
          details: `Issued ${data.quantity}× ${machine.toolName} (${machine.id})`,
        },
      });
      await tx.stockAuditLog.create({
        data: {
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          itemType: "Machine",
          itemId: machine.id,
          itemName: machine.toolName,
          actionType: "Issue",
          quantity: data.quantity,
          previousAvailable: prevAvail,
          newAvailable: prevAvail - data.quantity,
          projectId: project.id,
          projectName: project.customerName,
          customerName: project.customerName,
          issuedByOrActor: data.issuedBy,
          condition: machine.condition,
          notes: data.remarks ?? `Issued to project ${project.id}`,
        },
      });

      return record;
    }, { timeout: 30000, maxWait: 10000 });
  });

export const returnMachineFromProject = createServerFn({ method: "POST" })
  .validator(
    (input: {
      issueRecordId: string;
      returnQty: number;
      condition: MachineCondition;
      returnRemarks?: string;
      returnedBy?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const rec = await tx.machineIssueRecord.findUnique({ where: { id: data.issueRecordId } });
      if (!rec) throw new Error("Issue record not found");
      const remaining = rec.quantity - rec.returnedQuantity;
      if (data.returnQty > remaining) throw new Error(`Cannot return ${data.returnQty}. Remaining: ${remaining}`);

      const machine = await tx.machine.findUnique({ where: { id: rec.machineId } });
      if (!machine) throw new Error("Machine not found");

      const newReturned = rec.returnedQuantity + data.returnQty;
      const fully = newReturned >= rec.quantity;
      let newStatus: "Returned" | "PartiallyReturned" | "UnderRepair" | "Lost" =
        fully ? "Returned" : "PartiallyReturned";
      if (data.condition === "Damaged" || data.condition === "RepairRequired") newStatus = "UnderRepair";
      if (data.condition === "Lost") newStatus = "Lost";

      await tx.machineIssueRecord.update({
        where: { id: rec.id },
        data: {
          returnedQuantity: newReturned,
          conditionOnReturn: data.condition,
          actualReturnedDate: new Date(),
          status: newStatus,
          returnRemarks: data.returnRemarks ?? rec.returnRemarks,
        },
      });

      let newAvail = machine.availableQuantity;
      let newRepair = machine.repairQuantity;
      let newLost = machine.lostQuantity;
      let action: StockActionType = "Return";
      if (data.condition === "Good") {
        newAvail += data.returnQty;
        action = "Return";
      } else if (data.condition === "Damaged" || data.condition === "RepairRequired") {
        newRepair += data.returnQty;
        action = "RepairMove";
      } else if (data.condition === "Lost") {
        newLost += data.returnQty;
        action = "LostMove";
      }

      await tx.machine.update({
        where: { id: machine.id },
        data: {
          availableQuantity: newAvail,
          issuedQuantity: Math.max(0, machine.issuedQuantity - data.returnQty),
          repairQuantity: newRepair,
          lostQuantity: newLost,
        },
      });

      await tx.projectActivity.create({
        data: {
          projectId: rec.projectId,
          event: "Machine Returned",
          actor: data.returnedBy || "Site Manager",
          details: `Returned ${data.returnQty}× ${machine.toolName} (${data.condition})`,
        },
      });
      await tx.stockAuditLog.create({
        data: {
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          itemType: "Machine",
          itemId: machine.id,
          itemName: machine.toolName,
          actionType: action,
          quantity: data.returnQty,
          previousAvailable: machine.availableQuantity,
          newAvailable: newAvail,
          projectId: rec.projectId,
          projectName: rec.projectName,
          customerName: rec.customerName,
          issuedByOrActor: data.returnedBy || "Site Manager",
          condition: data.condition,
          notes: data.returnRemarks ?? `Returned ${data.returnQty} as ${data.condition}`,
        },
      });

      return { ok: true };
    }, { timeout: 30000, maxWait: 10000 });
  });
