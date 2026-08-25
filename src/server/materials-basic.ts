"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { toNumber, generateSafeId } from "./utils";
import { assertCanEdit } from "./permissions";

const materialInput = z.object({
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  currentStock: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  supplier: z.string(),
  purchaseCost: z.number().min(0),
  remarks: z.string().optional().nullable(),
  requestedByRole: z.string().optional().nullable(),
  requestedBySubRole: z.string().optional().nullable(),
});

export const addMaterial = createServerFn({ method: "POST" })
  .validator((input: unknown) => materialInput.parse(input))
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const year = new Date().getFullYear();
    const id = await generateSafeId(db.material, `MAT-${year}`);
    const material = await db.material.create({
      data: {
        id,
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentStock: data.currentStock,
        minimumStock: data.minimumStock,
        supplier: data.supplier,
        purchaseCost: data.purchaseCost,
        remarks: data.remarks ?? undefined,
      },
    });
    await db.stockAuditLog.create({
      data: {
        id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        itemType: "Material",
        itemId: id,
        itemName: data.name,
        actionType: "StockAddition",
        quantity: data.currentStock,
        previousAvailable: 0,
        newAvailable: data.currentStock,
        issuedByOrActor: "Administrator",
        notes: `New material added: ${data.name}`,
      },
    });
    return {
      ...material,
      purchaseCost: toNumber(material.purchaseCost),
    };
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .validator((input: { id: string; updates: Partial<z.infer<typeof materialInput>>; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const updated = await db.material.update({ where: { id: data.id }, data: data.updates as any });
    return {
      ...updated,
      purchaseCost: toNumber(updated.purchaseCost),
    };
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .validator((input: { id: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    await db.material.delete({ where: { id: data.id } });
    return { ok: true };
  });

