import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useRobotics } from "@/lib/robotics-context";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  FolderKanban,
  Coins,
  DollarSign,
  TrendingUp,
  Calendar,
  Wrench,
  Users,
  Filter,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  MapPin,
  ExternalLink,
  Camera,
  Activity,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  generateProjectsReport,
  generateAttendanceReport,
  generatePayrollReport,
  generatePayrollPdfReport,
  type PayrollReportResult,
} from "~/server/reports";

export const Route = createFileRoute("/reports")({
  component: ReportsComponent,
});

function ReportsComponent() {
  const { enquiries, projects, payments, labours, attendance, customers, machines, machineIssues, currentUser } = useRobotics();

  const [activeReport, setActiveReport] = useState<
    "REVENUE" | "PROJECTS" | "PENDING" | "ENQUIRIES" | "ATTENDANCE" | "PAYROLL" | "NATURE" | "CUSTOMER" | "REFERRALS"
  >("REVENUE");

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Payroll Report state
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [payrollStartDate, setPayrollStartDate] = useState(sevenDaysAgoStr);
  const [payrollEndDate, setPayrollEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [payrollSearchQuery, setPayrollSearchQuery] = useState("");
  const [payrollTypeFilter, setPayrollTypeFilter] = useState<"ALL" | "Permanent" | "Contract">("ALL");
  const [payrollData, setPayrollData] = useState<PayrollReportResult | null>(null);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [isGeneratingPayrollPdf, setIsGeneratingPayrollPdf] = useState(false);

  useEffect(() => {
    if (activeReport === "PAYROLL") {
      setIsLoadingPayroll(true);
      generatePayrollReport({ data: { startDate: payrollStartDate, endDate: payrollEndDate } })
        .then((res) => {
          setPayrollData(res);
        })
        .catch((err) => {
          console.error("Failed to load payroll report:", err);
          toast.error("Failed to load payroll data");
        })
        .finally(() => {
          setIsLoadingPayroll(false);
        });
    }
  }, [activeReport, payrollStartDate, payrollEndDate]);

  const handleDownloadPayrollPdf = async () => {
    try {
      setIsGeneratingPayrollPdf(true);
      const res = await generatePayrollPdfReport({
        data: { startDate: payrollStartDate, endDate: payrollEndDate },
      });
      downloadPdfBlob(res.base64, res.filename);
      toast.success("Downloaded Payroll Report PDF");
    } catch (err: any) {
      console.error("Failed to generate payroll PDF:", err);
      toast.error(err?.message || "Failed to generate payroll PDF");
    } finally {
      setIsGeneratingPayrollPdf(false);
    }
  };

  const filteredPayrollItems = useMemo(() => {
    if (!payrollData?.items) return [];
    return payrollData.items.filter((item) => {
      if (payrollTypeFilter !== "ALL" && item.labourType !== payrollTypeFilter) return false;
      if (payrollSearchQuery.trim()) {
        const q = payrollSearchQuery.toLowerCase().trim();
        const matchName = item.labourName.toLowerCase().includes(q);
        const matchId = item.labourId.toLowerCase().includes(q);
        const matchProjects = item.distinctProjects.some((p) => p.toLowerCase().includes(q));
        if (!matchName && !matchId && !matchProjects) return false;
      }
      return true;
    });
  }, [payrollData, payrollTypeFilter, payrollSearchQuery]);

  const payrollFilteredTotals = useMemo(() => {
    const totalPayable = filteredPayrollItems.reduce((acc, i) => acc + i.totalEarned, 0);
    const totalDays = filteredPayrollItems.reduce((acc, i) => acc + i.daysPresent, 0);
    const totalHours = filteredPayrollItems.reduce((acc, i) => acc + i.totalHours, 0);
    return {
      totalPayable,
      totalDays,
      totalHours: Number(totalHours.toFixed(1)),
      count: filteredPayrollItems.length,
    };
  }, [filteredPayrollItems]);

  const downloadPdfBlob = (base64: string, filename: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const todayStr = new Date().toISOString().slice(0, 10);
  const [myActivityStartDate, setMyActivityStartDate] = useState(todayStr);
  const [myActivityEndDate, setMyActivityEndDate] = useState(todayStr);
  const [myActivityActorFilter, setMyActivityActorFilter] = useState("CURRENT_USER");
  const [myActivitySearchQuery, setMyActivitySearchQuery] = useState("");

  const allActivities = useMemo(() => {
    const list: {
      id: string;
      timestamp: string;
      date: string;
      event: string;
      actor: string;
      details: string;
      projectId?: string;
      customerName?: string;
    }[] = [];

    (projects || []).forEach((p) => {
      (p.activities || []).forEach((a) => {
        list.push({
          id: a.id,
          timestamp: a.timestamp,
          date: a.timestamp.slice(0, 10),
          event: a.event,
          actor: a.actor,
          details: a.details,
          projectId: p.id,
          customerName: p.customerName,
        });
      });
    });

    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [projects]);

  const currentUserName = currentUser?.name || "CEO Executive";

  const filteredMyActivities = useMemo(() => {
    return allActivities.filter((act) => {
      if (myActivityActorFilter === "CURRENT_USER") {
        const actActor = act.actor.toLowerCase().trim();
        const currName = currentUserName.toLowerCase().trim();
        if (actActor !== currName && !currName.includes(actActor) && !actActor.includes(currName)) {
          return false;
        }
      } else if (myActivityActorFilter !== "ALL") {
        if (act.actor.toLowerCase() !== myActivityActorFilter.toLowerCase()) return false;
      }

      if (myActivityStartDate && act.date < myActivityStartDate) return false;
      if (myActivityEndDate && act.date > myActivityEndDate) return false;

      if (myActivitySearchQuery.trim()) {
        const q = myActivitySearchQuery.toLowerCase().trim();
        const matchEvent = act.event.toLowerCase().includes(q);
        const matchDetails = act.details.toLowerCase().includes(q);
        const matchProj = act.projectId ? act.projectId.toLowerCase().includes(q) : false;
        const matchCust = act.customerName ? act.customerName.toLowerCase().includes(q) : false;
        const matchActor = act.actor.toLowerCase().includes(q);
        if (!matchEvent && !matchDetails && !matchProj && !matchCust && !matchActor) return false;
      }

      return true;
    });
  }, [allActivities, currentUserName, myActivityActorFilter, myActivityStartDate, myActivityEndDate, myActivitySearchQuery]);

  // View Work Done Details Modal state
  const [selectedWorkDoneItem, setSelectedWorkDoneItem] = useState<any | null>(null);

  // View Project Work History Modal state
  const [selectedWorkProject, setSelectedWorkProject] = useState<any | null>(null);

  // View Customer Ledger Statement Modal state
  const [selectedCustomerLedger, setSelectedCustomerLedger] = useState<any | null>(null);

  // Customer Account Ledger Custom Filtering States
  const [custLedgerStatusFilter, setCustLedgerStatusFilter] = useState<string>("ALL");
  const [custStartDateFilter, setCustStartDateFilter] = useState<string>("");
  const [custEndDateFilter, setCustEndDateFilter] = useState<string>("");
  const [custSearchQuery, setCustSearchQuery] = useState<string>("");

  // Customer Ledger Filtered Array
  const filteredCustomerLedgers = customers
    .map((c) => {
      const cProjs = projects.filter(
        (p) => p.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
      );
      const totalVal = cProjs.reduce((s, p) => s + (p.projectValue || 0), 0);
      const totalRec = cProjs.reduce((s, p) => s + (p.receivedAmount || 0), 0);
      const balanceDue = Math.max(0, totalVal - totalRec);
      const projectCount = cProjs.length;
      const latestProjectDate =
        cProjs.map((p) => p.scheduledDate || p.createdAt?.slice(0, 10)).sort().reverse()[0] || "";

      return {
        customer: c,
        projects: cProjs,
        totalVal,
        totalRec,
        balanceDue,
        projectCount,
        latestProjectDate,
      };
    })
    .filter((item) => {
      // 1. Status Filter
      if (custLedgerStatusFilter === "DUE" && item.balanceDue === 0) return false;
      if (custLedgerStatusFilter === "SETTLED" && item.balanceDue > 0) return false;

      // 2. Date Filter
      if (custStartDateFilter && item.latestProjectDate && item.latestProjectDate < custStartDateFilter) return false;
      if (custEndDateFilter && item.latestProjectDate && item.latestProjectDate > custEndDateFilter) return false;

      // 3. Search Filter
      if (custSearchQuery.trim()) {
        const q = custSearchQuery.toLowerCase().trim();
        const matchName = item.customer.name.toLowerCase().includes(q);
        const matchPhone = item.customer.phone?.toLowerCase().includes(q) || false;
        const matchLoc = item.customer.location?.toLowerCase().includes(q) || false;
        const matchEmail = (item.customer as any).email?.toLowerCase().includes(q) || false;
        if (!matchName && !matchPhone && !matchLoc && !matchEmail) return false;
      }

      return true;
    });

  const grandTotalLifetimeVal = filteredCustomerLedgers.reduce((s, i) => s + i.totalVal, 0);
  const grandTotalCashReceived = filteredCustomerLedgers.reduce((s, i) => s + i.totalRec, 0);
  const grandTotalOutstandingDue = filteredCustomerLedgers.reduce((s, i) => s + i.balanceDue, 0);

  // Revenue Report Custom Filtering States
  const [revenuePaymentStatusFilter, setRevenuePaymentStatusFilter] = useState<string>("ALL");
  const [revenueStartDateFilter, setRevenueStartDateFilter] = useState<string>("");
  const [revenueEndDateFilter, setRevenueEndDateFilter] = useState<string>("");
  const [revenueSearchQuery, setRevenueSearchQuery] = useState<string>("");

  // Revenue Filtered Array
  const filteredRevenueReport = projects.filter((p) => {
    // 1. Payment Status Filter
    if (revenuePaymentStatusFilter !== "ALL") {
      if (revenuePaymentStatusFilter === "Unpaid") {
        if (p.paymentStatus !== "Pending" && p.paymentStatus !== "Overdue" && (p.paymentStatus as any) !== "Unpaid") {
          return false;
        }
      } else if (p.paymentStatus !== revenuePaymentStatusFilter) {
        return false;
      }
    }

    // 2. Date Range Filter
    const pDate = p.scheduledDate || p.createdAt?.slice(0, 10) || "";
    if (revenueStartDateFilter && pDate && pDate < revenueStartDateFilter) {
      return false;
    }
    if (revenueEndDateFilter && pDate && pDate > revenueEndDateFilter) {
      return false;
    }

    // 3. Search Query Filter
    if (revenueSearchQuery.trim()) {
      const q = revenueSearchQuery.toLowerCase().trim();
      const matchId = p.id.toLowerCase().includes(q);
      const matchCust = p.customerName.toLowerCase().includes(q);
      const matchLoc = p.location?.toLowerCase().includes(q) || false;
      const matchWork = p.natureOfWork?.toLowerCase().includes(q) || false;
      if (!matchId && !matchCust && !matchLoc && !matchWork) {
        return false;
      }
    }

    return true;
  });

  const revenueTotalContract = filteredRevenueReport.reduce((sum, p) => sum + (p.projectValue || 0), 0);
  const revenueTotalReceived = filteredRevenueReport.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
  const revenueTotalBalance = filteredRevenueReport.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

  const paidStatusCount = projects.filter((p) => p.paymentStatus === "Paid").length;
  const partialStatusCount = projects.filter((p) => p.paymentStatus === "Partial").length;
  const unpaidStatusCount = projects.filter(
    (p) => p.paymentStatus === "Pending" || p.paymentStatus === "Overdue" || (p.paymentStatus as any) === "Unpaid"
  ).length;

  // Pending Collections Custom Filtering States
  const [pendingPaymentStatusFilter, setPendingPaymentStatusFilter] = useState<string>("ALL");
  const [pendingStartDateFilter, setPendingStartDateFilter] = useState<string>("");
  const [pendingEndDateFilter, setPendingEndDateFilter] = useState<string>("");
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string>("");

  // Pending Collections Filtered Array
  const filteredPendingReport = projects
    .filter((p) => (p.balanceAmount || 0) > 0)
    .filter((p) => {
      // 1. Payment Status Filter
      if (pendingPaymentStatusFilter !== "ALL") {
        if (pendingPaymentStatusFilter === "Unpaid" || pendingPaymentStatusFilter === "Pending") {
          if (p.paymentStatus !== "Pending" && p.paymentStatus !== "Overdue" && (p.paymentStatus as any) !== "Unpaid") {
            return false;
          }
        } else if (p.paymentStatus !== pendingPaymentStatusFilter) {
          return false;
        }
      }

      // 2. Date Range Filter
      const pDate = p.scheduledDate || p.createdAt?.slice(0, 10) || "";
      if (pendingStartDateFilter && pDate && pDate < pendingStartDateFilter) {
        return false;
      }
      if (pendingEndDateFilter && pDate && pDate > pendingEndDateFilter) {
        return false;
      }

      // 3. Search Query Filter
      if (pendingSearchQuery.trim()) {
        const q = pendingSearchQuery.toLowerCase().trim();
        const matchId = p.id.toLowerCase().includes(q);
        const matchCust = p.customerName.toLowerCase().includes(q);
        const matchPhone = p.phone?.toLowerCase().includes(q) || false;
        const matchLoc = p.location?.toLowerCase().includes(q) || false;
        if (!matchId && !matchCust && !matchPhone && !matchLoc) {
          return false;
        }
      }

      return true;
    });

  const totalPendingReceivables = filteredPendingReport.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);
  const totalPendingContractVal = filteredPendingReport.reduce((sum, p) => sum + (p.projectValue || 0), 0);
  const totalPendingReceivedVal = filteredPendingReport.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);

  // Work Report & Live Activity Timeline Custom Filtering States
  const [workCategoryFilter, setWorkCategoryFilter] = useState<string>("ALL");
  const [workStartDateFilter, setWorkStartDateFilter] = useState<string>("");
  const [workEndDateFilter, setWorkEndDateFilter] = useState<string>("");
  const [workSearchQuery, setWorkSearchQuery] = useState<string>("");

  // Group Work Report by Project (showing 1 row per project with full till-date history)
  const filteredWorkProjects = projects
    .map((p) => {
      const logs = p.labourLogs || [];
      const totalHours = logs.reduce((sum, l) => sum + (l.hoursWorked || 0), 0);
      const totalShifts = logs.length;
      const latestLog = logs.slice(-1)[0];
      const latestWorkSummary = latestLog?.workDescription || `Site setup & ${p.natureOfWork} deployment`;
      const latestDate = latestLog?.date || p.scheduledDate || p.createdAt?.slice(0, 10) || "N/A";

      return {
        project: p,
        projectId: p.id,
        customerName: p.customerName,
        workCategory: p.natureOfWork || "General Servicing",
        engineerName: p.assignedEngineerName || "Unassigned",
        location: p.location || "Hyderabad",
        status: p.status,
        contractValue: p.projectValue || 0,
        logs,
        totalShifts,
        totalHours,
        latestWorkSummary,
        latestDate,
      };
    })
    .filter((item) => {
      // 1. Work Category Filter
      if (workCategoryFilter !== "ALL" && item.workCategory !== workCategoryFilter) {
        return false;
      }

      // 2. Date Range Filter
      if (workStartDateFilter && item.latestDate && item.latestDate < workStartDateFilter) {
        return false;
      }
      if (workEndDateFilter && item.latestDate && item.latestDate > workEndDateFilter) {
        return false;
      }

      // 3. Search Query Filter
      if (workSearchQuery.trim()) {
        const q = workSearchQuery.toLowerCase().trim();
        const matchId = item.projectId.toLowerCase().includes(q);
        const matchCust = item.customerName.toLowerCase().includes(q);
        const matchWork = item.workCategory.toLowerCase().includes(q);
        const matchEng = item.engineerName.toLowerCase().includes(q);
        const matchSummary = item.latestWorkSummary.toLowerCase().includes(q);
        const matchLoc = item.location.toLowerCase().includes(q);
        if (!matchId && !matchCust && !matchWork && !matchEng && !matchSummary && !matchLoc) {
          return false;
        }
      }

      return true;
    });

  const uniqueWorkCategories = Array.from(
    new Set(projects.map((p) => p.natureOfWork).filter(Boolean))
  );

  // Projects Report Custom Filtering States
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("ALL");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>("");

  // Projects Report Filtered Array
  const filteredProjectsReport = projects.filter((p) => {
    // 1. Status Filter
    if (projectStatusFilter !== "ALL" && p.status !== projectStatusFilter) {
      return false;
    }

    // 2. Date Range Filter
    const pDate = p.scheduledDate || p.createdAt?.slice(0, 10) || "";
    if (startDateFilter && pDate && pDate < startDateFilter) {
      return false;
    }
    if (endDateFilter && pDate && pDate > endDateFilter) {
      return false;
    }

    // 3. Search Query Filter
    if (projectSearchQuery.trim()) {
      const q = projectSearchQuery.toLowerCase().trim();
      const matchId = p.id.toLowerCase().includes(q);
      const matchCust = p.customerName.toLowerCase().includes(q);
      const matchEng = p.assignedEngineerName?.toLowerCase().includes(q) || false;
      const matchWork = p.natureOfWork?.toLowerCase().includes(q) || false;
      const matchLoc = p.location?.toLowerCase().includes(q) || false;
      if (!matchId && !matchCust && !matchEng && !matchWork && !matchLoc) {
        return false;
      }
    }

    return true;
  });

  const ongoingCount = projects.filter((p) => p.status === "Ongoing").length;
  const scheduledCount = projects.filter((p) => p.status === "Scheduled").length;
  const waitingCount = projects.filter((p) => p.status === "Waiting").length;
  const completedCount = projects.filter((p) => p.status === "Completed").length;
  const closedCount = projects.filter((p) => p.status === "Closed").length;

  // Enquiries Report Custom Filtering States
  const [enquiryDecisionFilter, setEnquiryDecisionFilter] = useState<string>("ALL");
  const [enquiryStartDateFilter, setEnquiryStartDateFilter] = useState<string>("");
  const [enquiryEndDateFilter, setEnquiryEndDateFilter] = useState<string>("");
  const [enquirySearchQuery, setEnquirySearchQuery] = useState<string>("");

  // Enquiries Filtered Array
  const filteredEnquiriesReport = enquiries.filter((e) => {
    // 1. Decision / Status Filter
    if (enquiryDecisionFilter !== "ALL") {
      const d = (e.customerDecision || "").toLowerCase().replace(/[^a-z]/g, "");
      const target = enquiryDecisionFilter.toLowerCase().replace(/[^a-z]/g, "");
      if (!d.includes(target) && !target.includes(d)) {
        return false;
      }
    }

    // 2. Date Range Filter
    const eDate = e.createdAt?.slice(0, 10) || "";
    if (enquiryStartDateFilter && eDate && eDate < enquiryStartDateFilter) {
      return false;
    }
    if (enquiryEndDateFilter && eDate && eDate > enquiryEndDateFilter) {
      return false;
    }

    // 3. Search Query Filter
    if (enquirySearchQuery.trim()) {
      const q = enquirySearchQuery.toLowerCase().trim();
      const matchId = e.id.toLowerCase().includes(q);
      const matchCust = e.customerName.toLowerCase().includes(q);
      const matchPhone = e.phone?.toLowerCase().includes(q) || false;
      const matchLeak = e.leakageType?.toLowerCase().includes(q) || false;
      const matchSource = e.leadSource?.toLowerCase().includes(q) || false;
      const matchRef = e.referredBy?.toLowerCase().includes(q) || false;
      if (!matchId && !matchCust && !matchPhone && !matchLeak && !matchSource && !matchRef) {
        return false;
      }
    }

    return true;
  });

  const enquiryFollowUpCount = enquiries.filter((e) => (e.customerDecision || "").toLowerCase().includes("follow")).length;
  const enquiryThinkingCount = enquiries.filter((e) => (e.customerDecision || "").toLowerCase().includes("think")).length;
  const enquiryApprovedCount = enquiries.filter((e) => (e.customerDecision || "").toLowerCase().includes("approve")).length;
  const enquiryCancelledCount = enquiries.filter((e) => (e.customerDecision || "").toLowerCase().includes("cancel")).length;

  // Attendance & Payroll Custom Filtering States
  const [attMemberFilter, setAttMemberFilter] = useState<string>("ALL");
  const [attTypeFilter, setAttTypeFilter] = useState<string>("ALL");
  const [attStartDateFilter, setAttStartDateFilter] = useState<string>("");
  const [attEndDateFilter, setAttEndDateFilter] = useState<string>("");

  // Flatten all project labour logs
  const allProjectLogs = projects.flatMap((p) =>
    (p.labourLogs || []).map((log) => ({
      ...log,
      projectId: p.id,
      customerName: p.customerName,
      location: p.location,
      natureOfWork: p.natureOfWork,
    }))
  );

  // Attendance Summary calculation per labour
  const filteredLaboursSummary = labours
    .filter((l) => {
      if (l.isActive === false && attMemberFilter !== l.id) return false;
      if (attMemberFilter !== "ALL" && l.id !== attMemberFilter) return false;
      if (attTypeFilter !== "ALL" && l.type !== attTypeFilter) return false;
      return true;
    })
    .map((l) => {
      const logs = allProjectLogs.filter((log) => {
        if (log.labourId !== l.id) return false;
        if (attStartDateFilter && log.date < attStartDateFilter) return false;
        if (attEndDateFilter && log.date > attEndDateFilter) return false;
        return true;
      });

      const presentDays = logs.filter((log) => log.attendance === "Present" || log.inTime).length;
      const totalHours = logs.reduce((acc, log) => acc + (log.hoursWorked || 0), 0);
      const dailyWageRate = l.dailyWage ?? Math.round((l.defaultWeeklyWage || 1400) / 6);
      const earnedWages = logs.reduce(
        (acc, log) =>
          acc +
          (log.earnedMoney ||
            (log.attendance === "Half Day"
              ? Math.round(dailyWageRate / 2)
              : log.attendance === "Absent" || log.attendance === "Leave"
              ? 0
              : dailyWageRate)),
        0
      );

      return {
        labour: l,
        presentDays,
        totalHours,
        dailyWageRate,
        weeklyRate: l.defaultWeeklyWage || (dailyWageRate * 6),
        earnedWages,
        logs,
      };
    });

  const handleDownloadProjectsPdfReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generateProjectsReport({
        data: {
          status: projectStatusFilter,
          startDate: startDateFilter || undefined,
          endDate: endDateFilter || undefined,
        },
      });
      if (res?.base64) {
        downloadPdfBlob(res.base64, res.filename || "projects-report.pdf");
        toast.success("Downloaded Projects Report PDF with photo thumbnails!");
      } else {
        toast.error("Failed to generate Projects PDF");
      }
    } catch (err: any) {
      console.error("Projects PDF Error:", err);
      toast.error("Failed to generate Projects PDF report");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadAttendancePdfReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generateAttendanceReport({
        data: {
          startDate: attStartDateFilter || undefined,
          endDate: attEndDateFilter || undefined,
          labourId: attMemberFilter,
        },
      });
      if (res?.base64) {
        downloadPdfBlob(res.base64, res.filename || "attendance-report.pdf");
        toast.success("Downloaded Attendance Report PDF with photo thumbnails!");
      } else {
        toast.error("Failed to generate Attendance PDF");
      }
    } catch (err: any) {
      console.error("Attendance PDF Error:", err);
      toast.error("Failed to generate Attendance PDF report");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export Excel (.xlsx) Helper with Auto-Fit Column Widths (Fixes ##### issue in Excel!)
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    try {
      const cleanRows = rows.map((row) =>
        row.map((val) => {
          if (val === null || val === undefined) return "";
          const str = String(val);
          // If value is full ISO date like 2026-08-19T00:00:00.000Z, format to YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
            return str.slice(0, 10);
          }
          return str;
        })
      );

      const aoa = [headers, ...cleanRows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Auto-fit column widths so Excel never shows ##### for dates or numbers
      const colWidths = headers.map((header, colIndex) => {
        let maxLen = header.length;
        for (const row of cleanRows) {
          const cellValue = row[colIndex] || "";
          if (cellValue.length > maxLen) {
            maxLen = cellValue.length;
          }
        }
        return { wch: Math.max(maxLen + 5, 16) }; // Minimum width 16 to guarantee dates never show #####
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filename}.xlsx successfully!`);
    } catch (err: any) {
      toast.error("Export failed: " + (err?.message || err));
    }
  };

  // Export Printable PDF Helper
  const handleExportPDF = (reportTitle: string, headers: string[], rows: (string | number)[][]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download PDF report");
      return;
    }

    const tableHeaders = headers
      .map(
        (h) =>
          `<th style="padding:8px 10px; border:1px solid #cbd5e1; background:#f1f5f9; text-align:left; font-size:10px; font-weight:bold; color:#1e293b; text-transform:uppercase;">${h}</th>`
      )
      .join("");

    const tableRows = rows
      .map(
        (r) =>
          `<tr>${r
            .map(
              (cell) =>
                `<td style="padding:6px 10px; border:1px solid #e2e8f0; font-size:10px; color:#334155;">${cell ?? "N/A"}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    const now = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
            .logo { font-size: 18px; font-weight: 900; color: #1e3a8a; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            .footer { margin-top: 20px; text-align: right; font-size: 10px; color: #94a3b8; }
            @media print {
              body { padding: 0; }
              @page { size: A4 landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">ROBOTICS ERP — EXECUTIVE REPORT</div>
              <div class="subtitle">${reportTitle} • Generated on ${now}</div>
            </div>
            <div style="text-align: right; font-size: 10px; font-weight: bold; color: #2563eb;">
              OFFICIAL BUSINESS REPORT
            </div>
          </div>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">
            Generated via Robotics ERP System
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Generated PDF View for ${reportTitle}`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white dark:bg-card p-3 rounded-xl border border-border shadow-xs">
        {[
          { id: "REVENUE", label: "Revenue", icon: TrendingUp },
          { id: "PROJECTS", label: "Projects", icon: FolderKanban },
          { id: "PENDING", label: "Pending", icon: Coins },
          { id: "ENQUIRIES", label: "Enquiries", icon: FileText },
          { id: "ATTENDANCE", label: "Attendance", icon: Calendar },
          { id: "PAYROLL", label: "Payroll", icon: DollarSign },
          { id: "NATURE", label: "My Activity", icon: Activity },
          { id: "CUSTOMER", label: "Ledger", icon: Users },
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

      {/* 1. REVENUE REPORT WITH DATE-TO-DATE CUSTOMIZATION & DOWNLOAD */}
      {activeReport === "REVENUE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Customized Revenue & Billing Summary Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter revenue by payment status (Paid, Partial, Unpaid), Date Range (Date-to-Date), and export customized data.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = revenuePaymentStatusFilter === "ALL" ? "All_Payments" : revenuePaymentStatusFilter;
                    const dateLabel = revenueStartDateFilter || revenueEndDateFilter ? `_${revenueStartDateFilter}_to_${revenueEndDateFilter}` : "";
                    handleExportCSV(
                      `Custom_Revenue_Report_${statusLabel}${dateLabel}`,
                      ["Project ID", "Customer Name", "Work Description", "Scheduled Date", "Contract Value (INR)", "Amount Received (INR)", "Balance Due (INR)", "Payment Status"],
                      filteredRevenueReport.map((p) => [
                        p.id,
                        p.customerName,
                        p.natureOfWork || "N/A",
                        p.scheduledDate || "N/A",
                        p.projectValue || 0,
                        p.receivedAmount || 0,
                        p.balanceAmount || 0,
                        p.paymentStatus || "Unpaid",
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Filtered Excel ({filteredRevenueReport.length})
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = revenuePaymentStatusFilter === "ALL" ? "All_Payments" : revenuePaymentStatusFilter;
                    const dateLabel = revenueStartDateFilter || revenueEndDateFilter ? ` (${revenueStartDateFilter} to ${revenueEndDateFilter})` : "";
                    handleExportPDF(
                      `Custom Revenue & Billing Summary Report - ${statusLabel}${dateLabel}`,
                      ["Project ID", "Customer Name", "Work Description", "Scheduled Date", "Contract Value (₹)", "Received (₹)", "Balance Due (₹)", "Status"],
                      filteredRevenueReport.map((p) => [
                        p.id,
                        p.customerName,
                        p.natureOfWork || "N/A",
                        p.scheduledDate || "N/A",
                        `₹${(p.projectValue || 0).toLocaleString("en-IN")}`,
                        `₹${(p.receivedAmount || 0).toLocaleString("en-IN")}`,
                        `₹${(p.balanceAmount || 0).toLocaleString("en-IN")}`,
                        p.paymentStatus || "Unpaid",
                      ])
                    );
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" /> Download PDF Report
                </Button>
              </div>
            </div>

            {/* Payment Status Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Payment Status:</span>
              {[
                { id: "ALL", label: `All (${projects.length})` },
                { id: "Paid", label: `Paid (${paidStatusCount})` },
                { id: "Partial", label: `Partial (${partialStatusCount})` },
                { id: "Unpaid", label: `Unpaid (${unpaidStatusCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRevenuePaymentStatusFilter(tab.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
                    revenuePaymentStatusFilter === tab.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interactive Filters Panel: Date-to-Date & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Revenue From (Date)</Label>
                <Input
                  type="date"
                  value={revenueStartDateFilter}
                  onChange={(e) => setRevenueStartDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Revenue To (Date)</Label>
                <Input
                  type="date"
                  value={revenueEndDateFilter}
                  onChange={(e) => setRevenueEndDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Records</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer, Project ID, Location..."
                    value={revenueSearchQuery}
                    onChange={(e) => setRevenueSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRevenuePaymentStatusFilter("ALL");
                    setRevenueStartDateFilter("");
                    setRevenueEndDateFilter("");
                    setRevenueSearchQuery("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Live Financial Metrics Summary Bar */}
            <div className="p-3 bg-muted/20 border-b grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-muted-foreground font-semibold">Total Contract:</span>
                <span className="font-extrabold text-foreground">₹{revenueTotalContract.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2 border-y sm:border-y-0 sm:border-x border-border/60 py-1 sm:py-0">
                <span className="text-muted-foreground font-semibold">Cash Received:</span>
                <span className="font-extrabold text-emerald-600">₹{revenueTotalReceived.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-muted-foreground font-semibold">Outstanding Due:</span>
                <span className="font-extrabold text-rose-600">₹{revenueTotalBalance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Project ID</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Scheduled Date</th>
                    <th className="p-3">Contract Value</th>
                    <th className="p-3">Amount Received</th>
                    <th className="p-3">Balance Amount</th>
                    <th className="p-3 text-right pr-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRevenueReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground font-medium">
                        No revenue or billing records match the selected payment or date filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRevenueReport.map((p) => (
                      <tr key={p.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-blue-600">
                          <Link to="/projects" search={{ openId: p.id }} className="hover:underline text-blue-600 hover:text-blue-700">
                            {p.id}
                          </Link>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{p.customerName}</td>
                        <td className="p-3 font-mono text-muted-foreground">{p.scheduledDate || "N/A"}</td>
                        <td className="p-3 font-bold text-foreground">₹{p.projectValue.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-emerald-600">₹{p.receivedAmount.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-rose-600">₹{p.balanceAmount.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right pr-4">
                          <Badge
                            className={`text-[10px] ${
                              p.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : p.paymentStatus === "Partial"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
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

      {/* 2. PROJECTS REPORT WITH CUSTOM FILTERS & CUSTOMIZED DOWNLOAD */}
      {activeReport === "PROJECTS" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-blue-600" />
                  Customized Projects Deployment Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter by status (Ongoing, Scheduled, etc.), Date Range (Date-to-Date), and download customized data.
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = projectStatusFilter === "ALL" ? "All_Statuses" : projectStatusFilter;
                    const dateLabel = startDateFilter || endDateFilter ? `_${startDateFilter}_to_${endDateFilter}` : "";
                    handleExportCSV(
                      `Custom_Projects_Report_${statusLabel}${dateLabel}`,
                      ["Project ID", "Customer Name", "Work Description", "Lead Engineer", "Scheduled Date", "Location", "Contract Value (INR)", "Payment Status", "Project Status"],
                      filteredProjectsReport.map((p) => [
                        p.id,
                        p.customerName,
                        p.natureOfWork,
                        p.assignedEngineerName || "Unassigned",
                        p.scheduledDate || "N/A",
                        p.location || "N/A",
                        p.projectValue,
                        p.paymentStatus,
                        p.status,
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Filtered Excel ({filteredProjectsReport.length})
                </Button>

                <Button
                  size="sm"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadProjectsPdfReport}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  {isGeneratingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Download Projects Report (PDF)
                </Button>

              </div>
            </div>

            {/* Status Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Status:</span>
              {[
                { id: "ALL", label: `All (${projects.length})` },
                { id: "Ongoing", label: `Ongoing (${ongoingCount})` },
                { id: "Scheduled", label: `Scheduled (${scheduledCount})` },
                { id: "Waiting", label: `Waiting (${waitingCount})` },
                { id: "Completed", label: `Completed (${completedCount})` },
                { id: "Closed", label: `Closed (${closedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProjectStatusFilter(tab.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
                    projectStatusFilter === tab.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interactive Filters Panel: Date-to-Date & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Scheduled From (Date)</Label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Scheduled To (Date)</Label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Records</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer, Engineer, Location..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProjectStatusFilter("ALL");
                    setStartDateFilter("");
                    setEndDateFilter("");
                    setProjectSearchQuery("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">
                Showing <b className="text-foreground">{filteredProjectsReport.length}</b> of {projects.length} Projects
                {projectStatusFilter !== "ALL" && ` (Status: ${projectStatusFilter})`}
                {startDateFilter && ` (From: ${startDateFilter})`}
                {endDateFilter && ` (To: ${endDateFilter})`}
              </span>
              <span className="font-bold text-emerald-700">
                Filtered Value: ₹
                {filteredProjectsReport.reduce((acc, p) => acc + (p.projectValue || 0), 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Project ID</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Work Description</th>
                    <th className="p-3">Lead Engineer</th>
                    <th className="p-3">Scheduled Date</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Contract Value</th>
                    <th className="p-3 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProjectsReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                        No project deployment records match the selected status or date filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProjectsReport.map((p) => (
                      <tr key={p.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-blue-600">
                          <Link to="/projects" search={{ openId: p.id }} className="hover:underline text-blue-600 hover:text-blue-700">
                            {p.id}
                          </Link>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{p.customerName}</td>
                        <td className="p-3 font-medium text-foreground">{p.natureOfWork}</td>
                        <td className="p-3 font-semibold text-purple-700">{p.assignedEngineerName || "Unassigned"}</td>
                        <td className="p-3 text-muted-foreground font-mono">{p.scheduledDate || "N/A"}</td>
                        <td className="p-3 text-muted-foreground">{p.location || "Hyderabad"}</td>
                        <td className="p-3 font-bold text-foreground">₹{p.projectValue.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right pr-4">
                          <Badge
                            className={`text-[10px] ${
                              p.status === "Ongoing"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : p.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : p.status === "Scheduled"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : p.status === "Waiting"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-slate-100 text-slate-800 border border-slate-200"
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

      {/* 3. PENDING COLLECTIONS WITH DATE-TO-DATE CUSTOMIZATION & DOWNLOAD */}
      {activeReport === "PENDING" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-rose-600" />
                  Customized Pending Receivables & Collections Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter pending collections by payment status (Unpaid, Partial), Date Range (Date-to-Date), and export customized data.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = pendingPaymentStatusFilter === "ALL" ? "All_Pending" : pendingPaymentStatusFilter;
                    const dateLabel = pendingStartDateFilter || pendingEndDateFilter ? `_${pendingStartDateFilter}_to_${pendingEndDateFilter}` : "";
                    handleExportCSV(
                      `Custom_Pending_Collections_Report_${statusLabel}${dateLabel}`,
                      ["Project ID", "Customer Name", "Contact Phone", "Work Description", "Scheduled / Due Date", "Contract Value (INR)", "Amount Received (INR)", "Outstanding Due (INR)", "Payment Status"],
                      filteredPendingReport.map((p) => [
                        p.id,
                        p.customerName,
                        p.phone || "N/A",
                        p.natureOfWork || "N/A",
                        p.scheduledDate || "N/A",
                        p.projectValue || 0,
                        p.receivedAmount || 0,
                        p.balanceAmount || 0,
                        p.paymentStatus || "Unpaid",
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Filtered Excel ({filteredPendingReport.length})
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = pendingPaymentStatusFilter === "ALL" ? "All_Pending" : pendingPaymentStatusFilter;
                    const dateLabel = pendingStartDateFilter || pendingEndDateFilter ? ` (${pendingStartDateFilter} to ${pendingEndDateFilter})` : "";
                    handleExportPDF(
                      `Custom Pending Receivables & Collections Report - ${statusLabel}${dateLabel}`,
                      ["Project ID", "Customer Name", "Contact Phone", "Work Description", "Scheduled / Due Date", "Contract Value (₹)", "Received (₹)", "Outstanding Due (₹)", "Status"],
                      filteredPendingReport.map((p) => [
                        p.id,
                        p.customerName,
                        p.phone || "N/A",
                        p.natureOfWork || "N/A",
                        p.scheduledDate || "N/A",
                        `₹${(p.projectValue || 0).toLocaleString("en-IN")}`,
                        `₹${(p.receivedAmount || 0).toLocaleString("en-IN")}`,
                        `₹${(p.balanceAmount || 0).toLocaleString("en-IN")}`,
                        p.paymentStatus || "Unpaid",
                      ])
                    );
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" /> Download PDF Report
                </Button>
              </div>
            </div>

            {/* Payment Status Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Collection Status:</span>
              {[
                { id: "ALL", label: `All Pending (${projects.filter((p) => (p.balanceAmount || 0) > 0).length})` },
                { id: "Unpaid", label: `Unpaid Only (${projects.filter((p) => (p.paymentStatus === "Pending" || p.paymentStatus === "Overdue" || (p.paymentStatus as any) === "Unpaid") && (p.balanceAmount || 0) > 0).length})` },
                { id: "Partial", label: `Partial Paid (${projects.filter((p) => p.paymentStatus === "Partial" && (p.balanceAmount || 0) > 0).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPendingPaymentStatusFilter(tab.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
                    pendingPaymentStatusFilter === tab.id
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interactive Filters Panel: Date-to-Date & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Due / Scheduled From (Date)</Label>
                <Input
                  type="date"
                  value={pendingStartDateFilter}
                  onChange={(e) => setPendingStartDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Due / Scheduled To (Date)</Label>
                <Input
                  type="date"
                  value={pendingEndDateFilter}
                  onChange={(e) => setPendingEndDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Records</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer, Phone, Project ID, Location..."
                    value={pendingSearchQuery}
                    onChange={(e) => setPendingSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPendingPaymentStatusFilter("ALL");
                    setPendingStartDateFilter("");
                    setPendingEndDateFilter("");
                    setPendingSearchQuery("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Live Financial Metrics Summary Bar */}
            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-rose-700 font-bold">Total Pending Due:</span>
                <span className="font-extrabold text-rose-700 text-sm">₹{totalPendingReceivables.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2 border-y sm:border-y-0 sm:border-x border-rose-200/60 dark:border-rose-900/40 py-1 sm:py-0">
                <span className="text-muted-foreground font-semibold">Cash Collected So Far:</span>
                <span className="font-extrabold text-emerald-600">₹{totalPendingReceivedVal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-muted-foreground font-semibold">Total Contract Value:</span>
                <span className="font-extrabold text-foreground">₹{totalPendingContractVal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Project ID</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Contact Phone</th>
                    <th className="p-3">Scheduled / Due Date</th>
                    <th className="p-3">Contract Value</th>
                    <th className="p-3">Amount Received</th>
                    <th className="p-3 font-bold text-rose-600">Outstanding Due</th>
                    <th className="p-3 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPendingReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                        No pending collection balances match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPendingReport.map((p) => (
                      <tr key={p.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-blue-600">
                          <Link to="/projects" search={{ openId: p.id }} className="hover:underline text-blue-600 hover:text-blue-700">
                            {p.id}
                          </Link>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{p.customerName}</td>
                        <td className="p-3 text-muted-foreground font-mono">{p.phone || "N/A"}</td>
                        <td className="p-3 font-mono text-muted-foreground">{p.scheduledDate || "N/A"}</td>
                        <td className="p-3 font-medium">₹{p.projectValue.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-emerald-600">₹{p.receivedAmount.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-extrabold text-rose-600 text-sm">
                          ₹{p.balanceAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right pr-4">
                          <Badge
                            className={`text-[10px] ${
                              p.paymentStatus === "Pending" || (p.paymentStatus as any) === "Unpaid"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
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

      {/* 4. ENQUIRIES REPORT WITH CUSTOM DECISION FILTERS & CUSTOMIZED DOWNLOAD */}
      {activeReport === "ENQUIRIES" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Customized Enquiries & Quotations Funnel Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter by decision (Follow Up, Thinking, Approved, Cancelled), Date Range (Date-to-Date), and export customized data.
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const decLabel = enquiryDecisionFilter === "ALL" ? "All_Decisions" : enquiryDecisionFilter;
                    const dateLabel = enquiryStartDateFilter || enquiryEndDateFilter ? `_${enquiryStartDateFilter}_to_${enquiryEndDateFilter}` : "";
                    handleExportCSV(
                      `Custom_Enquiries_Report_${decLabel}${dateLabel}`,
                      [
                        "Enquiry ID",
                        "Customer Name",
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
                      filteredEnquiriesReport.map((e) => [
                        e.id,
                        e.customerName,
                        e.phone || "N/A",
                        e.location || "N/A",
                        e.leakageType || "N/A",
                        e.assignedEngineerName || "Unassigned",
                        e.quotationAmount || 0,
                        e.siteVisitDate || "N/A",
                        e.workCommittedDate || "Not Set",
                        e.actualWorkStartedDate || "Pending",
                        e.leadSource || "N/A",
                        e.referredBy || "—",
                        e.customerDecision || "Follow Up",
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Filtered Excel ({filteredEnquiriesReport.length})
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    const decLabel = enquiryDecisionFilter === "ALL" ? "All_Decisions" : enquiryDecisionFilter;
                    const dateLabel = enquiryStartDateFilter || enquiryEndDateFilter ? ` (${enquiryStartDateFilter} to ${enquiryEndDateFilter})` : "";
                    handleExportPDF(
                      `Custom Enquiries & Quotations Funnel Report - ${decLabel}${dateLabel}`,
                      [
                        "Enquiry ID",
                        "Customer Name",
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
                      filteredEnquiriesReport.map((e) => [
                        e.id,
                        e.customerName,
                        e.phone || "N/A",
                        e.location || "N/A",
                        e.leakageType || "N/A",
                        e.assignedEngineerName || "Unassigned",
                        `INR ${(e.quotationAmount || 0).toLocaleString("en-IN")}`,
                        e.siteVisitDate || "N/A",
                        e.workCommittedDate || "Not Set",
                        e.actualWorkStartedDate || "Pending",
                        e.leadSource || "N/A",
                        e.referredBy || "—",
                        e.customerDecision || "Follow Up",
                      ])
                    );
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" /> Download PDF Report
                </Button>
              </div>
            </div>

            {/* Decision Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Decision:</span>
              {[
                { id: "ALL", label: `All (${enquiries.length})` },
                { id: "Follow Up", label: `Follow Up (${enquiryFollowUpCount})` },
                { id: "Thinking", label: `Thinking (${enquiryThinkingCount})` },
                { id: "Approved", label: `Approved (${enquiryApprovedCount})` },
                { id: "Cancelled", label: `Cancelled (${enquiryCancelledCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEnquiryDecisionFilter(tab.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
                    enquiryDecisionFilter === tab.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interactive Filters Panel: Date-to-Date & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Enquiry From (Date)</Label>
                <Input
                  type="date"
                  value={enquiryStartDateFilter}
                  onChange={(e) => setEnquiryStartDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Enquiry To (Date)</Label>
                <Input
                  type="date"
                  value={enquiryEndDateFilter}
                  onChange={(e) => setEnquiryEndDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Enquiries</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer, Leakage, Source, Phone..."
                    value={enquirySearchQuery}
                    onChange={(e) => setEnquirySearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEnquiryDecisionFilter("ALL");
                    setEnquiryStartDateFilter("");
                    setEnquiryEndDateFilter("");
                    setEnquirySearchQuery("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">
                Showing <b className="text-foreground">{filteredEnquiriesReport.length}</b> of {enquiries.length} Enquiries
                {enquiryDecisionFilter !== "ALL" && ` (Decision: ${enquiryDecisionFilter})`}
                {enquiryStartDateFilter && ` (From: ${enquiryStartDateFilter})`}
                {enquiryEndDateFilter && ` (To: ${enquiryEndDateFilter})`}
              </span>
              <span className="font-bold text-emerald-700">
                Filtered Quotation Value: ₹
                {filteredEnquiriesReport.reduce((acc, e) => acc + (e.quotationAmount || 0), 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4 whitespace-nowrap">Enquiry #</th>
                    <th className="p-3 whitespace-nowrap">Customer Name</th>
                    <th className="p-3 whitespace-nowrap">Phone</th>
                    <th className="p-3 whitespace-nowrap">Location</th>
                    <th className="p-3 whitespace-nowrap">Leakage / Service Need</th>
                    <th className="p-3 whitespace-nowrap">Engineer</th>
                    <th className="p-3 whitespace-nowrap">Quotation Amount</th>
                    <th className="p-3 whitespace-nowrap">Site Visit Date</th>
                    <th className="p-3 whitespace-nowrap">Start Date</th>
                    <th className="p-3 whitespace-nowrap">Work Started</th>
                    <th className="p-3 whitespace-nowrap">Lead Source</th>
                    <th className="p-3 whitespace-nowrap">Referred By</th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap">Customer Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEnquiriesReport.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-muted-foreground font-medium">
                        No enquiry records match the selected decision or date filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEnquiriesReport.map((e) => {
                      const dec = e.customerDecision || "Follow Up";
                      const isApproved = dec.toLowerCase().includes("approve");
                      const isCancelled = dec.toLowerCase().includes("cancel");
                      const isThinking = dec.toLowerCase().includes("think");

                      return (
                        <tr key={e.id} className="hover:bg-accent/40">
                          <td className="p-3 pl-4 font-bold text-blue-600 whitespace-nowrap">{e.id}</td>
                          <td className="p-3 font-semibold text-foreground whitespace-nowrap">{e.customerName}</td>
                          <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">{e.phone || "N/A"}</td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{e.location || "N/A"}</td>
                          <td className="p-3 text-muted-foreground font-medium whitespace-nowrap">{e.leakageType}</td>
                          <td className="p-3 font-semibold text-purple-700 whitespace-nowrap">{e.assignedEngineerName || "Unassigned"}</td>
                          <td className="p-3 font-bold text-foreground whitespace-nowrap">₹{(e.quotationAmount || 0).toLocaleString("en-IN")}</td>
                          <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">{e.siteVisitDate || "N/A"}</td>
                          <td className="p-3 font-mono text-purple-700 whitespace-nowrap">{e.workCommittedDate || "Not Set"}</td>
                          <td className="p-3 font-mono text-emerald-700 whitespace-nowrap">{e.actualWorkStartedDate || "Pending"}</td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{e.leadSource}</td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{e.referredBy || "—"}</td>
                          <td className="p-3 text-right pr-4 whitespace-nowrap">
                            <Badge
                              className={`text-[10px] ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : isCancelled
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isThinking
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {dec}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. ATTENDANCE & PAYROLL REPORT WITH MEMBER & WEEKLY DATE-TO-DATE CUSTOMIZATION */}
      {activeReport === "ATTENDANCE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Customized Workforce Attendance & Payroll Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a particular member or all staff, customize weekly/date-to-date ranges, and download customized payroll records.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const memberObj = labours.find((l) => l.id === attMemberFilter);
                    const memberLabel = memberObj ? memberObj.name.replace(/\s+/g, "_") : "All_Staff";
                    const dateLabel = attStartDateFilter || attEndDateFilter ? `_${attStartDateFilter}_to_${attEndDateFilter}` : "";

                    if (attMemberFilter !== "ALL") {
                      const logsToExport = allProjectLogs.filter((log) => {
                        if (log.labourId !== attMemberFilter) return false;
                        if (attStartDateFilter && log.date < attStartDateFilter) return false;
                        if (attEndDateFilter && log.date > attEndDateFilter) return false;
                        return true;
                      });

                      handleExportCSV(
                        `Attendance_Timesheet_${memberLabel}${dateLabel}`,
                        ["Date", "Labour ID", "Labour Name", "Project / Customer", "Location", "Work Description", "Check-in", "Check-out", "Hours Worked", "Earned Wage (INR)", "Attendance", "Verification"],
                        logsToExport.map((log) => [
                          log.date,
                          log.labourId,
                          log.labourName,
                          log.customerName || "N/A",
                          log.location || projects.find((p) => p.id === log.projectId)?.location || "—",
                          log.workDescription || "On-site servicing",
                          log.inTime || "N/A",
                          log.outTime || "N/A",
                          log.hoursWorked || 0,
                          Math.round(log.earnedMoney || 0),
                          log.attendance || "Present",
                          log.verificationStatus || "Verified",
                        ])
                      );
                    } else {
                      handleExportCSV(
                        `Payroll_Summary_${memberLabel}${dateLabel}`,
                        ["Labour ID", "Labour Name", "Labour Type", "Daily Wage (₹/day)", "Present Days", "Total Hours Worked", "Earned Payroll (INR)"],
                        filteredLaboursSummary.map((item) => [
                          item.labour.id,
                          item.labour.name,
                          item.labour.type,
                          item.dailyWageRate,
                          item.presentDays,
                          item.totalHours.toFixed(1),
                          Math.round(item.earnedWages),
                        ])
                      );
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Filtered Excel
                </Button>

                <Button
                  size="sm"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadAttendancePdfReport}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  {isGeneratingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Download Attendance Report (PDF)
                </Button>

              </div>
            </div>

            {/* Interactive Filters Panel: Member Dropdown, Date-to-Date & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Particular Member Dropdown */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Select Particular Member</Label>
                <select
                  value={attMemberFilter}
                  onChange={(e) => setAttMemberFilter(e.target.value)}
                  className="w-full h-8 text-xs font-medium rounded-lg border border-border bg-white dark:bg-card px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Staff Members ({labours.filter((l) => l.isActive !== false).length})</option>
                  {labours.filter((l) => l.isActive !== false).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type} - ₹{l.dailyWage ?? Math.round((l.defaultWeeklyWage || 1400) / 6)}/day)
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">From Date (Weekly / Range)</Label>
                <Input
                  type="date"
                  value={attStartDateFilter}
                  onChange={(e) => setAttStartDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* To Date */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">To Date (Weekly / Range)</Label>
                <Input
                  type="date"
                  value={attEndDateFilter}
                  onChange={(e) => setAttEndDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Reset Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttMemberFilter("ALL");
                    setAttTypeFilter("ALL");
                    setAttStartDateFilter("");
                    setAttEndDateFilter("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Top Summary Banner */}
            <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">
                Mode:{" "}
                <b className="text-foreground">
                  {attMemberFilter === "ALL"
                    ? `All Staff Summary (${filteredLaboursSummary.length} members)`
                    : `Individual Member Timesheet: ${labours.find((l) => l.id === attMemberFilter)?.name || attMemberFilter}`}
                </b>
                {attStartDateFilter && ` (From: ${attStartDateFilter})`}
                {attEndDateFilter && ` (To: ${attEndDateFilter})`}
              </span>
              <span className="font-bold text-emerald-700">
                Total Earned Payroll: ₹
                {filteredLaboursSummary
                  .reduce((acc, item) => acc + item.earnedWages, 0)
                  .toLocaleString("en-IN")}
              </span>
            </div>

            {/* View 1: Single Member Detailed Daily Log */}
            {attMemberFilter !== "ALL" ? (
              <div className="overflow-x-auto">
                {(() => {
                  const selLabour = labours.find((l) => l.id === attMemberFilter);
                  const memberLogs = allProjectLogs.filter((log) => {
                    if (log.labourId !== attMemberFilter) return false;
                    if (attStartDateFilter && log.date < attStartDateFilter) return false;
                    if (attEndDateFilter && log.date > attEndDateFilter) return false;
                    return true;
                  });

                  const totalHoursWorked = memberLogs.reduce((acc, l) => acc + (l.hoursWorked || 0), 0);
                  const totalEarned = memberLogs.reduce((acc, l) => acc + (l.earnedMoney || 0), 0);

                  return (
                    <div className="space-y-3 p-4">
                      {/* Individual Member Header Card */}
                      <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <h3 className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
                            <span>{selLabour?.name || attMemberFilter}</span>
                            <Badge className="bg-blue-600 text-white text-[10px]">{selLabour?.type || "Staff"}</Badge>
                          </h3>
                          <p className="text-[11px] text-blue-700 mt-0.5">
                            Weekly Base Rate: <b>₹{selLabour?.defaultWeeklyWage || 1400}/week</b> • Phone: {selLabour?.phone || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] text-blue-600 font-bold uppercase">Present Days</p>
                            <p className="text-sm font-black text-blue-900">{memberLogs.length} Days</p>
                          </div>
                          <div className="border-l border-blue-200 pl-4">
                            <p className="text-[10px] text-blue-600 font-bold uppercase">Total Hours</p>
                            <p className="text-sm font-black text-blue-900">{totalHoursWorked.toFixed(1)}h</p>
                          </div>
                          <div className="border-l border-blue-200 pl-4">
                            <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Earned</p>
                            <p className="text-sm font-black text-emerald-700">₹{Math.round(totalEarned).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>

                      {/* Daily Timesheet Table */}
                      <div className="border rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                            <tr>
                              <th className="p-3 pl-4">Shift Date</th>
                              <th className="p-3">Project / Customer</th>
                              <th className="p-3">Location</th>
                              <th className="p-3">Work Description</th>
                              <th className="p-3">Check-in (IN)</th>
                              <th className="p-3">Check-out (OUT)</th>
                              <th className="p-3 text-center">Hours</th>
                              <th className="p-3 text-right">Daily Wage</th>
                              <th className="p-3 text-right pr-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {memberLogs.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="p-6 text-center text-muted-foreground font-medium">
                                  No shift logs found for this member in the selected date range.
                                </td>
                              </tr>
                            ) : (
                              memberLogs.map((log) => {
                                const proj = projects.find((p) => p.id === log.projectId);
                                const siteLoc = log.location || proj?.location || "—";

                                return (
                                  <tr key={`${log.date}_${log.projectId}_${log.labourId}`} className="hover:bg-accent/40">
                                    <td className="p-3 pl-4 font-bold text-foreground font-mono">{log.date}</td>
                                    <td className="p-3 font-semibold text-blue-600">{log.customerName || log.projectId || "On-site Project"}</td>
                                    <td className="p-3 text-muted-foreground whitespace-nowrap">{siteLoc}</td>
                                    <td className="p-3 text-muted-foreground">{log.workDescription || "On-site servicing"}</td>
                                    <td className="p-3 font-mono text-slate-700">{log.inTime || "—"}</td>
                                    <td className="p-3 font-mono text-slate-700">{log.outTime || "Active"}</td>
                                    <td className="p-3 text-center font-bold text-foreground">{log.hoursWorked || 0} hrs</td>
                                    <td className="p-3 text-right font-bold text-emerald-600">
                                      ₹{Math.round(log.earnedMoney || 0).toLocaleString("en-IN")}
                                    </td>
                                    <td className="p-3 text-right pr-4">
                                      <Badge
                                        className={`text-[10px] ${
                                          log.verificationStatus === "Verified"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                        }`}
                                      >
                                        {log.verificationStatus || "Verified"}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* View 2: All Members Summary Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                    <tr>
                      <th className="p-3 pl-4">Labour Staff Member</th>
                      <th className="p-3">Staff Type</th>
                      <th className="p-3">Daily Wage (₹/day)</th>
                      <th className="p-3 text-center">Present Days</th>
                      <th className="p-3 text-center">Total Hours Worked</th>
                      <th className="p-3 text-right">Earned Payroll</th>
                      <th className="p-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLaboursSummary.map((item) => (
                      <tr key={item.labour.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-foreground">{item.labour.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {item.labour.type}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-purple-700">₹{item.dailyWageRate}/day</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{item.presentDays} days</td>
                        <td className="p-3 text-center font-bold text-slate-700">{item.totalHours.toFixed(1)} hrs</td>
                        <td className="p-3 text-right font-extrabold text-blue-700 text-sm">
                          ₹{Math.round(item.earnedWages).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right pr-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAttMemberFilter(item.labour.id)}
                            className="text-[10px] h-6 px-2 text-blue-600 border-blue-200 hover:bg-blue-50 font-bold rounded-md cursor-pointer"
                          >
                            View Timesheet
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. PAYROLL REPORT WITH CUSTOM DATE-TO-DATE & DOWNLOADABLE PDF */}
      {activeReport === "PAYROLL" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Weekly Workforce Payroll & Wage Settlement Summary
                </CardTitle>
                <CardDescription className="text-xs">
                  Accrued wage calculation based on verified daily hours and project assignments for accounting & salary disbursement.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => {
                    const dateLabel = `_${payrollStartDate}_to_${payrollEndDate}`;
                    handleExportCSV(
                      `Weekly_Payroll_Report${dateLabel}`,
                      [
                        "Labour ID",
                        "Labour Name",
                        "Employment Type",
                        "Daily Wage (₹/day)",
                        "Projects Worked",
                        "Days Present",
                        "Hours Worked",
                        "Amount Payable (INR)",
                      ],
                      filteredPayrollItems.map((item) => [
                        item.labourId,
                        item.labourName,
                        item.labourType,
                        item.dailyWage,
                        (item.distinctProjects || []).join("; ") || "General Duty",
                        item.daysPresent,
                        item.totalHours,
                        item.totalEarned,
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Payroll Excel ({filteredPayrollItems.length})
                </Button>

                <Button
                  size="sm"
                  disabled={isGeneratingPayrollPdf}
                  onClick={handleDownloadPayrollPdf}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  {isGeneratingPayrollPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  Download Payroll Report (PDF)
                </Button>
              </div>
            </div>

            {/* Quick Type Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Staff Type:</span>
              {[
                { id: "ALL", label: `All Workforce (${payrollData?.items?.length || 0})` },
                {
                  id: "Permanent",
                  label: `Permanent (${payrollData?.items?.filter((i) => i.labourType === "Permanent").length || 0})`,
                },
                {
                  id: "Contract",
                  label: `Contract (${payrollData?.items?.filter((i) => i.labourType === "Contract").length || 0})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPayrollTypeFilter(tab.id as any)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
                    payrollTypeFilter === tab.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interactive Filters Panel: Date-to-Date & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Period From (Date)</Label>
                <Input
                  type="date"
                  value={payrollStartDate}
                  onChange={(e) => setPayrollStartDate(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card font-mono"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Period To (Date)</Label>
                <Input
                  type="date"
                  value={payrollEndDate}
                  onChange={(e) => setPayrollEndDate(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card font-mono"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Staff or Project</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Worker Name, ID, Project..."
                    value={payrollSearchQuery}
                    onChange={(e) => setPayrollSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPayrollStartDate(sevenDaysAgoStr);
                    setPayrollEndDate(new Date().toISOString().slice(0, 10));
                    setPayrollTypeFilter("ALL");
                    setPayrollSearchQuery("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Live Financial Metrics Summary Bar */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-emerald-800 font-bold uppercase text-[10px]">Total Amount Payable</span>
                <p className="font-extrabold text-emerald-700 text-base sm:text-lg">
                  ₹{payrollFilteredTotals.totalPayable.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="space-y-0.5 border-l pl-3 border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-muted-foreground font-semibold text-[10px]">Total Days Worked</span>
                <p className="font-extrabold text-foreground text-sm sm:text-base">
                  {payrollFilteredTotals.totalDays} days
                </p>
              </div>

              <div className="space-y-0.5 border-l pl-3 border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-muted-foreground font-semibold text-[10px]">Total Hours Logged</span>
                <p className="font-extrabold text-foreground text-sm sm:text-base">
                  {payrollFilteredTotals.totalHours} hrs
                </p>
              </div>

              <div className="space-y-0.5 border-l pl-3 border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-muted-foreground font-semibold text-[10px]">Workforce Size</span>
                <p className="font-extrabold text-blue-700 text-sm sm:text-base">
                  {payrollFilteredTotals.count} Labourers
                </p>
              </div>
            </div>

            {isLoadingPayroll ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-semibold">Calculating weekly payroll from logged attendance and verified hours...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                    <tr>
                      <th className="p-3 pl-4 whitespace-nowrap">Labour Staff</th>
                      <th className="p-3 whitespace-nowrap">Type</th>
                      <th className="p-3 whitespace-nowrap">Projects Worked</th>
                      <th className="p-3 text-center whitespace-nowrap">Days Present</th>
                      <th className="p-3 text-center whitespace-nowrap">Hours Worked</th>
                      <th className="p-3 text-right whitespace-nowrap">Daily Wage (₹/day)</th>
                      <th className="p-3 text-right pr-4 whitespace-nowrap">Amount Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPayrollItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground font-medium">
                          No payroll entries or attendance records match the selected date range and filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPayrollItems.map((item) => (
                        <tr key={item.labourId} className="hover:bg-accent/40 transition-colors">
                          <td className="p-3 pl-4 font-bold text-foreground whitespace-nowrap">
                            <div>{item.labourName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono font-normal">
                              {item.labourId}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge
                              className={`text-[10px] ${
                                item.labourType === "Permanent"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-slate-800 text-white"
                              }`}
                            >
                              {item.labourType}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {(item.distinctProjects || []).length > 0 ? (
                                (item.distinctProjects || []).map((p, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-[10px] bg-slate-50 text-slate-700 border-slate-200"
                                  >
                                    {p}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs italic">No site deployments</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-foreground whitespace-nowrap">
                            {item.daysPresent} days
                          </td>
                          <td className="p-3 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {item.totalHours} hrs
                          </td>
                          <td className="p-3 text-right font-medium text-muted-foreground whitespace-nowrap">
                            ₹{item.dailyWage.toLocaleString("en-IN")}/day
                          </td>
                          <td className="p-3 text-right pr-4 font-extrabold text-emerald-700 text-sm whitespace-nowrap">
                            ₹{item.totalEarned.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredPayrollItems.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                      <tr>
                        <td className="p-3 pl-4 uppercase font-extrabold text-foreground" colSpan={3}>
                          Grand Total ({filteredPayrollItems.length} Labourers)
                        </td>
                        <td className="p-3 text-center font-extrabold text-foreground">
                          {payrollFilteredTotals.totalDays} days
                        </td>
                        <td className="p-3 text-center font-extrabold text-foreground">
                          {payrollFilteredTotals.totalHours} hrs
                        </td>
                        <td className="p-3 text-right text-muted-foreground font-normal">—</td>
                        <td className="p-3 text-right pr-4 font-extrabold text-emerald-700 text-base">
                          ₹{payrollFilteredTotals.totalPayable.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. MY ACTIVITY LOG TAB */}
      {activeReport === "NATURE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  My Activity Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily log of actions executed by <strong>{currentUser?.name || "Current User"}</strong> read from project activities.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const dateLabel = myActivityStartDate || myActivityEndDate ? ` (${myActivityStartDate} to ${myActivityEndDate})` : "";
                    handleExportPDF(
                      `My Activity Log Report - ${currentUser?.name || "User"}${dateLabel}`,
                      ["Date / Time", "Action (Event)", "Project", "Details", "Actor"],
                      filteredMyActivities.map((act) => [
                        act.timestamp,
                        act.event,
                        act.projectId || "N/A",
                        act.details,
                        act.actor,
                      ])
                    );
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" /> Download My Activity Report (PDF)
                </Button>
              </div>
            </div>

            {/* Actor Filter & Date Range Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* User Actor Filter */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">User Filter</Label>
                <select
                  value={myActivityActorFilter}
                  onChange={(e) => setMyActivityActorFilter(e.target.value)}
                  className="w-full h-8 text-xs font-semibold rounded-lg border border-border bg-white dark:bg-card px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CURRENT_USER">My Logins Only ({currentUser?.name || "Current User"})</option>
                  <option value="ALL">All Operations Users</option>
                </select>
              </div>

              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Activity Date From</Label>
                <Input
                  type="date"
                  value={myActivityStartDate}
                  onChange={(e) => setMyActivityStartDate(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card font-mono"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Activity Date To</Label>
                <Input
                  type="date"
                  value={myActivityEndDate}
                  onChange={(e) => setMyActivityEndDate(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card font-mono"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Log Details</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search action, project, details..."
                    value={myActivitySearchQuery}
                    onChange={(e) => setMyActivitySearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="p-3 bg-muted/20 border-b flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">
                Showing <b className="text-foreground">{filteredMyActivities.length}</b> activity log entries
                {myActivityStartDate && ` (From: ${myActivityStartDate})`}
                {myActivityEndDate && ` (To: ${myActivityEndDate})`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMyActivityStartDate(todayStr);
                  setMyActivityEndDate(todayStr);
                  setMyActivityActorFilter("CURRENT_USER");
                  setMyActivitySearchQuery("");
                }}
                className="h-6 px-2 text-[10px] rounded font-semibold border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Reset to Today
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4 whitespace-nowrap">Date / Time</th>
                    <th className="p-3 whitespace-nowrap">Action (Event)</th>
                    <th className="p-3 whitespace-nowrap">Project</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMyActivities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">
                        No activity logs recorded for the selected user and date range ({myActivityStartDate || "today"}).
                      </td>
                    </tr>
                  ) : (
                    filteredMyActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-mono text-muted-foreground whitespace-nowrap">
                          {act.timestamp}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                            {act.event}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-blue-600 whitespace-nowrap">
                          {act.projectId ? (
                            <Link to="/projects" search={{ openId: act.projectId }} className="hover:underline text-blue-600">
                              {act.projectId}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {act.details}
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

      {/* 7. CUSTOMER ACCOUNT LEDGER WITH DATE-TO-DATE CUSTOMIZATION & DOWNLOAD */}
      {activeReport === "CUSTOMER" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Customer Account Ledger & Lifetime Statements
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter clients by payment status, Date Range (Date-to-Date), and view or export client ledger statements.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = custLedgerStatusFilter === "ALL" ? "All_Clients" : custLedgerStatusFilter;
                    const dateLabel = custStartDateFilter || custEndDateFilter ? `_${custStartDateFilter}_to_${custEndDateFilter}` : "";
                    handleExportCSV(
                      `Customer_Account_Ledger_${statusLabel}${dateLabel}`,
                      ["Customer ID", "Customer Name", "Contact Phone", "Location", "Projects Count", "Total Lifetime Value (INR)", "Total Cash Received (INR)", "Outstanding Due (INR)", "Status"],
                      filteredCustomerLedgers.map((item) => [
                        item.customer.id,
                        item.customer.name,
                        item.customer.phone || "N/A",
                        item.customer.location || "N/A",
                        item.projectCount,
                        item.totalVal,
                        item.totalRec,
                        item.balanceDue,
                        item.balanceDue > 0 ? "Outstanding Due" : "Settled",
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Customer Ledger Excel ({filteredCustomerLedgers.length})
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    const statusLabel = custLedgerStatusFilter === "ALL" ? "All_Clients" : custLedgerStatusFilter;
                    const dateLabel = custStartDateFilter || custEndDateFilter ? ` (${custStartDateFilter} to ${custEndDateFilter})` : "";
                    handleExportPDF(
                      `Customer Account Ledger & Lifetime Statements - ${statusLabel}${dateLabel}`,
                      ["Customer ID", "Customer Name", "Contact Phone", "Location", "Projects", "Lifetime Value (INR)", "Cash Received (INR)", "Outstanding Due (INR)", "Status"],
                      filteredCustomerLedgers.map((item) => [
                        item.customer.id,
                        item.customer.name,
                        item.customer.phone || "N/A",
                        item.customer.location || "N/A",
                        item.projectCount,
                        `INR ${item.totalVal.toLocaleString("en-IN")}`,
                        `INR ${item.totalRec.toLocaleString("en-IN")}`,
                        `INR ${item.balanceDue.toLocaleString("en-IN")}`,
                        item.balanceDue > 0 ? "Outstanding Due" : "Settled",
                      ])
                    );
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" /> Download PDF Report
                </Button>
              </div>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Ledger Status:</span>
              {[
                { id: "ALL", label: `All Clients (${customers.length})` },
                {
                  id: "DUE",
                  label: `Outstanding Due Only (${
                    customers.filter((c) => {
                      const cProjs = projects.filter((p) => p.customerName.toLowerCase().trim() === c.name.toLowerCase().trim());
                      const val = cProjs.reduce((s, p) => s + p.projectValue, 0);
                      const rec = cProjs.reduce((s, p) => s + p.receivedAmount, 0);
                      return val - rec > 0;
                    }).length
                  })`,
                },
                {
                  id: "SETTLED",
                  label: `Fully Settled (${
                    customers.filter((c) => {
                      const cProjs = projects.filter((p) => p.customerName.toLowerCase().trim() === c.name.toLowerCase().trim());
                      const val = cProjs.reduce((s, p) => s + p.projectValue, 0);
                      const rec = cProjs.reduce((s, p) => s + p.receivedAmount, 0);
                      return val > 0 && val - rec === 0;
                    }).length
                  })`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustLedgerStatusFilter(tab.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer ${
                    custLedgerStatusFilter === tab.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interactive Filters Panel: Date-to-Date & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
              {/* Date From */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Project Date From (Date)</Label>
                <Input
                  type="date"
                  value={custStartDateFilter}
                  onChange={(e) => setCustStartDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Date To */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Project Date To (Date)</Label>
                <Input
                  type="date"
                  value={custEndDateFilter}
                  onChange={(e) => setCustEndDateFilter(e.target.value)}
                  className="h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                />
              </div>

              {/* Search input */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Customer Ledger</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer Name, Phone, Location..."
                    value={custSearchQuery}
                    onChange={(e) => setCustSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg border-border bg-white dark:bg-card"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustLedgerStatusFilter("ALL");
                    setCustStartDateFilter("");
                    setCustEndDateFilter("");
                    setCustSearchQuery("");
                  }}
                  className="w-full h-8 text-xs rounded-lg font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Live Financial Metrics Bar */}
            <div className="p-3 bg-muted/20 border-b grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-muted-foreground font-semibold">Filtered Lifetime Value:</span>
                <span className="font-extrabold text-foreground">₹{grandTotalLifetimeVal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-2 border-y sm:border-y-0 sm:border-x border-border/60 py-1 sm:py-0">
                <span className="text-muted-foreground font-semibold">Cash Collected:</span>
                <span className="font-extrabold text-emerald-600">₹{grandTotalCashReceived.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-muted-foreground font-semibold">Total Balance Due:</span>
                <span className="font-extrabold text-rose-600">₹{grandTotalOutstandingDue.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Customer Name</th>
                    <th className="p-3">Contact Phone</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-center">Projects</th>
                    <th className="p-3">Lifetime Value</th>
                    <th className="p-3">Cash Received</th>
                    <th className="p-3 font-bold text-rose-600">Outstanding Balance</th>
                    <th className="p-3 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomerLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                        No customer accounts match the selected ledger filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomerLedgers.map((item) => (
                      <tr key={item.customer.id} className="hover:bg-accent/40">
                        <td className="p-3 pl-4 font-bold text-foreground">{item.customer.name}</td>
                        <td className="p-3 text-muted-foreground font-mono">{item.customer.phone || "N/A"}</td>
                        <td className="p-3 text-muted-foreground">{item.customer.location || "N/A"}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{item.projectCount}</td>
                        <td className="p-3 font-bold text-foreground">₹{item.totalVal.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-emerald-600">₹{item.totalRec.toLocaleString("en-IN")}</td>
                        <td className="p-3 font-extrabold text-rose-600 text-sm">
                          ₹{item.balanceDue.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right pr-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCustomerLedger(item)}
                            className="text-[10px] h-6 px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50 font-bold rounded-lg cursor-pointer gap-1"
                          >
                            <Eye className="h-3 w-3" /> View Statement
                          </Button>
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
                            <td className="p-3 pl-4 font-bold text-purple-700 dark:text-purple-400">{ref}</td>
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

      {/* VIEW WORK DONE DETAILS & DOWNLOAD MODAL */}
      <Dialog open={Boolean(selectedWorkDoneItem)} onOpenChange={(open) => !open && setSelectedWorkDoneItem(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          {selectedWorkDoneItem && (
            <>
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="flex items-center justify-between gap-2 text-base font-extrabold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 grid place-items-center border border-blue-200">
                      <Wrench className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span>Work Done Verification Log</span>
                      <p className="text-xs font-normal text-muted-foreground">
                        <Link to="/projects" search={{ openId: selectedWorkDoneItem.projectId }} className="hover:underline text-blue-600 hover:text-blue-700 font-semibold">
                          {selectedWorkDoneItem.projectId}
                        </Link> • {selectedWorkDoneItem.customerName}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                    {selectedWorkDoneItem.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Key Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Activity Date</span>
                    <p className="font-extrabold text-foreground font-mono mt-0.5">{selectedWorkDoneItem.date}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Hours Logged</span>
                    <p className="font-extrabold text-foreground mt-0.5">{selectedWorkDoneItem.hoursLogged} hrs</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-600 uppercase font-bold">Lead Engineer</span>
                    <p className="font-extrabold text-purple-700 mt-0.5">{selectedWorkDoneItem.engineerName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 uppercase font-bold">Staff On Duty</span>
                    <p className="font-extrabold text-blue-700 mt-0.5">{selectedWorkDoneItem.staffOnDuty}</p>
                  </div>
                </div>

                {/* Work Done Detailed Notes */}
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl space-y-1">
                  <h4 className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    Detailed Work Done Summary
                  </h4>
                  <p className="text-xs text-foreground font-medium leading-relaxed">
                    {selectedWorkDoneItem.activitySummary}
                  </p>
                </div>

                {/* Worksite Geolocation & Verification Info */}
                <div className="p-3 border border-border rounded-xl flex items-center justify-between bg-white dark:bg-card">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Worksite Geolocation</span>
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> {selectedWorkDoneItem.location}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedWorkDoneItem.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors"
                  >
                    Open GPS Map <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedWorkDoneItem(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleExportCSV(
                      `Work_Done_${selectedWorkDoneItem.projectId}_${selectedWorkDoneItem.date}`,
                      ["Project ID", "Customer Name", "Work Category", "Activity Date", "Lead Engineer", "Staff On Duty", "Work Done Description", "Hours Logged", "Location", "Status"],
                      [[
                        selectedWorkDoneItem.projectId,
                        selectedWorkDoneItem.customerName,
                        selectedWorkDoneItem.workCategory,
                        selectedWorkDoneItem.date,
                        selectedWorkDoneItem.engineerName,
                        selectedWorkDoneItem.staffOnDuty,
                        selectedWorkDoneItem.activitySummary,
                        selectedWorkDoneItem.hoursLogged,
                        selectedWorkDoneItem.location,
                        selectedWorkDoneItem.status,
                      ]]
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-md px-4"
                >
                  <Download className="h-3.5 w-3.5" /> Download Work Done Record (CSV)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW CUSTOMER STATEMENT / ACCOUNT LEDGER MODAL */}
      <Dialog open={Boolean(selectedCustomerLedger)} onOpenChange={(open) => !open && setSelectedCustomerLedger(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          {selectedCustomerLedger && (
            <>
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="flex items-center justify-between gap-2 text-base font-extrabold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 grid place-items-center border border-blue-200">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span>Client Lifetime Account Statement</span>
                      <p className="text-xs font-normal text-muted-foreground">
                        {selectedCustomerLedger.customer.name} • {selectedCustomerLedger.customer.phone || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] ${
                      selectedCustomerLedger.balanceDue > 0
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {selectedCustomerLedger.balanceDue > 0 ? "Outstanding Balance" : "Fully Settled"}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Lifetime Summary Bar */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Lifetime Value</span>
                    <p className="font-extrabold text-foreground text-sm mt-0.5">₹{selectedCustomerLedger.totalVal.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase font-bold">Cash Received</span>
                    <p className="font-extrabold text-emerald-600 text-sm mt-0.5">₹{selectedCustomerLedger.totalRec.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 uppercase font-bold">Balance Due</span>
                    <p className="font-extrabold text-rose-600 text-sm mt-0.5">₹{selectedCustomerLedger.balanceDue.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Customer Projects Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Client Projects Ledger ({selectedCustomerLedger.projects.length})</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Location: {selectedCustomerLedger.customer.location || "N/A"}</span>
                  </h4>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2.5 pl-3">Project ID</th>
                          <th className="p-2.5">Work Description</th>
                          <th className="p-2.5">Scheduled Date</th>
                          <th className="p-2.5">Contract Value</th>
                          <th className="p-2.5">Received</th>
                          <th className="p-2.5 text-right pr-3 font-bold text-rose-600">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedCustomerLedger.projects.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              No project deployments registered for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          selectedCustomerLedger.projects.map((p: any) => (
                            <tr key={p.id} className="hover:bg-accent/40">
                              <td className="p-2.5 pl-3 font-bold text-blue-600">
                                <Link to="/projects" search={{ openId: p.id }} className="hover:underline text-blue-600 hover:text-blue-700">
                                  {p.id}
                                </Link>
                              </td>
                              <td className="p-2.5 font-medium text-foreground">{p.natureOfWork}</td>
                              <td className="p-2.5 font-mono text-muted-foreground">{p.scheduledDate || "N/A"}</td>
                              <td className="p-2.5 font-semibold">₹{(p.projectValue || 0).toLocaleString("en-IN")}</td>
                              <td className="p-2.5 font-bold text-emerald-600">₹{(p.receivedAmount || 0).toLocaleString("en-IN")}</td>
                              <td className="p-2.5 text-right pr-3 font-extrabold text-rose-600">
                                ₹{(p.balanceAmount || 0).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCustomerLedger(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleExportCSV(
                      `Client_Statement_${selectedCustomerLedger.customer.name.replace(/\s+/g, "_")}`,
                      ["Project ID", "Customer Name", "Work Description", "Scheduled Date", "Contract Value (INR)", "Amount Received (INR)", "Balance Due (INR)", "Payment Status"],
                      selectedCustomerLedger.projects.map((p: any) => [
                        p.id,
                        p.customerName,
                        p.natureOfWork || "N/A",
                        p.scheduledDate || "N/A",
                        p.projectValue || 0,
                        p.receivedAmount || 0,
                        p.balanceAmount || 0,
                        p.paymentStatus || "Unpaid",
                      ])
                    );
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-md px-4"
                >
                  <Download className="h-3.5 w-3.5" /> Download Client Statement (CSV)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW PROJECT WORK DONE HISTORY TILL DATE MODAL */}
      <Dialog open={Boolean(selectedWorkProject)} onOpenChange={(open) => !open && setSelectedWorkProject(null)}>
        <DialogContent className="max-w-3xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          {selectedWorkProject && (
            <>
              <DialogHeader className="border-b pb-3">
                <DialogTitle className="flex items-center justify-between gap-2 text-base font-extrabold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 grid place-items-center border border-blue-200">
                      <Wrench className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span>Complete Work History Till Date</span>
                      <p className="text-xs font-normal text-muted-foreground">
                        <Link to="/projects" search={{ openId: selectedWorkProject.projectId }} className="hover:underline text-blue-600 hover:text-blue-700 font-semibold">
                          {selectedWorkProject.projectId}
                        </Link> • {selectedWorkProject.customerName} ({selectedWorkProject.workCategory})
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] ${
                      selectedWorkProject.status === "Ongoing"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : selectedWorkProject.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {selectedWorkProject.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Project Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-muted/30 p-3 rounded-xl border border-slate-200 dark:border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Shifts Logged</span>
                    <p className="font-extrabold text-foreground text-sm mt-0.5">{selectedWorkProject.totalShifts} shifts</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 uppercase font-bold">Hours Worked Till Date</span>
                    <p className="font-extrabold text-blue-600 text-sm mt-0.5">{selectedWorkProject.totalHours.toFixed(1)} hrs</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-600 uppercase font-bold">Lead Engineer</span>
                    <p className="font-extrabold text-purple-700 text-sm mt-0.5">{selectedWorkProject.engineerName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase font-bold">Contract Value</span>
                    <p className="font-extrabold text-emerald-600 text-sm mt-0.5">₹{selectedWorkProject.contractValue.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Machinery & Equipment Deployed Section */}
                {(() => {
                  const projMachines = machineIssues.filter((mi) => mi.projectId === selectedWorkProject.projectId);
                  return (
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-muted/20 border border-slate-200 dark:border-border">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-indigo-600" /> Allocated Machinery & Tooling Equipment ({projMachines.length})
                      </h4>
                      {projMachines.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                          Standard robotics servicing kit & high-pressure pump active on site.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {projMachines.map((mi) => (
                            <span key={mi.id} className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                              {mi.machineName} ({mi.issueDate})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Assigned Field Crew Section */}
                {(() => {
                  const assignedCrew = labours.filter((l) =>
                    selectedWorkProject.projectObj?.assignedLabourIds?.includes(l.id)
                  );
                  return (
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-muted/20 border border-slate-200 dark:border-border">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-purple-600" /> Assigned Labour Crew ({assignedCrew.length})
                      </h4>
                      {assignedCrew.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                          Field technicians assigned per shift schedule.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedCrew.map((lab) => (
                            <span key={lab.id} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                              {lab.name} ({lab.type} • ₹{lab.defaultWeeklyWage}/wk)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Chronological Work History Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Shift Execution Logs & Work Done (Till Date)</span>
                    <span className="text-[11px] font-normal text-muted-foreground">Location: {selectedWorkProject.location}</span>
                  </h4>

                  <div className="overflow-x-auto rounded-xl border border-border max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium sticky top-0 bg-white dark:bg-card">
                        <tr>
                          <th className="p-2.5 pl-3">Shift Date</th>
                          <th className="p-2.5">Staff On Duty</th>
                          <th className="p-2.5">Work Done Description</th>
                          <th className="p-2.5 text-center">In - Out Time</th>
                          <th className="p-2.5 text-center">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedWorkProject.logs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-muted-foreground">
                              No individual shift logs logged for this project yet. Project initialized on {selectedWorkProject.latestDate}.
                            </td>
                          </tr>
                        ) : (
                          selectedWorkProject.logs.map((log: any, idx: number) => (
                            <tr key={`${log.date}_${idx}`} className="hover:bg-accent/40">
                              <td className="p-2.5 pl-3 font-bold text-foreground font-mono">{log.date}</td>
                              <td className="p-2.5 font-semibold text-blue-600">{log.labourName || "Staff Member"}</td>
                              <td className="p-2.5 font-medium text-foreground max-w-xs">{log.workDescription || "On-site operations"}</td>
                              <td className="p-2.5 text-center font-mono text-muted-foreground text-[11px]">
                                {log.inTime || "09:00"} - {log.outTime || "17:00"}
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-700">
                                {log.hoursWorked ? `${log.hoursWorked}h` : "8h"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedWorkProject(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      handleExportCSV(
                        `Project_Work_History_${selectedWorkProject.projectId}_Till_Date`,
                        ["Project ID", "Customer Name", "Work Category", "Shift Date", "Staff On Duty", "Work Done Description", "In Time", "Out Time", "Hours Worked", "Verification"],
                        selectedWorkProject.logs.length > 0
                          ? selectedWorkProject.logs.map((log: any) => [
                              selectedWorkProject.projectId,
                              selectedWorkProject.customerName,
                              selectedWorkProject.workCategory,
                              log.date,
                              log.labourName || "Staff Member",
                              log.workDescription || "On-site operations",
                              log.inTime || "09:00",
                              log.outTime || "17:00",
                              log.hoursWorked || 8,
                              log.verificationStatus || "Verified",
                            ])
                          : [[
                              selectedWorkProject.projectId,
                              selectedWorkProject.customerName,
                              selectedWorkProject.workCategory,
                              selectedWorkProject.latestDate,
                              "Unassigned",
                              selectedWorkProject.latestWorkSummary,
                              "N/A",
                              "N/A",
                              0,
                              selectedWorkProject.status,
                            ]]
                      );
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-md px-3.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Excel (CSV)
                  </Button>

                  <Button
                    onClick={() => {
                      handleExportPDF(
                        `Project Work History & Shift Logs - ${selectedWorkProject.projectId} (${selectedWorkProject.customerName})`,
                        ["Shift Date", "Staff On Duty", "Work Done Description", "In - Out Time", "Hours Logged", "Verification Status"],
                        selectedWorkProject.logs.length > 0
                          ? selectedWorkProject.logs.map((log: any) => [
                              log.date,
                              log.labourName || "Staff Member",
                              log.workDescription || "On-site operations",
                              `${log.inTime || "09:00"} - ${log.outTime || "17:00"}`,
                              `${log.hoursWorked || 8}h`,
                              log.verificationStatus || "Verified",
                            ])
                          : [[
                              selectedWorkProject.latestDate,
                              "Unassigned",
                              selectedWorkProject.latestWorkSummary,
                              "N/A",
                              "0h",
                              selectedWorkProject.status,
                            ]]
                      );
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-md px-3.5"
                  >
                    <FileText className="h-3.5 w-3.5" /> Download PDF Report
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
