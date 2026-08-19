"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { generateSafeId } from "./utils";

const machineInput = z.object({
  toolName: z.string(),
  category: z.string(),
  attachment: z.string().optional().nullable(),
  brand: z.string(),
  currentStock: z.number().int().min(0),
  availableQuantity: z.number().int().min(0),
  unit: z.string(),
  condition: z.enum(["Good", "Damaged", "RepairRequired", "Lost"]).default("Good"),
  remarks: z.string().optional().nullable(),
});

export const addMachine = createServerFn({ method: "POST" })
  .validator((input: unknown) => machineInput.parse(input))
  .handler(async ({ data }) => {
    const year = new Date().getFullYear();
    const id = await generateSafeId(db.machine, `MCH-${year}`);
    const machine = await db.machine.create({
      data: {
        id,
        toolName: data.toolName,
        category: data.category,
        attachment: data.attachment ?? undefined,
        brand: data.brand,
        currentStock: data.currentStock,
        availableQuantity: data.availableQuantity,
        unit: data.unit,
        condition: data.condition,
        remarks: data.remarks ?? undefined,
      },
    });
    await db.stockAuditLog.create({
      data: {
        id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        itemType: "Machine",
        itemId: id,
        itemName: data.toolName,
        actionType: "StockAddition",
        quantity: data.currentStock,
        previousAvailable: 0,
        newAvailable: data.availableQuantity,
        issuedByOrActor: "Administrator",
        notes: `New machine added: ${data.toolName}`,
      },
    });
    return machine;
  });

export const updateMachine = createServerFn({ method: "POST" })
  .validator((input: { id: string; updates: Partial<z.infer<typeof machineInput>> }) => input)
  .handler(async ({ data }) => {
    return db.machine.update({ where: { id: data.id }, data: data.updates as any });
  });

export const deleteMachine = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.machine.delete({ where: { id: data.id } });
    return { ok: true };
  });
