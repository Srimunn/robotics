"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { cleanPhone } from "./utils";

export const listLabours = createServerFn({ method: "GET" }).handler(async () => {
  return db.labour.findMany({
    orderBy: { name: "asc" },
    include: { wageHistory: { orderBy: { assignedDate: "desc" } } },
  });
});

const labourInput = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  type: z.enum(["Permanent", "Contract"]),
  defaultWeeklyWage: z.number().int().min(0),
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
    const count = await db.labour.count();
    const id = `LBR-${String(count + 1).padStart(3, "0")}`;
    const cleanName = data.name.trim().split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");
    const loginId = data.loginId?.trim() || cleanName.toLowerCase() || id.toLowerCase();
    const pin = data.pin?.trim() || String(Math.floor(1000 + Math.random() * 9000));

    return db.labour.create({
      data: {
        id,
        name: data.name,
        phone: cleanPhone(data.phone),
        type: data.type,
        defaultWeeklyWage: data.defaultWeeklyWage,
        dailyWage: data.dailyWage ?? undefined,
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
    return db.labour.update({
      where: { id },
      data: {
        ...updates,
        phone: updates.phone ? cleanPhone(updates.phone) : undefined,
      } as any,
    });
  });

export const deleteLabour = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.labour.delete({ where: { id: data.id } });
    return { ok: true };
  });
