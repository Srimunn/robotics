"use server";

import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";

const normalizeKey = (name: string) => name.toLowerCase().trim().replace(/\s+/g, " ");

interface RecordItem {
  type: "enquiry" | "project";
  customerName: string;
  phone: string;
  location: string;
  createdAt: Date;
}

/** Customers are derived from Enquiries + Projects (grouped by normalized customer name). */
export const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const [enquiries, projects] = await Promise.all([
    db.enquiry.findMany({ select: { customerName: true, phone: true, location: true, createdAt: true } }),
    db.project.findMany({ select: { customerName: true, phone: true, location: true, createdAt: true } }),
  ]);

  const groups = new Map<string, RecordItem[]>();

  for (const e of enquiries) {
    if (!e.customerName) continue;
    const key = normalizeKey(e.customerName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ type: "enquiry", ...e });
  }

  for (const p of projects) {
    if (!p.customerName) continue;
    const key = normalizeKey(p.customerName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ type: "project", ...p });
  }

  const result = Array.from(groups.entries()).map(([key, items]) => {
    // 1. Use the earliest-created project or enquiry's exact name spelling and createdAt
    const earliestItem = items.reduce((earliest, current) =>
      current.createdAt < earliest.createdAt ? current : earliest
    );

    // 2. Use the most recent project's phone number and location (or enquiry if no projects exist)
    const projectItems = items.filter((item) => item.type === "project");
    let contactItem: RecordItem;
    if (projectItems.length > 0) {
      contactItem = projectItems.reduce((latest, current) =>
        current.createdAt > latest.createdAt ? current : latest
      );
    } else {
      contactItem = items.reduce((latest, current) =>
        current.createdAt > latest.createdAt ? current : latest
      );
    }

    const hash = Math.abs(key.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0));

    return {
      id: `CUST-${hash}`,
      name: earliestItem.customerName.trim(),
      phone: contactItem.phone.trim(),
      location: contactItem.location.trim(),
      createdAt: earliestItem.createdAt,
    };
  });

  return result.sort((a, b) => a.name.localeCompare(b.name));
});

