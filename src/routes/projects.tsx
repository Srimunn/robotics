import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { uploadImage } from "~/server/upload";
import { useRobotics, calculateHoursFromTimes, calculateEarnedWage } from "@/lib/robotics-context";
import type { Project, ProjectStatus, ProjectLabourLog, LabourType, MachineCondition, MachineIssueRecord, MaterialIssueRecord, PaymentStageItem, PaymentStatus, ProjectLabourAssignment } from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import { PhotoCapture } from "@/components/PhotoCapture";

import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  HardHat,
  IndianRupee,
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
  Upload,
  ShieldAlert,
  AlertTriangle,
  Save,
  Camera,
  Pencil,
  FileSpreadsheet,
  Package,
  Check,
  X,
  ChevronsUpDown,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateSingleProjectReport } from "~/server/reports";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface ProjectsSearch {
  openId?: string;
}

export const Route = createFileRoute("/projects")({
  validateSearch: (search: Record<string, unknown>): ProjectsSearch => {
    return {
      openId: typeof search.openId === "string" ? search.openId : undefined,
    };
  },
  component: ProjectsComponent,
});

interface LabourAssignmentState {
  labourId: string;
  weeklyWage: number;
}

function ProjectsComponent() {
  const { openId } = Route.useSearch();
  const {
    projects,
    labours,
    engineers,
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
    unassignLabourFromProject,
    updateProjectLabourLog,
    addPayment,
    issueMachineToProject,
    returnMachineFromProject,
    issueMaterialToProject,
    addProjectMaterialNote,
    updateProjectMaterialNote,
    deleteProjectMaterialNote,
    addPaymentStage,
    updatePaymentStage,
    deletePaymentStage,
    applyPresetPaymentPlan,
    addLabour,
    addMasterDataItem,
  } = useRobotics();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Project Details Cockpit Modal state
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    if (activeProject) {
      const fresh = projects.find((p) => p.id === activeProject.id);
      if (fresh) {
        setActiveProject(fresh);
      }
    } else if (openId && projects.length > 0) {
      const found = projects.find((p) => p.id === openId);
      if (found) {
        setActiveProject(found);
      }
    }
  }, [openId, projects]);

  // Inline editing state for Project detail cockpit (phone & location)
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadSingleReport = async (projectId: string) => {
    try {
      setIsDownloadingReport(true);
      const res = await generateSingleProjectReport({ data: { projectId } });
      if (res?.base64) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename || `project-report-${projectId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Downloaded Single Project Completion Report PDF!");
      } else {
        toast.error("Failed to generate project report PDF");
      }
    } catch (err: any) {
      console.error("Error generating project report:", err);
      toast.error(err?.message || "Failed to download project report");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  useEffect(() => {
    setIsEditingPhone(false);
    setIsEditingLocation(false);
  }, [activeProject?.id]);

  const handleSavePhone = async () => {
    if (!activeProject) return;
    const val = phoneInput.trim();
    await updateProject(activeProject.id, { phone: val });
    setActiveProject({ ...activeProject, phone: val });
    setIsEditingPhone(false);
    toast.success("Phone number updated");
  };

  const handleSaveLocation = async () => {
    if (!activeProject) return;
    const val = locationInput.trim();
    await updateProject(activeProject.id, { location: val });
    setActiveProject({ ...activeProject, location: val });
    setIsEditingLocation(false);
    toast.success("Location updated");
  };

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

  // Assign Labour modal state (selector for existing labours)
  const [addLabourModalOpen, setAddLabourModalOpen] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [selectedLabourIds, setSelectedLabourIds] = useState<string[]>([]);
  const [customWeeklyWages, setCustomWeeklyWages] = useState<Record<string, number>>({});
  const [customAssignedDates, setCustomAssignedDates] = useState<Record<string, string>>({});

  const handleSaveNewAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (selectedLabourIds.length === 0) {
      toast.error("Please select at least one labour staff to assign");
      return;
    }

    const assignmentsToSubmit = selectedLabourIds.map((id) => {
      const l = labours.find((x) => x.id === id);
      const date = customAssignedDates[id] || new Date().toISOString().slice(0, 10);
      return {
        labourId: id,
        weeklyWage: customWeeklyWages[id] ?? 0,
        assignedDate: date,
      };
    });

    await assignLaboursToProject(activeProject.id, assignmentsToSubmit);

    const existingAssignments = activeProject.labourAssignments || [];
    const updatedAssignments = [...existingAssignments];

    for (const asgn of assignmentsToSubmit) {
      const l = labours.find((x) => x.id === asgn.labourId);
      const date = customAssignedDates[asgn.labourId] || new Date().toISOString().slice(0, 10);
      const idx = updatedAssignments.findIndex((a) => a.labourId === asgn.labourId);
      const newItem: ProjectLabourAssignment = {
        labourId: asgn.labourId,
        labourName: l?.name || asgn.labourId,
        labourType: l?.type || "Permanent",
        weeklyWage: asgn.weeklyWage,
        assignedDate: date,
        isActive: true,
      };
      if (idx >= 0) {
        updatedAssignments[idx] = newItem;
      } else {
        updatedAssignments.push(newItem);
      }
    }

    const newActiveIds = Array.from(
      new Set([...activeProject.assignedLabourIds, ...selectedLabourIds])
    );

    setActiveProject({
      ...activeProject,
      assignedLabourIds: newActiveIds,
      labourAssignments: updatedAssignments,
    });

    toast.success(`Successfully assigned ${selectedLabourIds.length} labour staff`);
    setAddLabourModalOpen(false);
    setSelectedLabourIds([]);
    setCustomWeeklyWages({});
    setCustomAssignedDates({});
    setAssignSearchQuery("");
  };

  const handleUnassignLabour = async (labourId: string) => {
    if (!activeProject) return;
    await unassignLabourFromProject(activeProject.id, labourId);

    const updatedAssignments = (activeProject.labourAssignments || []).map((a) =>
      a.labourId === labourId ? { ...a, isActive: false } : a
    );
    const updatedActiveIds = activeProject.assignedLabourIds.filter((id) => id !== labourId);

    setActiveProject({
      ...activeProject,
      assignedLabourIds: updatedActiveIds,
      labourAssignments: updatedAssignments,
    });

    toast.success("Labour unassigned from project");
  };

  const handleSaveActiveProject = async () => {
    if (!activeProject) return;
    try {
      await updateProject(activeProject.id, {
        customerName: activeProject.customerName,
        phone: activeProject.phone,
        location: activeProject.location,
        leadSource: activeProject.leadSource,
        leakageType: activeProject.leakageType,
        natureOfWork: activeProject.natureOfWork,
        assignedEngineerId: activeProject.assignedEngineerId,
        assignedEngineerName: activeProject.assignedEngineerName,
        siteVisitDate: activeProject.siteVisitDate,
        siteVisitStatus: activeProject.siteVisitStatus,
        quotationDate: activeProject.quotationDate,
        quotationAmount: activeProject.quotationAmount,
        quotationPdfUrl: activeProject.quotationPdfUrl,
        projectValue: activeProject.projectValue,
        scheduledDate: activeProject.scheduledDate,
        workCommittedDate: activeProject.workCommittedDate,
        actualWorkStartedDate: activeProject.actualWorkStartedDate,
        customerDecision: activeProject.customerDecision,
        cancellationReason: activeProject.cancellationReason,
        remarks: activeProject.remarks,
        internalNotes: activeProject.internalNotes,
      });
      toast.success(`Project ${activeProject.id} saved & updated successfully!`);
      setActiveProject(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update project");
    }
  };

  // Policy Notice Modal
  const [noticeOpen, setNoticeOpen] = useState(false);

  // Edit Labour In/Out Log Modal
  const [editLogOpen, setEditLogOpen] = useState(false);
  const [editingLogData, setEditingLogData] = useState<ProjectLabourLog | null>(null);

  // Project Issue / Return Machine Modal
  const [projIssueMachineOpen, setProjIssueMachineOpen] = useState(false);
  const [projMachineSelectOpen, setProjMachineSelectOpen] = useState(false);
  const [projIssueMachineId, setProjIssueMachineId] = useState("");
  const [projIssueMachineQty, setProjIssueMachineQty] = useState(1);
  const [projIssueMachineReturnDate, setProjIssueMachineReturnDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [projIssueMachineBy, setProjIssueMachineBy] = useState("");
  const [projIssueMachineRemarks, setProjIssueMachineRemarks] = useState("");

  const [projReturnMachineTarget, setProjReturnMachineTarget] = useState<MachineIssueRecord | null>(null);
  const [projReturnMachineQty, setProjReturnMachineQty] = useState(1);
  const [projReturnMachineCondition, setProjReturnMachineCondition] = useState<MachineCondition>("Good");
  const [projReturnMachineRemarks, setProjReturnMachineRemarks] = useState("");

  // Project Issue Material Modal
  const [projIssueMaterialOpen, setProjIssueMaterialOpen] = useState(false);
  const [projIssueMaterialId, setProjIssueMaterialId] = useState("");
  const [projIssueMaterialQty, setProjIssueMaterialQty] = useState(1);
  const [projIssueMaterialBy, setProjIssueMaterialBy] = useState("");
  const [projIssueMaterialRemarks, setProjIssueMaterialRemarks] = useState("");

  // Project Material Note Modal
  const [isAddMaterialNoteOpen, setIsAddMaterialNoteOpen] = useState(false);
  const [editingMatNote, setEditingMatNote] = useState<MaterialIssueRecord | null>(null);
  const [matNoteDesc, setMatNoteDesc] = useState("");
  const [matNoteDate, setMatNoteDate] = useState(new Date().toISOString().slice(0, 10));

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
        weeklyWage: existingAssignment ? existingAssignment.weeklyWage : (l.defaultWeeklyWage ?? 1400),
      };
    });
    setLabourAssignmentsState(initial);
    setAssignOpen(true);
  };

  const handleSaveAssignedLabours = () => {
    if (!activeProject) return;

    // Filter only those labours currently checked/included in assignedLabourIds
    const selected = labourAssignmentsState.filter((a) =>
      activeProject.assignedLabourIds.includes(a.labourId)
    );

    const assignmentsToSubmit = selected.map((s) => {
      const existing = activeProject.labourAssignments?.find((a) => a.labourId === s.labourId);
      return {
        labourId: s.labourId,
        weeklyWage: s.weeklyWage,
        assignedDate: existing?.assignedDate || new Date().toISOString().slice(0, 10),
      };
    });

    assignLaboursToProject(activeProject.id, assignmentsToSubmit);

    // Synchronously update activeProject local state so Section 4 renders assigned staff immediately
    const updatedAssignments: ProjectLabourAssignment[] = selected.map((s) => {
      const l = labours.find((x) => x.id === s.labourId);
      const existing = activeProject.labourAssignments?.find((a) => a.labourId === s.labourId);
      return {
        labourId: s.labourId,
        labourName: l?.name || s.labourId,
        labourType: l?.type || "Permanent",
        weeklyWage: s.weeklyWage,
        assignedDate: existing?.assignedDate || new Date().toISOString().slice(0, 10),
        isActive: true,
      };
    });

    setActiveProject({
      ...activeProject,
      assignedLabourIds: selected.map((s) => s.labourId),
      labourAssignments: updatedAssignments,
    });

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
      toast.error(`Payment amount cannot exceed project balance (₹${activeProject.balanceAmount.toLocaleString("en-IN")})`);
      return;
    }

    let computedRef = `PAY-REF-${Math.floor(Math.random() * 1000000)}`;

    const newReceived = (activeProject.receivedAmount || 0) + payAmount;
    const newBalance = Math.max(0, activeProject.projectValue - newReceived);
    let newStatus: PaymentStatus = "Pending";
    if (newReceived >= activeProject.projectValue && activeProject.projectValue > 0) {
      newStatus = "Paid";
    } else if (newReceived > 0) {
      newStatus = "Partial";
    }

    addPayment({
      projectId: activeProject.id,
      paymentDate: payDateInput || new Date().toISOString().slice(0, 10),
      amount: payAmount,
      mode: payMode as any,
      referenceNumber: computedRef,
      remarks: payRemarksInput || `Collection received for project ${activeProject.id}`,
      receivedBy: payReceivedByInput || "Accounts & Credit Desk",
      proofName: payProofName,
    });

    setActiveProject({
      ...activeProject,
      receivedAmount: newReceived,
      balanceAmount: newBalance,
      paymentStatus: newStatus,
    });

    setPaymentOpen(false);
    setPayAmount(0);
    setPayRef("");
    setPayProofName("");
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
        </div>
        <Button
          onClick={() => setNoticeOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
        >
          <Sparkles className="h-4 w-4" /> Convert Project
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
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
            <CardTitle className="text-sm font-semibold">Projects ({filteredProjects.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-muted-foreground border-b text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 pl-4 whitespace-nowrap">ID</th>
                  <th className="p-3 whitespace-nowrap min-w-[160px]">CUSTOMER</th>
                  <th className="p-3 whitespace-nowrap min-w-[200px]">WORK TYPE</th>
                  <th className="p-3 whitespace-nowrap">ENGINEER</th>
                  <th className="p-3 whitespace-nowrap">START DATE</th>
                  <th className="p-3 whitespace-nowrap">STARTED</th>
                  <th className="p-3 whitespace-nowrap">PAYMENT</th>
                  <th className="p-3 whitespace-nowrap">STATUS</th>
                  <th className="p-3 text-right pr-4 whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                          <FolderKanban className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">No projects available.</p>
                          <p className="text-xs text-muted-foreground">Convert an approved customer enquiry or assign labour to begin site operations.</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: "/enquiries" })}
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg shadow-xs"
                        >
                          <Sparkles className="h-4 w-4" /> Go to Enquiries to Convert
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => {
                    const cleanCustomerName = (() => {
                      if (!p.customerName) return "";
                      const parts = p.customerName.trim().split(/\s+/);
                      const unique: string[] = [];
                      parts.forEach((part) => {
                        if (unique.length === 0 || unique[unique.length - 1].toLowerCase() !== part.toLowerCase()) {
                          unique.push(part);
                        }
                      });
                      return unique.join(" ");
                    })();

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setActiveProject(p)}
                        className="hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <td className="p-3 pl-4 font-bold text-blue-600 whitespace-nowrap">
                          <div>{p.id}</div>
                          {p.enquiryId && (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 mt-0.5">
                              Linked: {p.enquiryId}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-xs text-foreground truncate max-w-[160px]" title={cleanCustomerName}>
                            {cleanCustomerName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[190px]" title={`${p.phone} • ${p.location}`}>
                            {p.phone} {p.location ? `• ${p.location}` : ""}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-xs text-foreground truncate max-w-[210px]" title={p.natureOfWork}>
                            {p.natureOfWork}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Select
                            value={engineers.find((e) => e.name === p.assignedEngineerName)?.id || p.assignedEngineerId || "unassigned"}
                            onValueChange={(val) => {
                              if (val === "unassigned") {
                                updateProject(p.id, { assignedEngineerId: "", assignedEngineerName: "" });
                              } else {
                                const eng = engineers.find((e) => e.id === val);
                                if (eng) {
                                  updateProject(p.id, { assignedEngineerId: eng.id, assignedEngineerName: eng.name });
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs rounded-md font-semibold text-blue-700 bg-blue-50/80 border-blue-200 w-[150px] focus:ring-1">
                              <SelectValue placeholder="Assign Engineer">
                                {p.assignedEngineerName ? (
                                  <span className="font-semibold text-xs text-blue-700 truncate">
                                    {p.assignedEngineerName}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 text-xs font-medium">Unassigned</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="unassigned" className="text-xs text-amber-600 font-medium">
                                Unassigned
                              </SelectItem>
                              {engineers.map((eng) => (
                                <SelectItem key={eng.id} value={eng.id} className="text-xs">
                                  {eng.name} ({eng.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 font-semibold text-xs text-blue-700 whitespace-nowrap font-mono">
                          {p.workCommittedDate ? p.workCommittedDate : "Not Set"}
                        </td>
                        <td className="p-3 font-semibold text-xs text-emerald-700 whitespace-nowrap font-mono">
                          {p.actualWorkStartedDate ? p.actualWorkStartedDate : "Pending"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
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
                      <td className="p-3 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => setActiveProject(p)} className="h-7 text-xs text-blue-600 gap-1 font-semibold">
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
                  );
                })
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
          <DialogContent className="max-w-5xl rounded-xl border shadow-xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-6 space-y-5">
            <DialogHeader className="border-b pb-4">
              <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl font-black text-blue-700 font-mono tracking-wide">{activeProject.id}</span>
                    <Badge
                      className={`text-[10px] font-bold ${
                        activeProject.status === "Ongoing"
                          ? "bg-emerald-600 text-white"
                          : activeProject.status === "Completed"
                          ? "bg-emerald-700 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {activeProject.status}
                    </Badge>
                    {activeProject.enquiryId && (
                      <Badge variant="outline" className="text-[10px] bg-blue-100/80 text-blue-800 border-blue-300">
                        Linked Enquiry: {activeProject.enquiryId}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                    {activeProject.customerName} &bull; <span className="text-slate-600 font-normal">{activeProject.natureOfWork}</span>
                  </DialogTitle>
                </div>
                <div className="text-left sm:text-right bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Engineer</span>
                  <Select
                    value={engineers.find((e) => e.name === activeProject.assignedEngineerName)?.id || activeProject.assignedEngineerId || "unassigned"}
                    onValueChange={(val) => {
                      const eng = engineers.find((e) => e.id === val);
                      const updates = val === "unassigned" 
                        ? { assignedEngineerId: "", assignedEngineerName: "" }
                        : eng ? { assignedEngineerId: eng.id, assignedEngineerName: eng.name } : {};
                      updateProject(activeProject.id, updates);
                      setActiveProject({ ...activeProject, ...updates });
                    }}
                  >
                    <SelectTrigger className="h-6 text-xs font-bold text-blue-700 p-0 border-0 bg-transparent shadow-none focus:ring-0">
                      <SelectValue placeholder="Assign Engineer">
                        {activeProject.assignedEngineerName || "Unassigned"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="unassigned" className="text-xs text-amber-600 font-medium">
                        Unassigned
                      </SelectItem>
                      {engineers.map((eng) => (
                        <SelectItem key={eng.id} value={eng.id} className="text-xs">
                          {eng.name} ({eng.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 text-xs">
              {/* SECTION 1: VISUAL PROJECT TIMELINE */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Progress
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

              {/* SECTION 2: CUSTOMER, ENGINEER & WORK DATES */}
              <Card className="rounded-xl border border-blue-100 shadow-2xs bg-white dark:bg-card w-full">
                  <CardHeader className="p-3.5 border-b bg-blue-50/50 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-blue-600" /> Details
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-blue-100/80 text-blue-800 border-blue-300 font-bold">
                      {activeProject.assignedEngineerName ? (
                        activeProject.assignedEngineerName.startsWith("Er.")
                          ? activeProject.assignedEngineerName
                          : `Er. ${activeProject.assignedEngineerName}`
                      ) : (
                        "Unassigned"
                      )}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
                        <span className="font-bold text-slate-900 text-sm block">{activeProject.customerName}</span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 group/edit min-h-[26px]">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {isEditingPhone ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSavePhone();
                                  } else if (e.key === "Escape") {
                                    setIsEditingPhone(false);
                                  }
                                }}
                                placeholder="Enter phone..."
                                className="h-6 text-[11px] px-2 py-0 w-36 rounded-md border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleSavePhone}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                title="Save phone number"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingPhone(false)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {activeProject.phone && activeProject.phone.trim() !== "" && activeProject.phone !== "Not specified" ? (
                                <span className="text-slate-600 font-medium">{activeProject.phone}</span>
                              ) : (
                                <span className="text-slate-400 italic">Not specified</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setPhoneInput(activeProject.phone || "");
                                  setIsEditingPhone(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 opacity-50 group-hover/edit:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                                title="Edit phone number"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Site Location</span>
                        <div className="flex items-center gap-1.5 text-xs mt-0.5 group/edit min-h-[26px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {isEditingLocation ? (
                            <div className="flex items-center gap-1 w-full">
                              <Input
                                value={locationInput}
                                onChange={(e) => setLocationInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveLocation();
                                  } else if (e.key === "Escape") {
                                    setIsEditingLocation(false);
                                  }
                                }}
                                placeholder="Enter site location..."
                                className="h-6 text-xs px-2 py-0 flex-1 min-w-0 rounded-md border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleSaveLocation}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors shrink-0"
                                title="Save location"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingLocation(false)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {activeProject.location && activeProject.location.trim() !== "" && activeProject.location !== "Not specified" ? (
                                <span className="font-semibold text-slate-800 truncate" title={activeProject.location}>
                                  {activeProject.location}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Not specified</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setLocationInput(activeProject.location || "");
                                  setIsEditingLocation(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 opacity-50 group-hover/edit:opacity-100 transition-opacity p-0.5 rounded cursor-pointer shrink-0"
                                title="Edit site location"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-slate-400">Source:</span>
                          <Badge variant="outline" className="text-[9px] bg-white text-slate-700">{activeProject.leadSource || "Direct"}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Work Dates Highlight Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                          <CalendarCheck className="h-4 w-4 text-blue-600" /> Work Committed Date
                        </div>
                        <div className="text-sm font-extrabold text-blue-800 font-mono">
                          {activeProject.workCommittedDate || "Not Specified"}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                          <PlayCircle className="h-4 w-4 text-emerald-600" /> Actual Work Started Date
                        </div>
                        <div className="text-sm font-extrabold text-emerald-800 font-mono">
                          {activeProject.actualWorkStartedDate || "Work Pending"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SECTION 3: FINANCIAL SUMMARY & DYNAMIC PAYMENT PLAN */}
                <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card w-full">
                  <CardHeader className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 grid place-items-center">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-bold text-foreground">Payments</CardTitle>
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
                  </CardContent>
                </Card>

              {/* SECTION 4: LABOUR ASSIGNMENT & WEEKLY WAGES */}
              <Card className="rounded-xl border border-border shadow-xs">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                      <HardHat className="h-3.5 w-3.5 text-blue-600" /> Labours
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAddLabourModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1 shadow-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Assign Existing Labours
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2 pl-3">Labour Name</th>
                          <th className="p-2">Labour Type</th>
                          <th className="p-2">Weekly Wage</th>
                          <th className="p-2">Assigned Date</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-right pr-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(() => {
                          const allAssignments = activeProject.labourAssignments || [];
                          const activeAssignments = allAssignments.filter((a) => a.isActive !== false);
                          const inactiveAssignments = allAssignments.filter((a) => a.isActive === false);

                          if (allAssignments.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                  No labours assigned to this project yet. Click "Assign Existing Labours" to select labours.
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <>
                              {/* ACTIVE ASSIGNMENTS */}
                              {activeAssignments.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-3 text-center text-muted-foreground italic">
                                    No active labours currently assigned to this project.
                                  </td>
                                </tr>
                              ) : (
                                activeAssignments.map((assignment) => {
                                  const lab = labours.find((x) => x.id === assignment.labourId);
                                  const weeklyWage = assignment.weeklyWage ?? lab?.defaultWeeklyWage ?? 1400;

                                  return (
                                    <tr key={assignment.labourId} className="hover:bg-accent/40 transition-colors">
                                      <td className="p-2.5 pl-3 font-bold text-foreground">
                                        {lab ? lab.name : assignment.labourName}
                                        <div className="text-[10px] text-muted-foreground">{assignment.labourId}</div>
                                      </td>
                                      <td className="p-2.5">
                                        <Badge variant="outline" className="text-[10px]">
                                          {lab?.type || assignment.labourType || "Permanent"}
                                        </Badge>
                                      </td>
                                      <td className="p-2.5 font-bold text-blue-700">
                                        ₹{weeklyWage.toLocaleString("en-IN")}/week
                                      </td>
                                      <td className="p-2.5 text-muted-foreground">
                                        {assignment.assignedDate || "Active"}
                                      </td>
                                      <td className="p-2.5">
                                        <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                          Active on Site
                                        </Badge>
                                      </td>
                                      <td className="p-2.5 text-right pr-3">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleUnassignLabour(assignment.labourId)}
                                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900 rounded-lg gap-1 font-medium"
                                        >
                                          <X className="h-3.5 w-3.5" /> Unassign
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}

                              {/* PREVIOUSLY ASSIGNED (INACTIVE) ASSIGNMENTS */}
                              {inactiveAssignments.length > 0 && (
                                <>
                                  <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-t border-b">
                                    <td colSpan={6} className="p-2.5 pl-3 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                      <div className="flex items-center gap-1.5">
                                        <History className="h-3.5 w-3.5 text-slate-500" /> Previously Assigned Labours ({inactiveAssignments.length})
                                      </div>
                                    </td>
                                  </tr>
                                  {inactiveAssignments.map((assignment) => {
                                    const lab = labours.find((x) => x.id === assignment.labourId);
                                    const weeklyWage = assignment.weeklyWage ?? lab?.defaultWeeklyWage ?? 1400;
                                    const logCount = (activeProject.labourLogs || []).filter(
                                      (lg) => lg.labourId === assignment.labourId
                                    ).length;

                                    return (
                                      <tr
                                        key={`inactive_${assignment.labourId}`}
                                        className="bg-muted/15 text-muted-foreground opacity-70 hover:opacity-100 transition-opacity border-b"
                                      >
                                        <td className="p-2.5 pl-3 font-medium">
                                          <span className="line-through">{lab ? lab.name : assignment.labourName}</span>
                                          <div className="text-[10px] text-slate-400">{assignment.labourId}</div>
                                        </td>
                                        <td className="p-2.5">
                                          <Badge variant="outline" className="text-[10px] opacity-60">
                                            {lab?.type || assignment.labourType || "Permanent"}
                                          </Badge>
                                        </td>
                                        <td className="p-2.5 text-slate-500">
                                          ₹{weeklyWage.toLocaleString("en-IN")}/week
                                        </td>
                                        <td className="p-2.5 text-[11px]">
                                          {assignment.assignedDate}
                                        </td>
                                        <td className="p-2.5">
                                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300">
                                            Unassigned / Inactive
                                          </Badge>
                                        </td>
                                        <td className="p-2.5 text-right pr-3 text-[11px] font-mono">
                                          {logCount} work log(s)
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </>
                              )}
                            </>
                          );
                        })()}
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
                      <Clock className="h-3.5 w-3.5 text-blue-600" /> Daily Log
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2 pl-3">Labour</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Weekly Wage</th>
                          <th className="p-2">In Time</th>
                          <th className="p-2">Out Time</th>
                          <th className="p-2">Attendance</th>
                          <th className="p-2">Hours</th>
                          <th className="p-2">Earned Wages</th>
                          <th className="p-2">Work Notes</th>
                          <th className="p-2 text-right pr-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeProject.assignedLabourIds.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-4 text-center text-muted-foreground">
                              No labours assigned. Assign labours above to start logging work.
                            </td>
                          </tr>
                        ) : (
                          (activeProject.assignedLabourIds || []).map((lId) => {
                            const lab = labours.find((x) => x.id === lId);
                            const assignment = (activeProject.labourAssignments || []).find((a) => a.labourId === lId);
                            const weeklyWage = assignment ? assignment.weeklyWage : (lab?.defaultWeeklyWage ?? 1400);

                            const existingLog = (activeProject.labourLogs || []).find((lg) => lg.labourId === lId);
                            const inTime = existingLog?.inTime || "";
                            const outTime = existingLog?.outTime || "";
                            const isPresent = Boolean(inTime && inTime.trim().length > 0);
                            const attendanceStatus = isPresent ? "Present" : "Absent";
                            const hours = isPresent ? calculateHoursFromTimes(inTime, outTime) : 0;
                            const earnedWage = existingLog?.earnedMoney || calculateEarnedWage(weeklyWage, hours);
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
                                <td className="p-2.5 font-extrabold text-emerald-700">₹{earnedWage.toLocaleString("en-IN")}</td>
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
                    <Briefcase className="h-3.5 w-3.5 text-amber-600" /> Work Summary
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
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Payments Log
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
                      <Wrench className="h-3.5 w-3.5 text-blue-600" /> Tools Used
                    </CardTitle>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const avail = machines.filter((m) => m.availableQuantity > 0);
                      if (avail.length > 0) setProjIssueMachineId(avail[0].id);
                      setProjIssueMachineQty(1);
                      setProjIssueMachineReturnDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
                      setProjIssueMachineBy("");
                      setProjIssueMachineRemarks("");
                      setProjIssueMachineOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Issue Machine
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                        <tr>
                          <th className="p-2 pl-3">Machine / Tool</th>
                          <th className="p-2">Category & Brand</th>
                          <th className="p-2 text-center">Issued</th>
                          <th className="p-2 text-center">Returned</th>
                          <th className="p-2">Dates</th>
                          <th className="p-2">Issued By</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-right pr-3">Action</th>
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
                                    {mIssue.actualReturnedDate && (
                                      <div className="text-[10px] text-emerald-600 font-semibold">Returned: {mIssue.actualReturnedDate}</div>
                                    )}
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



              {/* SECTION 7.5: MATERIAL ISSUE LOG */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-amber-600" /> Section 7.5: Material Issue Log (Reference Notes)
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingMatNote(null);
                      setMatNoteDesc("");
                      setMatNoteDate(new Date().toISOString().slice(0, 10));
                      setIsAddMaterialNoteOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs gap-1.5 h-7 shadow-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Material Note
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/10 text-muted-foreground border-b text-[10px] font-bold uppercase">
                        <tr>
                          <th className="p-2 pl-3 w-32">Date</th>
                          <th className="p-2">Material / Item Description</th>
                          <th className="p-2 text-right pr-3 w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(!materialIssues.filter((m) => m.projectId === activeProject.id) ||
                        materialIssues.filter((m) => m.projectId === activeProject.id).length === 0) ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-muted-foreground">
                              No material notes recorded for this project yet. Click "Add Material Note" to log materials used.
                            </td>
                          </tr>
                        ) : (
                          materialIssues
                            .filter((m) => m.projectId === activeProject.id)
                            .map((mat) => (
                              <tr key={mat.id} className="hover:bg-accent/40 transition-colors">
                                <td className="p-2.5 pl-3 font-semibold text-foreground whitespace-nowrap">
                                  {mat.issueDate}
                                </td>
                                <td className="p-2.5 text-foreground font-medium">
                                  {mat.materialName}
                                </td>
                                <td className="p-2.5 text-right pr-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingMatNote(mat);
                                        setMatNoteDesc(mat.materialName);
                                        setMatNoteDate(mat.issueDate || new Date().toISOString().slice(0, 10));
                                        setIsAddMaterialNoteOpen(true);
                                      }}
                                      title="Edit Note"
                                      className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteProjectMaterialNote(mat.id)}
                                      title="Delete Note"
                                      className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
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
                </CardContent>
              </Card>

              {/* SECTION 8: ACTIVITY TIMELINE */}
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
                  {(() => {
                    const quotationUrl =
                      activeProject.quotationPdfUrl ||
                      enquiries.find((e) => e.projectId === activeProject.id || e.id === activeProject.enquiryId)?.quotationPdfUrl;

                    if (quotationUrl) {
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(quotationUrl, "_blank", "noopener,noreferrer");
                            toast.success("Opening Quotation PDF...");
                          }}
                          className="text-xs gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold hover:bg-emerald-100 shadow-2xs"
                        >
                          <FileDown className="h-3.5 w-3.5 text-emerald-600" /> View / Download PDF
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`proj-quotation-pdf-input-${activeProject.id}`}
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            e.target.value = ""; // Reset input so re-selection works

                            console.log("[Client Project] Selected file details:", {
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              lastModified: file.lastModified,
                            });

                            try {
                              const base64Data = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === "string") {
                                    resolve(reader.result);
                                  } else {
                                    reject(new Error("FileReader did not return a valid string"));
                                  }
                                };
                                reader.onerror = () => reject(reader.error || new Error("Failed to read selected PDF file"));
                                reader.readAsDataURL(file);
                              });

                              const expectedMinBase64Len = Math.floor(file.size * 1.33);
                              console.log("[Client Project] Base64 encoding complete:", {
                                fileSizeOriginal: file.size,
                                expectedBase64MinLen: expectedMinBase64Len,
                                actualBase64Len: base64Data.length,
                                base64Prefix: base64Data.slice(0, 50),
                                isComplete: base64Data.length >= expectedMinBase64Len,
                              });

                              const res = await uploadImage({
                                data: {
                                  image: base64Data,
                                  folder: "quotations",
                                  isRaw: true,
                                },
                              });

                              console.log("[Client Project] Server upload response:", res);

                              if (res?.url) {
                                updateProject(activeProject.id, { quotationPdfUrl: res.url });
                                setActiveProject({ ...activeProject, quotationPdfUrl: res.url });
                                toast.success("Quotation PDF uploaded and saved to Project!");
                              } else {
                                toast.error("Failed to upload Quotation PDF");
                              }
                            } catch (err: any) {
                              console.error("[Client Project] PDF upload error:", err);
                              toast.error(err?.message || "Failed to upload Quotation PDF");
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`proj-quotation-pdf-input-${activeProject.id}`)?.click()}
                          className="text-xs gap-1.5 rounded-lg border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold shadow-2xs"
                        >
                          <Upload className="h-3.5 w-3.5 text-blue-600" /> Upload Quotation PDF
                        </Button>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* SECTION 10: BEFORE & AFTER WORK SITE PHOTOS (2 PICTURES UPLOAD) */}
              <Card className="rounded-xl border border-slate-200 shadow-xs bg-white dark:bg-card">
                <CardHeader className="p-3.5 border-b bg-slate-50/70 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-blue-600" /> Section 10: Site Inspection Photos (Uploading 2 Pictures — Before & After Work)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5 text-slate-500">
                      Upload pre-servicing initial condition photo & post-servicing completion verification photo.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. BEFORE WORK PHOTO CONTAINER */}
                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          1. Before Work Photo (Initial Condition)
                        </span>
                        {activeProject.beforeWorkPhotoUrl && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">Uploaded</Badge>
                        )}
                      </div>

                      {activeProject.beforeWorkPhotoUrl ? (
                        <div className="relative group rounded-lg overflow-hidden border border-amber-300 bg-white shadow-2xs">
                          <img
                            src={activeProject.beforeWorkPhotoUrl}
                            alt="Before Work Condition"
                            className="w-full h-44 object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              const w = window.open("", "_blank");
                              if (w) w.document.write(`<img src="${activeProject.beforeWorkPhotoUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                updateProject(activeProject.id, { beforeWorkPhotoUrl: "" });
                                setActiveProject({ ...activeProject, beforeWorkPhotoUrl: "" });
                                toast.success("Before Work photo removed");
                              }}
                              className="h-7 text-xs gap-1 font-bold"
                            >
                              <Trash2 className="h-3 w-3" /> Remove Photo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-xl p-6 text-center space-y-3 bg-white dark:bg-card">
                          <Camera className="h-8 w-8 text-amber-500 mx-auto" />
                          <div>
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">No Before Work Photo Uploaded</p>
                            <p className="text-[10px] text-muted-foreground">Upload initial site damage or pre-servicing condition image.</p>
                          </div>
                          <PhotoCapture
                            folder="project-work"
                            label="Upload Before Photo"
                            currentPhotoUrl={activeProject.beforeWorkPhotoUrl}
                            onUploaded={(url) => {
                              updateProject(activeProject.id, { beforeWorkPhotoUrl: url });
                              setActiveProject({ ...activeProject, beforeWorkPhotoUrl: url });
                              toast.success("Before Work Photo uploaded successfully to Cloudinary!");
                            }}
                            className="flex justify-center"
                          />
                        </div>
                      )}
                    </div>

                    {/* 2. AFTER WORK PHOTO CONTAINER */}
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          2. After Work Photo (Completed Finish)
                        </span>
                        {activeProject.afterWorkPhotoUrl && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">Uploaded</Badge>
                        )}
                      </div>

                      {activeProject.afterWorkPhotoUrl ? (
                        <div className="relative group rounded-lg overflow-hidden border border-emerald-300 bg-white shadow-2xs">
                          <img
                            src={activeProject.afterWorkPhotoUrl}
                            alt="After Work Finish"
                            className="w-full h-44 object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              const w = window.open("", "_blank");
                              if (w) w.document.write(`<img src="${activeProject.afterWorkPhotoUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                updateProject(activeProject.id, { afterWorkPhotoUrl: "" });
                                setActiveProject({ ...activeProject, afterWorkPhotoUrl: "" });
                                toast.success("After Work photo removed");
                              }}
                              className="h-7 text-xs gap-1 font-bold"
                            >
                              <Trash2 className="h-3 w-3" /> Remove Photo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-xl p-6 text-center space-y-3 bg-white dark:bg-card">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                          <div>
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">No After Work Photo Uploaded</p>
                            <p className="text-[10px] text-muted-foreground">Upload post-servicing completed work verification image.</p>
                          </div>
                          <PhotoCapture
                            folder="project-work"
                            label="Upload After Photo"
                            currentPhotoUrl={activeProject.afterWorkPhotoUrl}
                            onUploaded={(url) => {
                              updateProject(activeProject.id, { afterWorkPhotoUrl: url });
                              setActiveProject({ ...activeProject, afterWorkPhotoUrl: url });
                              toast.success("After Work Photo uploaded successfully to Cloudinary!");
                            }}
                            className="flex justify-center"
                          />
                        </div>
                      )}

                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => activeProject && handleDownloadSingleReport(activeProject.id)}
                disabled={isDownloadingReport}
                className="rounded-xl text-xs font-bold gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                {isDownloadingReport ? "Generating PDF..." : "Download Project Report"}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveProject(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveActiveProject}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs gap-1 font-bold shadow-md px-5 h-9"
                >
                  <Save className="h-4 w-4" /> Save & Update Project
                </Button>
              </div>
            </DialogFooter>
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
                  <Label className="text-xs font-semibold">Start Time / In Time (e.g. 09:00 AM)</Label>
                  <Input
                    placeholder="09:00 AM"
                    value={editingLogData.inTime || ""}
                    onChange={(e) => setEditingLogData({ ...editingLogData, inTime: e.target.value })}
                    className="h-9 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">End Time / Out Time (e.g. 06:00 PM)</Label>
                  <Input
                    placeholder="06:00 PM"
                    value={editingLogData.outTime || ""}
                    onChange={(e) => setEditingLogData({ ...editingLogData, outTime: e.target.value })}
                    className="h-9 rounded-lg font-mono font-semibold"
                  />
                </div>
              </div>

              {/* REALTIME CALCULATED WORKING HOURS & EARNED MONEY BOX */}
              {(() => {
                const hours = calculateHoursFromTimes(editingLogData.inTime, editingLogData.outTime);
                const money = calculateEarnedWage(editingLogData.weeklyWage || 1400, hours);
                return (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="text-emerald-900 dark:text-emerald-300 font-bold">Calculated Hours:</span>
                      <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {hours > 0 ? `${hours} hrs` : "0 hrs"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-900 dark:text-emerald-300 font-bold">Earned Wages for Hours:</span>
                      <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        ₹{money.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                );
              })()}

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
                Configure project-specific weekly wages for each labour. (e.g., Ravi ₹1400/wk, Ganesh ₹1800/wk, Selvam ₹2200/wk).
              </p>
            </div>

            <div className="space-y-2 border rounded-lg p-2 max-h-72 overflow-y-auto">
              {labours.map((l) => {
                const isAssigned = activeProject?.assignedLabourIds.includes(l.id);
                const currentWageState = labourAssignmentsState.find((x) => x.labourId === l.id)?.weeklyWage ?? 0;

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

                            if (checked) {
                              if (!labourAssignmentsState.some((x) => x.labourId === l.id)) {
                                setLabourAssignmentsState((prev) => [
                                  ...prev,
                                  { labourId: l.id, weeklyWage: 0 },
                                ]);
                              }
                            } else {
                              setLabourAssignmentsState((prev) => prev.filter((x) => x.labourId !== l.id));
                            }
                          }}
                        />
                        <div>
                          <p className="font-bold text-foreground">{l.name}</p>
                          <p className="text-[10px] text-muted-foreground">{l.phone}</p>
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
                issuedBy: projIssueMachineBy,
                remarks: projIssueMachineRemarks,
              });
              setProjIssueMachineOpen(false);
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs font-semibold">Select Available Machine *</Label>
              <Popover open={projMachineSelectOpen} onOpenChange={setProjMachineSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={projMachineSelectOpen}
                    className="w-full justify-between h-9 text-xs rounded-lg font-normal bg-background border-input px-3"
                  >
                    <span className="truncate">
                      {projIssueMachineId
                        ? (() => {
                            const m = machines.find((x) => x.id === projIssueMachineId);
                            return m ? `${m.toolName} (${m.availableQuantity} ${m.unit} available)` : "Select machine...";
                          })()
                        : "Search & select available machine..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[calc(100vw-32px)] p-0 shadow-xl rounded-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Type to search machine name, brand, or ID..." className="h-9 text-xs" />
                    <CommandList className="max-h-60 overflow-y-auto overflow-x-hidden p-1">
                      <CommandEmpty className="p-4 text-xs text-center text-muted-foreground italic">
                        No available machines match search query.
                      </CommandEmpty>
                      <CommandGroup>
                        {machines
                          .filter((m) => m.availableQuantity > 0)
                          .map((m) => (
                            <CommandItem
                              key={m.id}
                              value={`${m.toolName} ${m.category || ""} ${m.brand || ""} ${m.id}`}
                              onSelect={() => {
                                setProjIssueMachineId(m.id);
                                setProjMachineSelectOpen(false);
                              }}
                              className="text-xs flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent min-w-0 w-full"
                            >
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <span className="font-bold text-foreground truncate">{m.toolName}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{m.category || "Tool"} • ID: {m.id}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-medium whitespace-nowrap">
                                {m.availableQuantity} {m.unit} available
                              </Badge>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

        {/* ASSIGN LABOUR STAFF MODAL (SELECT FROM EXISTING LABOURS MODULE) */}
        <Dialog open={addLabourModalOpen} onOpenChange={setAddLabourModalOpen}>
          <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="flex items-center gap-2.5 text-base font-extrabold text-foreground">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 grid place-items-center border border-blue-200 dark:border-blue-800">
                  <HardHat className="h-5 w-5" />
                </div>
                <div>
                  <span>Assign Labour Staff to Project</span>
                  <p className="text-xs font-normal text-muted-foreground">Select existing staff from Labours module and configure weekly wages.</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveNewAssignments} className="space-y-4 text-xs pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search labours by name, phone, type, or ID..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto p-1 border rounded-xl divide-y">
                {(() => {
                  const availableLabours = labours.filter((l) => {
                    const isCurrentlyActive = activeProject?.labourAssignments?.some(
                      (a) => a.labourId === l.id && a.isActive !== false
                    );
                    if (isCurrentlyActive) return false;
                    if (!assignSearchQuery) return true;
                    const q = assignSearchQuery.toLowerCase();
                    return (
                      l.name.toLowerCase().includes(q) ||
                      l.phone.includes(q) ||
                      l.id.toLowerCase().includes(q) ||
                      l.type.toLowerCase().includes(q)
                    );
                  });

                  if (availableLabours.length === 0) {
                    return (
                      <div className="p-6 text-center text-muted-foreground italic text-xs">
                        No available labours found. (Either all labours are already actively assigned or no matching records match search query).
                      </div>
                    );
                  }

                  return availableLabours.map((l) => {
                    const isSelected = selectedLabourIds.includes(l.id);
                    const wageVal = customWeeklyWages[l.id] ?? 0;
                    const dateVal = customAssignedDates[l.id] || new Date().toISOString().slice(0, 10);

                    return (
                      <div
                        key={l.id}
                        className={`p-3 rounded-lg transition-colors space-y-2 ${
                          isSelected ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/30" : "hover:bg-accent/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedLabourIds((prev) => [...prev, l.id]);
                                  if (customWeeklyWages[l.id] === undefined) {
                                    setCustomWeeklyWages((prev) => ({
                                      ...prev,
                                      [l.id]: 0,
                                    }));
                                  }
                                  if (!customAssignedDates[l.id]) {
                                    setCustomAssignedDates((prev) => ({
                                      ...prev,
                                      [l.id]: new Date().toISOString().slice(0, 10),
                                    }));
                                  }
                                } else {
                                  setSelectedLabourIds((prev) => prev.filter((id) => id !== l.id));
                                }
                              }}
                            />
                            <div>
                              <p className="font-bold text-foreground">{l.name}</p>
                              <p className="text-[10px] text-muted-foreground">{l.phone} • ID: {l.id}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {l.type}
                          </Badge>
                        </div>

                        {isSelected && (
                          <div className="grid grid-cols-2 gap-3 pl-7 pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                                Weekly Wage (₹/week):
                              </Label>
                              <Input
                                type="number"
                                value={wageVal}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCustomWeeklyWages((prev) => ({ ...prev, [l.id]: val }));
                                }}
                                className="h-8 rounded-lg font-bold text-blue-700 dark:text-blue-400 bg-background text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                                Assigned Date:
                              </Label>
                              <Input
                                type="date"
                                value={dateVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomAssignedDates((prev) => ({ ...prev, [l.id]: val }));
                                }}
                                className="h-8 rounded-lg bg-background text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddLabourModalOpen(false);
                    setSelectedLabourIds([]);
                  }}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={selectedLabourIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl h-10 text-xs font-bold shadow-md px-5 gap-1"
                >
                  <Check className="h-4 w-4" /> Assign Selected ({selectedLabourIds.length})
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ADD / EDIT MATERIAL NOTE DIALOG */}
        <Dialog open={isAddMaterialNoteOpen} onOpenChange={(open) => {
          setIsAddMaterialNoteOpen(open);
          if (!open) setEditingMatNote(null);
        }}>
          <DialogContent className="max-w-full sm:max-w-md w-full rounded-2xl p-4 sm:p-6 bg-background">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Package className="h-5 w-5 text-amber-600" />
                {editingMatNote ? "Edit Material Note" : "Add Material Note"}
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!activeProject || !matNoteDesc.trim()) return;
                if (editingMatNote) {
                  await updateProjectMaterialNote({
                    id: editingMatNote.id,
                    description: matNoteDesc.trim(),
                    date: matNoteDate,
                  });
                } else {
                  await addProjectMaterialNote({
                    projectId: activeProject.id,
                    description: matNoteDesc.trim(),
                    date: matNoteDate,
                  });
                }
                setIsAddMaterialNoteOpen(false);
                setEditingMatNote(null);
              }}
              className="space-y-4 py-2 text-xs"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date *</Label>
                <Input
                  type="date"
                  required
                  value={matNoteDate}
                  onChange={(e) => setMatNoteDate(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Material / Item Description *</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder='e.g., "PU chemical - 2.6 kgs, Packer rod - 13"'
                  value={matNoteDesc}
                  onChange={(e) => setMatNoteDesc(e.target.value)}
                  className="text-xs rounded-lg resize-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddMaterialNoteOpen(false);
                    setEditingMatNote(null);
                  }}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                >
                  {editingMatNote ? "Update Note" : "Save Note"}
                </Button>
              </DialogFooter>
            </form>
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
