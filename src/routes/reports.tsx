import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  FolderKanban,
  Coins,
  TrendingUp,
  Calendar,
  Wrench,
  Users,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  component: ReportsComponent,
});

function ReportsComponent() {
  const { enquiries, projects, payments, labours, attendance, customers } = useRobotics();

  const [activeReport, setActiveReport] = useState<
    "REVENUE" | "PROJECTS" | "PENDING" | "ENQUIRIES" | "ATTENDANCE" | "NATURE" | "CUSTOMER" | "REFERRALS"
  >("REVENUE");

  // Export CSV Helper
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${x}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}.csv successfully!`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Automated Reports Engine</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Live Real-Time
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Zero manual aggregation. All metrics generated instantly from business operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPDF}
            className="text-xs gap-1 rounded-lg"
          >
            <Printer className="h-4 w-4" /> Export PDF / Print
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (activeReport === "REVENUE") {
                handleExportCSV(
                  "Revenue_Report",
                  ["Project ID", "Customer", "Contract Value", "Received", "Balance", "Payment Status"],
                  projects.map((p) => [
                    p.id,
                    p.customerName,
                    p.projectValue,
                    p.receivedAmount,
                    p.balanceAmount,
                    p.paymentStatus,
                  ])
                );
              } else if (activeReport === "PROJECTS") {
                handleExportCSV(
                  "Projects_Report",
                  ["Project ID", "Customer", "Nature of Work", "Scheduled Date", "Status"],
                  projects.map((p) => [p.id, p.customerName, p.natureOfWork, p.scheduledDate, p.status])
                );
              } else if (activeReport === "ENQUIRIES") {
                handleExportCSV(
                  "Enquiries_Report",
                  ["Enquiry ID", "Customer", "Leakage Type", "Quotation Amount", "Decision"],
                  enquiries.map((e) => [e.id, e.customerName, e.leakageType, e.quotationAmount || 0, e.customerDecision])
                );
              } else {
                handleExportCSV(
                  "General_Report",
                  ["ID", "Customer", "Value"],
                  projects.map((p) => [p.id, p.customerName, p.projectValue])
                );
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel (CSV)
          </Button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white dark:bg-card p-3 rounded-xl border border-border shadow-xs">
        {[
          { id: "REVENUE", label: "Revenue Report", icon: TrendingUp },
          { id: "PROJECTS", label: "Projects Report", icon: FolderKanban },
          { id: "PENDING", label: "Pending Collections", icon: Coins },
          { id: "ENQUIRIES", label: "Enquiries & Quotations", icon: FileText },
          { id: "ATTENDANCE", label: "Attendance & Payroll", icon: Calendar },
          { id: "NATURE", label: "Nature of Work", icon: Wrench },
          { id: "CUSTOMER", label: "Customer Ledger", icon: Users },
          { id: "REFERRALS", label: "Referral Tracking & Analytics", icon: BarChart3 },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeReport === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveReport(tab.id as any)}
            className={`text-xs rounded-lg gap-1.5 whitespace-nowrap ${
              activeReport === tab.id ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </Button>
        ))}
      </div>

      {/* 1. REVENUE REPORT */}
      {activeReport === "REVENUE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Total Revenue & Billing Summary</CardTitle>
            <CardDescription className="text-xs">Contract values, cash received and balance due</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Project ID</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Contract Value</th>
                    <th className="p-3">Amount Received</th>
                    <th className="p-3">Balance Amount</th>
                    <th className="p-3 text-right pr-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No revenue or billing records available.
                      </td>
                    </tr>
                  ) : (
                    projects.map((p) => (
                      <tr key={p.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-blue-600">{p.id}</td>
                        <td className="p-3 font-semibold text-foreground">{p.customerName}</td>
                        <td className="p-3 font-bold text-foreground">₹{p.projectValue.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-emerald-600">₹{p.receivedAmount.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-rose-600">₹{p.balanceAmount.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right pr-4">
                          <Badge
                            className={`text-[10px] ${
                              p.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.paymentStatus === "Partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {p.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. PROJECTS REPORT */}
      {activeReport === "PROJECTS" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Project Deployment Status Report</CardTitle>
            <CardDescription className="text-xs">Execution status across engineering projects</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Project ID</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Nature of Work</th>
                    <th className="p-3">Lead Engineer</th>
                    <th className="p-3">Scheduled Date</th>
                    <th className="p-3 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No project deployment records available.
                      </td>
                    </tr>
                  ) : (
                    projects.map((p) => (
                      <tr key={p.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-blue-600">{p.id}</td>
                        <td className="p-3 font-semibold text-foreground">{p.customerName}</td>
                        <td className="p-3 font-medium text-foreground">{p.natureOfWork}</td>
                        <td className="p-3 font-semibold text-purple-700">{p.assignedEngineerName || "Er. Rajesh Kumar"}</td>
                        <td className="p-3 text-muted-foreground">{p.scheduledDate}</td>
                        <td className="p-3 text-right pr-4">
                          <Badge
                            className={`text-[10px] ${
                              p.status === "Ongoing"
                                ? "bg-amber-100 text-amber-800"
                                : p.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. PENDING COLLECTIONS */}
      {activeReport === "PENDING" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold text-rose-600">Pending Receivables & Aging Report</CardTitle>
            <CardDescription className="text-xs">Outstanding payment balances per customer project</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Project ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Contact Phone</th>
                    <th className="p-3">Contract Value</th>
                    <th className="p-3">Received Amount</th>
                    <th className="p-3 text-right pr-4 font-bold text-rose-600">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.filter((p) => p.balanceAmount > 0).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No pending collection balances found.
                      </td>
                    </tr>
                  ) : (
                    projects
                      .filter((p) => p.balanceAmount > 0)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-accent/40">
                          <td className="p-3 pl-4 font-bold text-blue-600">{p.id}</td>
                          <td className="p-3 font-semibold text-foreground">{p.customerName}</td>
                          <td className="p-3 text-muted-foreground font-mono">📞 {p.phone}</td>
                          <td className="p-3">₹{p.projectValue.toLocaleString("en-IN")}</td>
                          <td className="p-3 font-bold text-emerald-600">₹{p.receivedAmount.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right pr-4 font-extrabold text-rose-600 text-sm">
                            ₹{p.balanceAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. ENQUIRIES REPORT */}
      {activeReport === "ENQUIRIES" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Customer Enquiries & Quotations Funnel</CardTitle>
            <CardDescription className="text-xs">Enquiry status and customer conversion tracking</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Enquiry #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Leakage / Service Need</th>
                    <th className="p-3">Quotation Amount</th>
                    <th className="p-3">Lead Source</th>
                    <th className="p-3 text-right pr-4">Customer Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {enquiries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No customer enquiry records available.
                      </td>
                    </tr>
                  ) : (
                    enquiries.map((e) => (
                      <tr key={e.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-blue-600">{e.id}</td>
                        <td className="p-3 font-semibold text-foreground">{e.customerName}</td>
                        <td className="p-3 text-muted-foreground">{e.leakageType}</td>
                        <td className="p-3 font-bold text-foreground">₹{(e.quotationAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="p-3 text-muted-foreground">{e.leadSource}</td>
                        <td className="p-3 text-right pr-4">
                          <Badge
                            className={`text-[10px] ${
                              e.customerDecision === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : e.customerDecision === "Cancelled"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {e.customerDecision}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. ATTENDANCE REPORT */}
      {activeReport === "ATTENDANCE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Workforce Attendance & Weekly Wage Payroll Report</CardTitle>
            <CardDescription className="text-xs">July 2026 Monthly Attendance & Weekly Wage disbursements</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Labour Name</th>
                    <th className="p-3">Labour Type</th>
                    <th className="p-3">Weekly Wage Rate</th>
                    <th className="p-3 text-center">Present Days</th>
                    <th className="p-3 text-center">Absent Days</th>
                    <th className="p-3 text-right pr-4 font-bold">Estimated Monthly Payroll</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {labours.map((l) => {
                    let presentCount = 0;
                    let absentCount = 0;
                    for (let d = 1; d <= 28; d++) {
                      const dayStr = d < 10 ? `0${d}` : `${d}`;
                      const rec = attendance[`${l.id}_2026-07-${dayStr}`];
                      if (rec?.status === "Present") presentCount++;
                      else if (rec?.status === "Absent") absentCount++;
                    }
                    const weeklyRate = l.defaultWeeklyWage || 1400;
                    const weeksWorked = Math.ceil(presentCount / 6);
                    const estimatedPay = weeksWorked * weeklyRate;

                    return (
                      <tr key={l.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-foreground">{l.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {l.type}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-purple-700">₹{weeklyRate}/wk</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{presentCount} days</td>
                        <td className="p-3 text-center font-bold text-rose-600">{absentCount} days</td>
                        <td className="p-3 text-right pr-4 font-extrabold text-blue-700 text-sm">
                          ₹{estimatedPay.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. NATURE OF WORK REPORT */}
      {activeReport === "NATURE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Nature of Work Service Distribution</CardTitle>
            <CardDescription className="text-xs">Category Breakdown of Revenue and Volume</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Service Category</th>
                    <th className="p-3">Total Projects</th>
                    <th className="p-3 text-right pr-4">Combined Contract Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(
                    projects.reduce((acc, p) => {
                      if (!acc[p.natureOfWork]) acc[p.natureOfWork] = { count: 0, val: 0 };
                      acc[p.natureOfWork].count += 1;
                      acc[p.natureOfWork].val += p.projectValue;
                      return acc;
                    }, {} as Record<string, { count: number; val: number }>)
                  ).map(([cat, info]) => (
                    <tr key={cat} className="hover:bg-accent/40">
                      <td className="p-3 pl-4 font-bold text-foreground">{cat}</td>
                      <td className="p-3 font-semibold text-blue-600">{info.count} Projects</td>
                      <td className="p-3 text-right pr-4 font-extrabold text-emerald-700 text-sm">
                        ₹{info.val.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. CUSTOMER LEDGER REPORT */}
      {activeReport === "CUSTOMER" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Customer Account Ledger</CardTitle>
            <CardDescription className="text-xs">Client contract lifetime values & balances</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Customer Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Total Lifetime Value</th>
                    <th className="p-3 text-right pr-4">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => {
                    const cProjs = projects.filter(
                      (p) => p.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
                    );
                    const totalVal = cProjs.reduce((s, p) => s + p.projectValue, 0);
                    const totalRec = cProjs.reduce((s, p) => s + p.receivedAmount, 0);
                    const bal = Math.max(0, totalVal - totalRec);

                    return (
                      <tr key={c.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-foreground">{c.name}</td>
                        <td className="p-3 text-muted-foreground">📞 {c.phone}</td>
                        <td className="p-3 text-muted-foreground">📍 {c.location}</td>
                        <td className="p-3 font-bold text-foreground">₹{totalVal.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right pr-4 font-extrabold text-rose-600">
                          ₹{bal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. REFERRAL TRACKING & LEAD SOURCE ANALYTICS */}
      {activeReport === "REFERRALS" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Enquiries</span>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">{enquiries.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold tracking-wider">Referred Enquiries</span>
                <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                  {enquiries.filter((e) => Boolean(e.referredBy)).length}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider font-bold">Referral Conversion Rate</span>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {(() => {
                    const referredEnqs = enquiries.filter((e) => Boolean(e.referredBy));
                    if (referredEnqs.length === 0) return "0%";
                    const converted = referredEnqs.filter((e) => projects.some((p) => p.enquiryId === e.id)).length;
                    return `${Math.round((converted / referredEnqs.length) * 100)}%`;
                  })()}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider font-bold">Referral Generated Revenue</span>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                  ₹{projects.filter((p) => Boolean(p.referredBy)).reduce((s, p) => s + p.projectValue, 0).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Table 1: Lead Source Analytics */}
          <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold">Enquiries & Conversion by Lead Source</CardTitle>
              <CardDescription className="text-xs">Performance breakdown across acquisition channels</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                    <tr>
                      <th className="p-3 pl-4">Lead Source</th>
                      <th className="p-3 text-center">Total Enquiries</th>
                      <th className="p-3 text-center">Converted Projects</th>
                      <th className="p-3 text-center">Conversion Rate %</th>
                      <th className="p-3 text-right pr-4">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const sources = Array.from(new Set(enquiries.map((e) => e.leadSource || "Phone Call")));
                      if (sources.length === 0) return (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No lead source analytics data yet.</td></tr>
                      );

                      return sources.map((src) => {
                        const srcEnqs = enquiries.filter((e) => e.leadSource === src);
                        const srcProjs = projects.filter((p) => p.leadSource === src || srcEnqs.some((e) => e.id === p.enquiryId));
                        const convRate = srcEnqs.length > 0 ? Math.round((srcProjs.length / srcEnqs.length) * 100) : 0;
                        const rev = srcProjs.reduce((s, p) => s + p.projectValue, 0);

                        return (
                          <tr key={src} className="hover:bg-accent/40">
                            <td className="p-3 pl-4 font-bold text-foreground">{src}</td>
                            <td className="p-3 text-center font-semibold text-blue-600">{srcEnqs.length}</td>
                            <td className="p-3 text-center font-semibold text-emerald-600">{srcProjs.length}</td>
                            <td className="p-3 text-center font-bold text-foreground">{convRate}%</td>
                            <td className="p-3 text-right pr-4 font-extrabold text-foreground">₹{rev.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Table 2: Top Referral Persons & References */}
          <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold">Top Referral Sources & Reference Persons</CardTitle>
              <CardDescription className="text-xs">Tracking specific persons and clients referring business</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                    <tr>
                      <th className="p-3 pl-4">Referred By / Reference Person</th>
                      <th className="p-3 text-center">Enquiries Referred</th>
                      <th className="p-3 text-center">Projects Converted</th>
                      <th className="p-3 text-right pr-4">Total Contract Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const refNames = Array.from(new Set(enquiries.map((e) => e.referredBy).filter(Boolean))) as string[];
                      if (refNames.length === 0) return (
                        <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No referral tracking data logged yet. Create an enquiry with a reference person.</td></tr>
                      );

                      return refNames.map((ref) => {
                        const refEnqs = enquiries.filter((e) => e.referredBy === ref);
                        const refProjs = projects.filter((p) => p.referredBy === ref || refEnqs.some((e) => e.id === p.enquiryId));
                        const rev = refProjs.reduce((s, p) => s + p.projectValue, 0);

                        return (
                          <tr key={ref} className="hover:bg-accent/40">
                            <td className="p-3 pl-4 font-bold text-purple-700 dark:text-purple-400">👤 {ref}</td>
                            <td className="p-3 text-center font-semibold text-blue-600">{refEnqs.length}</td>
                            <td className="p-3 text-center font-semibold text-emerald-600">{refProjs.length}</td>
                            <td className="p-3 text-right pr-4 font-extrabold text-foreground">₹{rev.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
