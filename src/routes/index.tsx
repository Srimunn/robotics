import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRobotics, calculateHoursFromTimes, calculateEarnedWage } from "@/lib/robotics-context";
import type {
  Enquiry,
  Project,
  Labour,
  Payment,
  ProjectStatus,
  SiteVisitStatus,
  LabourType,
  PaymentMode,
} from "@/lib/robotics-types";
import {
  PhoneCall,
  UserCheck,
  FileText,
  CheckCircle2,
  FolderKanban,
  Clock,
  CheckCheck,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Coins,
  Users,
  Calendar,
  CalendarCheck,
  ArrowRight,
  MapPin,
  Sparkles,
  Plus,
  PlayCircle,
  HardHat,
  DollarSign,
  User,
  UserPlus,
  Receipt,
  Activity,
  Check,
  ChevronRight,
  Eye,
  AlertCircle,
  ShieldAlert,
  Building2,
  Phone,
  Wrench,
  Boxes,
  Package,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const {
    currentUser,
    enquiries,
    projects,
    payments,
    labours,
    attendance,
    engineers,
    checkEngineerAvailability,
    settings,
    machines,
    materials,
    machineIssues,
    materialIssues,
    addEnquiry,
    updateEnquiry,
    updateProject,
    updateProjectStatus,
    recordAttendance,
    addPayment,
    addLabour,
    addMasterDataItem,
    updateProjectLabourLog,
  } = useRobotics();

  console.log({ role: currentUser?.role, enquiriesCount: enquiries.length, projectsCount: projects.length });

  const navigate = useNavigate();

  // Floating & Quick Action Dialog States
  const [newEnqOpen, setNewEnqOpen] = useState(false);
  const [assignEngOpen, setAssignEngOpen] = useState(false);
  const [recordPayOpen, setRecordPayOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [addLabourOpen, setAddLabourOpen] = useState(false);

  // Selected Target States for Modals
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>("");
  const [selectedEngId, setSelectedEngId] = useState<string>("");

  const [selectedPayProjectId, setSelectedPayProjectId] = useState<string>("");
  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [payModeInput, setPayModeInput] = useState<PaymentMode>("Bank Transfer");
  const [payRefInput, setPayRefInput] = useState<string>("");

  const [selectedAttLabourId, setSelectedAttLabourId] = useState<string>("");
  const [attInTimeInput, setAttInTimeInput] = useState<string>("09:00 AM");
  const [attOutTimeInput, setAttOutTimeInput] = useState<string>("06:00 PM");

  // Form Inputs for New Enquiry
  const [enqCustName, setEnqCustName] = useState("");
  const [enqPhone, setEnqPhone] = useState("");
  const [enqLocation, setEnqLocation] = useState("");
  const [enqLeakageType, setEnqLeakageType] = useState("Robotic Arm Oil Leakage & Joint Seal");
  const [enqLeadSource, setEnqLeadSource] = useState("Phone Call");
  const [enqReferredBy, setEnqReferredBy] = useState("");
  const [enqEngineerName, setEnqEngineerName] = useState("Er. Rajesh Kumar");
  const [enqEngineerId, setEnqEngineerId] = useState("");
  const [enqSiteVisitDate, setEnqSiteVisitDate] = useState("2026-08-07");
  const [enqQuotationAmount, setEnqQuotationAmount] = useState<number>(0);
  const [enqWorkCommittedDate, setEnqWorkCommittedDate] = useState("2026-08-15");
  const [enqActualWorkStartedDate, setEnqActualWorkStartedDate] = useState("");
  const [enqRemarks, setEnqRemarks] = useState("");

  // Form Inputs for New Labour
  const [labourName, setLabourName] = useState("");
  const [labourPhone, setLabourPhone] = useState("");
  const [labourType, setLabourType] = useState<LabourType>("Permanent");
  const [labourWage, setLabourWage] = useState<number>(1400);
  const [labourSkillsStr, setLabourSkillsStr] = useState("Robotic Joint Seals, Servicing");

  // Details Cockpit Dialog States
  const [activeSiteVisitEnquiry, setActiveSiteVisitEnquiry] = useState<Enquiry | null>(null);
  const [activeProjectModal, setActiveProjectModal] = useState<Project | null>(null);

  // ---------------------------------------------------------------------------
  // TODAY'S CALCULATED METRICS
  // ---------------------------------------------------------------------------
  const realTodayStr = new Date().toISOString().slice(0, 10);
  const seedTodayStr = "2026-07-28";
  const todayStr = realTodayStr;

  // Card 1: Today's Site Visits (Enquiries with siteVisitDate or assigned engineer)
  const todaysSiteVisits = enquiries.filter(
    (e) => e.siteVisitStatus !== "Completed" || e.siteVisitDate === todayStr || e.siteVisitDate === seedTodayStr
  );

  // Card 2: Today's Scheduled / Ongoing Projects
  const todaysScheduledProjects = projects.filter(
    (p) => p.status === "Scheduled" || p.status === "Waiting" || p.status === "Ongoing"
  );

  // Card 3: Permanent Labour Yet To Check In (Assigned today, type === "Permanent", no In Time logged)
  const permanentLabourPendingCheckIn = labours.filter((l) => {
    if (l.type !== "Permanent") return false;
    const attRecord = attendance[`${l.id}_${todayStr}`] || attendance[`${l.id}_${seedTodayStr}`];
    const isCheckedIn = attRecord && attRecord.status === "Present" && Boolean(attRecord.inTime);
    return !isCheckedIn;
  });

  // Card 4: Pending Payments (Outstanding Amount > 0)
  const pendingPaymentsProjects = projects.filter((p) => p.balanceAmount > 0);

  // Card 5: Today's Completed Works
  const todaysCompletedWorks = projects.filter(
    (p) => p.status === "Completed" || p.status === "Closed"
  );

  // Today's Summary Right Side Panel Indicators
  const newEnquiriesToday = enquiries.filter(
    (e) =>
      e.enquiryDate === todayStr ||
      e.enquiryDate === seedTodayStr ||
      e.customerDecision === "Thinking" ||
      e.customerDecision === "Follow-up" ||
      e.customerDecision === "Follow Up" ||
      e.customerStatus === "Prospective"
  ).length;

  const siteVisitsCompletedCount = enquiries.filter(
    (e) => e.siteVisitStatus === "Completed"
  ).length;

  // Machine & Material KPI Calculations
  const kpiTotalMachines = machines.reduce((acc, m) => acc + m.currentStock, 0);
  const kpiAvailableMachines = machines.reduce((acc, m) => acc + m.availableQuantity, 0);
  const kpiIssuedMachines = machines.reduce((acc, m) => acc + m.issuedQuantity, 0);
  const kpiMachinesUnderRepair = machines.reduce((acc, m) => acc + m.repairQuantity, 0);
  const kpiLowStockMaterials = materials.filter((m) => m.currentStock <= m.minimumStock).length;
  const kpiTotalInventoryValuation = materials.reduce((acc, m) => acc + m.currentStock * m.purchaseCost, 0);
  const kpiTodaysMaterialConsumption = materialIssues
    .filter((mi) => mi.issueDate === todayStr || mi.issueDate === seedTodayStr)
    .reduce((acc, mi) => acc + (mi.totalCost || 0), 0);
  const kpiTodaysMachineIssues = machineIssues.filter((mi) => mi.issueDate === todayStr || mi.issueDate === seedTodayStr).length;

  const projectsStartedCount = projects.filter(
    (p) => p.status === "Ongoing"
  ).length;

  const projectsCompletedCount = todaysCompletedWorks.length;

  const totalCollectionToday = payments.reduce((sum, p) => sum + p.amount, 0);

  const totalRevenue = projects.reduce((sum, p) => sum + p.projectValue, 0);
  const amountCollected = projects.reduce((sum, p) => sum + p.receivedAmount, 0);
  const totalOutstandingAmount = Math.max(0, totalRevenue - amountCollected);

  const permanentLabourWorkingCount = labours.filter((l) => {
    if (l.type !== "Permanent") return false;
    const rec = attendance[`${l.id}_${todayStr}`] || attendance[`${l.id}_${seedTodayStr}`];
    return rec && rec.status === "Present";
  }).length;

  const contractLabourWorkingCount = labours.filter((l) => {
    if (l.type !== "Contract") return false;
    const rec = attendance[`${l.id}_${todayStr}`] || attendance[`${l.id}_${seedTodayStr}`];
    return rec && rec.status === "Present";
  }).length;

  // Helper to convert time string (e.g. "05:30 PM", "11:49 AM", "09:00 AM") to 24-hour minutes for strict chronological sorting
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    try {
      const parts = timeStr.trim().split(" ");
      const [hStr, mStr] = parts[0].split(":");
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || "0", 10);
      if (parts[1]) {
        const mer = parts[1].toUpperCase();
        if (mer === "PM" && h < 12) h += 12;
        if (mer === "AM" && h === 12) h = 0;
      }
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  // State for Timeline Category Quick Filter
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<"ALL" | "SHIFTS" | "PROJECTS" | "PAYMENTS" | "EQUIPMENT">("ALL");

  // Dynamic Live Recent Activity Timeline (Tracks status changes to Ongoing, machines added, labour shifts, site visits & payments)
  const recentActivitiesTimeline = (() => {
    const events: Array<{
      id: string;
      time: string;
      date: string;
      title: string;
      subtitle: string;
      category: "SHIFTS" | "PROJECTS" | "PAYMENTS" | "EQUIPMENT";
      type: "checkin" | "payment" | "assignment" | "started" | "completed" | "machine" | "material" | "update";
      badgeText: string;
      badgeColor: string;
      projectObj?: Project;
      enquiryObj?: Enquiry;
    }> = [];

    const realTodayStr = new Date().toISOString().slice(0, 10);
    const uniqueKeys = new Set<string>();

    const pushUnique = (evt: typeof events[0]) => {
      const key = `${evt.title}_${evt.time}_${evt.date}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        events.push(evt);
      }
    };

    // 1. SHIFT LOGS & LABOUR CHECK-INS (FROM ALL PROJECTS)
    projects.forEach((proj) => {
      (proj.labourLogs || []).forEach((log) => {
        pushUnique({
          id: `log_${log.labourId}_${log.date}_${log.inTime}`,
          time: log.inTime || "09:00 AM",
          date: log.date || realTodayStr,
          title: `${log.labourName} checked in on ${proj.customerName} (${proj.id})`,
          subtitle: log.workDescription || "On-site robotic servicing check-in",
          category: "SHIFTS",
          type: "checkin",
          badgeText: log.outTime ? "Shift Completed" : "Live Duty On-Site",
          badgeColor: log.outTime
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-blue-50 text-blue-700 border-blue-200 font-bold",
          projectObj: proj,
        });
      });

      // 2. PROJECT ACTIVITIES & AUDIT LOGS
      (proj.activities || []).forEach((act) => {
        pushUnique({
          id: `act_${act.id}`,
          time: act.timestamp?.slice(11, 16) || "10:00 AM",
          date: act.timestamp?.slice(0, 10) || realTodayStr,
          title: `${act.event} on ${proj.customerName} (${proj.id})`,
          subtitle: `${act.details || "Project update logged"} • By ${act.actor || "Engineer"}`,
          category: "PROJECTS",
          type: "update",
          badgeText: "Project Activity",
          badgeColor: "bg-blue-50 text-blue-800 border-blue-200 font-bold",
          projectObj: proj,
        });
      });

      // 3. PROJECT STATUS TRANSITIONS & HISTORY
      (proj.statusHistory || []).forEach((sh: any, idx) => {
        const dateStr = String(sh.timestamp || sh.updatedAt || realTodayStr);
        pushUnique({
          id: `sh_${proj.id}_${idx}`,
          time: dateStr.length >= 16 ? dateStr.slice(11, 16) : "09:00 AM",
          date: dateStr.length >= 10 ? dateStr.slice(0, 10) : realTodayStr,
          title: `Project ${proj.id} (${proj.customerName}) status changed to ${(sh.status || "").toUpperCase()}`,
          subtitle: `Updated by ${sh.updatedBy || "Supervisor"} • Nature of Work: ${proj.natureOfWork}`,
          category: "PROJECTS",
          type: sh.status === "Completed" ? "completed" : sh.status === "Ongoing" ? "started" : "update",
          badgeText: `Status: ${sh.status}`,
          badgeColor: sh.status === "Completed"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold"
            : sh.status === "Ongoing"
            ? "bg-amber-50 text-amber-800 border-amber-200 font-bold"
            : "bg-blue-50 text-blue-800 border-blue-200 font-bold",
          projectObj: proj,
        });
      });

      // Current Project status fallback
      if (proj.status === "Ongoing") {
        pushUnique({
          id: `status_ongoing_${proj.id}`,
          time: "09:00 AM",
          date: proj.actualWorkStartedDate || proj.scheduledDate || realTodayStr,
          title: `Project ${proj.id} (${proj.customerName}) status set to ONGOING`,
          subtitle: `Nature of Work: ${proj.natureOfWork} • Location: ${proj.location}`,
          category: "PROJECTS",
          type: "started",
          badgeText: "Ongoing Work",
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
          projectObj: proj,
        });
      } else if (proj.status === "Completed") {
        pushUnique({
          id: `status_completed_${proj.id}`,
          time: "05:30 PM",
          date: proj.scheduledDate || realTodayStr,
          title: `Project ${proj.id} (${proj.customerName}) marked COMPLETED`,
          subtitle: `Contract Value: ₹${(proj.projectValue || 0).toLocaleString("en-IN")} • Lead Engineer: ${proj.assignedEngineerName || "Er. Rajesh Kumar"}`,
          category: "PROJECTS",
          type: "completed",
          badgeText: "Project Completed",
          badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold",
          projectObj: proj,
        });
      }

      // 4. CREW / WORKER ASSIGNMENTS TO PROJECTS
      (proj.labourAssignments || []).forEach((la) => {
        pushUnique({
          id: `la_${proj.id}_${la.labourId}`,
          time: "08:30 AM",
          date: la.assignedDate || realTodayStr,
          title: `Labour ${la.labourName} (${la.labourType}) assigned to ${proj.customerName} (${proj.id})`,
          subtitle: `Weekly Wage: ₹${la.weeklyWage} • Site Location: ${proj.location}`,
          category: "SHIFTS",
          type: "assignment",
          badgeText: "Labour Assigned",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200 font-bold",
          projectObj: proj,
        });
      });

      // 5. PAYMENT MILESTONE STAGES
      (proj.paymentStages || []).forEach((stg) => {
        pushUnique({
          id: `stg_${stg.id}`,
          time: "02:30 PM",
          date: stg.paidDate || stg.dueDate || realTodayStr,
          title: `Milestone Stage (${stg.stageName}): ₹${(stg.amount || 0).toLocaleString("en-IN")} for ${proj.customerName} (${proj.id})`,
          subtitle: `Stage Status: ${stg.status} • Reference: ${stg.referenceNumber || "Bank Transfer"}`,
          category: "PAYMENTS",
          type: "payment",
          badgeText: `Milestone: ${stg.status}`,
          badgeColor: stg.status === "Paid"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-black"
            : "bg-amber-50 text-amber-800 border-amber-200 font-bold",
          projectObj: proj,
        });
      });
    });

    // 3. MACHINES & EQUIPMENT ALLOCATED
    machineIssues.forEach((mi: any) => {
      const proj = projects.find((p) => p.id === mi.projectId);
      const issueDateStr = String(mi.issueDate || realTodayStr);
      pushUnique({
        id: `mi_${mi.id}`,
        time: "10:15 AM",
        date: issueDateStr.length >= 10 ? issueDateStr.slice(0, 10) : realTodayStr,
        title: `Machine Added: ${mi.machineName}`,
        subtitle: `Issued by ${mi.issuedBy || mi.issuedTo || "Site Crew"} for Project ${mi.projectId} (${proj?.customerName || "Site"})`,
        category: "EQUIPMENT",
        type: "machine",
        badgeText: "Machine Added",
        badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200 font-bold",
        projectObj: proj,
      });
    });

    machines.forEach((m: any) => {
      if (m.issuedQuantity > 0) {
        const linkedProj = projects.find((p) => p.natureOfWork?.toLowerCase().includes((m.category || "").toLowerCase()) || p.id === m.assignedProjectId);
        pushUnique({
          id: `m_${m.id}`,
          time: "10:30 AM",
          date: realTodayStr,
          title: `Equipment Deployed: ${m.toolName || m.name}`,
          subtitle: `${m.category} active on site (${m.issuedQuantity} unit(s) in service)`,
          category: "EQUIPMENT",
          type: "machine",
          badgeText: "Active Equipment",
          badgeColor: "bg-purple-50 text-purple-800 border-purple-200 font-bold",
          projectObj: linkedProj,
        });
      }
    });

    // 4. PAYMENTS RECEIVED
    payments.forEach((pay) => {
      const proj = projects.find((p) => p.id === pay.projectId);
      pushUnique({
        id: `pay_${pay.id}`,
        time: "02:30 PM",
        date: pay.paymentDate || realTodayStr,
        title: `Payment Received: ₹${pay.amount.toLocaleString("en-IN")} for ${proj ? proj.customerName : pay.projectId}`,
        subtitle: `Payment Mode: ${pay.mode} • Ref Number: ${pay.referenceNumber}`,
        category: "PAYMENTS",
        type: "payment",
        badgeText: `₹${pay.amount.toLocaleString("en-IN")}`,
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200 font-black",
        projectObj: proj,
      });
    });

    // 5. ENQUIRIES & SITE VISITS
    enquiries.forEach((enq) => {
      if (enq.assignedEngineerName) {
        pushUnique({
          id: `enq_${enq.id}`,
          time: "09:00 AM",
          date: enq.enquiryDate || realTodayStr,
          title: `Engineer ${enq.assignedEngineerName} assigned for site visit`,
          subtitle: `Customer: ${enq.customerName} • Location: ${enq.location}`,
          category: "PROJECTS",
          type: "assignment",
          badgeText: enq.siteVisitStatus || "Assigned",
          badgeColor: "bg-purple-50 text-purple-800 border-purple-200 font-bold",
          enquiryObj: enq,
        });
      }
    });

    // Sort strictly by 24-hour time descending (e.g. 05:30 PM at top, 02:30 PM, 11:49 AM, 10:42 AM, 09:15 AM, 09:00 AM, 08:30 AM)
    return events.sort((a, b) => parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time));
  })();

  // Quick Action Handlers
  const handleCreateEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enqCustName.trim() || !enqPhone.trim()) {
      toast.error("Please enter Customer Name and Phone Number");
      return;
    }
    const cleanEnqPhone = enqPhone.replace(/\D/g, "");
    if (cleanEnqPhone.length < 10) {
      toast.error("Phone Number must be at least 10 digits");
      return;
    }
    if (cleanEnqPhone.length > 10) {
      toast.error("Mobile Number cannot exceed 10 digits");
      return;
    }

    const eng = engineers.find((x) => x.id === enqEngineerId || x.name === enqEngineerName);

    addEnquiry({
      enquiryDate: todayStr,
      customerName: enqCustName,
      phone: enqPhone,
      location: enqLocation || "Plot 42, Industrial Park, HITEC City, Hyderabad",
      leadSource: enqLeadSource || "Phone Call",
      referredBy: enqReferredBy,
      leakageType: enqLeakageType || "Robotic Arm Oil Leakage & Joint Seal",
      assignedEngineerId: eng?.id || undefined,
      assignedEngineerName: eng?.name || enqEngineerName || "Er. Rajesh Kumar",
      siteVisitDate: enqSiteVisitDate || "2026-08-07",
      quotationAmount: (enqQuotationAmount as any) === "" || enqQuotationAmount === undefined || enqQuotationAmount === null ? undefined : Number(enqQuotationAmount),
      workCommittedDate: enqWorkCommittedDate || "2026-08-15",
      actualWorkStartedDate: enqActualWorkStartedDate || "",
      remarks: enqRemarks || "",
    });

    setNewEnqOpen(false);
    setEnqCustName("");
    setEnqPhone("");
    setEnqLocation("");
    setEnqQuotationAmount(0);
    setEnqActualWorkStartedDate("");
    setEnqRemarks("");
  };

  const handleAssignEngineerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiryId || !selectedEngId) {
      toast.error("Select both an Enquiry and an Engineer");
      return;
    }
    const eng = engineers.find((x) => x.id === selectedEngId);
    updateEnquiry(selectedEnquiryId, {
      assignedEngineerId: selectedEngId,
      assignedEngineerName: eng?.name,
      siteVisitStatus: "Assigned",
      siteVisitDate: todayStr,
    });
    setAssignEngOpen(false);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayProjectId || payAmountInput <= 0) {
      toast.error("Please select a project and enter a valid payment amount");
      return;
    }
    addPayment({
      projectId: selectedPayProjectId,
      paymentDate: todayStr,
      amount: payAmountInput,
      mode: payModeInput,
      referenceNumber: payRefInput || `PAY-REF-${Math.floor(Math.random() * 1000000)}`,
      remarks: `Recorded via Today's Operations Quick Action`,
    });
    setRecordPayOpen(false);
    setPayAmountInput(0);
    setPayRefInput("");
  };

  const handleQuickCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttLabourId) {
      toast.error("Please select a Labour");
      return;
    }
    const lab = labours.find((x) => x.id === selectedAttLabourId);

    // Find active project assigned to this labour or pick PRJ-2026-001
    const proj = projects.find((p) => p.assignedLabourIds.includes(selectedAttLabourId)) || projects[0];

    if (proj) {
      updateProjectLabourLog(proj.id, {
        labourId: selectedAttLabourId,
        labourName: lab?.name || selectedAttLabourId,
        labourType: lab?.type || "Permanent",
        weeklyWage: lab?.defaultWeeklyWage || 1400,
        dailyWage: lab?.dailyWage || 1400,
        date: todayStr,
        inTime: attInTimeInput,
        outTime: attOutTimeInput,
        attendance: "Present",
        hoursWorked: calculateHoursFromTimes(attInTimeInput, attOutTimeInput),
        workDescription: "On-site robotic servicing check-in",
      });
    } else {
      recordAttendance({
        labourId: selectedAttLabourId,
        labourName: lab?.name,
        date: todayStr,
        status: "Present",
        inTime: attInTimeInput,
        outTime: attOutTimeInput,
        hoursWorked: calculateHoursFromTimes(attInTimeInput, attOutTimeInput),
      });
    }

    setAttendanceOpen(false);
  };

  const handleAddLabourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourName || !labourPhone) {
      toast.error("Please enter Labour Name and Phone Number");
      return;
    }
    const cleanLabourPhone = labourPhone.replace(/\D/g, "");
    if (cleanLabourPhone.length < 10) {
      toast.error("Phone Number must be at least 10 digits");
      return;
    }
    if (cleanLabourPhone.length > 10) {
      toast.error("Mobile Number cannot exceed 10 digits");
      return;
    }

    addLabour({
      name: labourName,
      phone: labourPhone,
      type: labourType,
      defaultWeeklyWage: labourWage,
      dailyWage: labourWage,
      status: "Available",
      skills: [],
      wageHistory: [],
      loginId: "",
      pin: "0000",
    });
    setAddLabourOpen(false);
    setLabourName("");
    setLabourPhone("");
  };

  const handleStartWorkForProject = (projectId: string) => {
    updateProject(projectId, {
      actualWorkStartedDate: todayStr,
      status: "Ongoing",
    });
  };

  return (
    <div className="space-y-8 bg-slate-50/50 p-1 -m-1 pb-16">
      {/* ===========================================================================
          STICKY PAGE HEADER BANNER WITH QUICK ACTION TRIGGER PILLS
          =========================================================================== */}
      <div className="bg-white dark:bg-card border border-border px-6 py-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" /> Dashboard
          </h1>
        </div>


      </div>

      {/* ===========================================================================
          TOP KPI CARDS SUMMARY (10 HIGH-LEVEL EXECUTIVE TILES)
          =========================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">New Enquiries</span>
              <PhoneCall className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{newEnquiriesToday}</div>
            <p className="text-[10px] text-muted-foreground">Action required</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-300/80 bg-slate-100/50 dark:bg-slate-900/40 shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Today's Visits</span>
              <UserCheck className="h-4 w-4 text-slate-900 dark:text-slate-100" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{todaysSiteVisits.length}</div>
            <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">Engineers assigned</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pending Check-Ins</span>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600">{permanentLabourPendingCheckIn.length}</div>
            <p className="text-[10px] text-rose-600/80">Permanent staff</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Ongoing Works</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-600">{projectsStartedCount}</div>
            <p className="text-[10px] text-blue-600/80">Active on site</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Completed Works</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600">{projectsCompletedCount}</div>
            <p className="text-[10px] text-emerald-600/80">Signed off</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Permanent Staff</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-600">{permanentLabourWorkingCount} / {labours.filter(l=>l.type==="Permanent").length}</div>
            <p className="text-[10px] text-muted-foreground">Present today</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-300/80 bg-slate-100/50 dark:bg-slate-900/40 shadow-xs hover:shadow-sm transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Contract Staff</span>
              <HardHat className="h-4 w-4 text-slate-900 dark:text-slate-100" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{contractLabourWorkingCount} / {labours.filter(l=>l.type==="Contract").length}</div>
            <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">Present today</p>
          </CardContent>
        </Card>
      </div>

      {/* ===========================================================================
          CEO FINANCIAL & ACCOUNTS RECEIVABLE COCKPIT (6 KPIS + 3 CHARTS)
          =========================================================================== */}
      {(() => {
        const todayDateStr = new Date().toISOString().slice(0, 10);
        const thisMonthStr = todayDateStr.slice(0, 7);

        // 1. Today's Collection
        const todaysCollectionVal = payments
          .filter((p) => p.paymentDate === todayDateStr)
          .reduce((sum, p) => sum + p.amount, 0);

        // 2. Outstanding Amount
        const outstandingVal = projects.reduce((acc, p) => acc + p.balanceAmount, 0);

        // 3. Payments Due Today
        const dueTodayProjects = projects.filter((p) => {
          if (p.balanceAmount <= 0) return false;
          const pendingStages = (p.paymentStages || []).filter((s) => (s.paidAmount || 0) < s.amount);
          if (pendingStages.length > 0) {
            return pendingStages.some((s) => s.dueDate === todayDateStr);
          }
          return p.workCommittedDate === todayDateStr;
        });
        const dueTodayCount = dueTodayProjects.length;
        const dueTodayAmount = dueTodayProjects.reduce((acc, p) => acc + p.balanceAmount, 0);

        // 4. Overdue Payments
        const overdueProjects = projects.filter((p) => {
          if (p.balanceAmount <= 0) return false;
          const pendingStages = (p.paymentStages || []).filter((s) => (s.paidAmount || 0) < s.amount);
          if (pendingStages.length > 0) {
            return pendingStages.some((s) => s.dueDate < todayDateStr);
          }
          return (p.workCommittedDate && p.workCommittedDate < todayDateStr) || p.paymentStatus === "Overdue";
        });
        const overdueCount = overdueProjects.length;
        const overdueAmount = overdueProjects.reduce((acc, p) => acc + p.balanceAmount, 0);

        // 5. Collections This Month
        const monthCollectionsVal = payments
          .filter((p) => p.paymentDate.startsWith(thisMonthStr))
          .reduce((sum, p) => sum + p.amount, 0);

        // 6. Collection Rate
        const totalVal = projects.reduce((acc, p) => acc + p.projectValue, 0);
        const totalColl = payments.reduce((acc, p) => acc + p.amount, 0);
        const overallCollRate = totalVal > 0 ? Math.round((totalColl / totalVal) * 100) : 0;

        // Chart 1: Monthly Collections
        const monthlyData = [
          { month: "May 2026", amount: 150000 },
          { month: "Jun 2026", amount: 280000 },
          { month: "Jul 2026", amount: totalColl > 0 ? totalColl : 420000 },
          { month: "Aug 2026", amount: 190000 },
        ];

        // Chart 2: Outstanding by Customer
        const customerMap = new Map<string, number>();
        projects.forEach((p) => {
          if (p.balanceAmount > 0) {
            const current = customerMap.get(p.customerName) || 0;
            customerMap.set(p.customerName, current + p.balanceAmount);
          }
        });
        const customerOutstandingData = Array.from(customerMap.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        // Chart 3: Payment Status Distribution
        const statusCounts = {
          Paid: projects.filter((p) => p.paymentStatus === "Paid").length,
          Partial: projects.filter((p) => p.paymentStatus === "Partial").length,
          Pending: projects.filter((p) => p.paymentStatus === "Pending").length,
          Overdue: projects.filter((p) => p.paymentStatus === "Overdue" || overdueProjects.includes(p)).length,
        };

        const pieData = [
          { name: "Paid", value: statusCounts.Paid, color: "#10b981" },
          { name: "Partial", value: statusCounts.Partial, color: "#3b82f6" },
          { name: "Pending", value: statusCounts.Pending, color: "#f59e0b" },
          { name: "Overdue", value: statusCounts.Overdue, color: "#ef4444" },
        ].filter((d) => d.value > 0);

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" /> CEO Financial Cockpit & Accounts Receivable
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time executive financial metrics, milestone collection tracking & customer credit risk distribution.
                </p>
              </div>
              <Link to="/payments" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                Open Full Accounts Receivable →
              </Link>
            </div>

            {/* 6 Executive KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="rounded-xl border border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
                <CardContent className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Today's Collection</p>
                  <h3 className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1">₹{todaysCollectionVal.toLocaleString("en-IN")}</h3>
                  <p className="text-[10px] text-blue-600/80 mt-0.5">Receipts today</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-slate-300/80 bg-slate-100/50 dark:bg-slate-900/40 shadow-xs">
                <CardContent className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Outstanding Amount</p>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">₹{outstandingVal.toLocaleString("en-IN")}</h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Total uncollected balance</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
                <CardContent className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Payments Due Today</p>
                  <h3 className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1">{dueTodayCount} Accounts</h3>
                  <p className="text-[10px] text-blue-600/80 mt-0.5">₹{dueTodayAmount.toLocaleString("en-IN")} target</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
                <CardContent className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Overdue Payments</p>
                  <h3 className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1">{overdueCount} Accounts</h3>
                  <p className="text-[10px] text-blue-600/80 mt-0.5">₹{overdueAmount.toLocaleString("en-IN")} past due</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
                <CardContent className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Collections This Month</p>
                  <h3 className="text-lg font-extrabold text-blue-700 dark:text-blue-400 mt-1">₹{monthCollectionsVal.toLocaleString("en-IN")}</h3>
                  <p className="text-[10px] text-blue-600/80 mt-0.5">Monthly revenue total</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-white dark:bg-card shadow-xs">
                <CardContent className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Collection Rate</p>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{overallCollRate}%</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Overall collection efficiency</p>
                </CardContent>
              </Card>
            </div>

            {/* 3 Executive Financial Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chart 1: Monthly Collections */}
              <Card className="rounded-xl border border-border bg-white dark:bg-card shadow-xs">
                <CardHeader className="p-3.5 border-b">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Monthly Collections Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Collections"]} />
                      <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Chart 2: Outstanding by Customer */}
              <Card className="rounded-xl border border-border bg-white dark:bg-card shadow-xs">
                <CardHeader className="p-3.5 border-b">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-blue-600" /> Outstanding Credit by Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 h-52">
                  {customerOutstandingData.length === 0 ? (
                    <div className="h-full grid place-items-center text-xs text-muted-foreground">
                      No outstanding customer credit balances.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={customerOutstandingData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} />
                        <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Outstanding"]} />
                        <Bar dataKey="amount" fill="#0f172a" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Chart 3: Payment Status Distribution */}
              <Card className="rounded-xl border border-border bg-white dark:bg-card shadow-xs">
                <CardHeader className="p-3.5 border-b">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <PieChart className="h-3.5 w-3.5 text-blue-600" /> Payment Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 h-52 flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-3 text-[10px] mt-1">
                    {pieData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-bold">{d.name}:</span> {d.value}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })()}

      {/* ===========================================================================
          MACHINE & TOOL INVENTORY (5 KPI CARDS)
          =========================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Machine & Tool Inventory
            </h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Live Automated Stock
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/machines" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Manage Machines & Tools →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Card 1: Total Machines */}
          <Card className="rounded-xl border border-border bg-white shadow-xs">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-bold uppercase">Total Machines</span>
                <Wrench className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-foreground">{kpiTotalMachines}</div>
              <p className="text-[9px] text-muted-foreground">{machines.length} models</p>
            </CardContent>
          </Card>

          {/* Card 2: Available Machines */}
          <Card className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] font-bold uppercase">Available</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="text-lg font-extrabold text-emerald-700">{kpiAvailableMachines}</div>
              <p className="text-[9px] text-emerald-600 font-medium">Ready to issue</p>
            </CardContent>
          </Card>

          {/* Card 3: Issued Machines */}
          <Card className="rounded-xl border border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10px] font-bold uppercase">Issued</span>
                <Send className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-blue-700">{kpiIssuedMachines}</div>
              <p className="text-[9px] text-blue-600 font-medium">Active on site</p>
            </CardContent>
          </Card>

          {/* Card 4: Machines Under Repair */}
          <Card className="rounded-xl border border-slate-300/80 bg-slate-100/50 dark:bg-slate-900/40 shadow-xs">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 mb-1">
                <span className="text-[10px] font-bold uppercase">Under Repair</span>
                <AlertTriangle className="h-3.5 w-3.5 text-slate-800 dark:text-slate-200" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{kpiMachinesUnderRepair}</div>
              <p className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">Workshop repair</p>
            </CardContent>
          </Card>

          {/* Card 5: Today's Machine Issues */}
          <Card className="rounded-xl border border-border bg-white shadow-xs">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-bold uppercase">Machine Issues</span>
                <Wrench className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-blue-600">{kpiTodaysMachineIssues}</div>
              <p className="text-[9px] text-muted-foreground">Issued today</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===========================================================================
          NEW SECTION: TODAY'S OPERATIONS (5 CARDS GRID + RIGHT SIDE SUMMARY PANEL)
          =========================================================================== */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border shadow-xs">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" /> Today's Operations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live overview of all work scheduled for today. Understand work status in &lt;30 seconds.
            </p>
          </div>
          <Badge className="bg-blue-600 text-white font-bold text-xs">
            Live Automated Sync Active
          </Badge>
        </div>

        {/* Main Grid: 5 Operations Cards (Col-span-3) & Right Summary Panel (Col-span-1) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* LEFT & CENTER CARDS CONTAINER (COL-SPAN 3) */}
          <div className="xl:col-span-3 space-y-6">
            {/* GRID OF 5 MODERN OPERATIONS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* -------------------------------------------------------------------
                  CARD 1: Today's Site Visits
                  ------------------------------------------------------------------- */}
              <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 border-b bg-slate-50/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-purple-600" /> Today's Site Visits
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Scheduled engineer site inspections ({todaysSiteVisits.length})
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ to: "/enquiries" })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {todaysSiteVisits.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No site visits scheduled for today.
                      </div>
                    ) : (
                      todaysSiteVisits.map((visit) => (
                        <div
                          key={visit.id}
                          onClick={() => setActiveSiteVisitEnquiry(visit)}
                          className="p-3 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between text-xs group"
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">{visit.customerName}</span>
                              <span className="text-[10px] text-blue-600 font-semibold">{visit.id}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <span>{visit.location}</span>
                              <span>• {visit.assignedEngineerName || "Unassigned"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                visit.siteVisitStatus === "Completed"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : visit.siteVisitStatus === "Visited" || visit.siteVisitStatus === "Assigned"
                                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {visit.siteVisitStatus}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSiteVisitEnquiry(visit);
                              }}
                              className="h-7 text-[10px] font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* -------------------------------------------------------------------
                  CARD 2: Today's Scheduled Projects
                  ------------------------------------------------------------------- */}
              <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 border-b bg-slate-50/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FolderKanban className="h-4 w-4 text-blue-600" /> Today's Scheduled Projects
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Active site deployments ({todaysScheduledProjects.length})
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ to: "/projects" })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {todaysScheduledProjects.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No projects scheduled for today.
                      </div>
                    ) : (
                      todaysScheduledProjects.map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => setActiveProjectModal(proj)}
                          className="p-3 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between text-xs group"
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{proj.id}</span>
                              <span className="font-semibold text-slate-700 truncate">{proj.customerName}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <span>{proj.location}</span>
                              <span>• {proj.assignedLabourIds.length} Labour</span>
                              <span>• {proj.workCommittedDate || proj.scheduledDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveProjectModal(proj);
                              }}
                              className="h-7 text-[10px] font-semibold text-slate-700 border-slate-200"
                            >
                              Open Project
                            </Button>
                            {proj.status !== "Ongoing" && proj.status !== "Completed" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartWorkForProject(proj.id);
                                }}
                                className="h-7 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              >
                                <PlayCircle className="h-3 w-3" /> Start Work
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* -------------------------------------------------------------------
                  CARD 3: Labour Yet To Check In (Smart Auto-Removal on In Time Entry)
                  ------------------------------------------------------------------- */}
              <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 border-b bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse shrink-0" /> Labour Yet To Check In
                    </CardTitle>
                    <CardDescription className="text-[11px] leading-tight text-muted-foreground">
                      Permanent staff assigned today pending In Time check-in ({permanentLabourPendingCheckIn.length})
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAttendanceOpen(true)}
                    className="text-xs text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 shrink-0 self-start sm:self-center"
                  >
                    Quick Check-In
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {permanentLabourPendingCheckIn.length === 0 ? (
                      <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50/50 font-medium">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                        All assigned Permanent Labour have checked in for today!
                      </div>
                    ) : (
                      permanentLabourPendingCheckIn.map((lab) => {
                        const assignedProj = projects.find((p) => p.assignedLabourIds.includes(lab.id)) || projects[0];

                        return (
                          <div
                            key={lab.id}
                            className="p-3 hover:bg-rose-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="font-bold text-foreground flex flex-wrap items-center gap-1.5">
                                <span className="truncate">{lab.name}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 rounded font-mono shrink-0">
                                  {lab.id}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Proj: <span className="font-semibold text-slate-700">{assignedProj?.id}</span> • Scheduled: <span className="font-semibold">09:00 AM</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse shrink-0">
                                Check-In Pending
                              </span>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedAttLabourId(lab.id);
                                  setAttendanceOpen(true);
                                }}
                                className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                              >
                                Check In
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* -------------------------------------------------------------------
                  CARD 4: Pending Payments (Outstanding Amounts)
                  ------------------------------------------------------------------- */}
              <Card className="rounded-xl border border-border bg-white shadow-xs hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 border-b bg-slate-50/60 flex flex-row items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-rose-600 shrink-0" /> Pending Payments
                    </CardTitle>
                    <CardDescription className="text-[11px] truncate">
                      Outstanding project contract balances ({pendingPaymentsProjects.length})
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ to: "/payments" })}
                    className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {pendingPaymentsProjects.length === 0 ? (
                      <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50/50 font-medium">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                        All project payments are fully collected!
                      </div>
                    ) : (
                      pendingPaymentsProjects.map((proj) => (
                        <div
                          key={proj.id}
                          className="p-3 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="font-bold text-foreground flex flex-wrap items-center gap-1.5">
                              <span className="truncate">{proj.customerName}</span>
                              <span className="text-[10px] text-blue-600 font-semibold shrink-0">{proj.id}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Due: <span className="font-semibold text-slate-700">{proj.workCommittedDate || "Immediate"}</span> • <span className="font-bold text-rose-600">₹{proj.balanceAmount.toLocaleString("en-IN")} due</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                              Priority: High
                            </span>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPayProjectId(proj.id);
                                setPayAmountInput(proj.balanceAmount);
                                setRecordPayOpen(true);
                              }}
                              className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                            >
                              Record Payment
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* -------------------------------------------------------------------
                  CARD 5: Today's Completed Works
                  ------------------------------------------------------------------- */}
              <Card className="md:col-span-2 rounded-xl border border-border bg-white shadow-xs hover:shadow-md transition-all duration-200">
                <CardHeader className="p-4 border-b bg-slate-50/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <CheckCheck className="h-4 w-4 text-emerald-600" /> Today's Completed Works
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Successfully completed and signed off projects ({todaysCompletedWorks.length})
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    ● Signed Off
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {todaysCompletedWorks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No projects completed yet today.
                      </div>
                    ) : (
                      todaysCompletedWorks.map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => setActiveProjectModal(proj)}
                          className="p-3 hover:bg-emerald-50/30 transition-colors flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground flex items-center gap-2">
                              <span className="text-blue-600">{proj.id}</span>
                              <span>{proj.customerName}</span>
                              <span className="text-muted-foreground font-normal">• {proj.natureOfWork}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                              <span>Engineer: {proj.assignedEngineerName || "Er. Rajesh Kumar"}</span>
                              <span>• {proj.assignedLabourIds.length} Labours</span>
                              <span>• Collected: ₹{proj.receivedAmount.toLocaleString("en-IN")}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Completed
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* -------------------------------------------------------------------
                BOTTOM SECTION: RECENT ACTIVITY TIMELINE (SUPERVISOR LIVE FEED)
                ------------------------------------------------------------------- */}
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <CardHeader className="p-4 border-b bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-blue-600 animate-pulse" /> Live Recent Activity Timeline
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Real-time audit log of shift check-ins, status updates, machinery allocations & payment receipts
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold px-2.5 py-1 flex items-center gap-1.5 shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping"></span> Live Real-time Feed ({recentActivitiesTimeline.length})
                  </Badge>
                </div>
              </CardHeader>

              {/* Category Filter Pills Bar */}
              <div className="bg-slate-50/50 p-2.5 px-4 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: "ALL", label: "All Activity", count: recentActivitiesTimeline.length },
                  { id: "SHIFTS", label: "Shifts & Attendance", count: recentActivitiesTimeline.filter(e => e.category === "SHIFTS").length },
                  { id: "PROJECTS", label: "Project Status", count: recentActivitiesTimeline.filter(e => e.category === "PROJECTS").length },
                  { id: "PAYMENTS", label: "Payments", count: recentActivitiesTimeline.filter(e => e.category === "PAYMENTS").length },
                  { id: "EQUIPMENT", label: "Equipment", count: recentActivitiesTimeline.filter(e => e.category === "EQUIPMENT").length },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTimelineCategoryFilter(cat.id as any)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      timelineCategoryFilter === cat.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      timelineCategoryFilter === cat.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              <CardContent className="p-3.5">
                {(() => {
                  const filteredTimelineEvents = timelineCategoryFilter === "ALL"
                    ? recentActivitiesTimeline
                    : recentActivitiesTimeline.filter(e => e.category === timelineCategoryFilter);

                  if (filteredTimelineEvents.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-500 font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No activity logs logged under this category today.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {filteredTimelineEvents.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.projectObj) {
                              setActiveProjectModal(item.projectObj);
                            } else if (item.enquiryObj) {
                              setActiveSiteVisitEnquiry(item.enquiryObj);
                            }
                          }}
                          className={`group flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/90 transition-all ${
                            item.projectObj || item.enquiryObj ? "hover:border-blue-300 hover:shadow-2xs cursor-pointer" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 border text-xs font-extrabold shadow-2xs ${
                              item.type === "checkin" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              item.type === "payment" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                              item.type === "completed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              item.type === "machine" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                              "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {item.type === "checkin" ? <HardHat className="h-4 w-4" /> : item.type === "payment" ? <Wallet className="h-4 w-4" /> : item.type === "machine" ? <Wrench className="h-4 w-4" /> : item.type === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>

                            <div className="min-w-0 space-y-0.5 flex-1 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-slate-900 text-xs truncate leading-snug">{item.title}</h4>
                                <span className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${item.badgeColor}`}>
                                  {item.badgeText}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-semibold truncate">{item.subtitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] font-extrabold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {item.time}
                            </span>
                            {(item.projectObj || item.enquiryObj) && (
                              <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex items-center gap-0.5">
                                View ↗
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* -------------------------------------------------------------------
              RIGHT SIDE PANEL: TODAY'S SUMMARY (STICKY)
              ------------------------------------------------------------------- */}
          <div className="space-y-6">
            <div className="sticky top-36 space-y-6">
              <Card className="rounded-xl border border-border bg-white shadow-xs">
                <CardHeader className="p-4 border-b bg-slate-50/60">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-blue-600" /> Today's Summary
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Live aggregated operations stats
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">New Enquiries Today</span>
                    <span className="font-bold text-foreground bg-slate-100 px-2.5 py-0.5 rounded">
                      {newEnquiriesToday}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">Site Visits Completed</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100">
                      {siteVisitsCompletedCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">Projects Started</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100">
                      {projectsStartedCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">Projects Completed</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                      {projectsCompletedCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">Total Collection Today</span>
                    <span className="font-bold text-emerald-700">
                      ₹{totalCollectionToday.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">Outstanding Amount</span>
                    <span className="font-bold text-rose-600">
                      ₹{totalOutstandingAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-muted-foreground font-medium">Permanent Labour Working</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                      {permanentLabourWorkingCount} Staff
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Contract Labour Working</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                      {contractLabourWorkingCount} Staff
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ===========================================================================
          QUICK ACTION MODALS & DIALOGS
          =========================================================================== */}

      {/* 1. New Enquiry Dialog */}
      <Dialog open={newEnqOpen} onOpenChange={setNewEnqOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-base font-extrabold text-foreground">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 grid place-items-center border border-blue-200 dark:border-blue-800">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <span>Log New Customer Enquiry</span>
                <p className="text-xs font-normal text-muted-foreground">
                  Record client details, service needs, reference & engineer assignment
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEnquirySubmit} className="space-y-4 text-xs pt-2">
            {/* SECTION 1: CUSTOMER CONTACT INFORMATION */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" /> Section 1: Customer Contact Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Customer Full Name *</Label>
                  <Input
                    required
                    placeholder="e.g. AeroTech Solutions / Ramesh"
                    value={enqCustName}
                    onChange={(e) => setEnqCustName(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Mobile Phone Number *</Label>
                  <Input
                    required
                    placeholder="e.g. 9876543210"
                    value={enqPhone}
                    onChange={(e) => setEnqPhone(e.target.value)}
                    className={`h-9 text-xs rounded-xl bg-background ${
                      enqPhone.replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                  />
                  {enqPhone.replace(/\D/g, "").length > 10 && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Mobile number cannot exceed 10 digits ({enqPhone.replace(/\D/g, "").length}/10 digits)
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Site Address / Location</Label>
                <Input
                  placeholder="e.g. Plot 42, Industrial Park, HITEC City, Hyderabad"
                  value={enqLocation}
                  onChange={(e) => setEnqLocation(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* SECTION 2: SERVICE NEED & LEAD SOURCE */}
            <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-600" /> Section 2: Service Need & Lead Source
              </h3>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Service Need / Leakage Type *</Label>
                <SmartComboBox
                  category="Leakage Type"
                  value={enqLeakageType}
                  onChange={(val) => setEnqLeakageType(val)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lead Source</Label>
                  <SmartComboBox
                    category="Lead Source"
                    value={enqLeadSource}
                    onChange={(val) => setEnqLeadSource(val)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Referred By / Reference</Label>
                  <SmartComboBox
                    category="Referred By Options"
                    value={enqReferredBy}
                    placeholder="Select or type custom..."
                    onChange={(val) => setEnqReferredBy(val)}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: ENGINEERING ASSIGNMENT & SITE VISIT */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-blue-600" /> Section 3: Engineering Assignment & Site Visit
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assign Lead Engineer</Label>
                  <SmartComboBox
                    category="Engineer Names"
                    value={enqEngineerName}
                    onChange={(val) => {
                      setEnqEngineerName(val);
                      const eng = engineers.find((x) => x.name === val);
                      if (eng) setEnqEngineerId(eng.id);
                    }}
                    siteVisitDate={enqSiteVisitDate}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Site Visit Date</Label>
                  <Input
                    type="date"
                    value={enqSiteVisitDate}
                    onChange={(e) => setEnqSiteVisitDate(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Quotation Estimate (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 150000"
                    value={enqQuotationAmount || ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                      setEnqQuotationAmount(val);
                    }}
                    className="h-9 text-xs rounded-xl font-bold text-blue-700 dark:text-blue-400 bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: WORK COMMITMENT & EXECUTION DATES */}
            <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-emerald-600" /> Section 4: Work Commitment & Execution Dates
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                    <CalendarCheck className="h-3.5 w-3.5 text-purple-600" /> Work Committed Date *
                  </Label>
                  <Input
                    type="date"
                    value={enqWorkCommittedDate}
                    onChange={(e) => setEnqWorkCommittedDate(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-background border-purple-300 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                    <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Actual Work Started Date
                  </Label>
                  <Input
                    type="date"
                    value={enqActualWorkStartedDate}
                    onChange={(e) => setEnqActualWorkStartedDate(e.target.value)}
                    placeholder="dd-mm-yyyy"
                    className="h-9 text-xs rounded-xl bg-background border-emerald-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* INITIAL REMARKS */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold">Initial Remarks & Notes</Label>
              <SmartComboBox
                category="Remarks Templates"
                value={enqRemarks}
                placeholder="Select or type custom..."
                onChange={(val) => setEnqRemarks(val)}
              />
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewEnqOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-bold shadow-md px-5"
              >
                Save Enquiry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Assign Engineer Dialog */}
      <Dialog open={assignEngOpen} onOpenChange={setAssignEngOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-purple-700 dark:text-purple-400">
              <UserPlus className="h-5 w-5 text-purple-600" /> Assign Engineer to Site Visit
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignEngineerSubmit} className="space-y-4 text-xs pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Select Customer Enquiry</Label>
              <Select value={selectedEnquiryId} onValueChange={setSelectedEnquiryId}>
                <SelectTrigger className="h-9 text-xs rounded-xl mt-1 border-input bg-background px-3 font-normal shadow-2xs">
                  <SelectValue placeholder="Choose Enquiry..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[220px]">
                  {enquiries.map((enq) => (
                    <SelectItem
                      key={enq.id}
                      value={enq.id}
                      textValue={`${enq.id} - ${enq.customerName}`}
                      className="py-2 cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-semibold text-foreground truncate">{enq.id} - {enq.customerName}</span>
                        <span className="text-[11px] text-muted-foreground truncate">{enq.leakageType}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Select Field Engineer</Label>
              <Select value={selectedEngId} onValueChange={setSelectedEngId}>
                <SelectTrigger className="h-9 text-xs rounded-xl mt-1 border-input bg-background px-3 font-normal shadow-2xs">
                  <SelectValue placeholder="Choose Engineer..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[240px]">
                  {engineers.map((eng) => {
                    const avail = checkEngineerAvailability(eng.id, eng.name);
                    const isBooked = !avail.isAvailable;
                    const bookedReason = avail.currentProject ? `Assigned to ${avail.currentProject.id}` : "Booked for Site Visit";
                    return (
                      <SelectItem
                        key={eng.id}
                        value={eng.id}
                        textValue={`${eng.name} (${eng.specialty})`}
                        disabled={isBooked}
                        className={cn(
                          "py-2 transition-colors",
                          isBooked ? "opacity-50 cursor-not-allowed bg-rose-50/50 dark:bg-rose-950/20 text-muted-foreground" : "cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between w-full gap-3 min-w-0 pr-1">
                          <div className="flex flex-col min-w-0 truncate">
                            <span className={cn("font-semibold truncate text-foreground", isBooked && "line-through text-slate-400")}>
                              {eng.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate font-normal">{eng.specialty}</span>
                          </div>
                          {isBooked ? (
                            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-bold shrink-0">
                              Booked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold shrink-0">
                              Available
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 text-xs font-bold shadow-md shadow-purple-500/20 gap-2 transition-all"
              >
                <UserPlus className="h-4 w-4" /> Assign Engineer & Schedule Site Visit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Record Payment Dialog */}
      <Dialog open={recordPayOpen} onOpenChange={setRecordPayOpen}>
        <DialogContent className="max-w-md rounded-xl border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-700">
              <Receipt className="h-4 w-4 text-emerald-600" /> Record Project Payment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold">Select Project *</Label>
              <Select
                value={selectedPayProjectId}
                onValueChange={(val) => {
                  setSelectedPayProjectId(val);
                  const p = projects.find((x) => x.id === val);
                  if (p) setPayAmountInput(p.balanceAmount);
                }}
              >
                <SelectTrigger className="h-8 text-xs rounded-lg mt-1">
                  <SelectValue placeholder="Choose Project..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} - {p.customerName} (Bal: ₹{p.balanceAmount.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
              <Input
                type="number"
                value={payAmountInput}
                onChange={(e) => setPayAmountInput(Number(e.target.value))}
                className="h-8 text-xs font-bold text-emerald-700 rounded-lg mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <Select value={payModeInput} onValueChange={(val: PaymentMode) => setPayModeInput(val)}>
                <SelectTrigger className="h-8 text-xs rounded-lg mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="UPI">UPI Payment</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reference / UTR Number</Label>
              <Input
                value={payRefInput}
                onChange={(e) => setPayRefInput(e.target.value)}
                placeholder="e.g. HDFC-NEFT-9812739"
                className="h-8 text-xs rounded-lg mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
                Confirm & Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Mark Attendance / Quick Check-In Dialog */}
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-md rounded-xl border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-blue-700">
              <CalendarCheck className="h-4 w-4 text-blue-600" /> Labour Attendance Quick Check-In
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickCheckInSubmit} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold">Select Labour Staff *</Label>
              <Select value={selectedAttLabourId} onValueChange={setSelectedAttLabourId}>
                <SelectTrigger className="h-8 text-xs rounded-lg mt-1">
                  <SelectValue placeholder="Choose Labour..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {labours.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Start Time / In Time</Label>
                <Input
                  value={attInTimeInput}
                  onChange={(e) => setAttInTimeInput(e.target.value)}
                  placeholder="09:00 AM"
                  className="h-8 text-xs rounded-lg mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">End Time / Out Time</Label>
                <Input
                  value={attOutTimeInput}
                  onChange={(e) => setAttOutTimeInput(e.target.value)}
                  placeholder="06:00 PM"
                  className="h-8 text-xs rounded-lg mt-1 font-semibold"
                />
              </div>
            </div>

            {/* REAL-TIME CALCULATED HOURS & EARNED MONEY */}
            {(() => {
              const selectedL = labours.find((l) => l.id === selectedAttLabourId);
              const wage = selectedL ? selectedL.defaultWeeklyWage || 1400 : 1400;
              const hours = calculateHoursFromTimes(attInTimeInput, attOutTimeInput);
              const money = calculateEarnedWage(wage, hours);
              return (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-emerald-900 dark:text-emerald-300">Worked Hours:</span>
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{hours > 0 ? `${hours} hrs` : "0 hrs"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-900 dark:text-emerald-300">Earned Money:</span>
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">₹{money.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold">
                Log In Time & Mark Present
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Add Labour Dialog */}
      <Dialog open={addLabourOpen} onOpenChange={setAddLabourOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-base font-extrabold text-foreground">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 grid place-items-center border border-blue-200 dark:border-blue-800">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <span>Add Labour</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddLabourSubmit} className="space-y-4 text-xs pt-2">
            {/* CONTACT */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" /> Contact
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={labourName}
                    onChange={(e) => setLabourName(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Phone *</Label>
                  <Input
                    required
                    placeholder="e.g. 9840112233"
                    value={labourPhone}
                    onChange={(e) => setLabourPhone(e.target.value)}
                    className={`h-9 text-xs rounded-xl bg-background ${
                      labourPhone.replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                  />
                  {labourPhone.replace(/\D/g, "").length > 10 && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Mobile number cannot exceed 10 digits ({labourPhone.replace(/\D/g, "").length}/10 digits)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* EMPLOYMENT */}
            <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-purple-600" /> Employment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Type *</Label>
                  <Select value={labourType} onValueChange={(val: LabourType) => setLabourType(val)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Permanent">Permanent Staff</SelectItem>
                      <SelectItem value="Contract">Contract Labour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Weekly Wage (₹)</Label>
                  <Input
                    type="number"
                    value={labourWage}
                    onChange={(e) => setLabourWage(Number(e.target.value))}
                    className="h-9 text-xs font-bold rounded-xl text-purple-700 dark:text-purple-400 bg-background"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-bold shadow-md px-5 w-full sm:w-auto">
                Add Labour Profile
              </Button>
              <Button type="button" variant="outline" onClick={() => setAddLabourOpen(false)} className="rounded-xl text-xs w-full sm:w-auto">
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Modal for Site Visit Enquiry */}
      {activeSiteVisitEnquiry && (
        <Dialog open={!!activeSiteVisitEnquiry} onOpenChange={() => setActiveSiteVisitEnquiry(null)}>
          <DialogContent className="max-w-md rounded-xl border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-blue-600">
                <Building2 className="h-4 w-4" /> {activeSiteVisitEnquiry.id} - {activeSiteVisitEnquiry.customerName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold">{activeSiteVisitEnquiry.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-semibold">{activeSiteVisitEnquiry.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leakage / Service:</span>
                <span className="font-bold text-blue-700">{activeSiteVisitEnquiry.leakageType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned Engineer:</span>
                <span className="font-bold text-purple-700">{activeSiteVisitEnquiry.assignedEngineerName || "Unassigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site Visit Status:</span>
                <Badge variant="outline" className="text-[10px]">
                  {activeSiteVisitEnquiry.siteVisitStatus}
                </Badge>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                onClick={() => {
                  setActiveSiteVisitEnquiry(null);
                  navigate({ to: "/enquiries" });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Manage Full Enquiry Workflow →
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Details Modal for Project */}
      {activeProjectModal && (
        <Dialog open={!!activeProjectModal} onOpenChange={() => setActiveProjectModal(null)}>
          <DialogContent className="max-w-md rounded-xl border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-blue-600">
                <FolderKanban className="h-4 w-4" /> {activeProjectModal.id} - {activeProjectModal.customerName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nature of Work:</span>
                <span className="font-semibold">{activeProjectModal.natureOfWork}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Engineer:</span>
                <span className="font-bold text-purple-700">{activeProjectModal.assignedEngineerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Committed Date:</span>
                <span className="font-semibold text-purple-800">{activeProjectModal.workCommittedDate || "TBD"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Work Started:</span>
                <span className="font-bold text-emerald-700">{activeProjectModal.actualWorkStartedDate || "Work Pending"}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-bold">₹{activeProjectModal.projectValue.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance Outstanding:</span>
                <span className="font-bold text-rose-600">₹{activeProjectModal.balanceAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                onClick={() => {
                  setActiveProjectModal(null);
                  navigate({ to: "/projects" });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Open Full Project Master →
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
