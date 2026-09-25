"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
