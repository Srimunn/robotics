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

/** Clock time of a normal day: 9:30 AM to 6:00 PM. Used when a check-out time is missing. */
export const STANDARD_SHIFT_HOURS = 8.5;

/** Unpaid lunch break taken out of every full day's clock time. */
export const LUNCH_BREAK_HOURS = 0.5;

/** Paid working hours in a full day. Pay is worked out per hour at dailyWage / 8. */
export const FULL_DAY_HOURS = 8;

export function calculateHoursFromTimes(inTime?: string | null, outTime?: string | null): number {
  if (!inTime || !inTime.trim()) return 0;
  if (!outTime || !outTime.trim()) return STANDARD_SHIFT_HOURS;
  const inH = parseTimeToHours(inTime);
  const outH = parseTimeToHours(outTime);
  const diff = outH - inH;
  return diff > 0 ? Math.round(diff * 10) / 10 : STANDARD_SHIFT_HOURS;
}

/** Paid hours for a day: clock hours (in to out) minus the lunch break. */
export function calculatePaidHours(clockHours?: number | null): number {
  const hrs = Number(clockHours) || 0;
  return Math.max(0, Math.round((hrs - LUNCH_BREAK_HOURS) * 10) / 10);
}

/** Overtime hours in a day: paid hours beyond the 8-hour day. */
export function calculateOvertimeHours(clockHours?: number | null): number {
  const paid = calculatePaidHours(clockHours);
  return paid > FULL_DAY_HOURS ? Math.round((paid - FULL_DAY_HOURS) * 10) / 10 : 0;
}

/** Overtime pay: each hour beyond the 8-hour day pays dailyWage / 8. */
export function calculateOvertimePay(dailyWage: number, clockHours?: number | null): number {
  const wage = Number(dailyWage) || 0;
  return Math.round((calculateOvertimeHours(clockHours) * wage) / FULL_DAY_HOURS);
}

/** Pay for a worked day by the hour: paid hours x dailyWage / 8 (less than 8 hours pays less, more pays overtime). */
function hourlyPay(wage: number, clockHours?: number | null): number {
  // No hours recorded (e.g. marked Present without times) counts as a full day.
  if (clockHours === undefined || clockHours === null || !(Number(clockHours) > 0)) return Math.round(wage);
  return Math.round((calculatePaidHours(clockHours) * wage) / FULL_DAY_HOURS);
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
    return hourlyPay(wage, status);
  }

  const s = String(status || "").toLowerCase().replace(/[\s_-]/g, "");
  if (s === "present" || s === "overtime") {
    return hourlyPay(wage, hoursWorked);
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
  return hourlyPay(wage, hoursWorked);
}

/**
 * Pay for one day's attendance record under today's rules (wage, 8-hour day, overtime).
 * Every screen and report uses this so the amounts always agree with payroll,
 * instead of the amount saved on the record when it was first logged.
 */
export function payForDay(dailyWage: number, status?: string | null, hoursWorked?: number | null): number {
  return calculateEarnedWage(dailyWage, status || "Present", hoursWorked ? Number(hoursWorked) : undefined);
}

/** Daily wage for a labour: the stored daily wage, else the weekly wage spread over a 6-day week. */
export function dailyWageOfLabour(lab?: { dailyWage?: number | null; defaultWeeklyWage?: number | null } | null): number {
  return lab?.dailyWage ?? Math.round((lab?.defaultWeeklyWage || 1400) / 6);
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
