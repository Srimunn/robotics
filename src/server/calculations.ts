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

/** A normal working day is 9:30 AM to 6 PM (lunch included). Time beyond that is overtime. */
export const STANDARD_SHIFT_HOURS = 8.5;

/** Overtime hours in a day: hours beyond the standard shift. */
export function calculateOvertimeHours(hoursWorked?: number | null): number {
  const hrs = Number(hoursWorked) || 0;
  return hrs > STANDARD_SHIFT_HOURS ? Math.round((hrs - STANDARD_SHIFT_HOURS) * 10) / 10 : 0;
}

/** Overtime pay: each hour beyond the standard shift pays the daily wage / 8. */
export function calculateOvertimePay(dailyWage: number, hoursWorked?: number | null): number {
  const wage = Number(dailyWage) || 0;
  return Math.round((calculateOvertimeHours(hoursWorked) * wage) / 8);
}

export function calculateEarnedWage(
  dailyWage: number,
  status: string | number = "Present",
  hoursWorked?: number
): number {
  const wage = Number(dailyWage) || 0;
  if (wage <= 0) return 0;

  // Backward compatibility: If 2nd argument was hoursWorked as number
  if (typeof status === "number") {
    if (status <= 0) return 0;
    return Math.round(wage) + calculateOvertimePay(wage, status);
  }

  const s = String(status || "").toLowerCase().replace(/[\s_-]/g, "");
  if (s === "present" || s === "overtime") {
    return Math.round(wage) + calculateOvertimePay(wage, hoursWorked);
  }
  if (s === "halfday" || s === "half") {
    return Math.round(wage / 2);
  }
  if (s === "absent" || s === "leave") {
    return 0;
  }

  // Fallback: If status is unknown but hours are given
  if (hoursWorked !== undefined && hoursWorked <= 0) {
    return 0;
  }
  return Math.round(wage) + calculateOvertimePay(wage, hoursWorked);
}

/** Compute PaymentStatus from project net payable (projectValue - discount) + received + stages */
export function computePaymentStatus(
  netPayable: number,
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

  if (receivedAmount >= netPayable && netPayable > 0) return "Paid";
  if (receivedAmount === 0) {
    if (hasOverdueStage || projectOverdue) return "Overdue";
    return "Pending";
  }
  if (receivedAmount >= netPayable) return "Paid";
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
