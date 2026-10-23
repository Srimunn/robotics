import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { Customer, Enquiry, Project } from "@/lib/robotics-types";
import { ExportButtons } from "@/components/export-buttons";
import { CustomerTypeBadge, GstBadge, typeLabel, gstLabel } from "@/components/customer-type-toggle";
import { DataPagination } from "@/components/ui/DataPagination";
import {
  Users,
  Search,
  Phone,
  MapPin,
  FolderKanban,
  CheckCircle2,
  Clock,
  TrendingUp,
  Coins,
  ChevronRight,
  Building2,
  FileText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/customers")({
  component: CustomersComponent,
});

const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, " ");

type SortKey = "name" | "enquiries" | "projects" | "value" | "collected" | "pending" | "lastActivity";

interface CustomerRow {
  customer: Customer;
  type?: "B2B" | "B2C";
  gst?: boolean;
  enquiryCount: number;
  projectCount: number;
  ongoingCount: number;
  completedCount: number;
  value: number;
  collected: number;
  pending: number;
  lastActivity: string;
}

function CustomersComponent() {
  const { customers, projects, enquiries, payments } = useRobotics();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quickFilter, setQuickFilter] = useState<"ALL" | "PENDING" | "B2B" | "B2C" | "GST" | "NON_GST">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // One row per customer with totals; built once per data change.
  const rows = useMemo<CustomerRow[]>(() => {
    const projByName = new Map<string, Project[]>();
    for (const p of projects) {
      const k = normalizeName(p.customerName || "");
      if (!projByName.has(k)) projByName.set(k, []);
      projByName.get(k)!.push(p);
    }
    const enqByName = new Map<string, Enquiry[]>();
    for (const e of enquiries) {
      const k = normalizeName(e.customerName || "");
      if (!enqByName.has(k)) enqByName.set(k, []);
      enqByName.get(k)!.push(e);
    }
    return customers.map((c) => {
      const k = normalizeName(c.name);
      const custProjects = projByName.get(k) || [];
      const custEnquiries = enqByName.get(k) || [];
      const value = custProjects.reduce((s, p) => s + (Number(p.projectValue) || 0), 0);
      const collected = custProjects.reduce((s, p) => s + (Number(p.receivedAmount) || 0), 0);
      const dates = [
        ...custEnquiries.map((e) => e.enquiryDate || ""),
        ...custProjects.map((p) => (p.createdAt || p.scheduledDate || "").slice(0, 10)),
      ].filter(Boolean);
      // B2B/B2C and GST are independent. Each comes from the most recent record that has it set
      // (projects first, since a project's values are the ones being billed).
      const byNewest = <T extends { createdAt?: string }>(list: T[]) =>
        [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      const type =
        byNewest(custProjects).find((p) => p.customerType)?.customerType ??
        byNewest(custEnquiries).find((e) => e.customerType)?.customerType;
      const latestProject = byNewest(custProjects)[0];
      const gst = latestProject
        ? Boolean(latestProject.isGST)
        : byNewest(custEnquiries).find((e) => e.isGST !== undefined)?.isGST;
      return {
        customer: c,
        type,
        gst,
        enquiryCount: custEnquiries.length,
        projectCount: custProjects.length,
        ongoingCount: custProjects.filter((p) => p.status === "Ongoing").length,
        completedCount: custProjects.filter((p) => p.status === "Completed" || p.status === "Closed").length,
        value,
        collected,
        pending: Math.max(0, value - collected),
        lastActivity: dates.sort().at(-1) || "",
      };
    });
  }, [customers, projects, enquiries]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = rows.filter((r) => {
      const c = r.customer;
      const matchesSearch =
        !q || c.name.toLowerCase().includes(q) || c.phone.includes(searchQuery) || c.location.toLowerCase().includes(q);
      const matchesQuick =
        quickFilter === "ALL" ||
        (quickFilter === "PENDING"
          ? r.pending > 0
          : quickFilter === "GST"
            ? r.gst === true
            : quickFilter === "NON_GST"
              ? r.gst === false
              : r.type === quickFilter);
      return matchesSearch && matchesQuick;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (r: CustomerRow): string | number =>
      sortKey === "name" ? r.customer.name.toLowerCase()
      : sortKey === "enquiries" ? r.enquiryCount
      : sortKey === "projects" ? r.projectCount
      : sortKey === "value" ? r.value
      : sortKey === "collected" ? r.collected
      : sortKey === "pending" ? r.pending
      : r.lastActivity;
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [rows, searchQuery, quickFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={`p-3 whitespace-nowrap ${className || ""}`}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase font-bold hover:text-foreground">
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );

  const exportRows = () =>
    filteredRows.map((r, i) => ({
      "S.No": i + 1,
      "Customer Name": r.customer.name,
      Phone: r.customer.phone,
      Location: r.customer.location,
      Type: typeLabel(r.type),
      GST: gstLabel(r.gst),
      Enquiries: r.enquiryCount,
      Projects: r.projectCount,
      Ongoing: r.ongoingCount,
      Completed: r.completedCount,
      "Contract Value (INR)": r.value,
      "Collected (INR)": r.collected,
      "Pending (INR)": r.pending,
      "Last Activity": r.lastActivity,
    }));

  const quickLabels: Record<typeof quickFilter, string> = {
    ALL: "All",
    PENDING: "Has pending amount",
    B2B: "B2B",
    B2C: "B2C",
    GST: "GST",
    NON_GST: "Non-GST",
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs rounded-lg h-9"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filter:</span>
          {(Object.keys(quickLabels) as (typeof quickFilter)[]).map((f) => (
            <Button
              key={f}
              variant={quickFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setQuickFilter(f);
                setCurrentPage(1);
              }}
              className={`h-8 text-xs rounded-lg whitespace-nowrap ${quickFilter === f ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
            >
              {quickLabels[f]}
            </Button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card overflow-hidden">
        <CardHeader className="p-4 border-b flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Customers ({filteredRows.length})</CardTitle>
          <ExportButtons
            rows={exportRows}
            filename="Customers"
            title="Customers"
            subtitle={[quickFilter !== "ALL" ? `Filter: ${quickLabels[quickFilter]}` : "", searchQuery ? `Search: "${searchQuery}"` : ""].filter(Boolean).join(" • ")}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[350px]">
            <table className="w-full text-left text-xs border-separate border-spacing-0" data-testid="customers-table">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 text-muted-foreground text-[11px] font-bold uppercase tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:bg-slate-50 [&_th]:dark:bg-slate-900 [&_th]:z-10 [&_th]:border-b [&_th]:border-slate-200 [&_th]:dark:border-slate-800 shadow-2xs">
                <tr>
                  <th className="p-3 pl-4 whitespace-nowrap hidden sm:table-cell">S.NO</th>
                  <SortHeader k="name" label="Customer" className="min-w-[160px] left-0 !z-20" />
                  <th className="p-3 whitespace-nowrap">PHONE</th>
                  <th className="p-3 whitespace-nowrap">LOCATION</th>
                  <th className="p-3 whitespace-nowrap">TYPE</th>
                  <th className="p-3 whitespace-nowrap">GST</th>
                  <SortHeader k="enquiries" label="Enquiries" />
                  <SortHeader k="projects" label="Projects" />
                  <SortHeader k="value" label="Contract Value" className="text-right" />
                  <SortHeader k="collected" label="Collected" className="text-right" />
                  <SortHeader k="pending" label="Pending" className="text-right" />
                  <SortHeader k="lastActivity" label="Last Activity" className="pr-4" />
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                          <Users className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">No customer records found.</p>
                          <p className="text-xs text-muted-foreground">Customers are auto-registered when creating enquiries and project bookings.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr
                      key={r.customer.id}
                      onClick={() => setSelectedCustomer(r.customer)}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      <td className="p-3 pl-4 text-muted-foreground hidden sm:table-cell">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td className="p-3 font-bold text-foreground sticky left-0 z-[1] bg-white dark:bg-card group-hover:bg-slate-50 dark:group-hover:bg-slate-900">
                        <span className="truncate block max-w-[220px]" title={r.customer.name}>{r.customer.name}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono">{r.customer.phone}</td>
                      <td className="p-3 whitespace-nowrap truncate max-w-[160px]" title={r.customer.location}>{r.customer.location}</td>
                      <td className="p-3 whitespace-nowrap"><CustomerTypeBadge value={r.type} /></td>
                      <td className="p-3 whitespace-nowrap"><GstBadge value={r.gst} /></td>
                      <td className="p-3 whitespace-nowrap text-center">{r.enquiryCount}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold">{r.projectCount}</span>
                        {r.projectCount > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({r.ongoingCount} ongoing, {r.completedCount} done)
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-right font-semibold">₹{r.value.toLocaleString("en-IN")}</td>
                      <td className="p-3 whitespace-nowrap text-right font-semibold text-emerald-600">₹{r.collected.toLocaleString("en-IN")}</td>
                      <td className={`p-3 whitespace-nowrap text-right font-bold ${r.pending > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                        ₹{r.pending.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 pr-4 whitespace-nowrap font-mono">{r.lastActivity || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-3xl rounded-xl border shadow-xl max-h-[85vh] overflow-y-auto p-6">
            {(() => {
              const custProjects = projects.filter(
                (p) => normalizeName(p.customerName) === normalizeName(selectedCustomer.name)
              );
              const custEnquiries = enquiries.filter(
                (e) => normalizeName(e.customerName) === normalizeName(selectedCustomer.name)
              );
              const custPayments = payments.filter((pay) =>
                custProjects.some((p) => p.id === pay.projectId)
              );

              const totalVal = custProjects.reduce((s, p) => s + p.projectValue, 0);
              const totalRec = custProjects.reduce((s, p) => s + p.receivedAmount, 0);
              const totalBal = Math.max(0, totalVal - totalRec);

              return (
                <div className="space-y-6">
                  <DialogHeader className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <DialogTitle className="text-xl font-bold text-foreground">
                          {selectedCustomer.name}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedCustomer.phone} • {selectedCustomer.location}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {selectedCustomer.id}
                      </Badge>
                    </div>
                  </DialogHeader>

                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-900">Total Lifetime Value</span>
                      <p className="text-lg font-extrabold text-blue-700 mt-1">₹{totalVal.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-900">Total Collected</span>
                      <p className="text-lg font-extrabold text-emerald-700 mt-1">₹{totalRec.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                      <span className="text-[10px] uppercase font-bold text-rose-900">Outstanding Due</span>
                      <p className="text-lg font-extrabold text-rose-700 mt-1">₹{totalBal.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Projects History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Projects History ({custProjects.length})
                    </h4>
                    <div className="border rounded-lg overflow-auto max-h-64">
                      <table className="w-full text-left text-xs border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-muted-foreground text-[11px] font-bold uppercase tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:bg-slate-100 [&_th]:dark:bg-slate-800 [&_th]:z-10 [&_th]:border-b [&_th]:border-slate-200 [&_th]:dark:border-slate-700 shadow-2xs">
                          <tr>
                            <th className="p-2.5 pl-3">Project ID</th>
                            <th className="p-2.5">Nature of Work</th>
                            <th className="p-2.5">Contract Value</th>
                            <th className="p-2.5">Balance</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800">
                          {custProjects.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                No projects recorded for this customer.
                              </td>
                            </tr>
                          ) : (
                            custProjects.map((p) => (
                              <tr key={p.id} className="hover:bg-accent/40">
                                <td className="p-2.5 pl-3 font-bold text-blue-600">
                                  <Link
                                    to="/projects"
                                    search={{ openId: p.id }}
                                    className="hover:underline text-blue-600 hover:text-blue-700"
                                  >
                                    {p.id}
                                  </Link>
                                </td>
                                <td className="p-2.5 font-medium">{p.natureOfWork}</td>
                                <td className="p-2.5">₹{p.projectValue.toLocaleString("en-IN")}</td>
                                <td className="p-2.5 font-bold text-rose-600">₹{p.balanceAmount.toLocaleString("en-IN")}</td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {p.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Enquiries History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Enquiries & Quotations History ({custEnquiries.length})
                    </h4>
                    <div className="border rounded-lg overflow-auto max-h-64">
                      <table className="w-full text-left text-xs border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-muted-foreground text-[11px] font-bold uppercase tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:bg-slate-100 [&_th]:dark:bg-slate-800 [&_th]:z-10 [&_th]:border-b [&_th]:border-slate-200 [&_th]:dark:border-slate-700 shadow-2xs">
                          <tr>
                            <th className="p-2.5 pl-3">Enquiry ID</th>
                            <th className="p-2.5">Service / Leakage Type</th>
                            <th className="p-2.5">Quotation Amount</th>
                            <th className="p-2.5">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800">
                          {custEnquiries.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                No enquiries logged for this customer.
                              </td>
                            </tr>
                          ) : (
                            custEnquiries.map((e) => (
                              <tr key={e.id} className="hover:bg-accent/40">
                                <td className="p-2.5 pl-3 font-bold text-blue-600">{e.id}</td>
                                <td className="p-2.5 font-medium">{e.leakageType}</td>
                                <td className="p-2.5">₹{(e.quotationAmount || 0).toLocaleString("en-IN")}</td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {e.customerDecision}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Transactions Ledger */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Transactions Ledger ({custPayments.length})
                    </h4>
                    <div className="border rounded-lg overflow-auto max-h-64">
                      <table className="w-full text-left text-xs border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-muted-foreground text-[11px] font-bold uppercase tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:bg-slate-100 [&_th]:dark:bg-slate-800 [&_th]:z-10 [&_th]:border-b [&_th]:border-slate-200 [&_th]:dark:border-slate-700 shadow-2xs">
                          <tr>
                            <th className="p-2.5 pl-3">Date</th>
                            <th className="p-2.5">Project ID</th>
                            <th className="p-2.5">Mode</th>
                            <th className="p-2.5">Reference #</th>
                            <th className="p-2.5 text-right pr-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800">
                          {custPayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                No payments recorded yet.
                              </td>
                            </tr>
                          ) : (
                            custPayments.map((pay) => (
                              <tr key={pay.id} className="hover:bg-accent/40">
                                <td className="p-2.5 pl-3 font-medium">{pay.paymentDate}</td>
                                <td className="p-2.5 font-semibold text-blue-600">
                                  <Link
                                    to="/projects"
                                    search={{ openId: pay.projectId }}
                                    className="hover:underline text-blue-600 hover:text-blue-700"
                                  >
                                    {pay.projectId}
                                  </Link>
                                </td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {pay.mode}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-mono">{pay.referenceNumber}</td>
                                <td className="p-2.5 text-right pr-3 font-bold text-emerald-600">
                                  ₹{pay.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
