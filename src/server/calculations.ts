import type { PaymentStageStatus, PaymentStatus } from "@prisma/client";

/** Parse "09.30 am" / "9:30 AM" / "6.00 pm" into decimal hours-of-day (0-24). */
export function parseTimeToHours(str: string | null | undefined): number {
  if (!str || !str.trim()) return 0;
  try {
    const cleaned = str.trim().replace(/\./g, ":");
    const parts = cleaned.split(/\s+/);
    const timePart = parts[0];
    const [hStr, mStr = "0"] = timePart.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const suffix = (parts[1] || "").toUpperCase();
    if (suffix === "PM" && h < 12) h += 12;
    if (suffix === "AM" && h === 12) h = 0;
    return h + m / 60;
  } catch {
    return 0;
  }
}

export function calculateHoursFromTimes(inTime?: string | null, outTime?: string | null): number {
  if (!inTime || !inTime.trim()) return 0;
  if (!outTime || !outTime.trim()) return 8;
  const inH = parseTimeToHours(inTime);
  const outH = parseTimeToHours(outTime);
  const diff = outH - inH;
  return diff > 0 ? Math.round(diff * 10) / 10 : 8;
}

export function calculateEarnedWage(weeklyWage: number, hoursWorked: number): number {
  if (!hoursWorked || hoursWorked <= 0) return 0;
  const hourlyRate = (weeklyWage || 1400) / 48;
  return Math.round(hoursWorked * hourlyRate);
}

/** Compute PaymentStatus from project total + received + stages */
export function computePaymentStatus(
  projectValue: number,
  receivedAmount: number,
  dueDate?: Date | null,
  paymentStages?: Array<{ dueDate: Date; amount: number; paidAmount?: number | null }>
): PaymentStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasOverdueStage = paymentStages?.some(
    (s) => s.dueDate < today && Number(s.paidAmount || 0) < Number(s.amount)
  );
  const projectOverdue = dueDate && dueDate < today;

  if (receivedAmount === 0) {
    if (hasOverdueStage || projectOverdue) return "Overdue";
    return "Pending";
  }
  if (receivedAmount >= projectValue && projectValue > 0) return "Paid";
  if (hasOverdueStage || projectOverdue) return "Overdue";
  return "Partial";
}

/** Allocate a receivedAmount pool across stages in order (returns { paidAmount, status } per stage) */
export function allocateToStages(
  totalReceived: number,
  stages: Array<{ id: string; amount: number; dueDate: Date }>
): Array<{ id: string; paidAmount: number; status: PaymentStageStatus }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let pool = totalReceived;
  return stages.map((stage) => {
    const amt = Number(stage.amount);
    let paidAmt = 0;
    let status: PaymentStageStatus = "Pending";
    if (pool >= amt) {
      paidAmt = amt;
      status = "Paid";
      pool -= amt;
    } else if (pool > 0) {
      paidAmt = pool;
      status = "Partial";
      pool = 0;
    } else {
      paidAmt = 0;
      status = stage.dueDate < today ? "Overdue" : "Pending";
    }
    return { id: stage.id, paidAmount: paidAmt, status };
  });
}
