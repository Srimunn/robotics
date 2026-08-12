"use server";

export * from "./materials-basic";

import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import { toNullableNumber } from "./utils";
import type { StockItemType } from "@prisma/client";

function formatMaterialIssue<T extends Record<string, any>>(mi: T | null) {
  if (!mi) return null;
  return {
    ...mi,
    unitCost: toNullableNumber(mi.unitCost),
    totalCost: toNullableNumber(mi.totalCost),
  };
}

export const issueMaterialToProject = createServerFn({ method: "POST" })
  .validator(
    (input: {
      materialId: string;
      projectId: string;
      quantity: number;
      issueDate: string;
      issuedBy: string;
      remarks?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const mat = await tx.material.findUnique({ where: { id: data.materialId } });
      if (!mat) throw new Error("Material not found");
      if (mat.currentStock < data.quantity) throw new Error(`Insufficient stock: ${mat.currentStock} ${mat.unit}`);
      const project = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!project) throw new Error("Project not found");

      const year = new Date().getFullYear();
      const count = await tx.materialIssueRecord.count();
      const id = `MAT-ISS-${year}-${String(count + 1).padStart(3, "0")}`;
      const totalCost = data.quantity * Number(mat.purchaseCost);

      const record = await tx.materialIssueRecord.create({
        data: {
          id,
          materialId: mat.id,
          materialName: mat.name,
          category: mat.category,
          unit: mat.unit,
          projectId: project.id,
          projectName: project.customerName,
          customerName: project.customerName,
          quantity: data.quantity,
          unitCost: mat.purchaseCost,
          totalCost,
          issueDate: new Date(data.issueDate),
          issuedBy: data.issuedBy,
          remarks: data.remarks,
        },
      });

      const prev = mat.currentStock;
      await tx.material.update({ where: { id: mat.id }, data: { currentStock: prev - data.quantity } });

      await tx.projectActivity.create({
        data: {
          projectId: project.id,
          event: "Material Consumed",
          actor: data.issuedBy,
          details: `${data.quantity} ${mat.unit} of ${mat.name} (₹${totalCost.toLocaleString("en-IN")})`,
        },
      });
      await tx.stockAuditLog.create({
        data: {
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          itemType: "Material",
          itemId: mat.id,
          itemName: mat.name,
          actionType: "Issue",
          quantity: data.quantity,
          previousAvailable: prev,
          newAvailable: prev - data.quantity,
          projectId: project.id,
          projectName: project.customerName,
          customerName: project.customerName,
          issuedByOrActor: data.issuedBy,
          notes: data.remarks ?? `Consumed in ${project.id}`,
        },
      });

      return formatMaterialIssue(record);
    }, { timeout: 30000, maxWait: 10000 });
  });

export const adjustStock = createServerFn({ method: "POST" })
  .validator(
    (input: { itemType: StockItemType; itemId: string; newQuantity: number; reason: string; actor: string }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      if (data.itemType === "Machine") {
        const m = await tx.machine.findUnique({ where: { id: data.itemId } });
        if (!m) throw new Error("Machine not found");
        const prev = m.availableQuantity;
        await tx.machine.update({
          where: { id: m.id },
          data: { availableQuantity: data.newQuantity, currentStock: data.newQuantity + m.issuedQuantity },
        });
        await tx.stockAuditLog.create({
          data: {
            id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            itemType: "Machine",
            itemId: m.id,
            itemName: m.toolName,
            actionType: "StockAdjustment",
            quantity: Math.abs(data.newQuantity - prev),
            previousAvailable: prev,
            newAvailable: data.newQuantity,
            issuedByOrActor: data.actor,
            notes: `Adjustment: ${data.reason}`,
          },
        });
      } else {
        const mat = await tx.material.findUnique({ where: { id: data.itemId } });
        if (!mat) throw new Error("Material not found");
        const prev = mat.currentStock;
        await tx.material.update({ where: { id: mat.id }, data: { currentStock: data.newQuantity } });
        await tx.stockAuditLog.create({
          data: {
            id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            itemType: "Material",
            itemId: mat.id,
            itemName: mat.name,
            actionType: "StockAdjustment",
            quantity: Math.abs(data.newQuantity - prev),
            previousAvailable: prev,
            newAvailable: data.newQuantity,
            issuedByOrActor: data.actor,
            notes: `Adjustment: ${data.reason}`,
          },
        });
      }
      return { ok: true };
    }, { timeout: 30000, maxWait: 10000 });
  });
