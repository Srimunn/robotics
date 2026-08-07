"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const s = await db.systemSettings.findUnique({ where: { id: "singleton" } });
  if (!s) throw new Error("System settings not initialised. Run seed script.");
  return s;
});

const updateSettingsSchema = z.object({
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  taxId: z.string().optional(),
  autoUpdateProjectStatusOnPayment: z.boolean().optional(),
  defaultLeadSources: z.array(z.string()).optional(),
  defaultLeakageTypes: z.array(z.string()).optional(),
  defaultWeeklyWagePermanent: z.number().int().optional(),
  defaultWeeklyWageContract: z.number().int().optional(),
  defaultDailyWagePermanent: z.number().int().nullable().optional(),
  defaultDailyWageContract: z.number().int().nullable().optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    return db.systemSettings.update({
      where: { id: "singleton" },
      data,
    });
  });
