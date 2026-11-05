/**
 * Column choices for list pages and printouts / exports.
 *
 * Saved per computer in the browser (localStorage). Nothing here is ever sent to the
 * server or written to the database, so these choices can never touch business data.
 *
 * - List pages: which columns show in the table at first. Hidden ones open from the
 *   row's expand arrow, or from the "All columns" switch above the table.
 * - Printouts / exports: which columns go into the PDF or Excel file. The "Choose columns"
 *   box shown before each export and the Settings page edit the same saved choice.
 */
import { useSyncExternalStore } from "react";

export type ListColumn = {
  key: string;
  label: string;
  /** Shown at first when nobody has changed the setting on this computer. */
  defaultVisible: boolean;
  /** Always shown (the page can't be used without it), so it has no toggle. */
  required?: boolean;
};

export type ListModule = { key: string; title: string; columns: ListColumn[] };

const col = (key: string, label: string, defaultVisible = true, required = false): ListColumn => ({
  key,
  label,
  defaultVisible,
  required,
});

/** Every list page whose columns can be toggled. Keys must match the page code. */
export const LIST_MODULES: ListModule[] = [
  {
    key: "projects",
    title: "Projects",
    columns: [
      col("id", "ID", true, true),
      col("customer", "Customer", true, true),
      col("workType", "Work type"),
      col("engineer", "Engineer"),
      col("startDate", "Start date", false),
      col("started", "Started", false),
      col("payment", "Payment"),
      col("status", "Status (with GST / B2C tags)"),
      col("action", "Action", true, true),
    ],
  },
  {
    key: "enquiries",
    title: "Enquiries",
    columns: [
      col("id", "ID", true, true),
      col("customer", "Customer", true, true),
      col("type", "Type (B2B / B2C)", false),
      col("gst", "GST", false),
      col("workType", "Work type"),
      col("referredBy", "Referred by", false),
      col("engineer", "Engineer", false),
      col("amount", "Amount"),
      col("startDate", "Start date", false),
      col("started", "Started", false),
      col("status", "Status"),
      col("nextFollowUp", "Next follow-up", false),
      col("action", "Action", true, true),
    ],
  },
  {
    key: "customers",
    title: "Customers",
    columns: [
      col("sno", "S.No"),
      col("name", "Customer", true, true),
      col("phone", "Phone"),
      col("location", "Location"),
      col("type", "Type"),
      col("gst", "GST"),
      col("enquiries", "Enquiries"),
      col("projects", "Projects"),
      col("value", "Contract value"),
      col("collected", "Collected"),
      col("pending", "Pending"),
      col("lastActivity", "Last activity"),
    ],
  },
  {
    key: "payments",
    title: "Payments (Receivables)",
    columns: [
      col("customer", "Customer", true, true),
      col("project", "Project"),
      col("projectStatus", "Project status"),
      col("value", "Value"),
      col("received", "Received"),
      col("balance", "Balance"),
      col("dueDate", "Due date"),
      col("overdue", "Overdue"),
      col("status", "Status"),
      col("action", "Action", true, true),
    ],
  },
  {
    key: "engineers",
    title: "Engineers",
    columns: [
      col("id", "ID", true, true),
      col("name", "Name", true, true),
      col("specialty", "Specialty"),
      col("status", "Status"),
      col("assignment", "Assignment"),
      col("nextAvailable", "Next available"),
      col("action", "Action", true, true),
    ],
  },
  {
    key: "labours",
    title: "Labours",
    columns: [
      col("id", "Labour ID", true, true),
      col("name", "Full name", true, true),
      col("phone", "Phone"),
      col("type", "Labour type"),
      col("wage", "Daily wage"),
      col("status", "Status"),
      col("action", "Actions", true, true),
    ],
  },
  {
    key: "tools",
    title: "Tools",
    columns: [
      col("id", "ID", true, true),
      col("name", "Tool name", true, true),
      col("category", "Category"),
      col("attachment", "Attachment"),
      col("qty", "Qty"),
      col("breakdown", "Breakdown"),
      col("condition", "Condition"),
      col("action", "Action", true, true),
    ],
  },
  {
    key: "materials",
    title: "Materials",
    columns: [
      col("id", "Material ID", true, true),
      col("name", "Material name", true, true),
      col("category", "Category"),
      col("stock", "Current stock / min"),
      col("supplier", "Supplier"),
      col("unitCost", "Unit cost"),
      col("totalValue", "Total value"),
      col("action", "Actions", true, true),
    ],
  },
];

