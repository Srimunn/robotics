"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { cleanPhone, generateSafeId } from "./utils";

export const listLabours = createServerFn({ method: "GET" }).handler(async () => {
  return db.labour.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { wageHistory: { orderBy: { assignedDate: "desc" } } },
  });
});

const labourInput = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  type: z.enum(["Permanent", "Contract"]),
  defaultWeeklyWage: z.number().int().min(0).optional().nullable(),
  dailyWage: z.number().int().min(0).optional().nullable(),
  skills: z.array(z.string()).default([]),
  loginId: z.string().optional(),
  pin: z.string().optional(),
  photoUrl: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const addLabour = createServerFn({ method: "POST" })
  .validator((input: unknown) => labourInput.parse(input))
  .handler(async ({ data }) => {
    const id = await generateSafeId(db.labour, "LBR");
    const cleanName = data.name.trim().split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");
    const loginId = data.loginId?.trim() || cleanName.toLowerCase() || id.toLowerCase();
    const pin = data.pin?.trim() || String(Math.floor(1000 + Math.random() * 9000));

    const dailyWage = data.dailyWage ?? (data.defaultWeeklyWage ? Math.round(data.defaultWeeklyWage / 6) : 0);
    const defaultWeeklyWage = data.defaultWeeklyWage ?? (dailyWage * 6);

    return db.labour.create({
      data: {
        id,
        name: data.name,
        phone: cleanPhone(data.phone),
        type: data.type,
        defaultWeeklyWage,
        dailyWage,
        status: "Available",
        skills: data.skills,
        loginId,
        pin,
        photoUrl: data.photoUrl ?? undefined,
        address: data.address ?? undefined,
      },
    });
  });

export const updateLabour = createServerFn({ method: "POST" })
  .validator((input: { id: string; updates: Partial<z.infer<typeof labourInput>> }) => input)
  .handler(async ({ data }) => {
    const { id, updates } = data;
    const updatesData: any = { ...updates };
    if (updates.phone) updatesData.phone = cleanPhone(updates.phone);
    if (updates.dailyWage !== undefined && updates.defaultWeeklyWage === undefined) {
      updatesData.defaultWeeklyWage = (updates.dailyWage || 0) * 6;
    } else if (updates.defaultWeeklyWage !== undefined && updates.dailyWage === undefined) {
      updatesData.dailyWage = Math.round((updates.defaultWeeklyWage || 0) / 6);
    }

    return db.labour.update({
      where: { id },
      data: updatesData,
    });
  });

export const deleteLabour = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    try {
      await db.projectLabourAssignment.deleteMany({ where: { labourId: data.id } });
      await db.labourWageHistory.deleteMany({ where: { labourId: data.id } });
      await db.labour.delete({ where: { id: data.id } });
    } catch {
      await db.projectLabourAssignment.updateMany({
        where: { labourId: data.id, isActive: true },
        data: { isActive: false },
      });
      await db.labour.update({
        where: { id: data.id },
        data: { isActive: false } as any,
      });
    }
    return { ok: true };
  });

export const deactivateLabour = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.projectLabourAssignment.updateMany({
      where: { labourId: data.id, isActive: true },
      data: { isActive: false },
    });
    return db.labour.update({
      where: { id: data.id },
      data: { isActive: false } as any,
    });
  });

export const reactivateLabour = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return db.labour.update({
      where: { id: data.id },
      data: { isActive: true } as any,
    });
  });

export const deleteLabourPermanently = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { id } = data;
    const [attCount, logCount, assignCount, wageCount] = await Promise.all([
      db.attendanceRecord.count({ where: { labourId: id } }),
      db.projectLabourLog.count({ where: { labourId: id } }),
      db.projectLabourAssignment.count({ where: { labourId: id } }),
      db.labourWageHistory.count({ where: { labourId: id } }),
    ]);

    if (attCount > 0 || logCount > 0 || assignCount > 0 || wageCount > 0) {
      throw new Error("Cannot permanently delete: this labour has history. Deactivate instead.");
    }

    await db.labour.delete({ where: { id } });
    return { ok: true };
  });

