"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { generateSafeId } from "./utils";
import { assertCanEdit } from "./permissions";

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
  requestedByRole: z.string().optional().nullable(),
  requestedBySubRole: z.string().optional().nullable(),
});

export const addMachine = createServerFn({ method: "POST" })
  .validator((input: unknown) => machineInput.parse(input))
  .handler(async ({ data }) => {
    assertCanEdit(data);
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

// Only these fields may be edited directly; issued/available counts change through issue, return and adjust.
const machineUpdateInput = z.object({
  toolName: z.string().min(1).optional(),
  category: z.string().optional(),
  attachment: z.string().optional().nullable(),
  brand: z.string().optional(),
  unit: z.string().optional(),
  condition: z.enum(["Good", "Damaged", "RepairRequired", "Lost"]).optional(),
  remarks: z.string().optional().nullable(),
  currentStock: z.number().int().min(0).optional(),
});

export const updateMachine = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id: string;
      updates: Partial<z.infer<typeof machineInput>>;
      requestedByRole?: string | null;
      requestedBySubRole?: string | null;
    }) => input
  )
  .handler(async ({ data }) => {
    // Older clients sent the role fields inside `updates`; honour them for the permission check.
    const rawUpdates = (data.updates ?? {}) as Record<string, unknown>;
    assertCanEdit({
      requestedByRole: data.requestedByRole ?? (rawUpdates.requestedByRole as string | null | undefined),
      requestedBySubRole: data.requestedBySubRole ?? (rawUpdates.requestedBySubRole as string | null | undefined),
    });
    const updates = machineUpdateInput.parse(rawUpdates);

    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Machine" WHERE id = ${data.id} FOR UPDATE`;
      const machine = await tx.machine.findUnique({ where: { id: data.id } });
      if (!machine) throw new Error("Machine not found");

      const { currentStock, ...rest } = updates;
      const stockData: { currentStock?: number; availableQuantity?: number } = {};
      if (currentStock !== undefined && currentStock !== machine.currentStock) {
        const outOfStore = machine.issuedQuantity + machine.repairQuantity + machine.lostQuantity;
        if (currentStock < outOfStore) {
          throw new Error(
            `Total stock cannot be less than ${outOfStore} (issued, under repair or lost units).`
          );
        }
        stockData.currentStock = currentStock;
        stockData.availableQuantity = currentStock - outOfStore;
        await tx.stockAuditLog.create({
          data: {
            id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            itemType: "Machine",
            itemId: machine.id,
            itemName: rest.toolName ?? machine.toolName,
            actionType: "StockAdjustment",
            quantity: Math.abs(currentStock - machine.currentStock),
            previousAvailable: machine.availableQuantity,
            newAvailable: stockData.availableQuantity,
            issuedByOrActor: data.requestedByRole ?? "Machine edit",
            notes: `Total stock edited from ${machine.currentStock} to ${currentStock}`,
          },
        });
      }

      return tx.machine.update({ where: { id: data.id }, data: { ...rest, ...stockData } });
    });
  });

export const deleteMachine = createServerFn({ method: "POST" })
  .validator((input: { id: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    await db.machine.delete({ where: { id: data.id } });
    return { ok: true };
  });