export type PrintReport = {
  key: string;
  title: string;
  group: string;
  /** Column headers exactly as the export writes them. */
  columns: string[];
  /** Columns left out by default (until someone ticks them on this computer). */
  defaultOff?: string[];
};

/**
 * Every PDF / Excel export, so the Settings page can list their columns before anyone
 * has exported. If a page adds a column later it still shows in the "Choose columns" box
 * (ticked), even before it is added here.
 */
export const PRINT_REPORTS: PrintReport[] = [
  {
    key: "list.enquiries",
    title: "Enquiries",
    group: "List pages",
    columns: [
      "Enquiry ID",
      "Enquiry Date",
      "Customer Name",
      "Type",
      "GST",
      "Phone 1",
      "Phone 2",
      "Location",
      "Work Type",
      "Lead Source",
      "Referred By",
      "Engineer",
      "Site Visit Date",
      "Quotation Amount (INR)",
      "Start Date",
      "Started",
      "Decision",
      "Next Follow-up",
      "Follow-up Note",
      "Project ID",
      "Remarks",
    ],
    defaultOff: [
      "GST",
      "Phone 2",
      "Lead Source",
      "Referred By",
      "Engineer",
      "Site Visit Date",
      "Start Date",
      "Started",
      "Project ID",
      "Remarks",
    ],
  },
  {
    key: "list.projects",
    title: "Projects",
    group: "List pages",
    columns: [
      "Project ID",
      "Customer Name",
      "Phone",
      "Location",
      "Customer Type",
      "GST",
      "Work Type",
      "Engineer",
      "Scheduled Date",
      "Start Date",
      "Started",
      "Contract Value (INR)",
      "Discount (INR)",
      "Received (INR)",
      "Balance (INR)",
      "Payment Status",
      "Status",
    ],
    defaultOff: [
      "Customer Type",
      "GST",
      "Scheduled Date",
      "Start Date",
      "Started",
      "Discount (INR)",
    ],
  },
  {
    key: "list.customers",
    title: "Customers",
    group: "List pages",
    columns: [
      "S.No",
      "Customer Name",
      "Phone",
      "Location",
      "Type",
      "GST",
      "Enquiries",
      "Projects",
      "Ongoing",
      "Completed",
      "Contract Value (INR)",
      "Collected (INR)",
      "Pending (INR)",
      "Last Activity",
    ],
  },
  {
    key: "list.payments.receivables",
    title: "Payments - Receivables",
    group: "List pages",
    columns: [
      "Project ID",
      "Customer Name",
      "Phone",
      "Customer Type",
      "GST",
      "Project Status",
      "Value (INR)",
      "Received (INR)",
      "Balance (INR)",
      "Next Due Stage",
      "Due Date",
      "Days Overdue",
      "Payment Status",
      "Follow-up Tag",
    ],
  },
  {
    key: "list.payments.history",
    title: "Payments - Payment History",
    group: "List pages",
    columns: [
      "Payment ID",
      "Date",
      "Amount (INR)",
      "Mode",
      "Reference #",
      "Project ID",
      "Customer Name",
      "Stage",
      "Received By",
      "Remarks",
    ],
  },
  {
    key: "list.payments.customer",
    title: "Payments - Customer Ledger",
    group: "List pages",
    columns: [
      "Customer Name",
      "Phone",
      "Location",
      "Projects",
      "Contract Value (INR)",
      "Collected (INR)",
      "Outstanding (INR)",
      "Last Payment Date",
    ],
  },
  {
    key: "list.engineers",
    title: "Engineers",
    group: "List pages",
    columns: [
      "Engineer ID",
      "Name",
      "Phone",
      "Specialty",
      "Status",
      "Current Assignment",
      "Next Available",
    ],
  },
  {
    key: "list.labours",
    title: "Labours",
    group: "List pages",
    columns: [
      "Labour ID",
      "Name",
      "Phone",
      "Type",
      "Daily Wage (INR)",
      "Weekly Wage (INR)",
      "Status",
      "Active",
      "Skills",
      "Address",
    ],
  },
  {
    key: "list.tools",
    title: "Tools",
    group: "List pages",
    columns: [
      "Tool ID",
      "Tool Name",
      "Category",
      "Attachment",
      "Brand",
      "Total Stock",
      "Available",
      "Issued",
      "Under Repair",
      "Lost",
      "Unit",
      "Condition",
      "Remarks",
    ],
  },
  {
    key: "list.materials",
    title: "Materials",
    group: "List pages",
    columns: [
      "Material ID",
      "Name",
      "Category",
      "Unit",
      "Current Stock",
      "Minimum Stock",
      "Low Stock",
      "Supplier",
      "Cost per Unit (INR)",
      "Stock Value (INR)",
      "Remarks",
    ],
  },
  {
    key: "list.attendance",
    title: "Attendance & Wages",
    group: "List pages",
    columns: [
      "Labour ID",
      "Name",
      "Phone",
      "Type",
      "Period",
      "Present",
      "Half Day",
      "Absent",
      "Hours Worked",
      "Overtime (hrs)",
      "Daily Wage (INR)",
      "Earned (INR)",
    ],
  },
  {
    key: "list.notifications.collections",
    title: "Collection Reminders",
    group: "List pages",
    columns: [
      "Status",
      "Due Date",
      "Project ID",
      "Customer Name",
      "Phone",
      "Customer Type",
      "GST",
      "Stage",
      "Amount Due (INR)",
      "Project Balance (INR)",
    ],
  },
  {
    key: "list.notifications.followups",
    title: "Follow-up Reminders",
    group: "List pages",
    columns: [
      "Status",
      "Follow-up Date",
      "Enquiry ID",
      "Customer Name",
      "Phone",
      "Type",
      "GST",
      "Work Type",
      "Decision",
      "Follow-up Note",
    ],
  },
  {
    key: "reports.revenue.pdf",
    title: "Revenue & Billing (PDF)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Work Description",
      "Scheduled Date",
      "Contract Value (₹)",
      "Discount (₹)",
      "Net Payable (₹)",
      "Received (₹)",
      "Balance Due (₹)",
      "Status",
    ],
  },
  {
    key: "reports.revenue.excel",
    title: "Revenue & Billing (Excel)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Work Description",
      "Scheduled Date",
      "Contract Value (INR)",
      "Discount (INR)",
      "Net Payable (INR)",
      "Amount Received (INR)",
      "Balance Due (INR)",
      "Payment Status",
    ],
  },
  {
    key: "reports.projects.excel",
    title: "Projects (Excel)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Customer Type",
      "GST Status",
      "Work Description",
      "Lead Engineer",
      "Scheduled Date",
      "Location",
      "Contract Value (INR)",
      "Discount (INR)",
      "Net Payable (INR)",
      "Payment Status",
      "Project Status",
    ],
  },
  {
    key: "reports.pending.pdf",
    title: "Pending Collections (PDF)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Contact Phone",
      "Work Description",
      "Scheduled / Due Date",
      "Contract Value (₹)",
      "Discount (₹)",
      "Net Payable (₹)",
      "Received (₹)",
      "Outstanding Due (₹)",
      "Status",
    ],
  },
  {
    key: "reports.pending.excel",
    title: "Pending Collections (Excel)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Contact Phone",
      "Work Description",
      "Scheduled / Due Date",
      "Contract Value (INR)",
      "Discount (INR)",
      "Net Payable (INR)",
      "Amount Received (INR)",
      "Outstanding Due (INR)",
      "Payment Status",
    ],
  },
  {
    key: "reports.enquiries.pdf",
    title: "Enquiries & Quotations (PDF)",
    group: "Reports",
    columns: [
      "Enquiry ID",
      "Customer Name",
      "Type",
      "GST",
      "Phone",
      "Location",
      "Leakage / Need",
      "Engineer",
      "Quotation (INR)",
      "Site Visit Date",
      "Start Date",
      "Work Started",
      "Lead Source",
      "Referred By",
      "Decision",
    ],
    defaultOff: [
      "GST",
      "Site Visit Date",
      "Start Date",
      "Work Started",
      "Lead Source",
      "Referred By",
    ],
  },
  {
    key: "reports.enquiries.excel",
    title: "Enquiries & Quotations (Excel)",
    group: "Reports",
    columns: [
      "Enquiry ID",
      "Customer Name",
      "Customer Type",
      "GST",
      "Phone",
      "Location",
      "Leakage / Service Need",
      "Assigned Engineer",
      "Quotation Amount (INR)",
      "Site Visit Date",
      "Work Committed Date",
      "Actual Work Started Date",
      "Lead Source",
      "Referred By",
      "Customer Decision",
    ],
    defaultOff: [
      "GST",
      "Site Visit Date",
      "Work Committed Date",
      "Actual Work Started Date",
      "Lead Source",
      "Referred By",
    ],
  },
  {
    key: "reports.timesheet.excel",
    title: "Attendance Timesheet (Excel)",
    group: "Reports",
    columns: [
      "Date",
      "Labour ID",
      "Labour Name",
      "Project / Customer",
      "Location",
      "Work Description",
      "Check-in",
      "Check-out",
      "Hours Worked",
      "Earned Wage (INR)",
      "Attendance",
      "Verification",
    ],
  },
  {
    key: "reports.payrollSummary.excel",
    title: "Payroll Summary (Excel)",
    group: "Reports",
    columns: [
      "Labour ID",
      "Labour Name",
      "Labour Type",
      "Daily Wage (₹/day)",
      "Present Days",
      "Total Hours Worked",
      "Earned Payroll (INR)",
    ],
  },
  {
    key: "reports.weeklyPayroll.excel",
    title: "Weekly Payroll (Excel)",
    group: "Reports",
    columns: [
      "Labour ID",
      "Labour Name",
      "Employment Type",
      "Daily Wage (₹/day)",
      "Projects Worked",
      "Days Present",
      "Hours Worked",
      "Overtime Hours",
      "Overtime Pay (INR)",
      "Amount Payable (INR)",
    ],
  },
  {
    key: "reports.activity.pdf",
    title: "My Activity Log (PDF)",
    group: "Reports",
    columns: ["Date / Time", "Action (Event)", "Project", "Details", "Actor"],
  },
  {
    key: "reports.ledger.pdf",
    title: "Customer Ledger (PDF)",
    group: "Reports",
    columns: [
      "Customer ID",
      "Customer Name",
      "Contact Phone",
      "Location",
      "Projects",
      "Lifetime Value (INR)",
      "Cash Received (INR)",
      "Outstanding Due (INR)",
      "Status",
    ],
  },
  {
    key: "reports.ledger.excel",
    title: "Customer Ledger (Excel)",
    group: "Reports",
    columns: [
      "Customer ID",
      "Customer Name",
      "Contact Phone",
      "Location",
      "Projects Count",
      "Total Lifetime Value (INR)",
      "Total Cash Received (INR)",
      "Outstanding Due (INR)",
      "Status",
    ],
  },
  {
    key: "reports.workDone.excel",
    title: "Work Done entry (Excel)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Work Category",
      "Activity Date",
      "Lead Engineer",
      "Staff On Duty",
      "Work Done Description",
      "Hours Logged",
      "Location",
      "Status",
    ],
  },
  {
    key: "reports.clientStatement.excel",
    title: "Client Statement (Excel)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Work Description",
      "Scheduled Date",
      "Contract Value (INR)",
      "Amount Received (INR)",
      "Balance Due (INR)",
      "Payment Status",
    ],
  },
  {
    key: "reports.workHistory.pdf",
    title: "Project Work History (PDF)",
    group: "Reports",
    columns: [
      "Shift Date",
      "Staff On Duty",
      "Work Done Description",
      "In - Out Time",
      "Hours Logged",
      "Verification Status",
    ],
  },
  {
    key: "reports.workHistory.excel",
    title: "Project Work History (Excel)",
    group: "Reports",
    columns: [
      "Project ID",
      "Customer Name",
      "Work Category",
      "Shift Date",
      "Staff On Duty",
      "Work Done Description",
      "In Time",
      "Out Time",
      "Hours Worked",
      "Verification",
    ],
  },
];

