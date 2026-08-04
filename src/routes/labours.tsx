import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { Labour, LabourType } from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  HardHat,
  Plus,
  Search,
  Calendar,
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/labours")({
  component: LaboursComponent,
});

function LaboursComponent() {
  const { labours, attendance, projects, addLabour, updateLabour, deleteLabour, checkLabourAvailability } = useRobotics();

  const [activeTab, setActiveTab] = useState<"PROFILE" | "ATTENDANCE" | "MASTER">("PROFILE");
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
    skillsStr: "Robotics Servicing, Hydraulics",
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
    const skills = labourFormData.skillsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const newL = addLabour({
      name: labourFormData.name,
      phone: labourFormData.phone,
      type: labourFormData.type,
      defaultWeeklyWage: labourFormData.defaultWeeklyWage,
      status: labourFormData.status,
      skills,
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

  const filteredLabours = labours.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Global attendance records
  const globalAttendanceList = Object.values(attendance).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Labour Management</h1>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Weekly Wage Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Labour paid WEEKLY. Wages configured per project assignment. Complete profiles with wage history, attendance % and working hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Workforce Members ({filteredLabours.length})
              </CardTitle>
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
                          className={l.type === "Permanent" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}
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
            {selectedLabourProfile ? (
              (() => {
                const stats = getLabourMonthStats(selectedLabourProfile.id);
                const currentProjectsList = projects.filter(
                  (p) => p.assignedLabourIds.includes(selectedLabourProfile.id) && p.status !== "Completed" && p.status !== "Closed"
                );
                const recentProjectsList = projects.filter((p) => p.assignedLabourIds.includes(selectedLabourProfile.id));

                return (
                  <div className="space-y-6 text-xs">
                    {/* Header Card */}
                    <Card className="rounded-xl border border-border bg-white dark:bg-card">
                      <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-extrabold text-foreground">
                              {selectedLabourProfile.name}
                            </CardTitle>
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              {selectedLabourProfile.type}
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                              {selectedLabourProfile.status}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-1">
                            ID: <strong>{selectedLabourProfile.id}</strong> • Mobile: <strong>{selectedLabourProfile.phone}</strong>
                          </CardDescription>
                        </div>
                        <div className="text-left sm:text-right bg-purple-50 p-3 rounded-xl border border-purple-100">
                          <span className="text-[10px] uppercase font-bold text-purple-900">Default Weekly Wage</span>
                          <p className="text-xl font-extrabold text-purple-700">₹{(selectedLabourProfile.defaultWeeklyWage || 1400).toLocaleString("en-IN")} / week</p>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 space-y-6">
                        {/* 5 KPI Metric Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-bold uppercase text-blue-800">Working Hours</span>
                            <p className="text-xl font-extrabold text-blue-700 mt-1">{stats.totalHours} hrs</p>
                            <span className="text-[10px] text-blue-600">Across site logs</span>
                          </div>
                          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold uppercase text-emerald-800">Attendance %</span>
                            <p className="text-xl font-extrabold text-emerald-700 mt-1">{stats.attendancePct}%</p>
                            <span className="text-[10px] text-emerald-600">{stats.presentCount} Present / {stats.absentCount} Absent</span>
                          </div>
                          <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-100">
                            <span className="text-[10px] font-bold uppercase text-purple-800">Payments Earned</span>
                            <p className="text-xl font-extrabold text-purple-700 mt-1">₹{stats.paymentsReceived.toLocaleString("en-IN")}</p>
                            <span className="text-[10px] text-purple-600">Weekly wage disbursements</span>
                          </div>
                          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-100">
                            <span className="text-[10px] font-bold uppercase text-amber-800">Active Projects</span>
                            <p className="text-xl font-extrabold text-amber-700 mt-1">{currentProjectsList.length} Sites</p>
                            <span className="text-[10px] text-amber-600">Currently deployed</span>
                          </div>
                        </div>

                        {/* CURRENT PROJECTS SECTION */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-blue-600" /> Current Deployed Projects
                          </h4>
                          {currentProjectsList.length === 0 ? (
                            <p className="text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                              Currently available for new project deployment.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {currentProjectsList.map((p) => {
                                const assignment = p.labourAssignments?.find((a) => a.labourId === selectedLabourProfile.id);
                                const projWage = assignment ? assignment.weeklyWage : selectedLabourProfile.defaultWeeklyWage || 1400;

                                return (
                                  <div key={p.id} className="p-3 bg-muted/20 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                      <p className="font-bold text-blue-600">{p.id} — {p.customerName}</p>
                                      <p className="text-[11px] text-muted-foreground">{p.natureOfWork} • 📍 {p.location}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-purple-50 text-purple-800 border-purple-200">
                                        ₹{projWage.toLocaleString("en-IN")}/week
                                      </Badge>
                                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">{p.status}</Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* WEEKLY WAGE HISTORY ACROSS PROJECT ASSIGNMENTS */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-purple-600" /> Weekly Wage History (Project Assignment Log)
                          </h4>
                          <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                                <tr>
                                  <th className="p-2.5 pl-3">Project / Site Name</th>
                                  <th className="p-2.5">Weekly Wage Configured</th>
                                  <th className="p-2.5">Assignment Date</th>
                                  <th className="p-2.5 text-right pr-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {(!selectedLabourProfile.wageHistory || selectedLabourProfile.wageHistory.length === 0) ? (
                                  <tr>
                                    <td colSpan={4} className="p-3 text-center text-muted-foreground">
                                      Initial wage history established at ₹{(selectedLabourProfile.defaultWeeklyWage || 1400).toLocaleString("en-IN")}/week.
                                    </td>
                                  </tr>
                                ) : (
                                  selectedLabourProfile.wageHistory.map((h, i) => (
                                    <tr key={i} className="hover:bg-accent/40">
                                      <td className="p-2.5 pl-3 font-bold text-foreground">{h.projectName} ({h.projectId})</td>
                                      <td className="p-2.5 font-extrabold text-purple-700">₹{h.weeklyWage.toLocaleString("en-IN")}/week</td>
                                      <td className="p-2.5 text-muted-foreground">{h.assignedDate}</td>
                                      <td className="p-2.5 text-right pr-3">
                                        <Badge variant="outline" className="text-[10px]">Logged</Badge>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* ATTENDANCE CALENDAR (VISUAL MATRIX FOR JULY 2026) */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Attendance Calendar (July 2026)
                          </h4>
                          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                            {Array.from({ length: 28 }, (_, idx) => {
                              const day = idx + 1;
                              const dayStr = day < 10 ? `0${day}` : `${day}`;
                              const dateKey = `2026-07-${dayStr}`;
                              const record = attendance[`${selectedLabourProfile.id}_${dateKey}`];
                              const status = record?.status || "Absent";

                              return (
                                <div
                                  key={day}
                                  title={`${dateKey}: ${status} (${record?.hoursWorked || 0} hrs)`}
                                  className={`p-1.5 text-center rounded-lg border text-[10px] font-bold ${
                                    status === "Present"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : status === "Leave"
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-rose-100 text-rose-800 border-rose-300"
                                  }`}
                                >
                                  <div>{day}</div>
                                  <div className="text-[9px] font-semibold">{status === "Present" ? "P" : status === "Leave" ? "L" : "A"}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* RECENT PROJECTS HISTORY */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-amber-600" /> Recent Projects Handled
                          </h4>
                          <div className="space-y-1.5">
                            {recentProjectsList.length === 0 ? (
                              <p className="text-muted-foreground">No past completed project history.</p>
                            ) : (
                              recentProjectsList.map((p) => (
                                <div key={p.id} className="p-2.5 rounded-lg border bg-muted/20 flex justify-between items-center">
                                  <div>
                                    <p className="font-bold text-foreground">{p.customerName} ({p.id})</p>
                                    <p className="text-[11px] text-muted-foreground">{p.natureOfWork}</p>
                                  </div>
                                  <Badge className="text-[10px]">{p.status}</Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()
            ) : (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Select a workforce member from the left panel.
              </div>
            )}
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
                        <td className="p-3 font-bold text-purple-700">₹{wage}/wk</td>
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
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
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
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Labour Database Master</CardTitle>
            <CardDescription className="text-xs">Master workforce database</CardDescription>
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
                    <th className="p-3">Skill Sets</th>
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
                      <td className="p-3 font-bold text-purple-700">₹{(l.defaultWeeklyWage || 1400).toLocaleString("en-IN")}/wk</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{l.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{l.skills.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ADD LABOUR DIALOG WITH SMART COMBO BOX */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-xl border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <HardHat className="h-5 w-5 text-blue-600" /> Add Labour Record
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddLabourSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                required
                placeholder="e.g. Ramesh Chandra"
                value={labourFormData.name}
                onChange={(e) => setLabourFormData({ ...labourFormData, name: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone Number *</Label>
              <Input
                required
                placeholder="e.g. 9840998877"
                value={labourFormData.phone}
                onChange={(e) => setLabourFormData({ ...labourFormData, phone: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Labour Type (Smart Combo)</Label>
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
                  className="h-9 rounded-lg font-bold text-purple-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Skills (Comma Separated)</Label>
              <Input
                placeholder="e.g. PLC Wiring, Robot Arm Calibration"
                value={labourFormData.skillsStr}
                onChange={(e) => setLabourFormData({ ...labourFormData, skillsStr: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
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
    </div>
  );
}
