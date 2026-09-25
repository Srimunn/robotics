import type { Prisma } from "@prisma/client";
// Utilities for server functions

/** Strip whitespace from phone numbers */
export function cleanPhone(raw: string): string {
  return (raw || "").replace(/\s+/g, "").trim();
}

/** Generate an entity ID like ENQ-2026-001, given prefix + existing count */
export function makeSeqId(prefix: string, existingCount: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(existingCount + 1).padStart(3, "0")}`;
}

/** Robustly generate a unique sequential ID for any Prisma model delegate */
export async function generateSafeId(
  delegate: {
    count: (args?: any) => Promise<number>;
    findUnique: (args: { where: { id: string } }) => Promise<any>;
    findMany?: (args?: any) => Promise<any[]>;
  },
  prefix: string,
  padding: number = 3
): Promise<string> {
  let maxSeq = 0;
  try {
    if (typeof delegate.findMany === "function") {
      const records = await delegate.findMany({
        where: { id: { startsWith: prefix } },
        select: { id: true },
      });
      for (const rec of records) {
        if (rec && typeof rec.id === "string") {
          const parts = rec.id.split("-");
          const lastNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastNum) && lastNum > maxSeq) {
            maxSeq = lastNum;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error finding max sequential ID:", err);
  }

  if (maxSeq === 0) {
    try {
      const count = await delegate.count();
      maxSeq = count;
    } catch {
      maxSeq = 0;
    }
  }

  let num = maxSeq + 1;
  let id = `${prefix}-${String(num).padStart(padding, "0")}`;
  while (await delegate.findUnique({ where: { id } })) {
    num++;
    id = `${prefix}-${String(num).padStart(padding, "0")}`;
  }
  return id;
}

/** Generate a short random suffix for sub-record IDs (activities, stages) */
export function shortId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convert nullable Decimal/Prisma Decimal to plain number for API responses */
export function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

export function toNullableNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

/** Rejects zero, negative, fractional or non-numeric stock quantities before they reach the database. */
export function assertPositiveWholeQuantity(value: unknown, label = "Quantity"): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a whole number greater than 0`);
  }
  return n;
}

/** Locks a stock row for the rest of the transaction so concurrent issues/returns cannot overwrite each other. */
export async function lockRowForUpdate(tx: Prisma.TransactionClient, table: "Machine" | "Material" | "MachineIssueRecord", id: string) {
  if (table === "Machine") await tx.$queryRaw`SELECT id FROM "Machine" WHERE id = ${id} FOR UPDATE`;
  else if (table === "Material") await tx.$queryRaw`SELECT id FROM "Material" WHERE id = ${id} FOR UPDATE`;
  else await tx.$queryRaw`SELECT id FROM "MachineIssueRecord" WHERE id = ${id} FOR UPDATE`;
}