// ---------------------------------------------------------------------------
// Storage (localStorage, this computer only)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "erp.columnPrefs.v1";
const CHANGE_EVENT = "erp-column-prefs-change";

type Prefs = {
  /** list[moduleKey][columnKey] = shown? Only columns someone changed are stored. */
  list: Record<string, Record<string, boolean>>;
  /** print[reportKey][header] = included? Only columns someone changed are stored. */
  print: Record<string, Record<string, boolean>>;
};

const EMPTY: Prefs = { list: {}, print: {} };
let cache: Prefs | null = null;

function readPrefs(): Prefs {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = {
      list: parsed && typeof parsed.list === "object" && parsed.list ? parsed.list : {},
      print: parsed && typeof parsed.print === "object" && parsed.print ? parsed.print : {},
    };
  } catch {
    // Unreadable or blocked storage: fall back to the defaults, never break the page.
    cache = { list: {}, print: {} };
  }
  return cache;
}

function writePrefs(next: Prefs) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode): the choice still applies until reload.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, readPrefs, () => EMPTY);
}

// ---------------------------------------------------------------------------
// List pages
// ---------------------------------------------------------------------------

export function getListModule(moduleKey: string) {
  return LIST_MODULES.find((m) => m.key === moduleKey);
}

function listVisible(prefs: Prefs, module: ListModule, c: ListColumn) {
  if (c.required) return true;
  const saved = prefs.list[module.key]?.[c.key];
  return typeof saved === "boolean" ? saved : c.defaultVisible;
}

