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
  delegate: { count: () => Promise<number>; findUnique: (args: { where: { id: string } }) => Promise<any> },
  prefix: string,
  padding: number = 3
): Promise<string> {
  const count = await delegate.count();
  let num = count + 1;
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
