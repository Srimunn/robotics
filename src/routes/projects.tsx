import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics, calculateHoursFromTimes } from "@/lib/robotics-context";
import type { Project, ProjectStatus, ProjectLabourLog, LabourType, MachineCondition, MachineIssueRecord, PaymentStageItem } from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  HardHat,
  DollarSign,
  UserCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  FileText,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Lock,
  History,
  Briefcase,
  CheckSquare,
  Edit3,
  CalendarCheck,
  PlayCircle,
  ArrowRightLeft,
  FileDown,
  Wrench,
  Boxes,
  RotateCcw,
  Send,
  Trash2,
  Wallet,
  Percent,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  component: ProjectsComponent,
});

interface LabourAssignmentState {
  labourId: string;
  weeklyWage: number;
}

function ProjectsComponent() {
  const {
    projects,
    labours,
    payments,
    enquiries,
    machines,
    materials,
    machineIssues,
    materialIssues,
    updateProject,
    deleteProject,
    updateProjectStatus,
    assignLaboursToProject,
    updateProjectLabourLog,
    addPayment,
    issueMachineToProject,
    returnMachineFromProject,
    issueMaterialToProject,
    addPaymentStage,
    updatePaymentStage,
    deletePaymentStage,
    applyPresetPaymentPlan,
  } = useRobotics();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Project Details Cockpit Modal state
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Collapsible Payment & Credit section state
  const [isPaymentCreditOpen, setIsPaymentCreditOpen] = useState(true);

  // Quick Payment Dialog state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>("Bank Transfer");
  const [payRef, setPayRef] = useState("");
  const [payDateInput, setPayDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [payReceivedByInput, setPayReceivedByInput] = useState("Accounts & Credit Desk");
  const [payRemarksInput, setPayRemarksInput] = useState("Payment received via Project Financial Cockpit");

  // Mode-Specific Dynamic Attributes
  const [payReceiptNum, setPayReceiptNum] = useState("");
  const [payUpiApp, setPayUpiApp] = useState("Google Pay");
  const [payTransactionId, setPayTransactionId] = useState("");
  const [payUpiRefNum, setPayUpiRefNum] = useState("");
  const [payUtrNum, setPayUtrNum] = useState("");
  const [payBankName, setPayBankName] = useState("");
  const [payAccountReceived, setPayAccountReceived] = useState("");
  const [payChequeNum, setPayChequeNum] = useState("");
  const [payChequeDate, setPayChequeDate] = useState(new Date().toISOString().slice(0, 10));
  const [payProofName, setPayProofName] = useState("");

  // Dynamic Payment Stage Modal States
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editStageOpen, setEditStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PaymentStageItem | null>(null);

  const [stageNameInput, setStageNameInput] = useState("");
  const [stageAmountInput, setStageAmountInput] = useState<number>(0);
  const [stageDueDateInput, setStageDueDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [stageNotesInput, setStageNotesInput] = useState("");

  // Assign Labour modal state (with project-specific weekly wage configuration!)
  const [assignOpen, setAssignOpen] = useState(false);
  const [labourAssignmentsState, setLabourAssignmentsState] = useState<LabourAssignmentState[]>([]);

  // Policy Notice Modal
  const [noticeOpen, setNoticeOpen] = useState(false);

  // Edit Labour In/Out Log Modal
  const [editLogOpen, setEditLogOpen] = useState(false);
  const [editingLogData, setEditingLogData] = useState<ProjectLabourLog | null>(null);

  // Project Issue / Return Machine Modal
  const [projIssueMachineOpen, setProjIssueMachineOpen] = useState(false);
  const [projIssueMachineId, setProjIssueMachineId] = useState("");
  const [projIssueMachineQty, setProjIssueMachineQty] = useState(1);
  const [projIssueMachineReturnDate, setProjIssueMachineReturnDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [projIssueMachineBy, setProjIssueMachineBy] = useState("Er. Rajesh Kumar");
  const [projIssueMachineRemarks, setProjIssueMachineRemarks] = useState("");

  const [projReturnMachineTarget, setProjReturnMachineTarget] = useState<MachineIssueRecord | null>(null);
  const [projReturnMachineQty, setProjReturnMachineQty] = useState(1);
  const [projReturnMachineCondition, setProjReturnMachineCondition] = useState<MachineCondition>("Good");
  const [projReturnMachineRemarks, setProjReturnMachineRemarks] = useState("");

  // Project Issue Material Modal
  const [projIssueMaterialOpen, setProjIssueMaterialOpen] = useState(false);
  const [projIssueMaterialId, setProjIssueMaterialId] = useState("");
  const [projIssueMaterialQty, setProjIssueMaterialQty] = useState(1);
  const [projIssueMaterialBy, setProjIssueMaterialBy] = useState("Er. Rajesh Kumar");
  const [projIssueMaterialRemarks, setProjIssueMaterialRemarks] = useState("");

  // Project Closing Checklist Modal
  const [closingProjectTarget, setClosingProjectTarget] = useState<Project | null>(null);

  // Filter & paginate projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.natureOfWork.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.assignedEngineerName && p.assignedEngineerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalProjectsItems = filteredProjects.length;
  const totalProjectsPages = Math.ceil(totalProjectsItems / pageSize);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenAssignLabourModal = () => {
    if (!activeProject) return;
    const initial: LabourAssignmentState[] = labours.map((l) => {
      const existingAssignment = activeProject.labourAssignments?.find((a) => a.labourId === l.id);
      return {
        labourId: l.id,
        weeklyWage: existingAssignment ? existingAssignment.weeklyWage : l.defaultWeeklyWage || 1400,
      };
    });
    setLabourAssignmentsState(initial);
    setAssignOpen(true);
  };

  const handleSaveAssignedLabours = () => {
    if (!activeProject) return;
    const selected = labourAssignmentsState.filter((a) =>
      activeProject.assignedLabourIds.includes(a.labourId) ||
      labourAssignmentsState.some((x) => x.labourId === a.labourId && x.weeklyWage > 0)
    );

    assignLaboursToProject(activeProject.id, labourAssignmentsState);
    const updated = projects.find((x) => x.id === activeProject.id);
    if (updated) setActiveProject(updated);
    setAssignOpen(false);
  };

  const handleSaveLabourLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editingLogData) return;

    updateProjectLabourLog(activeProject.id, editingLogData);
    setEditLogOpen(false);

    const updated = projects.find((x) => x.id === activeProject.id);
    if (updated) setActiveProject(updated);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (payAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than zero");
      return;
    }
    if (payAmount > activeProject.balanceAmount) {
      toast.error(`❌ Payment amount cannot exceed project balance (₹${activeProject.balanceAmount.toLocaleString("en-IN")})`);
      return;
    }

    let computedRef = payRef;
    if (payMode === "Cash" && payReceiptNum) computedRef = payReceiptNum;
    else if ((payMode === "Google Pay / UPI" || payMode === "UPI" || payMode === "PhonePe" || payMode === "Paytm") && payTransactionId) computedRef = payTransactionId;
    else if (payMode === "Bank Transfer" && payUtrNum) computedRef = payUtrNum;
    else if (payMode === "Cheque" && payChequeNum) computedRef = payChequeNum;
    if (!computedRef) computedRef = `PAY-REF-${Math.floor(Math.random() * 1000000)}`;

    addPayment({
      projectId: activeProject.id,
      paymentDate: payDateInput || new Date().toISOString().slice(0, 10),
      amount: payAmount,
      mode: payMode as any,
      referenceNumber: computedRef,
      remarks: payRemarksInput || `Collection received for project ${activeProject.id}`,
      receivedBy: payReceivedByInput || "Accounts & Credit Desk",
      receiptNumber: payReceiptNum,
      upiApp: payUpiApp,
      transactionId: payTransactionId,
      upiReferenceNumber: payUpiRefNum,
      utrNumber: payUtrNum,
      bankName: payBankName,
      accountReceived: payAccountReceived,
      chequeNumber: payChequeNum,
      chequeDate: payChequeDate,
      proofName: payProofName,
    });

    setPaymentOpen(false);
    setPayAmount(0);
    setPayRef("");
    setPayReceiptNum("");
    setPayTransactionId("");
    setPayUtrNum("");
    setPayChequeNum("");
    setPayProofName("");

    const updated = projects.find((x) => x.id === activeProject.id);
    if (updated) setActiveProject(updated);
  };

  const handleAddStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (!stageNameInput.trim()) {
      toast.error("Stage name is required");
      return;
    }
    if (stageAmountInput <= 0) {
      toast.error("Stage amount must be greater than zero");
      return;
    }

    addPaymentStage(activeProject.id, {
      stageName: stageNameInput.trim(),
      amount: Number(stageAmountInput),
      dueDate: stageDueDateInput || new Date().toISOString().slice(0, 10),
      paymentNotes: stageNotesInput.trim(),
    });

    setAddStageOpen(false);
    setStageNameInput("");
    setStageAmountInput(0);
    setStageNotesInput("");

    const updated = projects.find((x) => x.id === activeProject.id);
    if (updated) setActiveProject(updated);
  };

  const handleEditStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editingStage) return;
    if (!stageNameInput.trim()) {
      toast.error("Stage name is required");
      return;
    }

    updatePaymentStage(activeProject.id, editingStage.id, {
      stageName: stageNameInput.trim(),
      amount: Number(stageAmountInput),
      dueDate: stageDueDateInput,
      paymentNotes: stageNotesInput.trim(),
    });

    setEditStageOpen(false);
    setEditingStage(null);

    const updated = projects.find((x) => x.id === activeProject.id);
    if (updated) setActiveProject(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects Master</h1>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Auto Bi-Directional Sync
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stage 2 of Unified ERP Lifecycle. Single source of truth with Enquiry. Data syncs bi-directionally.
          </p>
        </div>
        <Button
          onClick={() => setNoticeOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
        >
          <Sparkles className="h-4 w-4" /> Go to Enquiries to Convert Project
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Project ID, Customer, Engineer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs rounded-lg h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Status:</span>
          {["ALL", "Waiting", "Scheduled", "Ongoing", "Completed", "Closed"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className={`h-8 text-xs rounded-lg ${
                statusFilter === st
                  ? st === "Ongoing"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : st === "Completed"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                  : ""
              }`}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Projects Master Table */}
      <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Active Enterprise Projects ({filteredProjects.length})</CardTitle>
            <CardDescription className="text-xs">Click row to open full 9-Section Enterprise Project Cockpit</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                <tr>
                  <th className="p-3 pl-4">Project ID</th>
                  <th className="p-3">Customer & Location</th>
                  <th className="p-3">Nature of Work</th>
                  <th className="p-3">Lead Engineer</th>
                  <th className="p-3">Work Committed Date</th>
                  <th className="p-3">Actual Started Date</th>
                  <th className="p-3">Financial Status</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-50 text-purple-600">
                          <FolderKanban className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">No projects available.</p>
                          <p className="text-xs text-muted-foreground">Convert an approved customer enquiry or assign labour to begin site operations.</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: "/enquiries" })}
                          className="mt-2 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 rounded-lg shadow-xs"
                        >
                          <Sparkles className="h-4 w-4" /> Go to Enquiries to Convert
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setActiveProject(p)}
                      className="hover:bg-accent/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3 pl-4 font-bold text-blue-600">
                        <div>{p.id}</div>
                        {p.enquiryId && (
                          <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 mt-0.5">
                            Linked: {p.enquiryId}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{p.customerName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          📞 {p.phone} • 📍 {p.location}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-foreground">{p.natureOfWork}</td>
                      <td className="p-3">
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          {p.assignedEngineerName || "Er. Rajesh Kumar"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-purple-700">
                        {p.workCommittedDate ? `📅 ${p.workCommittedDate}` : "Not Set"}
                      </td>
                      <td className="p-3 font-semibold text-emerald-700">
                        {p.actualWorkStartedDate ? `⚡ ${p.actualWorkStartedDate}` : "Pending"}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] ${
                            p.paymentStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : p.paymentStatus === "Partial"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-rose-100 text-rose-700 border-rose-200"
                          }`}
                        >
                          {p.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Select
                          value={p.status}
                          onValueChange={(val: ProjectStatus) => {
                            if (val === "Closed") {
                              setClosingProjectTarget(p);
                            } else {
                              updateProjectStatus(p.id, val);
                            }
                          }}
                        >
                          <SelectTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 w-28 text-xs font-medium rounded-lg"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Waiting">Waiting</SelectItem>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Ongoing">Ongoing</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => setActiveProject(p)} className="h-7 text-xs text-blue-600 gap-1">
                            View Details <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTargetId(p.id)}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DataPagination
            currentPage={currentPage}
            totalPages={totalProjectsPages}
            totalItems={totalProjectsItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* PROJECT DETAILS COCKPIT DIALOG (9 STRUCTURED ENTERPRISE SECTIONS) */}
      {activeProject && (
        <Dialog open={!!activeProject} onOpenChange={() => setActiveProject(null)}>
          <DialogContent className="max-w-5xl rounded-xl border shadow-xl max-h-[92vh] overflow-y-auto p-6 space-y-6">
            <DialogHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-extrabold text-blue-600">{activeProject.id}</span>
                    <Badge
                      className={`text-xs ${
                        activeProject.status === "Ongoing"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : activeProject.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}
                    >
                      {activeProject.status}
                    </Badge>
                    {activeProject.enquiryId && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        Linked Enquiry: {activeProject.enquiryId}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-lg font-bold text-foreground mt-1">
                    {activeProject.customerName} - {activeProject.natureOfWork}
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleOpenAssignLabourModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs gap-1"
                  >
                    <HardHat className="h-3.5 w-3.5" /> Assign Labour & Weekly Wages
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPayAmount(activeProject.balanceAmount);
                      setPaymentOpen(true);
                    }}
                    disabled={activeProject.balanceAmount === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Record Payment
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 text-xs">
              {/* SECTION 1: VISUAL PROJECT TIMELINE */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Section 1: Project Progress Timeline
                </span>
                <div className="flex items-center justify-between mt-3 px-2 relative">
                  {["Waiting", "Scheduled", "Ongoing", "Completed", "Closed"].map((st, idx) => {
                    const stages = ["Waiting", "Scheduled", "Ongoing", "Completed", "Closed"];
                    const currentIdx = stages.indexOf(activeProject.status);
                    const isPassed = idx <= currentIdx;

                    return (
                      <div key={st} className="flex flex-col items-center gap-1 z-10">
                        <div
                          className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-all ${
                            isPassed
                              ? "bg-blue-600 text-white shadow-xs ring-4 ring-blue-100"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className={`text-[11px] font-medium ${isPassed ? "text-blue-600 font-bold" : "text-muted-foreground"}`}>
                          {st}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GRID: SECTIONS 2 & 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SECTION 2: CUSTOMER & ENGINEER INFORMATION + WORK DATES */}
                <Card className="rounded-xl border border-border">
                  <CardHeader className="p-3 border-b bg-muted/20">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-purple-600" /> Section 2: Customer, Engineer & Work Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer Name:</span>
                      <span className="font-semibold text-foreground">{activeProject.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mobile Phone:</span>
                      <span className="font-semibold text-foreground">📞 {activeProject.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Site Address:</span>
                      <span className="font-semibold text-foreground">📍 {activeProject.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead Source & Referral:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{activeProject.leadSource || "Direct"}</Badge>
                        {activeProject.referredBy && (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                            Ref: {activeProject.referredBy}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Assigned Lead Engineer:</span>
                      <span className="font-bold text-purple-700">{activeProject.assignedEngineerName || "Er. Rajesh Kumar"}</span>
                    </div>

                    {/* Work Dates Highlight Box */}
                    <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 mt-2 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-bold text-purple-900 flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5 text-purple-600" /> Work Committed Date:
                        </span>
                        <span className="font-bold text-purple-800">
                          {activeProject.workCommittedDate || "Not Specified"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Actual Work Started Date:
                        </span>
                        <span className="font-bold text-emerald-800">
                          {activeProject.actualWorkStartedDate || "Work Pending"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SECTION 3: FINANCIAL SUMMARY & DYNAMIC PAYMENT PLAN */}
                <Card className="rounded-xl border border-border col-span-1 lg:col-span-2 shadow-xs bg-white dark:bg-card">
                  <CardHeader className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 grid place-items-center">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-bold text-foreground">Section 3: Project Financial Summary & Payment Plan</CardTitle>
                          <Badge
                            className={`text-[10px] font-bold ${
                              activeProject.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : activeProject.paymentStatus === "Partial"
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : activeProject.paymentStatus === "Overdue"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            }`}
                          >
                            {activeProject.paymentStatus}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Automated financial engine, dynamic milestone allocation & real-time collection progress.
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPayAmount(activeProject.balanceAmount > 0 ? activeProject.balanceAmount : activeProject.projectValue);
                        setPayRef("");
                        setPayRemarksInput("Received via Project Financial Cockpit");
                        setPaymentOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-sm"
                    >
                      <DollarSign className="h-4 w-4" /> Receive Payment
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 space-y-5">
                    {/* Financial KPI Cards & Progress */}
                    {(() => {
                      const totalVal = activeProject.projectValue || 0;
                      const collected = activeProject.receivedAmount || 0;
                      const outstanding = activeProject.balanceAmount || 0;
                      const collPct = totalVal > 0 ? Math.min(100, Math.round((collected / totalVal) * 100)) : 0;

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl border bg-slate-50/60 dark:bg-slate-900/40">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Contract Value</p>
                              <p className="text-lg font-extrabold text-foreground mt-0.5">₹{totalVal.toLocaleString("en-IN")}</p>
                            </div>
                            <div className="p-3 rounded-xl border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40">
                              <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">Collected Amount</p>
                              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{collected.toLocaleString("en-IN")}</p>
                            </div>
                            <div className="p-3 rounded-xl border bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40">
                              <p className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider">Outstanding Balance</p>
                              <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">₹{outstanding.toLocaleString("en-IN")}</p>
                            </div>
                            <div className="p-3 rounded-xl border bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40">
                              <p className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 tracking-wider">Collection Rate</p>
                              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{collPct}%</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                <Wallet className="h-3.5 w-3.5 text-blue-600" /> Revenue Collection Progress:
                              </span>
                              <span className="font-extrabold text-foreground">{collPct}% Collected ({collected.toLocaleString("en-IN")} / {totalVal.toLocaleString("en-IN")})</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  collPct === 100
                                    ? "bg-emerald-500"
                                    : collPct > 0
                                    ? "bg-blue-500"
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${collPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* DYNAMIC PAYMENT PLAN STAGE MANAGER */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-purple-600" /> Dynamic Payment Plan & Stage Schedule
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Custom payment arrangements without hardcoded templates. Add unlimited milestone stages.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              setStageNameInput("");
                              setStageAmountInput(0);
                              setStageDueDateInput(new Date().toISOString().slice(0, 10));
                              setStageNotesInput("");
                              setAddStageOpen(true);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 rounded-lg gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Stage
                          </Button>
                        </div>
                      </div>

                      {/* Quick Presets Toolbar */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Quick Presets:</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyPresetPaymentPlan(activeProject.id, "100_ADVANCE")}
                          className="h-7 text-[10px] rounded-md hover:bg-purple-50 hover:text-purple-700 whitespace-nowrap"
                        >
                          ⚡ 100% Advance
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyPresetPaymentPlan(activeProject.id, "50_50")}
                          className="h-7 text-[10px] rounded-md hover:bg-purple-50 hover:text-purple-700 whitespace-nowrap"
                        >
                          ⚖️ 50/50 Split
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyPresetPaymentPlan(activeProject.id, "20_30_50")}
                          className="h-7 text-[10px] rounded-md hover:bg-purple-50 hover:text-purple-700 whitespace-nowrap"
                        >
                          📊 20-30-50 Milestone
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyPresetPaymentPlan(activeProject.id, "100_CREDIT")}
                          className="h-7 text-[10px] rounded-md hover:bg-purple-50 hover:text-purple-700 whitespace-nowrap"
                        >
                          💳 100% Corporate Credit
                        </Button>
                      </div>

                      {/* Stage Allocation Total Validation Alert */}
                      {(() => {
                        const stages = activeProject.paymentStages || [];
                        const stageSum = stages.reduce((acc, s) => acc + s.amount, 0);
                        const isMismatch = stageSum !== activeProject.projectValue && stages.length > 0;

                        if (isMismatch) {
                          return (
                            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                <span>
                                  Stage allocation total (₹{stageSum.toLocaleString("en-IN")}) does not equal Contract Value (₹{activeProject.projectValue.toLocaleString("en-IN")}).
                                </span>
                              </span>
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Diff: ₹{Math.abs(activeProject.projectValue - stageSum).toLocaleString("en-IN")}
                              </Badge>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Payment Stages Table */}
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-muted-foreground font-semibold border-b">
                            <tr>
                              <th className="p-2.5 pl-3">Stage Name</th>
                              <th className="p-2.5 text-right">Target Amount</th>
                              <th className="p-2.5">Due Date</th>
                              <th className="p-2.5 text-right">Allocated Paid</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5">Notes</th>
                              <th className="p-2.5 text-right pr-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {(!activeProject.paymentStages || activeProject.paymentStages.length === 0) ? (
                              <tr>
                                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                  No payment stages configured. Click "Add Stage" or choose a Quick Preset above.
                                </td>
                              </tr>
                            ) : (
                              activeProject.paymentStages.map((stg) => (
                                <tr key={stg.id} className="hover:bg-accent/40 transition-colors">
                                  <td className="p-2.5 pl-3 font-bold text-foreground">
                                    {stg.stageName}
                                  </td>
                                  <td className="p-2.5 text-right font-extrabold text-foreground">
                                    ₹{stg.amount.toLocaleString("en-IN")}
                                  </td>
                                  <td className="p-2.5 font-semibold text-purple-700">
                                    📅 {stg.dueDate}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-emerald-600">
                                    ₹{(stg.paidAmount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="p-2.5">
                                    <Badge
                                      className={`text-[10px] ${
                                        stg.status === "Paid"
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                          : stg.status === "Partial"
                                          ? "bg-blue-100 text-blue-800 border-blue-200"
                                          : stg.status === "Overdue"
                                          ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                                          : "bg-amber-100 text-amber-800 border-amber-200"
                                      }`}
                                    >
                                      {stg.status}
                                    </Badge>
                                  </td>
                                  <td className="p-2.5 text-muted-foreground max-w-xs truncate">
                                    {stg.paymentNotes || "-"}
                                  </td>
                                  <td className="p-2.5 text-right pr-3 space-x-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingStage(stg);
                                        setStageNameInput(stg.stageName);
                                        setStageAmountInput(stg.amount);
                                        setStageDueDateInput(stg.dueDate);
                                        setStageNotesInput(stg.paymentNotes || "");
                                        setEditStageOpen(true);
                                      }}
                                      className="h-7 text-[11px] px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deletePaymentStage(activeProject.id, stg.id)}
                                      className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SECTION 4: LABOUR ASSIGNMENT & WEEKLY WAGES */}
              <Card className="rounded-xl border border-border shadow-xs">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <HardHat className="h-3.5 w-3.5 text-purple-600" /> Section 4: Labour Assignment & Weekly Wage Configuration
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Labour paid WEEKLY. Wages belong to this project assignment only.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOpenAssignLabourModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Edit Assignments & Wages
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2.5 pl-3">Labour Name</th>
                          <th className="p-2.5">Labour Type</th>
                          <th className="p-2.5">Weekly Wage (Project Specific)</th>
                          <th className="p-2.5">Assigned Date</th>
                          <th className="p-2.5 text-right pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeProject.assignedLabourIds.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-muted-foreground">
                              No labours assigned to this project yet. Click "Edit Assignments & Wages" to assign.
                            </td>
                          </tr>
                        ) : (
                          activeProject.assignedLabourIds.map((lId) => {
                            const lab = labours.find((x) => x.id === lId);
                            const assignment = activeProject.labourAssignments?.find((a) => a.labourId === lId);
                            const weeklyWage = assignment ? assignment.weeklyWage : lab?.defaultWeeklyWage || 1400;

                            return (
                              <tr key={lId} className="hover:bg-accent/40 transition-colors">
                                <td className="p-2.5 pl-3 font-bold text-foreground">
                                  {lab ? lab.name : lId}
                                  <div className="text-[10px] text-muted-foreground">{lId}</div>
                                </td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {lab?.type || "Permanent"}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-bold text-purple-700">
                                  ₹{weeklyWage.toLocaleString("en-IN")}/week
                                </td>
                                <td className="p-2.5 text-muted-foreground">
                                  {assignment?.assignedDate || "Active Assignment"}
                                </td>
                                <td className="p-2.5 text-right pr-3">
                                  <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">
                                    Active on Site
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

              {/* SECTION 5: LABOUR WORK LOG & ATTENDANCE (AUTO ATTENDANCE ENGINE) */}
              <Card className="rounded-xl border border-border shadow-xs">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-600" /> Section 5: Labour Work Log & Attendance (Auto Calculation Rules)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Entering In Time automatically sets Attendance = <span className="font-bold text-emerald-600">Present</span> and calculates Hours Worked!
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2.5 pl-3">Labour</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Weekly Wage</th>
                          <th className="p-2.5">In Time</th>
                          <th className="p-2.5">Out Time</th>
                          <th className="p-2.5">Attendance</th>
                          <th className="p-2.5">Hours Worked</th>
                          <th className="p-2.5">Work Notes</th>
                          <th className="p-2.5 text-right pr-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeProject.assignedLabourIds.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-muted-foreground">
                              No labours assigned. Assign labours above to start logging work.
                            </td>
                          </tr>
                        ) : (
                          (activeProject.assignedLabourIds || []).map((lId) => {
                            const lab = labours.find((x) => x.id === lId);
                            const assignment = (activeProject.labourAssignments || []).find((a) => a.labourId === lId);
                            const weeklyWage = assignment ? assignment.weeklyWage : lab?.defaultWeeklyWage || 1400;

                            const existingLog = (activeProject.labourLogs || []).find((lg) => lg.labourId === lId);
                            const inTime = existingLog?.inTime || "";
                            const outTime = existingLog?.outTime || "";
                            const isPresent = Boolean(inTime && inTime.trim().length > 0);
                            const attendanceStatus = isPresent ? "Present" : "Absent";
                            const hours = isPresent ? calculateHoursFromTimes(inTime, outTime) : 0;
                            const workDesc = existingLog?.workDescription || "Assigned on site";

                            return (
                              <tr key={lId} className="hover:bg-accent/40 transition-colors">
                                <td className="p-2.5 pl-3 font-bold text-foreground">
                                  {lab ? lab.name : lId}
                                </td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {lab?.type || "Permanent"}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-bold text-purple-700">₹{weeklyWage}/wk</td>
                                <td className="p-2.5 font-mono text-blue-600 font-semibold">{inTime || "—"}</td>
                                <td className="p-2.5 font-mono text-muted-foreground">{outTime || "—"}</td>
                                <td className="p-2.5">
                                  <Badge
                                    className={`text-[10px] ${
                                      attendanceStatus === "Present"
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : "bg-rose-100 text-rose-800 border-rose-200"
                                    }`}
                                  >
                                    {attendanceStatus}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-bold text-blue-700">{hours > 0 ? `${hours} hrs` : "0 hrs"}</td>
                                <td className="p-2.5 text-muted-foreground max-w-xs truncate">{workDesc}</td>
                                <td className="p-2.5 text-right pr-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingLogData({
                                        labourId: lId,
                                        labourName: lab?.name || lId,
                                        labourType: lab?.type || "Permanent",
                                        weeklyWage,
                                        date: new Date().toISOString().slice(0, 10),
                                        inTime: inTime || "09:00 AM",
                                        outTime: outTime || "06:00 PM",
                                        attendance: attendanceStatus as any,
                                        hoursWorked: hours || 8.5,
                                        workDescription: workDesc,
                                      });
                                      setEditLogOpen(true);
                                    }}
                                    className="h-6 text-[11px] gap-1"
                                  >
                                    <Edit3 className="h-3 w-3" /> Log In/Out Time
                                  </Button>
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

              {/* SECTION 6: DAILY WORK LOG SUMMARY */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-amber-600" /> Section 6: Daily Work Log Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {(activeProject.labourLogs || []).length === 0 ? (
                    <p className="text-muted-foreground text-center py-2">
                      No daily work logs recorded yet. Log In Time above to record site progress.
                    </p>
                  ) : (
                    (activeProject.labourLogs || []).map((log, i) => (
                      <div key={i} className="p-2.5 rounded-lg border bg-muted/20 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">
                            {log.labourName} — <span className="text-blue-600 font-semibold">{log.hoursWorked} hrs</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{log.workDescription}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          In: {log.inTime || "N/A"}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* SECTION 7: PAYMENT TRANSACTIONS */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Section 7: Payment Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b font-medium text-muted-foreground">
                      <tr>
                        <th className="p-2.5 pl-3">Payment Date</th>
                        <th className="p-2.5">Mode</th>
                        <th className="p-2.5">Reference #</th>
                        <th className="p-2.5">Remarks</th>
                        <th className="p-2.5 text-right pr-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.filter((pay) => pay.projectId === activeProject.id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            No payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments
                          .filter((pay) => pay.projectId === activeProject.id)
                          .map((pay) => (
                            <tr key={pay.id} className="hover:bg-accent/40">
                              <td className="p-2.5 pl-3 font-medium">{pay.paymentDate}</td>
                              <td className="p-2.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {pay.mode}
                                </Badge>
                              </td>
                              <td className="p-2.5 font-mono text-[11px]">{pay.referenceNumber}</td>
                              <td className="p-2.5 text-muted-foreground">{pay.remarks}</td>
                              <td className="p-2.5 text-right pr-3 font-bold text-emerald-600">
                                ₹{pay.amount.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* SECTION 8: MACHINES USED */}
              <Card className="rounded-xl border border-border shadow-xs">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-blue-600" /> Machines & Tools Used
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Track machines & tools issued to this project. Returning restores stock automatically.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const avail = machines.filter((m) => m.availableQuantity > 0);
                      if (avail.length > 0) setProjIssueMachineId(avail[0].id);
                      setProjIssueMachineQty(1);
                      setProjIssueMachineReturnDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
                      setProjIssueMachineBy("Er. Rajesh Kumar");
                      setProjIssueMachineRemarks("");
                      setProjIssueMachineOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Issue Machine
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2.5 pl-3">Machine / Tool Name</th>
                          <th className="p-2.5">Category & Brand</th>
                          <th className="p-2.5 text-center">Issued Qty</th>
                          <th className="p-2.5 text-center">Returned Qty</th>
                          <th className="p-2.5">Issue / Return Date</th>
                          <th className="p-2.5">Issued By</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right pr-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(!machineIssues.filter((m) => m.projectId === activeProject.id) ||
                        machineIssues.filter((m) => m.projectId === activeProject.id).length === 0) ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-muted-foreground">
                              No machines issued to this project yet. Click "Issue Machine" above to deploy tools.
                            </td>
                          </tr>
                        ) : (
                          machineIssues
                            .filter((m) => m.projectId === activeProject.id)
                            .map((mIssue) => {
                              const remainingToReturn = mIssue.quantity - mIssue.returnedQuantity;

                              return (
                                <tr key={mIssue.id} className="hover:bg-accent/40 transition-colors">
                                  <td className="p-2.5 pl-3 font-bold text-foreground">
                                    {mIssue.machineName}
                                    <div className="text-[10px] text-muted-foreground font-mono">{mIssue.machineId}</div>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="text-[11px] font-medium">{mIssue.category}</span>
                                    <div className="text-[10px] text-muted-foreground">{mIssue.brand}</div>
                                  </td>
                                  <td className="p-2.5 text-center font-bold">{mIssue.quantity}</td>
                                  <td className="p-2.5 text-center font-bold text-emerald-600">{mIssue.returnedQuantity}</td>
                                  <td className="p-2.5 text-muted-foreground">
                                    <div>Issued: {mIssue.issueDate}</div>
                                    <div className="text-[10px]">Exp: {mIssue.expectedReturnDate}</div>
                                  </td>
                                  <td className="p-2.5 text-muted-foreground">{mIssue.issuedBy}</td>
                                  <td className="p-2.5">
                                    <Badge
                                      className={`text-[10px] ${
                                        mIssue.status === "Issued"
                                          ? "bg-blue-600 text-white"
                                          : mIssue.status === "Returned"
                                          ? "bg-emerald-600 text-white"
                                          : "bg-amber-600 text-white"
                                      }`}
                                    >
                                      {mIssue.status}
                                    </Badge>
                                  </td>
                                  <td className="p-2.5 text-right pr-3">
                                    {remainingToReturn > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setProjReturnMachineTarget(mIssue);
                                          setProjReturnMachineQty(remainingToReturn);
                                          setProjReturnMachineCondition("Good");
                                          setProjReturnMachineRemarks("");
                                        }}
                                        className="h-6 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"
                                      >
                                        <RotateCcw className="h-3 w-3" /> Return Machine
                                      </Button>
                                    )}
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

              {/* SECTION 9: MATERIALS USED (CONSUMABLES) */}
              <Card className="rounded-xl border border-border shadow-xs">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-purple-600" /> Materials Used (Consumables)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Consumables automatically deduct from stock. Total expense is tracked per project.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const availMat = materials.filter((m) => m.currentStock > 0);
                      if (availMat.length > 0) setProjIssueMaterialId(availMat[0].id);
                      setProjIssueMaterialQty(1);
                      setProjIssueMaterialBy("Er. Rajesh Kumar");
                      setProjIssueMaterialRemarks("");
                      setProjIssueMaterialOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Issue Material
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2.5 pl-3">Material Name</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5 text-center">Qty Consumed</th>
                          <th className="p-2.5 text-right">Unit Cost</th>
                          <th className="p-2.5 text-right">Total Expense</th>
                          <th className="p-2.5">Issue Date</th>
                          <th className="p-2.5">Issued By</th>
                          <th className="p-2.5 pr-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(!materialIssues.filter((m) => m.projectId === activeProject.id) ||
                        materialIssues.filter((m) => m.projectId === activeProject.id).length === 0) ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-muted-foreground">
                              No materials consumed in this project yet. Click "Issue Material" to deduct stock.
                            </td>
                          </tr>
                        ) : (
                          materialIssues
                            .filter((m) => m.projectId === activeProject.id)
                            .map((matIssue) => (
                              <tr key={matIssue.id} className="hover:bg-accent/40 transition-colors">
                                <td className="p-2.5 pl-3 font-bold text-foreground">
                                  {matIssue.materialName}
                                  <div className="text-[10px] text-muted-foreground font-mono">{matIssue.materialId}</div>
                                </td>
                                <td className="p-2.5 text-muted-foreground">{matIssue.category}</td>
                                <td className="p-2.5 text-center font-bold text-purple-700">
                                  {matIssue.quantity} {matIssue.unit}
                                </td>
                                <td className="p-2.5 text-right font-mono">₹{(matIssue.unitCost || 0).toLocaleString("en-IN")}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                                  ₹{(matIssue.totalCost || 0).toLocaleString("en-IN")}
                                </td>
                                <td className="p-2.5 text-muted-foreground">{matIssue.issueDate}</td>
                                <td className="p-2.5 text-muted-foreground">{matIssue.issuedBy}</td>
                                <td className="p-2.5 pr-3 text-muted-foreground truncate max-w-xs">{matIssue.remarks || "-"}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 10: ACTIVITY TIMELINE */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-blue-600" /> Section 8: Project Activity Audit Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {activeProject.activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs relative pl-2 border-l-2 border-blue-500">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{act.event}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{act.timestamp}</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{act.details}</p>
                        <span className="text-[10px] text-blue-600 font-medium">Actor: {act.actor}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* SECTION 9: DOCUMENTS & ATTACHMENTS */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-600" /> Section 9: Documents & Quotation Artifacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-bold text-foreground">Quotation Document (PDF)</p>
                      <p className="text-[11px] text-muted-foreground">Inherited from Enquiry {activeProject.enquiryId || "Original"}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Downloading Quotation PDF...")}
                    className="text-xs gap-1.5 rounded-lg"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL: EDIT LABOUR IN/OUT LOG WITH SMART COMBO BOX */}
      {editingLogData && (
        <Dialog open={editLogOpen} onOpenChange={setEditLogOpen}>
          <DialogContent className="max-w-md rounded-xl border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" /> Log Labour In/Out Time & Work
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveLabourLog} className="space-y-4 text-xs">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="font-bold text-blue-950">{editingLogData.labourName}</p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Weekly Wage for this project: <strong>₹{editingLogData.weeklyWage}/week</strong>
                </p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Rule: Entering In Time automatically sets Attendance = <strong className="text-emerald-700">Present</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">In Time (e.g. 09:00 AM)</Label>
                  <Input
                    placeholder="09:00 AM"
                    value={editingLogData.inTime || ""}
                    onChange={(e) => setEditingLogData({ ...editingLogData, inTime: e.target.value })}
                    className="h-9 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Out Time (e.g. 06:00 PM)</Label>
                  <Input
                    placeholder="06:00 PM"
                    value={editingLogData.outTime || ""}
                    onChange={(e) => setEditingLogData({ ...editingLogData, outTime: e.target.value })}
                    className="h-9 rounded-lg font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Daily Work Description (Smart Combo)</Label>
                <SmartComboBox
                  category="Work Descriptions"
                  value={editingLogData.workDescription || ""}
                  onChange={(val) => setEditingLogData({ ...editingLogData, workDescription: val })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditLogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  Save & Sync Attendance
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MULTI-SELECT LABOUR ASSIGNMENT & EDITABLE WEEKLY WAGES DIALOG */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-xl rounded-xl border shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <HardHat className="h-5 w-5 text-purple-600" /> Assign Workforce & Set Weekly Wages
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p className="font-bold text-purple-950">Weekly Wages Policy</p>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Configure project-specific weekly wages for each worker. (e.g., Ravi ₹1400/wk, Ganesh ₹1800/wk, Selvam ₹2200/wk).
              </p>
            </div>

            <div className="space-y-2 border rounded-lg p-2 max-h-72 overflow-y-auto">
              {labours.map((l) => {
                const isAssigned = activeProject?.assignedLabourIds.includes(l.id);
                const currentWageState = labourAssignmentsState.find((x) => x.labourId === l.id)?.weeklyWage || l.defaultWeeklyWage || 1400;

                return (
                  <div
                    key={l.id}
                    className={`p-3 rounded-lg border transition-colors space-y-2 ${
                      isAssigned ? "bg-purple-50/70 border-purple-300 dark:bg-purple-950/30" : "hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isAssigned}
                          onCheckedChange={(checked) => {
                            if (!activeProject) return;
                            const newIds = checked
                              ? [...activeProject.assignedLabourIds, l.id]
                              : activeProject.assignedLabourIds.filter((id) => id !== l.id);
                            setActiveProject({ ...activeProject, assignedLabourIds: newIds });
                          }}
                        />
                        <div>
                          <p className="font-bold text-foreground">{l.name}</p>
                          <p className="text-[10px] text-muted-foreground">{l.phone} • Skill: {l.skills.join(", ")}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {l.type}
                      </Badge>
                    </div>

                    {isAssigned && (
                      <div className="flex items-center gap-2 pl-7 pt-1 border-t border-purple-200/60">
                        <Label className="text-[11px] font-semibold text-purple-900 whitespace-nowrap">
                          Weekly Wage (₹/week):
                        </Label>
                        <Input
                          type="number"
                          value={currentWageState}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLabourAssignmentsState((prev) =>
                              prev.map((item) => (item.labourId === l.id ? { ...item, weeklyWage: val } : item))
                            );
                          }}
                          className="h-7 w-32 rounded-lg font-bold text-purple-700 bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAssignedLabours}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Save Labour & Wage Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECEIVE PAYMENT POPUP DIALOG WITH REAL-TIME PREVIEW */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md rounded-2xl border shadow-xl bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <DollarSign className="h-5 w-5 text-emerald-600" /> Receive Payment Cockpit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record collection receipt. Automatically updates Collected, Outstanding Balance, %, Payment Status, & Stage Allocations.
            </DialogDescription>
          </DialogHeader>

          {activeProject && (
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">{activeProject.customerName}</span>
                  <Badge variant="outline" className="text-[10px]">{activeProject.id}</Badge>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Contract Value: ₹{activeProject.projectValue.toLocaleString("en-IN")}</span>
                  <span className="text-rose-600 font-bold">Outstanding: ₹{activeProject.balanceAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Amount Received (₹) *</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="h-9 rounded-lg font-bold text-base text-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Payment Date *</Label>
                  <Input
                    type="date"
                    required
                    value={payDateInput}
                    onChange={(e) => setPayDateInput(e.target.value)}
                    className="h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <Select value={payMode} onValueChange={(val) => setPayMode(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Google Pay / UPI">Google Pay / UPI</SelectItem>
                    <SelectItem value="PhonePe">PhonePe</SelectItem>
                    <SelectItem value="Paytm">Paytm</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Credit Collection">Credit Collection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DYNAMIC MODE FIELDS */}
              {payMode === "Cash" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cash Receipt Number *</Label>
                    <Input
                      placeholder="e.g. CSH-REC-901"
                      required
                      value={payReceiptNum}
                      onChange={(e) => setPayReceiptNum(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Received By (Staff)</Label>
                    <Input
                      placeholder="Staff Cashier Name"
                      value={payReceivedByInput}
                      onChange={(e) => setPayReceivedByInput(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {(payMode === "Google Pay / UPI" || payMode === "PhonePe" || payMode === "Paytm" || payMode === "UPI") && (
                <div className="space-y-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Transaction ID *</Label>
                      <Input
                        placeholder="e.g. TXN-987654321"
                        required
                        value={payTransactionId}
                        onChange={(e) => setPayTransactionId(e.target.value)}
                        className="h-9 rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">UPI App</Label>
                      <Select value={payUpiApp} onValueChange={setPayUpiApp}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue placeholder="UPI App..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Google Pay">Google Pay</SelectItem>
                          <SelectItem value="PhonePe">PhonePe</SelectItem>
                          <SelectItem value="Paytm">Paytm</SelectItem>
                          <SelectItem value="BHIM UPI">BHIM UPI</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">UPI Reference Number</Label>
                    <Input
                      placeholder="UPI Ref / RRN #"
                      value={payUpiRefNum}
                      onChange={(e) => setPayUpiRefNum(e.target.value)}
                      className="h-9 rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}

              {payMode === "Bank Transfer" && (
                <div className="space-y-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">UTR Number *</Label>
                      <Input
                        placeholder="e.g. UTR1293847"
                        required
                        value={payUtrNum}
                        onChange={(e) => setPayUtrNum(e.target.value)}
                        className="h-9 rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Bank Name</Label>
                      <Input
                        placeholder="e.g. HDFC Bank, ICICI Bank"
                        value={payBankName}
                        onChange={(e) => setPayBankName(e.target.value)}
                        className="h-9 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Account Received Into</Label>
                    <Input
                      placeholder="e.g. Primary Corporate Current A/c ****4019"
                      value={payAccountReceived}
                      onChange={(e) => setPayAccountReceived(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {payMode === "Cheque" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cheque Number *</Label>
                    <Input
                      placeholder="e.g. CHQ-004812"
                      required
                      value={payChequeNum}
                      onChange={(e) => setPayChequeNum(e.target.value)}
                      className="h-9 rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cheque Date *</Label>
                    <Input
                      type="date"
                      required
                      value={payChequeDate}
                      onChange={(e) => setPayChequeDate(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                  </div>
                  <div className="col-span-full space-y-1">
                    <Label className="text-xs font-semibold">Drawee Bank Name</Label>
                    <Input
                      placeholder="e.g. State Bank of India"
                      value={payBankName}
                      onChange={(e) => setPayBankName(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Received By (User/Desk)</Label>
                  <Input
                    value={payReceivedByInput}
                    onChange={(e) => setPayReceivedByInput(e.target.value)}
                    className="h-9 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Upload Payment Proof</Label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPayProofName(e.target.files[0].name);
                        toast.success(`Attached proof file: ${e.target.files[0].name}`);
                      }
                    }}
                    className="h-9 text-xs rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Remarks</Label>
                <Input
                  placeholder="Collection remarks..."
                  value={payRemarksInput}
                  onChange={(e) => setPayRemarksInput(e.target.value)}
                  className="h-9 rounded-lg"
                />
              </div>

              {/* Live Preview Panel */}
              {(() => {
                const totalVal = activeProject.projectValue || 0;
                const newColl = (activeProject.receivedAmount || 0) + (payAmount || 0);
                const newBal = Math.max(0, totalVal - newColl);
                const newPct = totalVal > 0 ? Math.min(100, Math.round((newColl / totalVal) * 100)) : 0;
                let predictedStatus = "Pending";
                if (newColl >= totalVal && totalVal > 0) predictedStatus = "Paid";
                else if (newColl > 0) predictedStatus = "Partial";

                return (
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5 text-xs">
                    <p className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Auto-Sync Preview After Saving:
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">New Collected:</span>
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">₹{newColl.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New Balance:</span>
                        <p className="font-bold text-rose-600 dark:text-rose-400">₹{newBal.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New Status:</span>
                        <p className="font-bold text-blue-600 dark:text-blue-400">{predictedStatus} ({newPct}%)</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Save Collection Receipt
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD PAYMENT STAGE MODAL */}
      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent className="max-w-md rounded-2xl border shadow-xl bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Plus className="h-5 w-5 text-purple-600" /> Add Dynamic Payment Stage
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a custom milestone stage with target amount and due date.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStageSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stage Name *</Label>
              <Input
                placeholder="e.g. Advance Booking (30%), Final Handover (50%)"
                required
                value={stageNameInput}
                onChange={(e) => setStageNameInput(e.target.value)}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stage Target Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={stageAmountInput}
                  onChange={(e) => setStageAmountInput(Number(e.target.value))}
                  className="h-9 rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={stageDueDateInput}
                  onChange={(e) => setStageDueDateInput(e.target.value)}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Notes / Criteria</Label>
              <Textarea
                placeholder="Conditions for releasing this milestone payment..."
                value={stageNotesInput}
                onChange={(e) => setStageNotesInput(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setAddStageOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                Add Stage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PAYMENT STAGE MODAL */}
      <Dialog open={editStageOpen} onOpenChange={setEditStageOpen}>
        <DialogContent className="max-w-md rounded-2xl border shadow-xl bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Edit3 className="h-5 w-5 text-blue-600" /> Edit Payment Stage
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditStageSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stage Name *</Label>
              <Input
                required
                value={stageNameInput}
                onChange={(e) => setStageNameInput(e.target.value)}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stage Target Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={stageAmountInput}
                  onChange={(e) => setStageAmountInput(Number(e.target.value))}
                  className="h-9 rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={stageDueDateInput}
                  onChange={(e) => setStageDueDateInput(e.target.value)}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Notes / Criteria</Label>
              <Textarea
                value={stageNotesInput}
                onChange={(e) => setStageNotesInput(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditStageOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* POLICY NOTICE DIALOG */}
      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="max-w-md rounded-xl border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" /> Enterprise Workflow Rule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-muted-foreground py-2">
            <p>
              In accordance with company policy, <strong>Projects are created ONLY from Approved Enquiries</strong>.
            </p>
            <p>
              This ensures 100% data inheritance (Customer details, Engineer assignment, Site location, Quotation value, Work Committed Date & Actual Work Started Date) without any duplicate data entry.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setNoticeOpen(false);
                navigate({ to: "/enquiries" });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
            >
              Go to Enquiries Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROJECT ISSUE MACHINE MODAL */}
      <Dialog open={projIssueMachineOpen} onOpenChange={setProjIssueMachineOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" /> Issue Machine to Project {activeProject?.id}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!activeProject || !projIssueMachineId) return;
              issueMachineToProject({
                machineId: projIssueMachineId,
                projectId: activeProject.id,
                quantity: Number(projIssueMachineQty),
                issueDate: new Date().toISOString().slice(0, 10),
                expectedReturnDate: projIssueMachineReturnDate,
                issuedBy: projIssueMachineBy,
                remarks: projIssueMachineRemarks,
              });
              setProjIssueMachineOpen(false);
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Available Machine *</Label>
              <Select value={projIssueMachineId} onValueChange={setProjIssueMachineId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Select machine..." />
                </SelectTrigger>
                <SelectContent>
                  {machines
                    .filter((m) => m.availableQuantity > 0)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.toolName} ({m.availableQuantity} {m.unit} available)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity to Issue *</Label>
                <Input
                  type="number"
                  min="1"
                  value={projIssueMachineQty}
                  onChange={(e) => setProjIssueMachineQty(Math.max(1, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Issued By</Label>
                <Input
                  value={projIssueMachineBy}
                  onChange={(e) => setProjIssueMachineBy(e.target.value)}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expected Return Date</Label>
              <Input
                type="date"
                value={projIssueMachineReturnDate}
                onChange={(e) => setProjIssueMachineReturnDate(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea
                placeholder="Issue remarks..."
                value={projIssueMachineRemarks}
                onChange={(e) => setProjIssueMachineRemarks(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProjIssueMachineOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Issue Machine
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PROJECT RETURN MACHINE MODAL */}
      <Dialog open={!!projReturnMachineTarget} onOpenChange={(open) => !open && setProjReturnMachineTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-600" /> Return Machine to Inventory
            </DialogTitle>
          </DialogHeader>

          {projReturnMachineTarget && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                returnMachineFromProject({
                  issueRecordId: projReturnMachineTarget.id,
                  returnQty: Number(projReturnMachineQty),
                  condition: projReturnMachineCondition,
                  returnRemarks: projReturnMachineRemarks,
                });
                setProjReturnMachineTarget(null);
              }}
              className="space-y-4 py-2 text-xs"
            >
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="font-bold text-emerald-950">{projReturnMachineTarget.machineName}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Remaining Issued: {projReturnMachineTarget.quantity - projReturnMachineTarget.returnedQuantity} units
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Returned Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={projReturnMachineTarget.quantity - projReturnMachineTarget.returnedQuantity}
                    value={projReturnMachineQty}
                    onChange={(e) => setProjReturnMachineQty(Number(e.target.value))}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Returned Condition *</Label>
                  <Select value={projReturnMachineCondition} onValueChange={(val: MachineCondition) => setProjReturnMachineCondition(val)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good (Back to Available Stock)</SelectItem>
                      <SelectItem value="Damaged">Damaged (Move to Repair Stock)</SelectItem>
                      <SelectItem value="Repair Required">Repair Required (Move to Repair Stock)</SelectItem>
                      <SelectItem value="Lost">Lost (Move to Lost Inventory)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Return Remarks</Label>
                <Textarea
                  placeholder="Condition notes or maintenance required..."
                  value={projReturnMachineRemarks}
                  onChange={(e) => setProjReturnMachineRemarks(e.target.value)}
                  rows={2}
                  className="text-xs rounded-lg resize-none"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProjReturnMachineTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                  Confirm Return & Restore Stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* PROJECT ISSUE MATERIAL MODAL */}
      <Dialog open={projIssueMaterialOpen} onOpenChange={setProjIssueMaterialOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-purple-600" /> Issue Consumable Material to Project {activeProject?.id}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!activeProject || !projIssueMaterialId) return;
              issueMaterialToProject({
                materialId: projIssueMaterialId,
                projectId: activeProject.id,
                quantity: Number(projIssueMaterialQty),
                issueDate: new Date().toISOString().slice(0, 10),
                issuedBy: projIssueMaterialBy,
                remarks: projIssueMaterialRemarks,
              });
              setProjIssueMaterialOpen(false);
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Material *</Label>
              <Select value={projIssueMaterialId} onValueChange={setProjIssueMaterialId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {materials
                    .filter((m) => m.currentStock > 0)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.currentStock} {m.unit} in stock - ₹{m.purchaseCost}/{m.unit})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity Consumed *</Label>
                <Input
                  type="number"
                  min="1"
                  value={projIssueMaterialQty}
                  onChange={(e) => setProjIssueMaterialQty(Math.max(1, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Issued By</Label>
                <Input
                  value={projIssueMaterialBy}
                  onChange={(e) => setProjIssueMaterialBy(e.target.value)}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea
                placeholder="Consumable issue notes..."
                value={projIssueMaterialRemarks}
                onChange={(e) => setProjIssueMaterialRemarks(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProjIssueMaterialOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                Issue Material & Deduct Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

        {/* PROJECT CLOSING CHECKLIST MODAL */}
        <Dialog open={!!closingProjectTarget} onOpenChange={(open) => !open && setClosingProjectTarget(null)}>
          <DialogContent className="max-w-lg rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Project Closing Audit Checklist ({closingProjectTarget?.id})
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review project status prior to closing. Warnings provide operational guidance and do not block project sign-off.
              </DialogDescription>
            </DialogHeader>

            {closingProjectTarget && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 space-y-1">
                  <div className="font-bold text-purple-950 dark:text-purple-200">
                    {closingProjectTarget.customerName} - {closingProjectTarget.natureOfWork}
                  </div>
                  <div className="text-purple-700 text-[11px]">
                    Contract Value: ₹{closingProjectTarget.projectValue.toLocaleString("en-IN")} • Location: {closingProjectTarget.location}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* 1. Attendance Checklist */}
                  <div className="p-3 rounded-xl border flex items-center justify-between bg-white dark:bg-card">
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-bold text-foreground">1. Attendance Logs Recorded</div>
                        <div className="text-[11px] text-muted-foreground">
                          {(closingProjectTarget.labourLogs || []).length > 0
                            ? `${(closingProjectTarget.labourLogs || []).length} attendance log entries verified`
                            : "No daily attendance logs recorded for assigned labours"}
                        </div>
                      </div>
                    </div>
                    {(closingProjectTarget.labourLogs || []).length > 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Warning</Badge>
                    )}
                  </div>

                  {/* 2. Machines & Tools Return Checklist */}
                  {(() => {
                    const unreturned = (machineIssues || []).filter(
                      (m) => m.projectId === closingProjectTarget.id && m.status === "Issued"
                    );
                    const isClean = unreturned.length === 0;

                    return (
                      <div className="p-3 rounded-xl border flex items-center justify-between bg-white dark:bg-card">
                        <div className="flex items-center gap-2.5">
                          <Wrench className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="font-bold text-foreground">2. Machines & Tools Returned</div>
                            <div className="text-[11px] text-muted-foreground">
                              {isClean
                                ? "All deployed tools & machines returned to inventory"
                                : `${unreturned.length} machine issue record(s) still active on site`}
                            </div>
                          </div>
                        </div>
                        {isClean ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">All Returned</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Warning</Badge>
                        )}
                      </div>
                    );
                  })()}

                  {/* 3. Payments & Outstanding Balance Checklist */}
                  <div className="p-3 rounded-xl border flex items-center justify-between bg-white dark:bg-card">
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-bold text-foreground">3. Payment Collection & Balance</div>
                        <div className="text-[11px] text-muted-foreground">
                          {closingProjectTarget.balanceAmount <= 0
                            ? "Contract value fully settled (₹0 balance)"
                            : `Outstanding balance remaining: ₹${closingProjectTarget.balanceAmount.toLocaleString("en-IN")}`}
                        </div>
                      </div>
                    </div>
                    {closingProjectTarget.balanceAmount <= 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Settled</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">Balance Due</Badge>
                    )}
                  </div>

                  {/* 4. Document Artifacts Checklist */}
                  <div className="p-3 rounded-xl border flex items-center justify-between bg-white dark:bg-card">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-slate-600" />
                      <div>
                        <div className="font-bold text-foreground">4. Document Artifacts & Quotations</div>
                        <div className="text-[11px] text-muted-foreground">
                          {closingProjectTarget.enquiryId
                            ? `Linked to Enquiry ${closingProjectTarget.enquiryId}`
                            : "Direct project entry"}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Verified</Badge>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 text-rose-900 dark:text-rose-300">
                  {closingProjectTarget.balanceAmount > 0 || closingProjectTarget.status !== "Completed"
                    ? "Notice: Project cannot be closed unless Outstanding balance is ₹0 and Project Status is marked 'Completed'."
                    : "Notice: All checklist requirements met. You can manually close this project."}
                </p>

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setClosingProjectTarget(null)} className="h-9 text-xs rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    disabled={closingProjectTarget.balanceAmount > 0 || closingProjectTarget.status !== "Completed"}
                    onClick={() => {
                      updateProjectStatus(closingProjectTarget.id, "Closed");
                      setClosingProjectTarget(null);
                      if (activeProject && activeProject.id === closingProjectTarget.id) {
                        setActiveProject(null);
                      }
                    }}
                    className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs"
                  >
                    Confirm & Close Project
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION DIALOG */}
        <DeleteConfirm
          open={Boolean(deleteTargetId)}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
          onConfirm={() => {
            if (deleteTargetId) {
              deleteProject(deleteTargetId);
              if (activeProject?.id === deleteTargetId) {
                setActiveProject(null);
              }
              setDeleteTargetId(null);
            }
          }}
          title="Delete Project Record?"
          description="Are you sure you want to delete this project? All associated logs and financial records will be removed."
        />
      </div>
    );
  }