export function setListColumnVisible(moduleKey: string, columnKey: string, visible: boolean) {
  const prefs = readPrefs();
  writePrefs({
    ...prefs,
    list: { ...prefs.list, [moduleKey]: { ...prefs.list[moduleKey], [columnKey]: visible } },
  });
}

export function resetListColumns(moduleKey: string) {
  const prefs = readPrefs();
  const list = { ...prefs.list };
  delete list[moduleKey];
  writePrefs({ ...prefs, list });
}

/** Which columns a list page shows at first, from the Settings page choice. */
export function useListColumns(moduleKey: string) {
  const prefs = usePrefs();
  const module = getListModule(moduleKey);
  const columns = module?.columns ?? [];
  const visible = new Set(
    columns.filter((c) => module && listVisible(prefs, module, c)).map((c) => c.key),
  );
  const hidden = columns.filter((c) => !visible.has(c.key));
  return {
    columns,
    /** True when the column shows in the table at first. Unknown keys always show. */
    isVisible: (key: string) => !columns.some((c) => c.key === key) || visible.has(key),
    hidden,
    visibleCount: visible.size,
  };
}

// ---------------------------------------------------------------------------
// Printouts / exports
// ---------------------------------------------------------------------------

export function getPrintReport(reportKey: string) {
  return PRINT_REPORTS.find((r) => r.key === reportKey);
}

