"use server";

import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";

/** Customers are derived from Enquiries + Projects (dedup by name+phone). */
export const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const [enquiries, projects] = await Promise.all([
    db.enquiry.findMany({ select: { customerName: true, phone: true, location: true, createdAt: true } }),
    db.project.findMany({ select: { customerName: true, phone: true, location: true, createdAt: true } }),
  ]);

  const map = new Map<string, { id: string; name: string; phone: string; location: string; createdAt: Date }>();
  const normalize = (name: string, phone: string, location: string, createdAt: Date) => {
    const key = `${name.toLowerCase().trim()}_${phone.trim()}`;
    if (!map.has(key)) {
      const hash = Math.abs(key.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0));
      map.set(key, {
        id: `CUST-${hash}`,
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
        createdAt,
      });
    }
  };

  for (const e of enquiries) normalize(e.customerName, e.phone, e.location, e.createdAt);
  for (const p of projects) normalize(p.customerName, p.phone, p.location, p.createdAt);
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
});
