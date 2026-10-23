import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Banknote, PhoneCall, CheckCircle2, CalendarClock } from "lucide-react";
import { useRobotics } from "@/lib/robotics-context";
import {
  DUE_SOON_DAYS,
  describeDue,
  getFollowUpReminders,
  getPaymentReminders,
  localToday,
  type FollowUpReminder,
  type PaymentReminder,
  type ReminderBucket,
} from "@/lib/reminders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportButtons } from "@/components/export-buttons";
import { CustomerTypeBadge, GstBadge, typeLabel, gstLabel } from "@/components/customer-type-toggle";
import { cn } from "@/lib/utils";

interface NotificationsSearch {
  tab?: "collections" | "followups";
}

export const Route = createFileRoute("/notifications")({
  validateSearch: (search: Record<string, unknown>): NotificationsSearch => ({
    tab:
      search.tab === "followups"
        ? "followups"
        : search.tab === "collections"
          ? "collections"
          : undefined,
  }),
  component: NotificationsComponent,
});

const BUCKETS: { id: ReminderBucket; label: string; tone: string }[] = [
  { id: "overdue", label: "Overdue", tone: "text-rose-700 bg-rose-50 border-rose-200" },
  { id: "today", label: "Due today", tone: "text-amber-700 bg-amber-50 border-amber-200" },
  {
    id: "upcoming",
    label: `Next ${DUE_SOON_DAYS} days`,
    tone: "text-blue-700 bg-blue-50 border-blue-200",
  },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function NotificationsComponent() {
  const { projects, enquiries } = useRobotics();
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"collections" | "followups">(tab || "collections");

  const today = localToday();
  const payments = useMemo(() => getPaymentReminders(projects, today), [projects, today]);
  const followUps = useMemo(() => getFollowUpReminders(enquiries, today), [enquiries, today]);

  const count = (list: { bucket: ReminderBucket }[], b: ReminderBucket) =>
    list.filter((x) => x.bucket === b).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground">
              Payment collections and enquiry follow-ups that need action.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={cn(
            "text-left p-4 rounded-xl border bg-white dark:bg-card shadow-xs transition-colors",
            activeTab === "collections"
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-border hover:bg-accent/40",
          )}
          data-testid="tab-collections"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
            <Banknote className="h-4 w-4 text-emerald-600" /> Collections
          </div>
          <div className="mt-1 text-sm">
            <span className="font-extrabold text-rose-600">
              {count(payments, "overdue")} overdue
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {count(payments, "today")} today · {count(payments, "upcoming")} soon
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("followups")}
          className={cn(
            "text-left p-4 rounded-xl border bg-white dark:bg-card shadow-xs transition-colors",
            activeTab === "followups"
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-border hover:bg-accent/40",
          )}
          data-testid="tab-followups"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
            <PhoneCall className="h-4 w-4 text-blue-600" /> Follow-ups
          </div>
          <div className="mt-1 text-sm">
            <span className="font-extrabold text-rose-600">
              {count(followUps, "overdue")} overdue
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {count(followUps, "today")} today · {count(followUps, "upcoming")} soon
            </span>
          </div>
        </button>
      </div>

      {activeTab === "collections" ? (
        <CollectionsList items={payments} />
      ) : (
        <FollowUpsList items={followUps} />
      )}
    </div>
  );
}

function SectionHeader({ bucket, n }: { bucket: (typeof BUCKETS)[number]; n: number }) {
  return (
    <tr>
      <td colSpan={99} className="p-0">
        <div
          className={cn(
            "px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider border-y",
            bucket.tone,
          )}
        >
          {bucket.label} ({n})
        </div>
      </td>
    </tr>
  );
}

