import type { Enquiry, Project } from "./robotics-types";

/** How many days ahead a payment counts as "due soon". */
export const DUE_SOON_DAYS = 3;

/** Today's date as YYYY-MM-DD in the browser's own time zone (IST for the team). */
export function localToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string) {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export type ReminderBucket = "overdue" | "today" | "upcoming";

export function bucketFor(dueDate: string, today = localToday()): ReminderBucket {
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

export interface PaymentReminder {
  key: string;
  projectId: string;
  customerName: string;
  phone: string;
  isGST: boolean;
  stageName: string;
  dueDate: string;
  amountDue: number;
  projectBalance: number;
  bucket: ReminderBucket;
  /** Positive = days overdue, 0 = today, negative = days left. */
  daysOverdue: number;
}

/**
 * Collection reminders: every unpaid payment stage due on or before today + DUE_SOON_DAYS,
 * for projects that still have a balance. Projects with no stages use the same fallback
 * due date as the Payments page (work committed date, else scheduled date).
 */
export function getPaymentReminders(projects: Project[], today = localToday()): PaymentReminder[] {
  const horizon = localToday(DUE_SOON_DAYS);
  const out: PaymentReminder[] = [];
  for (const p of projects) {
    const balance = Number(p.balanceAmount) || 0;
    if (balance <= 0) continue;
    const stages = (p.paymentStages || []).filter(
      (s) => s.status !== "Paid" && (Number(s.amount) || 0) - (Number(s.paidAmount) || 0) > 0,
    );
    const items =
      stages.length > 0
        ? stages.map((s) => ({
            key: `${p.id}:${s.id}`,
            stageName: s.stageName,
            dueDate: s.dueDate,
            amountDue: Math.min(balance, (Number(s.amount) || 0) - (Number(s.paidAmount) || 0)),
          }))
        : (p.paymentStages || []).length === 0
          ? [
              {
                key: `${p.id}:contract`,
                stageName: "Contract balance",
                dueDate: (p.workCommittedDate || p.scheduledDate || "").slice(0, 10),
                amountDue: balance,
              },
            ]
          : [];
    for (const it of items) {
      if (!it.dueDate || it.dueDate > horizon) continue;
      out.push({
        ...it,
        projectId: p.id,
        customerName: p.customerName,
        phone: p.phone,
        isGST: Boolean(p.isGST),
        projectBalance: balance,
        bucket: bucketFor(it.dueDate, today),
        daysOverdue: daysBetween(it.dueDate, today),
      });
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amountDue - a.amountDue);
}

/** An enquiry is still open for follow-up until it is approved, cancelled or converted. */
export function isOpenForFollowUp(e: Enquiry) {
  return !e.projectId && e.customerDecision !== "Approved" && e.customerDecision !== "Cancelled";
}

export interface FollowUpReminder {
  enquiry: Enquiry;
  dueDate: string;
  bucket: ReminderBucket;
  daysOverdue: number;
}

/** Follow-up reminders: open enquiries whose next follow-up date is on or before today + DUE_SOON_DAYS. */
export function getFollowUpReminders(
  enquiries: Enquiry[],
  today = localToday(),
): FollowUpReminder[] {
  const horizon = localToday(DUE_SOON_DAYS);
  return enquiries
    .filter((e) => e.nextFollowUpDate && isOpenForFollowUp(e) && e.nextFollowUpDate <= horizon)
    .map((e) => ({
      enquiry: e,
      dueDate: e.nextFollowUpDate!,
      bucket: bucketFor(e.nextFollowUpDate!, today),
      daysOverdue: daysBetween(e.nextFollowUpDate!, today),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function describeDue(daysOverdue: number) {
  if (daysOverdue > 0) return `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`;
  if (daysOverdue === 0) return "Due today";
  const left = -daysOverdue;
  return `Due in ${left} day${left === 1 ? "" : "s"}`;
}
