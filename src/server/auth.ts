"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";

type StaffRole = "CEO" | "RS" | "DRS" | "CS" | "BS";

// Role PINs live in server environment variables so they never ship in the browser bundle.
// The fallbacks keep existing logins working until ROLE_PIN_* is set in Railway.
const FALLBACK_PINS: Record<StaffRole, string> = {
  CEO: "1234",
  RS: "5678",
  DRS: "9753",
  CS: "2468",
  BS: "8642",
};

function expectedPin(role: StaffRole): string {
  const fromEnv = process.env[`ROLE_PIN_${role}`]?.trim();
  if (fromEnv) return fromEnv;
  console.warn(`[auth] ROLE_PIN_${role} is not set; using the default PIN. Set it in the environment.`);
  return FALLBACK_PINS[role];
}

export const verifyRolePin = createServerFn({ method: "POST" })
  .validator(z.object({ role: z.enum(["CEO", "RS", "DRS", "CS", "BS"]), pin: z.string().min(1).max(32) }))
  .handler(async ({ data }) => {
    return { ok: data.pin.trim() === expectedPin(data.role) };
  });

// Labour sign-in is checked here so labour PINs never reach the browser.
export const verifyLabourPin = createServerFn({ method: "POST" })
  .validator(z.object({ loginIdOrId: z.string().min(1).max(100), pin: z.string().min(1).max(32) }))
  .handler(async ({ data }) => {
    const t = data.loginIdOrId.trim().toLowerCase();
    const pin = data.pin.trim();
    const labours = await db.labour.findMany({
      where: { isActive: true },
      select: { id: true, name: true, loginId: true, pin: true },
    });
    const lab = labours.find((l) => {
      const idMatch = l.id?.toLowerCase() === t;
      const loginIdMatch = l.loginId?.toLowerCase() === t;
      const nameMatch = l.name?.toLowerCase() === t;
      const firstNameMatch = l.name?.toLowerCase().split(" ")[0] === t;
      return (idMatch || loginIdMatch || nameMatch || firstNameMatch) && (l.pin || "0000") === pin;
    });
    return lab ? { ok: true as const, id: lab.id, name: lab.name } : { ok: false as const };
  });