function CollectionsList({ items }: { items: PaymentReminder[] }) {
  const exportRows = () =>
    items.map((r) => ({
      Status: describeDue(r.daysOverdue),
      "Due Date": r.dueDate,
      "Project ID": r.projectId,
      "Customer Name": r.customerName,
      Phone: r.phone,
      "Customer Type": r.customerType || "Not set",
      GST: r.isGST ? "GST" : "Non-GST",
      Stage: r.stageName,
      "Amount Due (INR)": r.amountDue,
      "Project Balance (INR)": r.projectBalance,
    }));
  const total = items.reduce((s, r) => s + r.amountDue, 0);

  return (
    <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card overflow-hidden">
      <CardHeader className="p-4 border-b flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold">
          Payment collections ({items.length}) · {inr(total)} due
        </CardTitle>
        <ExportButtons
          rows={exportRows}
          filename="Collection_Reminders"
          title="Collection Reminders"
        />
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <table
          className="w-full text-left text-xs border-separate border-spacing-0"
          data-testid="collections-table"
        >
          <thead className="bg-slate-50 dark:bg-slate-900 text-muted-foreground text-[11px] font-bold uppercase tracking-wider [&_th]:border-b">
            <tr>
              <th className="p-3 pl-4 whitespace-nowrap">Due</th>
              <th className="p-3 whitespace-nowrap">Customer</th>
              <th className="p-3 whitespace-nowrap">Project / Stage</th>
              <th className="p-3 whitespace-nowrap text-right">Amount Due</th>
              <th className="p-3 whitespace-nowrap text-right">Balance</th>
              <th className="p-3 pr-4 whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody className="[&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800">
            {items.length === 0 && (
              <EmptyRow text="No payments overdue or due in the next few days." />
            )}
            {BUCKETS.map((b) => {
              const list = items.filter((r) => r.bucket === b.id);
              if (list.length === 0) return null;
              return [
                <SectionHeader key={`h-${b.id}`} bucket={b} n={list.length} />,
                ...list.map((r) => (
                  <tr key={r.key} className="hover:bg-accent/40">
                    <td className="p-3 pl-4 whitespace-nowrap">
                      <div className="font-mono font-semibold">{r.dueDate}</div>
                      <div
                        className={cn(
                          "text-[10px] font-bold",
                          r.daysOverdue > 0
                            ? "text-rose-600"
                            : r.daysOverdue === 0
                              ? "text-amber-600"
                              : "text-blue-600",
                        )}
                      >
                        {describeDue(r.daysOverdue)}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-foreground">{r.customerName}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        {r.phone} {r.customerType && <CustomerTypeBadge value={r.customerType} />}
                        <GstBadge value={r.isGST} />
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-blue-600">{r.projectId}</div>
                      <div className="text-[11px] text-muted-foreground">{r.stageName}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-right font-extrabold text-rose-600">
                      {inr(r.amountDue)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-right text-muted-foreground">
                      {inr(r.projectBalance)}
                    </td>
                    <td className="p-3 pr-4 whitespace-nowrap text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg"
                      >
                        <Link to="/projects" search={{ openId: r.projectId }}>
                          Open project
                        </Link>
                      </Button>
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function FollowUpsList({ items }: { items: FollowUpReminder[] }) {
  const { updateEnquiry } = useRobotics();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const exportRows = () =>
    items.map((r) => ({
      Status: describeDue(r.daysOverdue),
      "Follow-up Date": r.dueDate,
      "Enquiry ID": r.enquiry.id,
      "Customer Name": r.enquiry.customerName,
      Phone: r.enquiry.phone,
      Type: typeLabel(r.enquiry.customerType),
      GST: gstLabel(r.enquiry.isGST),
      "Work Type": r.enquiry.leakageType,
      Decision: r.enquiry.customerDecision,
      "Follow-up Note": r.enquiry.followUpNote || "",
    }));

  const markDone = async (id: string) => {
    setBusyId(id);
    try {
      await updateEnquiry(id, { nextFollowUpDate: null as any, followUpNote: null as any });
    } finally {
      setBusyId(null);
    }
  };

  const saveReschedule = async (id: string) => {
    if (!rescheduleDate) return;
    setBusyId(id);
    try {
      await updateEnquiry(id, { nextFollowUpDate: rescheduleDate });
      setRescheduleId(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card overflow-hidden">
      <CardHeader className="p-4 border-b flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold">Enquiry follow-ups ({items.length})</CardTitle>
        <ExportButtons
          rows={exportRows}
          filename="Follow-up_Reminders"
          title="Follow-up Reminders"
        />
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <table
          className="w-full text-left text-xs border-separate border-spacing-0"
          data-testid="followups-table"
        >
          <thead className="bg-slate-50 dark:bg-slate-900 text-muted-foreground text-[11px] font-bold uppercase tracking-wider [&_th]:border-b">
            <tr>
              <th className="p-3 pl-4 whitespace-nowrap">Follow-up</th>
              <th className="p-3 whitespace-nowrap">Customer</th>
              <th className="p-3 whitespace-nowrap">Enquiry</th>
              <th className="p-3 whitespace-nowrap min-w-[200px]">Note</th>
              <th className="p-3 pr-4 whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody className="[&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800">
            {items.length === 0 && (
              <EmptyRow text="No follow-ups due. Set a follow-up date on an enquiry to get a reminder here." />
            )}
            {BUCKETS.map((b) => {
              const list = items.filter((r) => r.bucket === b.id);
              if (list.length === 0) return null;
              return [
                <SectionHeader key={`h-${b.id}`} bucket={b} n={list.length} />,
                ...list.map((r) => (
                  <tr
                    key={r.enquiry.id}
                    className="hover:bg-accent/40"
                    data-testid={`followup-${r.enquiry.id}`}
                  >
                    <td className="p-3 pl-4 whitespace-nowrap">
                      <div className="font-mono font-semibold">{r.dueDate}</div>
                      <div
                        className={cn(
                          "text-[10px] font-bold",
                          r.daysOverdue > 0
                            ? "text-rose-600"
                            : r.daysOverdue === 0
                              ? "text-amber-600"
                              : "text-blue-600",
                        )}
                      >
                        {describeDue(r.daysOverdue)}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-foreground">{r.enquiry.customerName}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <a href={`tel:${r.enquiry.phone}`} className="hover:underline">
                          {r.enquiry.phone}
                        </a>
                        <CustomerTypeBadge value={r.enquiry.customerType} />
                        <GstBadge value={r.enquiry.isGST} />
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-blue-600">{r.enquiry.id}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {r.enquiry.leakageType}
                      </div>
                    </td>
                    <td className="p-3 text-[11px]">
                      {r.enquiry.followUpNote || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 pr-4 whitespace-nowrap text-right">
                      {rescheduleId === r.enquiry.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Input
                            type="date"
                            min={localToday()}
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="h-7 w-36 text-xs rounded-lg"
                            aria-label="New follow-up date"
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            disabled={!rescheduleDate || busyId === r.enquiry.id}
                            onClick={() => saveReschedule(r.enquiry.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setRescheduleId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-lg gap-1"
                            disabled={busyId === r.enquiry.id}
                            onClick={() => {
                              setRescheduleId(r.enquiry.id);
                              setRescheduleDate(localToday(1));
                            }}
                          >
                            <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-lg gap-1"
                            disabled={busyId === r.enquiry.id}
                            onClick={() => markDone(r.enquiry.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Done
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={99} className="p-12 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-semibold text-foreground">All clear</p>
          <p className="text-xs">{text}</p>
        </div>
      </td>
    </tr>
  );
}
