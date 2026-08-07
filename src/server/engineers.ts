"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { cleanPhone } from "./utils";

export const listEngineers = createServerFn({ method: "GET" }).handler(async () => {
  return db.engineer.findMany({ orderBy: { name: "asc" } });
});

const engineerInput = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  specialty: z.string().min(1),
  email: z.string().email().optional().nullable(),
});

export const addEngineer = createServerFn({ method: "POST" })
  .validator((input: unknown) => engineerInput.parse(input))
  .handler(async ({ data }) => {
    const count = await db.engineer.count();
    const id = `ENG-${String(count + 1).padStart(3, "0")}`;
    return db.engineer.create({
      data: {
        id,
        name: data.name,
        phone: cleanPhone(data.phone),
        specialty: data.specialty,
        email: data.email ?? undefined,
        status: "Available",
      },
    });
  });

export const updateEngineer = createServerFn({ method: "POST" })
  .validator((input: { id: string; updates: Partial<z.infer<typeof engineerInput>> }) => input)
  .handler(async ({ data }) => {
    const { id, updates } = data;
    return db.engineer.update({
      where: { id },
      data: {
        ...updates,
        phone: updates.phone ? cleanPhone(updates.phone) : undefined,
      },
    });
  });

export const deleteEngineer = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.engineer.delete({ where: { id: data.id } });
    return { ok: true };
  });