export function isPrintColumnOn(reportKey: string, header: string, prefs: Prefs = readPrefs()) {
  const saved = prefs.print[reportKey]?.[header];
  if (typeof saved === "boolean") return saved;
  return !(getPrintReport(reportKey)?.defaultOff ?? []).includes(header);
}

/** Saves the ticked columns for a report. Untouched columns keep following the defaults. */
export function savePrintColumns(reportKey: string, headers: string[], selected: string[]) {
  const prefs = readPrefs();
  const chosen = new Set(selected);
  const entry: Record<string, boolean> = { ...prefs.print[reportKey] };
  for (const h of headers) entry[h] = chosen.has(h);
  writePrefs({ ...prefs, print: { ...prefs.print, [reportKey]: entry } });
}

export function setPrintColumn(reportKey: string, header: string, on: boolean) {
  const prefs = readPrefs();
  writePrefs({
    ...prefs,
    print: { ...prefs.print, [reportKey]: { ...prefs.print[reportKey], [header]: on } },
  });
}

export function resetPrintColumns(reportKey: string) {
  const prefs = readPrefs();
  const print = { ...prefs.print };
  delete print[reportKey];
  writePrefs({ ...prefs, print });
}

export function defaultPrintSelection(reportKey: string, headers: string[]) {
  const off = getPrintReport(reportKey)?.defaultOff ?? [];
  return headers.filter((h) => !off.includes(h));
}

/** Reactive version for the Settings page. */
export function usePrintColumns(reportKey: string) {
  const prefs = usePrefs();
  return (header: string) => isPrintColumnOn(reportKey, header, prefs);
}
