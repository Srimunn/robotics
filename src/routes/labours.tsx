import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRobotics, calculateEarnedWage, calculateHoursFromTimes } from "@/lib/robotics-context";
import type { Labour, LabourType } from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  HardHat,
  Plus,
  Search,
  Calendar,
  CalendarCheck,
  DollarSign,
  CheckCircle2,
  Clock,
  UserCheck,
  Calculator,
  Briefcase,
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  Trash2,
  AlertTriangle,
  Copy,
  Wrench,
  KeyRound,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import React from "react";

class LabourErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Labour Module Boundary Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white dark:bg-card rounded-2xl border border-rose-200 dark:border-rose-900 shadow-md text-center max-w-xl mx-auto my-8 space-y-4">
          <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 grid place-items-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Labour Management Module</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {this.state.error?.message || "An issue occurred while rendering the labour cockpit."}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-4"
            >
              Reload Roster View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
              className="text-xs font-semibold rounded-lg px-4 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createFileRoute("/labours")({
  component: () => (
    <LabourErrorBoundary>
      <LaboursComponent />
    </LabourErrorBoundary>
  ),
});

function LaboursComponent() {
  const robotics = useRobotics();
  const labours = robotics?.labours || [];
  const attendance = robotics?.attendance || {};
  const projects = robotics?.projects || [];
  const { addLabour, updateLabour, deleteLabour, deactivateLabour, reactivateLabour, deleteLabourPermanently, checkLabourAvailability, addMasterDataItem, updateProjectLabourLog, verifyAttendanceRecord, currentUser } = robotics;

  const [activeTab, setActiveTab] = useState<"PROFILE" | "ATTENDANCE" | "MASTER">("PROFILE");
  const [labourTypeFilter, setLabourTypeFilter] = useState<"PERMANENT" | "CONTRACT" | "ALL">("ALL");
  const [showInactive, setShowInactive] = useState(false);

  const [deactivateConfirmTarget, setDeactivateConfirmTarget] = useState<Labour | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Labour | null>(null);
  const [reactivateConfirmTarget, setReactivateConfirmTarget] = useState<Labour | null>(null);

  const isManagerOrCeo = currentUser?.role === "CEO" || currentUser?.role === "Worker";

  const handleResetPin = async (labourId: string) => {
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    try {
      await updateLabour(labourId, { pin: newPin });
      toast.success(`PIN reset to: ${newPin} — share this with the worker`);
    } catch (err) {
      toast.error("Failed to reset PIN");
    }
  };

  const hasLabourHistory = (labourId: string) => {
    const hasAttendance = Object.values(attendance || {}).some((r) => r?.labourId === labourId);
    const hasProjectLogs = projects.some(
      (p) =>
        (p.assignedLabourIds || []).includes(labourId) ||
        (p.labourLogs || []).some((lg) => lg.labourId === labourId) ||
        (p.labourAssignments || []).some((la) => la.labourId === labourId)
    );
    const labour = labours.find((l) => l.id === labourId);
    const hasWageHist = (labour?.wageHistory || []).length > 0;
    return hasAttendance || hasProjectLogs || hasWageHist;
  };


  // Mark Attendance Modal state
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [attLabourId, setAttLabourId] = useState("");
  const [attProjectId, setAttProjectId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attInTime, setAttInTime] = useState("09:00 AM");
  const [attOutTime, setAttOutTime] = useState("06:00 PM");
  const [attWorkDesc, setAttWorkDesc] = useState("On-site servicing");

  const handleMarkAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attLabourId) {
      toast.error("Please select a Labour staff member");
      return;
    }
    const lab = labours.find((l) => l.id === attLabourId);
    const targetProj = projects.find((p) => p.id === attProjectId) || projects[0];
    const weeklyWage = lab?.defaultWeeklyWage || 1400;

    if (targetProj) {
      updateProjectLabourLog(targetProj.id, {
        labourId: attLabourId,
        labourName: lab?.name || attLabourId,
        labourType: lab?.type || "Permanent",
        weeklyWage: weeklyWage,
        date: attDate,
        inTime: attInTime,
        outTime: attOutTime,
        attendance: "Present",
        hoursWorked: calculateHoursFromTimes(attInTime, attOutTime),
        earnedMoney: calculateEarnedWage(weeklyWage, calculateHoursFromTimes(attInTime, attOutTime)),
        workDescription: attWorkDesc,
      });
    }
    setMarkAttendanceOpen(false);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteLabourTargetId, setDeleteLabourTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabourProfile, setSelectedLabourProfile] = useState<Labour | null>(labours[0] || null);

  const selectedYear = 2026;

  // Add Labour modal
  const [addOpen, setAddOpen] = useState(false);
  const [labourFormData, setLabourFormData] = useState({
    name: "",
    phone: "",
    loginId: "",
    pin: "",
    type: "Permanent" as LabourType,
    defaultWeeklyWage: 1400,
    status: "Available" as any,
  });

  const handleAddLabourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourFormData.name.trim()) {
      toast.error("Labour Name is required");
      return;
    }

    const newL = await addLabour({
      name: labourFormData.name,
      phone: labourFormData.phone,
      loginId: labourFormData.loginId.trim() || "",
      pin: labourFormData.pin.trim() || "0000",
      type: labourFormData.type,
      defaultWeeklyWage: labourFormData.defaultWeeklyWage,
      status: labourFormData.status,
      skills: [],
      wageHistory: [],
    });
    setSelectedLabourProfile(newL);
    setAddOpen(false);
    setLabourFormData({
      name: "",
      phone: "",
      loginId: "",
      pin: "",
      type: "Permanent",
      defaultWeeklyWage: 1400,
      status: "Available",
    });
  };

  // Navigation state for Attendance Matrix
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth(); // 0-indexed
  const monthName = calendarDate.toLocaleString("en-US", { month: "long" });
  const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // Unified global attendance records (central attendance + project logs)
  const { allAttendanceRecords, globalAttendanceList } = React.useMemo(() => {
    const centralLogs = Object.values(attendance || {}).filter((r) => Boolean(r && r.date));
    const projLogs = (projects || []).flatMap((p) =>
      (p.labourLogs || []).map((lg) => ({
        id: `${p.id}_${lg.labourId}_${lg.date}`,
        labourId: lg.labourId,
        labourName: lg.labourName,
        projectId: p.id,
        projectName: p.customerName,
        date: lg.date,
        status: (lg.attendance as any) || (lg.hoursWorked && lg.hoursWorked > 0 ? "Present" : "Absent"),
        inTime: lg.inTime,
        outTime: lg.outTime,
        hoursWorked: lg.hoursWorked,
        earnedMoney: lg.earnedMoney,
        workDescription: lg.workDescription,
        weeklyWage: lg.weeklyWage,
      }))
    );

    const map = new Map<string, any>();
    const list: any[] = [];

    [...centralLogs, ...projLogs].forEach((item) => {
      if (!item || !item.labourId || !item.date) return;
      const key = `${item.labourId}_${item.date}`;
      const existing = map.get(key);
      if (!existing || item.status === "Present" || (item.hoursWorked && item.hoursWorked > 0)) {
        map.set(key, item);
      }
      list.push(item);
    });

    list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return { allAttendanceRecords: map, globalAttendanceList: list };
  }, [attendance, projects]);

  const getLabourMonthStats = (labourId: string) => {
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;
    let totalHours = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const monthStr = (calendarMonth + 1) < 10 ? `0${calendarMonth + 1}` : `${calendarMonth + 1}`;
      const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;
      const record = allAttendanceRecords.get(`${labourId}_${dateKey}`);
      if (record) {
        if (record.status === "Present" || record.status === "Full Day") {
          presentCount++;
          totalHours += record.hoursWorked || 8.5;
        } else if (record.status === "Half Day" || record.status === "Half-Day") {
          halfDayCount++;
          presentCount += 0.5;
          totalHours += record.hoursWorked || 4;
        } else if (record.status === "Absent") absentCount++;
        else if (record.status === "Leave") leaveCount++;
      }
    }

    const totalDays = Math.ceil(presentCount + absentCount + halfDayCount);
    const attendancePct = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;

    const labour = labours.find((l) => l.id === labourId);
    const defaultWage = labour ? labour.defaultWeeklyWage || 1400 : 1400;

    const weeksWorked = Math.max(0, Math.ceil(presentCount / 6));
    const paymentsReceived = weeksWorked * defaultWage;

    return {
      presentCount,
      absentCount,
      leaveCount,
      totalHours,
      attendancePct,
      paymentsReceived,
      defaultWage,
    };
  };

  const activeLabours = (labours || []).filter((l) => showInactive || l?.isActive !== false);
  const permanentCount = activeLabours.filter((l) => l?.type === "Permanent").length;
  const contractCount = activeLabours.filter((l) => l?.type === "Contract").length;
  const allCount = activeLabours.length;

  const filteredLabours = (labours || []).filter((l) => {
    if (!l) return false;
    const name = l.name || "";
    const phone = l.phone || "";
    const id = l.id || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      labourTypeFilter === "ALL"
        ? true
        : labourTypeFilter === "PERMANENT"
        ? l.type === "Permanent"
        : l.type === "Contract";

    const matchesActive = showInactive ? true : l.isActive !== false;

    return matchesSearch && matchesType && matchesActive;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Labours</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (labours.length > 0) setAttLabourId(labours[0].id);
              if (projects.length > 0) setAttProjectId(projects[0].id);
              setMarkAttendanceOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold gap-1.5 shadow-xs"
          >
            <CalendarCheck className="h-4 w-4" /> Mark Attendance
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Labour
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={activeTab === "PROFILE" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (labours.length > 0 && !selectedLabourProfile) setSelectedLabourProfile(labours[0]);
              setActiveTab("PROFILE");
            }}
            className={`text-xs rounded-lg gap-1.5 ${activeTab === "PROFILE" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
          >
            <User className="h-3.5 w-3.5" /> Profile
          </Button>
          <Button
            variant={activeTab === "ATTENDANCE" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("ATTENDANCE")}
            className={`text-xs rounded-lg gap-1.5 ${activeTab === "ATTENDANCE" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
          >
            <Calendar className="h-3.5 w-3.5" /> Attendance
          </Button>
          <Button
            variant={activeTab === "MASTER" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("MASTER")}
            className={`text-xs rounded-lg gap-1.5 ${activeTab === "MASTER" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
          >
            <HardHat className="h-3.5 w-3.5" /> Labour Table
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant={showInactive ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className={`text-xs rounded-lg gap-1.5 font-bold ${
              showInactive ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200" : ""
            }`}
          >
            {showInactive ? "Showing Inactive" : "Show Inactive"}
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Labour Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs rounded-lg h-9"
            />
          </div>
        </div>

      </div>

      {/* TAB 1: LABOUR PROFILE COCKPIT (REDESIGNED FOR PROMPT REQUIREMENTS) */}
      {activeTab === "PROFILE" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Workforce Selector List */}
          <Card className="rounded-xl border border-border bg-white dark:bg-card">
            <CardHeader className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Workforce Roster ({filteredLabours.length})
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {labourTypeFilter === "PERMANENT" ? "Permanent Only" : labourTypeFilter === "CONTRACT" ? "Contract Only" : "All Labours"}
                </Badge>
              </div>

              {/* PERMANENT VS CONTRACT LABOUR SELECTION TABS */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setLabourTypeFilter("PERMANENT");
                    const perms = activeLabours.filter((l) => l.type === "Permanent");
                    if (perms.length > 0) setSelectedLabourProfile(perms[0]);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    labourTypeFilter === "PERMANENT"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Permanent ({permanentCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLabourTypeFilter("CONTRACT");
                    const cnts = activeLabours.filter((l) => l.type === "Contract");
                    if (cnts.length > 0) setSelectedLabourProfile(cnts[0]);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    labourTypeFilter === "CONTRACT"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Contract ({contractCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLabourTypeFilter("ALL")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    labourTypeFilter === "ALL"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allCount})
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[650px] overflow-y-auto">
              {filteredLabours.length === 0 ? (
                <div className="p-8 text-center">
                  <HardHat className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-foreground">No labour workforce registered.</p>
                  <p className="text-xs text-muted-foreground mt-1">Add workers to assign to site projects.</p>
                  <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white gap-1 rounded-lg">
                    <Plus className="h-3.5 w-3.5" /> Add Labour
                  </Button>
                </div>
              ) : (
                filteredLabours.map((l) => {
                  const isSelected = selectedLabourProfile?.id === l.id;
                  const isInactive = l.isActive === false;

                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLabourProfile(l)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isInactive
                          ? isSelected
                            ? "bg-amber-50 border-amber-400 dark:bg-amber-950/60 opacity-80 shadow-xs"
                            : "bg-slate-100/80 dark:bg-slate-900/50 border-slate-300/80 opacity-65 hover:opacity-90"
                          : isSelected
                          ? "bg-blue-50/90 border-blue-400 dark:bg-blue-950/60 shadow-xs"
                          : "bg-white dark:bg-card border-slate-200/80 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-lg grid place-items-center font-bold text-xs shrink-0 ${
                            isInactive ? "bg-slate-300 text-slate-700" : l.type === "Permanent" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-800"
                          }`}>
                            <HardHat className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <p className="font-extrabold text-xs text-foreground truncate">{l.name}</p>
                              {isInactive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium truncate">
                              ID: <span className="font-mono font-semibold">{l.id}</span> • {l.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-extrabold ${
                              l.type === "Permanent" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-800 border-slate-300"
                            }`}
                          >
                            {l.type}
                          </Badge>
                          <span className={`text-[9px] font-bold ${
                            isInactive ? "text-amber-800 font-bold" : l.status === "Assigned" ? "text-emerald-700" : "text-amber-700"
                          }`}>
                            ● {isInactive ? "Deactivated" : l.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Right 2 Cols: Comprehensive Profile View */}
          <div className="md:col-span-2 space-y-6">
            {(() => {
              const activeLabour = (selectedLabourProfile && labours.find((l) => l.id === selectedLabourProfile.id)) || filteredLabours[0] || labours[0] || null;
              if (!activeLabour) {
                return (
                  <Card className="rounded-xl border border-border bg-white dark:bg-card p-12 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">Select a labour staff member from the roster list to view their complete profile, active deployment details, and wage history.</p>
                  </Card>
                );
              }
              const stats = getLabourMonthStats(activeLabour.id);
              const currentProjectsList = projects.filter(
                (p) => (p.assignedLabourIds || []).includes(activeLabour.id) && p.status !== "Completed" && p.status !== "Closed"
              );
              const recentProjectsList = projects.filter((p) => (p.assignedLabourIds || []).includes(activeLabour.id));

              return (
                <div className="space-y-6 text-xs">
                  {/* Header Card */}
                  <Card className="rounded-xl border border-border bg-white dark:bg-card">
                    <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-xl font-extrabold text-foreground">
                            {activeLabour.name}
                          </CardTitle>
                          <Badge className={activeLabour.type === "Permanent" ? "bg-blue-600 text-white text-xs" : "bg-slate-800 text-white text-xs"}>
                            {activeLabour.type} Labour
                          </Badge>
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                            {activeLabour.status}
                          </Badge>
                          {activeLabour.isActive === false && (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold">
                              Inactive / Deactivated
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs mt-1">
                          ID: <strong>{activeLabour.id}</strong> • Mobile: <strong>{activeLabour.phone}</strong>
                        </CardDescription>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          {activeLabour.isActive === false ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReactivateConfirmTarget(activeLabour)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 text-xs font-bold rounded-lg gap-1 shadow-2xs"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Reactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeactivateConfirmTarget(activeLabour)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold rounded-lg gap-1 shadow-2xs"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Deactivate
                            </Button>
                          )}

                          {!hasLabourHistory(activeLabour.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmTarget(activeLabour)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 text-xs font-bold rounded-lg gap-1 shadow-2xs"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Delete Permanently
                            </Button>
                          )}
                        </div>

                        <div className="text-left sm:text-right bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <span className="text-[10px] uppercase font-bold text-emerald-900">Default Weekly Wage</span>
                          <p className="text-xl font-extrabold text-emerald-700">₹{(activeLabour.defaultWeeklyWage || 1400).toLocaleString("en-IN")} / week</p>
                        </div>
                      </div>

                    </CardHeader>

                    <CardContent className="p-5 space-y-6">
                      {/* EMPLOYMENT TYPE DESCRIPTION BANNER */}
                      {activeLabour.type === "Permanent" ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-xl text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-600 text-white">Permanent Roster</Badge>
                              <span className="font-semibold">Continuous workforce assigned continuously across all company site projects.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-slate-800 text-white">Contract Labour</Badge>
                              <span className="font-semibold">Project-specific contract labour assigned specifically for particular site contracts.</span>
                            </div>
                          </div>
                        )}

                        {/* STRUCTURED BLOCK 1: PORTAL LOGIN CREDENTIALS */}
                        <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge className="bg-purple-600 text-white font-bold text-[10px]">Portal Access Credentials</Badge>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Labour ID: <strong className="text-purple-700 dark:text-purple-300">{activeLabour.id}</strong>
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Login ID: <code className="bg-white dark:bg-purple-900/80 px-2 py-0.5 rounded border border-purple-300 font-extrabold text-purple-700 dark:text-purple-300 text-xs">{activeLabour.loginId || activeLabour.name.split(" ")[0]}</code>
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Generated 4-Digit PIN: <code className="bg-white dark:bg-purple-900/80 px-2 py-0.5 rounded border border-purple-300 font-extrabold text-purple-700 dark:text-purple-300 text-xs">{activeLabour.pin || "4827"}</code>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isManagerOrCeo && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetPin(activeLabour.id)}
                                className="h-8 text-[11px] font-bold text-purple-700 border-purple-300 hover:bg-purple-100 cursor-pointer rounded-lg gap-1"
                              >
                                <KeyRound className="h-3.5 w-3.5 inline mr-1" /> Reset PIN
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const text = `Robotics ERP Labour Portal Credentials\nLabour Name: ${activeLabour.name}\nLabour ID: ${activeLabour.id}\nLogin ID: ${activeLabour.loginId || activeLabour.name.split(" ")[0]}\nPIN: ${activeLabour.pin || "4827"}`;
                                navigator.clipboard.writeText(text);
                                toast.success(`Copied login credentials for ${activeLabour.name}`);
                              }}
                              className="h-8 text-[11px] font-bold text-purple-700 border-purple-300 hover:bg-purple-100 cursor-pointer rounded-lg gap-1"
                            >
                              <Copy className="h-3.5 w-3.5 inline mr-1" /> Copy Credentials
                            </Button>
                          </div>
                        </div>

                        {/* STRUCTURED BLOCK 2: TECHNICAL SKILLS & CAPABILITIES */}
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5 text-slate-500 inline mr-1" /> Technical Skills & Capabilities
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{activeLabour.skills?.length || 0} Specializations</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {activeLabour.skills && activeLabour.skills.length > 0 ? (
                              activeLabour.skills.map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="bg-white dark:bg-card text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-[11px] px-2.5 py-0.5">
                                  {skill}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No specific skills listed yet</span>
                            )}
                          </div>
                        </div>

                        {/* STRUCTURED BLOCK 3: 4 KPI METRIC CARDS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-bold uppercase text-blue-800">Total Hours Logged</span>
                            <p className="text-xl font-extrabold text-blue-700 mt-1">{stats.totalHours} hrs</p>
                            <span className="text-[10px] text-blue-600">Across site check-ins</span>
                          </div>
                          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold uppercase text-emerald-800">Attendance Rate</span>
                            <p className="text-xl font-extrabold text-emerald-700 mt-1">{stats.attendancePct}%</p>
                            <span className="text-[10px] text-emerald-600">{stats.presentCount} Present / {stats.absentCount} Absent</span>
                          </div>
                          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold uppercase text-emerald-800">Weekly Wages Paid</span>
                            <p className="text-xl font-extrabold text-emerald-700 mt-1">₹{stats.paymentsReceived.toLocaleString("en-IN")}</p>
                            <span className="text-[10px] text-emerald-600">Disbursements to date</span>
                          </div>
                          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-bold uppercase text-blue-800">Active Site Projects</span>
                            <p className="text-xl font-extrabold text-blue-700 mt-1">{currentProjectsList.length} Sites</p>
                            <span className="text-[10px] text-blue-600">Currently active on site</span>
                          </div>
                        </div>

                        {/* CURRENT ACTIVE DEPLOYED PROJECTS SECTION */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between border-b pb-2">
                            <span className="flex items-center gap-1.5 text-blue-700 font-extrabold">
                              <Briefcase className="h-4 w-4 text-blue-600" /> Current Active Deployed Project Details
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                              {currentProjectsList.length} Active Project(s)
                            </Badge>
                          </h4>
                          {currentProjectsList.length === 0 ? (
                            <p className="text-muted-foreground bg-muted/20 p-4 rounded-xl border text-center text-xs">
                              Currently available for new project deployment. Not deployed on any active site.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {currentProjectsList.map((p) => {
                                const assignment = p.labourAssignments?.find((a) => a.labourId === activeLabour.id);
                                const projWage = assignment ? assignment.weeklyWage : activeLabour.defaultWeeklyWage || 1400;
                                const projHours = (p.labourLogs || [])
                                  .filter((lg) => lg.labourId === activeLabour.id)
                                  .reduce((acc, lg) => acc + (lg.hoursWorked || 0), 0);

                                return (
                                  <div key={p.id} className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-sm text-blue-600">{p.id}</span>
                                          <span className="font-bold text-foreground">• {p.customerName}</span>
                                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">{p.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">{p.natureOfWork}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
                                          ₹{projWage.toLocaleString("en-IN")}/week
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800">
                                          {projHours} hrs logged
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      <div className="space-y-1">
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>Site Location:</span>
                                          <span className="font-semibold text-foreground">{p.location}</span>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>Lead Engineer:</span>
                                          <span className="font-semibold text-blue-700">{p.assignedEngineerName || "Er. Rajesh Kumar"}</span>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>Work Committed Date:</span>
                                          <span className="font-bold text-blue-800">{p.workCommittedDate || "Not Specified"}</span>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>Actual Work Started Date:</span>
                                          <span className="font-bold text-emerald-800">{p.actualWorkStartedDate || "Pending"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* COMPLETE ALL-TIME PROJECT ASSIGNMENT HISTORY */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between border-b pb-2">
                            <span className="flex items-center gap-1.5 text-blue-700 font-extrabold">
                              <TrendingUp className="h-4 w-4 text-blue-600" /> Complete Project Assignment History ({recentProjectsList.length})
                            </span>
                          </h4>
                          <div className="border rounded-xl overflow-hidden bg-white dark:bg-card">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                                <tr>
                                  <th className="p-2.5 pl-3">Project ID & Customer</th>
                                  <th className="p-2.5">Nature of Work & Location</th>
                                  <th className="p-2.5">Weekly Wage</th>
                                  <th className="p-2.5">Assigned Date</th>
                                  <th className="p-2.5 text-right pr-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {recentProjectsList.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                      No past project assignment records found for this labour.
                                    </td>
                                  </tr>
                                ) : (
                                  recentProjectsList.map((p) => {
                                    const assignment = p.labourAssignments?.find((a) => a.labourId === activeLabour.id);
                                    const projWage = assignment ? assignment.weeklyWage : activeLabour.defaultWeeklyWage || 1400;

                                    return (
                                      <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                                        <td className="p-2.5 pl-3 font-bold text-blue-600">
                                          {p.id}
                                          <div className="text-[11px] text-foreground font-semibold">{p.customerName}</div>
                                        </td>
                                        <td className="p-2.5">
                                          <div className="font-medium text-foreground">{p.natureOfWork}</div>
                                          <div className="text-[10px] text-muted-foreground">{p.location}</div>
                                        </td>
                                        <td className="p-2.5 font-bold text-emerald-700">₹{projWage.toLocaleString("en-IN")}/wk</td>
                                        <td className="p-2.5 text-muted-foreground">{assignment?.assignedDate || p.scheduledDate}</td>
                                        <td className="p-2.5 text-right pr-3">
                                          <Badge
                                            className={`text-[10px] ${
                                              p.status === "Ongoing"
                                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                                : p.status === "Completed"
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                : "bg-blue-100 text-blue-800 border-blue-200"
                                            }`}
                                          >
                                            {p.status}
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

                        {/* RECENT SITE WORK CHECK-IN LOGS */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between border-b pb-2">
                            <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
                              <Clock className="h-4 w-4 text-emerald-600" /> Recent Site Check-In & Work Logs
                            </span>
                          </h4>
                          <div className="border rounded-xl overflow-hidden bg-white dark:bg-card">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                                <tr>
                                  <th className="p-2.5 pl-3">Date</th>
                                  <th className="p-2.5">Project / Site</th>
                                  <th className="p-2.5">In / Out Time</th>
                                  <th className="p-2.5">Hours</th>
                                  <th className="p-2.5">Earned Wages</th>
                                  <th className="p-2.5">Attendance</th>
                                  <th className="p-2.5 pr-3">Work Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {(() => {
                                  const workerLogs = globalAttendanceList.filter((r) => r.labourId === activeLabour.id);
                                  if (workerLogs.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                          No daily work check-in logs recorded yet.
                                        </td>
                                      </tr>
                                    );
                                  }
                                  return workerLogs.slice(0, 5).map((rec) => {
                                    const hrs = rec.hoursWorked || 0;
                                    const earnedMoney = rec.earnedMoney || calculateEarnedWage(rec.weeklyWage || activeLabour.defaultWeeklyWage || 1400, hrs);

                                    return (
                                      <tr key={rec.id} className="hover:bg-accent/40 transition-colors">
                                        <td className="p-2.5 pl-3 font-semibold text-foreground">{rec.date}</td>
                                        <td className="p-2.5 font-bold text-blue-600">
                                          {rec.projectId ? `${rec.projectId}` : "Site Duty"}
                                        </td>
                                        <td className="p-2.5 font-mono text-muted-foreground">
                                          {rec.inTime || "—"} - {rec.outTime || "—"}
                                        </td>
                                        <td className="p-2.5 font-bold text-blue-700">{hrs ? `${hrs} hrs` : "0 hrs"}</td>
                                        <td className="p-2.5 font-extrabold text-emerald-700">₹{earnedMoney.toLocaleString("en-IN")}</td>
                                        <td className="p-2.5">
                                          <Badge className={rec.status === "Present" ? "bg-emerald-100 text-emerald-800 text-[10px]" : "bg-slate-200 text-slate-800 border-slate-300 text-[10px]"}>
                                            {rec.status}
                                          </Badge>
                                        </td>
                                        <td className="p-2.5 pr-3 text-muted-foreground truncate max-w-xs">{rec.workDescription || "-"}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* ATTENDANCE CALENDAR (VISUAL MATRIX FOR CURRENT MONTH) */}
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Monthly Attendance Calendar Matrix ({monthName} {calendarYear})
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePrevMonth}
                                className="h-6 w-6 p-0 rounded-md cursor-pointer"
                                title="Previous Month"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </Button>
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-foreground">
                                {monthName} {calendarYear}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleNextMonth}
                                className="h-6 w-6 p-0 rounded-md cursor-pointer"
                                title="Next Month"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                            {Array.from({ length: totalDaysInMonth }, (_, idx) => {
                              const day = idx + 1;
                              const dayStr = day < 10 ? `0${day}` : `${day}`;
                              const monthStr = (calendarMonth + 1) < 10 ? `0${calendarMonth + 1}` : `${calendarMonth + 1}`;
                              const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;
                              const record = allAttendanceRecords.get(`${activeLabour.id}_${dateKey}`);
                              const status = record?.status;

                              let badgeStyle = "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"; // Default: No data (-)
                              let label = "-";

                              if (record && status) {
                                if (status === "Present" || status === "Full Day") {
                                  badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                                  label = "P";
                                } else if (status === "Half Day" || status === "Half-Day") {
                                  badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                                  label = "H";
                                } else if (status === "Absent") {
                                  badgeStyle = "bg-rose-100 text-rose-800 border-rose-300";
                                  label = "A";
                                } else if (status === "Leave") {
                                  badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                                  label = "L";
                                }
                              }

                              return (
                                <div
                                  key={day}
                                  title={`${dateKey}: ${status || "No record"} (${record?.hoursWorked || 0} hrs)`}
                                  className={`p-1.5 text-center rounded-lg border text-[10px] font-bold ${badgeStyle}`}
                                >
                                  <div>{day}</div>
                                  <div className="text-[9px] font-semibold">{label}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE CALENDAR & LOGS */}
      {activeTab === "ATTENDANCE" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" /> Auto-Synced Central Attendance Module
              </CardTitle>
              <CardDescription className="text-xs">
                Attendance records populate automatically from Project Work Logs without double entry.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800">
              {globalAttendanceList.length} Logged Records
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Date</th>
                    <th className="p-3">Labour Name</th>
                    <th className="p-3">Project / Site Name</th>
                    <th className="p-3">Weekly Wage</th>
                    <th className="p-3">In Time</th>
                    <th className="p-3">Out Time</th>
                    <th className="p-3">Hours Worked</th>
                    <th className="p-3">Attendance Status</th>
                    <th className="p-3">Work Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {globalAttendanceList.map((rec) => {
                    const lab = labours.find((l) => l.id === rec.labourId);
                    const wage = rec.weeklyWage || lab?.defaultWeeklyWage || 1400;

                    return (
                      <tr key={rec.id} className="hover:bg-accent/40 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-foreground">{rec.date}</td>
                        <td className="p-3 font-bold text-foreground">
                          {lab ? lab.name : rec.labourName || rec.labourId}
                          <div className="text-[10px] text-muted-foreground font-mono">{rec.labourId}</div>
                        </td>
                        <td className="p-3 font-bold text-blue-600">
                          {rec.projectId ? `${rec.projectId} (${rec.projectName || "Site"})` : "General Site Duty"}
                        </td>
                        <td className="p-3 font-bold text-emerald-700">₹{wage}/wk</td>
                        <td className="p-3 font-mono text-blue-600 font-semibold">{rec.inTime || "—"}</td>
                        <td className="p-3 font-mono text-muted-foreground">{rec.outTime || "—"}</td>
                        <td className="p-3 font-bold text-foreground">
                          {rec.hoursWorked ? `${rec.hoursWorked} hrs` : "0 hrs"}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] ${
                              rec.status === "Present"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : rec.status === "Absent"
                                ? "bg-slate-200 text-slate-800 border-slate-300"
                                : "bg-blue-100 text-blue-800 border-blue-300"
                            }`}
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">
                          {rec.workDescription || "On-site servicing"}
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

      {/* TAB 3: WORKFORCE MASTER */}
      {activeTab === "MASTER" && (
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">Labour Database Master</CardTitle>
              <CardDescription className="text-xs">Master workforce database split by Employment Type</CardDescription>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border">
              <Button
                size="sm"
                variant={labourTypeFilter === "PERMANENT" ? "default" : "ghost"}
                onClick={() => setLabourTypeFilter("PERMANENT")}
                className={`h-7 text-xs rounded-lg gap-1 ${labourTypeFilter === "PERMANENT" ? "bg-blue-600 hover:bg-blue-700 text-white font-bold" : ""}`}
              >
                Permanent ({permanentCount})
              </Button>
              <Button
                size="sm"
                variant={labourTypeFilter === "CONTRACT" ? "default" : "ghost"}
                onClick={() => setLabourTypeFilter("CONTRACT")}
                className={`h-7 text-xs rounded-lg gap-1 ${labourTypeFilter === "CONTRACT" ? "bg-slate-800 hover:bg-slate-900 text-white font-bold" : ""}`}
              >
                Contract ({contractCount})
              </Button>
              <Button
                size="sm"
                variant={labourTypeFilter === "ALL" ? "default" : "ghost"}
                onClick={() => setLabourTypeFilter("ALL")}
                className={`h-7 text-xs rounded-lg ${labourTypeFilter === "ALL" ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : ""}`}
              >
                All ({labours.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="p-3 pl-4">Labour ID</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Labour Type</th>
                    <th className="p-3">Default Weekly Wage</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLabours.map((l) => (
                    <tr key={l.id} className={`hover:bg-accent/40 ${l.isActive === false ? "opacity-60 bg-amber-50/40 dark:bg-amber-950/20" : ""}`}>
                      <td className="p-3 pl-4 font-bold text-blue-600">{l.id}</td>
                      <td className="p-3 font-semibold text-foreground">
                        {l.name}
                        {l.isActive === false && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] bg-amber-100 text-amber-900 border-amber-300 font-bold">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{l.phone}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">{l.type}</Badge>
                      </td>
                      <td className="p-3 font-bold text-emerald-700">₹{(l.defaultWeeklyWage || 1400).toLocaleString("en-IN")}/wk</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{l.status}</Badge>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManagerOrCeo && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetPin(l.id)}
                              className="h-7 text-[11px] font-bold text-purple-700 border-purple-300 hover:bg-purple-50 rounded-lg gap-1"
                            >
                              <KeyRound className="h-3 w-3" /> Reset PIN
                            </Button>
                          )}
                          {l.isActive === false ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReactivateConfirmTarget(l)}
                              className="h-7 text-[11px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-lg gap-1"
                            >
                              <UserCheck className="h-3 w-3" /> Reactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeactivateConfirmTarget(l)}
                              className="h-7 text-[11px] font-bold text-amber-800 border-amber-300 hover:bg-amber-50 rounded-lg gap-1"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-600" /> Deactivate
                            </Button>
                          )}
                          {!hasLabourHistory(l.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmTarget(l)}
                              className="h-7 text-[11px] font-bold text-rose-700 border-rose-300 hover:bg-rose-50 rounded-lg gap-1"
                            >
                              <Trash2 className="h-3 w-3 text-rose-600" /> Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ADD LABOUR PROFILE MODAL */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-full sm:max-w-xl w-full max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-white dark:bg-card border border-border shadow-2xl">
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
                    value={labourFormData.name}
                    onChange={(e) => setLabourFormData({ ...labourFormData, name: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Phone *</Label>
                  <Input
                    required
                    value={labourFormData.phone}
                    onChange={(e) => setLabourFormData({ ...labourFormData, phone: e.target.value })}
                    className={`h-9 text-xs rounded-xl bg-background ${
                      labourFormData.phone.replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                  />
                  {labourFormData.phone.replace(/\D/g, "").length > 10 && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Mobile number cannot exceed 10 digits ({labourFormData.phone.replace(/\D/g, "").length}/10 digits)
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Login ID</Label>
                  <Input
                    value={labourFormData.loginId}
                    onChange={(e) => setLabourFormData({ ...labourFormData, loginId: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">PIN</Label>
                  <Input
                    maxLength={4}
                    value={labourFormData.pin}
                    onChange={(e) => setLabourFormData({ ...labourFormData, pin: e.target.value.replace(/\D/g, "") })}
                    className="h-9 text-xs rounded-xl bg-background font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* EMPLOYMENT */}
            <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Employment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Type *</Label>
                  <SmartComboBox
                    category="Labour Types"
                    value={labourFormData.type}
                    onChange={(val) => setLabourFormData({ ...labourFormData, type: val as LabourType })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Weekly Wage (₹) *</Label>
                  <Input
                    type="number"
                    required
                    value={labourFormData.defaultWeeklyWage}
                    onChange={(e) =>
                      setLabourFormData({ ...labourFormData, defaultWeeklyWage: Number(e.target.value) })
                    }
                    className="h-9 text-xs rounded-xl font-bold text-purple-700 dark:text-purple-400 bg-background"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-bold shadow-md px-5 w-full sm:w-auto">
                Add Labour Profile
              </Button>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl text-xs w-full sm:w-auto">
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <DeleteConfirm
        open={Boolean(deleteLabourTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteLabourTargetId(null);
        }}
        onConfirm={() => {
          if (deleteLabourTargetId) {
            deleteLabour(deleteLabourTargetId);
            if (selectedLabourProfile?.id === deleteLabourTargetId) {
              setSelectedLabourProfile(null);
            }
            setDeleteLabourTargetId(null);
          }
        }}
        title="Delete Labour Profile?"
        description="Are you sure you want to delete this labour profile? All historical wages and attendance logs will remain stored."
      />

      {/* MARK ATTENDANCE DIALOG */}
      <Dialog open={markAttendanceOpen} onOpenChange={setMarkAttendanceOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-card border shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <CalendarCheck className="h-5 w-5 text-emerald-600" /> Mark Labour Attendance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log Start Time & End Time to calculate worked hours and earned daily wages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMarkAttendanceSubmit} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-semibold block mb-1">Select Labour Staff *</Label>
              <Select value={attLabourId || labours[0]?.id || "LBR-101"} onValueChange={setAttLabourId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Choose Labour..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {labours.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.type} - ₹{(l.defaultWeeklyWage || 1400).toLocaleString("en-IN")}/wk)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold block mb-1">Select Site Project *</Label>
              <Select value={attProjectId || projects[0]?.id || "PRJ-2026-001"} onValueChange={setAttProjectId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Choose Project..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} — {p.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold block mb-1">Attendance Date</Label>
              <Input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="h-9 rounded-lg font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold block mb-1">Start Time / In Time</Label>
                <Input
                  value={attInTime}
                  onChange={(e) => setAttInTime(e.target.value)}
                  placeholder="09:00 AM"
                  className="h-9 rounded-lg font-mono font-semibold text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold block mb-1">End Time / Out Time</Label>
                <Input
                  value={attOutTime}
                  onChange={(e) => setAttOutTime(e.target.value)}
                  placeholder="06:00 PM"
                  className="h-9 rounded-lg font-mono font-semibold text-xs"
                />
              </div>
            </div>

            {/* REALTIME HOURS & EARNED MONEY BOX */}
            {(() => {
              const selectedL = labours.find((l) => l.id === attLabourId);
              const wage = selectedL ? selectedL.defaultWeeklyWage || 1400 : 1400;
              const hours = calculateHoursFromTimes(attInTime, attOutTime);
              const money = calculateEarnedWage(wage, hours);
              return (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-emerald-900 dark:text-emerald-300 font-bold">Calculated Working Hours:</span>
                    <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {hours > 0 ? `${hours} hrs` : "0 hrs"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-900 dark:text-emerald-300 font-bold">Earned Wages:</span>
                    <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ₹{money.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMarkAttendanceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
                Save & Mark Attendance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* DEACTIVATE CONFIRM DIALOG */}
      <Dialog open={Boolean(deactivateConfirmTarget)} onOpenChange={(open) => !open && setDeactivateConfirmTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Deactivate Labour Member?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              This will hide <strong>{deactivateConfirmTarget?.name}</strong> from active lists. Their history will be kept. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeactivateConfirmTarget(null)} className="rounded-lg text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (deactivateConfirmTarget) {
                  await deactivateLabour(deactivateConfirmTarget.id);
                  setDeactivateConfirmTarget(null);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
            >
              Deactivate Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REACTIVATE CONFIRM DIALOG */}
      <Dialog open={Boolean(reactivateConfirmTarget)} onOpenChange={(open) => !open && setReactivateConfirmTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" /> Reactivate Labour Member?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              This will restore <strong>{reactivateConfirmTarget?.name}</strong> to the active workforce roster. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button variant="outline" size="sm" onClick={() => setReactivateConfirmTarget(null)} className="rounded-lg text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (reactivateConfirmTarget) {
                  await reactivateLabour(reactivateConfirmTarget.id);
                  setReactivateConfirmTarget(null);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              Reactivate Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE PERMANENTLY CONFIRM DIALOG */}
      <Dialog open={Boolean(deleteConfirmTarget)} onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" /> Permanently Delete Labour?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              This will permanently erase <strong>{deleteConfirmTarget?.name}</strong> and cannot be undone. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmTarget(null)} className="rounded-lg text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (deleteConfirmTarget) {
                  try {
                    await deleteLabourPermanently(deleteConfirmTarget.id);
                    setDeleteConfirmTarget(null);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to delete labour");
                  }
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

