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
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  Trash2,
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
              onClick={() => {
                try {
                  localStorage.clear();
                  window.location.reload();
                } catch (e) {}
              }}
              className="text-xs font-semibold rounded-lg px-4 border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              Reset Stored Demo Data
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
  const { addLabour, updateLabour, deleteLabour, checkLabourAvailability, addMasterDataItem, updateProjectLabourLog } = robotics;

  const [activeTab, setActiveTab] = useState<"PROFILE" | "ATTENDANCE" | "MASTER">("PROFILE");
  const [labourTypeFilter, setLabourTypeFilter] = useState<"PERMANENT" | "CONTRACT" | "ALL">("ALL");

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
    type: "Permanent" as LabourType,
    defaultWeeklyWage: 1400,
    status: "Available" as any,
  });

  const handleAddLabourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourFormData.name.trim()) {
      toast.error("❌ Labour Name is required");
      return;
    }
    const cleanPhone = labourFormData.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("❌ Phone Number must be at least 10 digits");
      return;
    }

    const newL = addLabour({
      name: labourFormData.name,
      phone: labourFormData.phone,
      type: labourFormData.type,
      defaultWeeklyWage: labourFormData.defaultWeeklyWage,
      status: labourFormData.status,
      skills: [],
      wageHistory: [],
    });
    setSelectedLabourProfile(newL);
    toast.success("✅ Labour Profile Created Successfully");
    setAddOpen(false);
  };

  const daysInMonth = 28;

  const getLabourMonthStats = (labourId: string) => {
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let totalHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const dateKey = `${selectedYear}-07-${dayStr}`;
      const record = attendance[`${labourId}_${dateKey}`];
      if (record) {
        if (record.status === "Present") {
          presentCount++;
          totalHours += record.hoursWorked || 8.5;
        } else if (record.status === "Absent") absentCount++;
        else if (record.status === "Leave") leaveCount++;
      }
    }

    const totalDays = presentCount + absentCount;
    const attendancePct = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;

    const labour = labours.find((l) => l.id === labourId);
    const defaultWage = labour ? labour.defaultWeeklyWage || 1400 : 1400;

    // Payments received calculation (weekly wage scaled by weeks worked)
    const weeksWorked = Math.ceil(presentCount / 6);
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

  const permanentCount = (labours || []).filter((l) => l?.type === "Permanent").length;
  const contractCount = (labours || []).filter((l) => l?.type === "Contract").length;

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

    return matchesSearch && matchesType;
  });

  // Global attendance records
  const globalAttendanceList = Object.values(attendance || {})
    .filter((r) => Boolean(r && r.date))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Labour Management</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
              Weekly Wage Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Labour paid WEEKLY. Wages configured per project assignment. Complete profiles with wage history, attendance % and working hours.
          </p>
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
            <Plus className="h-4 w-4" /> Add Labour Profile
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
            <User className="h-3.5 w-3.5" /> Labour Profile Cockpit
          </Button>
          <Button
            variant={activeTab === "ATTENDANCE" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("ATTENDANCE")}
            className={`text-xs rounded-lg gap-1.5 ${activeTab === "ATTENDANCE" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
          >
            <Calendar className="h-3.5 w-3.5" /> Attendance Calendar & Logs
          </Button>
          <Button
            variant={activeTab === "MASTER" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("MASTER")}
            className={`text-xs rounded-lg gap-1.5 ${activeTab === "MASTER" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
          >
            <HardHat className="h-3.5 w-3.5" /> Workforce Master Table
          </Button>
        </div>

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
                  {labourTypeFilter === "PERMANENT" ? "Permanent Only" : labourTypeFilter === "CONTRACT" ? "Contract Only" : "All Workers"}
                </Badge>
              </div>

              {/* PERMANENT VS CONTRACT LABOUR SELECTION TABS */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setLabourTypeFilter("PERMANENT");
                    const perms = labours.filter((l) => l.type === "Permanent");
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
                    const cnts = labours.filter((l) => l.type === "Contract");
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
                  All ({labours.length})
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

                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLabourProfile(l)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50 border-blue-300 dark:bg-blue-950/40 shadow-xs"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-foreground">{l.name}</p>
                          <p className="text-[11px] text-muted-foreground">📞 {l.phone} • {l.id}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={l.type === "Permanent" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-800 border-slate-300"}
                        >
                          {l.type}
                        </Badge>
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
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl font-extrabold text-foreground">
                            {activeLabour.name}
                          </CardTitle>
                          <Badge className={activeLabour.type === "Permanent" ? "bg-blue-600 text-white text-xs" : "bg-slate-800 text-white text-xs"}>
                            {activeLabour.type} Labour
                          </Badge>
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                            {activeLabour.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1">
                          ID: <strong>{activeLabour.id}</strong> • Mobile: <strong>{activeLabour.phone}</strong>
                        </CardDescription>
                      </div>
                      <div className="text-left sm:text-right bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <span className="text-[10px] uppercase font-bold text-emerald-900">Default Weekly Wage</span>
                        <p className="text-xl font-extrabold text-emerald-700">₹{(activeLabour.defaultWeeklyWage || 1400).toLocaleString("en-IN")} / week</p>
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
                              <Badge className="bg-slate-800 text-white">Contract Worker</Badge>
                              <span className="font-semibold">Project-specific contract worker assigned specifically for particular site contracts.</span>
                            </div>
                          </div>
                        )}

                        {/* 4 KPI METRIC CARDS */}
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
                                          <span>📍 Site Location:</span>
                                          <span className="font-semibold text-foreground">{p.location}</span>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>👨‍🔧 Lead Engineer:</span>
                                          <span className="font-semibold text-blue-700">{p.assignedEngineerName || "Er. Rajesh Kumar"}</span>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>📅 Work Committed Date:</span>
                                          <span className="font-bold text-blue-800">{p.workCommittedDate || "Not Specified"}</span>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-1">
                                          <span>⚡ Actual Work Started Date:</span>
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
                                      No past project assignment records found for this worker.
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
                                          <div className="text-[10px] text-muted-foreground">📍 {p.location}</div>
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

                        {/* ATTENDANCE CALENDAR (VISUAL MATRIX FOR JULY 2026) */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Monthly Attendance Calendar Matrix (July 2026)
                          </h4>
                          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                            {Array.from({ length: 28 }, (_, idx) => {
                              const day = idx + 1;
                              const dayStr = day < 10 ? `0${day}` : `${day}`;
                              const dateKey = `2026-07-${dayStr}`;
                              const record = (attendance || {})[`${activeLabour.id}_${dateKey}`];
                              const status = record?.status || "Absent";

                              return (
                                <div
                                  key={day}
                                  title={`${dateKey}: ${status} (${record?.hoursWorked || 0} hrs)`}
                                  className={`p-1.5 text-center rounded-lg border text-[10px] font-bold ${
                                    status === "Present"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : status === "Leave"
                                      ? "bg-blue-100 text-blue-800 border-blue-300"
                                      : "bg-slate-200 text-slate-800 border-slate-300"
                                  }`}
                                >
                                  <div>{day}</div>
                                  <div className="text-[9px] font-semibold">{status === "Present" ? "P" : status === "Leave" ? "L" : "A"}</div>
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLabours.map((l) => (
                    <tr key={l.id} className="hover:bg-accent/40">
                      <td className="p-3 pl-4 font-bold text-blue-600">{l.id}</td>
                      <td className="p-3 font-semibold text-foreground">{l.name}</td>
                      <td className="p-3 text-muted-foreground">{l.phone}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">{l.type}</Badge>
                      </td>
                      <td className="p-3 font-bold text-emerald-700">₹{(l.defaultWeeklyWage || 1400).toLocaleString("en-IN")}/wk</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{l.status}</Badge>
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
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white dark:bg-card border border-border shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-base font-extrabold text-foreground">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 grid place-items-center border border-blue-200 dark:border-blue-800">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <span>Add New Labour Staff Profile</span>
                <p className="text-xs font-normal text-muted-foreground">Register permanent staff or contract workers with wage configuration.</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddLabourSubmit} className="space-y-4 text-xs pt-2">
            {/* SECTION 1: PERSONAL & CONTACT INFORMATION */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" /> Section 1: Contact Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Labour Full Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={labourFormData.name}
                    onChange={(e) => setLabourFormData({ ...labourFormData, name: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Mobile Phone Number *</Label>
                  <Input
                    required
                    placeholder="e.g. 9840998877"
                    value={labourFormData.phone}
                    onChange={(e) => setLabourFormData({ ...labourFormData, phone: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: EMPLOYMENT TYPE & WAGES */}
            <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Section 2: Employment Type & Wage Setup
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Labour Type (Contract / Permanent) *</Label>
                  <SmartComboBox
                    category="Labour Types"
                    value={labourFormData.type}
                    onChange={(val) => setLabourFormData({ ...labourFormData, type: val as LabourType })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Default Weekly Wage (₹/wk) *</Label>
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

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-bold shadow-md px-5">
                Add Labour Profile
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
    </div>
  );
}
