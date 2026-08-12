import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics, calculateHoursFromTimes, calculateEarnedWage } from "@/lib/robotics-context";
import type { AttendanceRecord, LabourType } from "@/lib/robotics-types";
import { DataPagination } from "@/components/ui/DataPagination";
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  UserCheck,
  HardHat,
  Filter,
  Eye,
  FileSpreadsheet,
  Layers,
  Calendar,
  Camera,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { PhotoCapture } from "@/components/PhotoCapture";

export const Route = createFileRoute("/attendance")({
  component: AttendancePageComponent,
});

function AttendancePageComponent() {
  const { labours, attendance, projects, updateProjectLabourLog, verifyAttendanceRecord, currentUser } = useRobotics();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Mark Attendance Modal state
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [attLabourId, setAttLabourId] = useState("");
  const [attProjectId, setAttProjectId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attInTime, setAttInTime] = useState("09:00 AM");
  const [attOutTime, setAttOutTime] = useState("06:00 PM");
  const [attWorkDesc, setAttWorkDesc] = useState("On-site servicing");
  const [attInPhotoUrl, setAttInPhotoUrl] = useState("");
  const [attOutPhotoUrl, setAttOutPhotoUrl] = useState("");

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
        inPhotoUrl: attInPhotoUrl || undefined,
        outPhotoUrl: attOutPhotoUrl || undefined,
        attendance: "Present",
        hoursWorked: calculateHoursFromTimes(attInTime, attOutTime),
        earnedMoney: calculateEarnedWage(weeklyWage, calculateHoursFromTimes(attInTime, attOutTime)),
        workDescription: attWorkDesc,
      });
    }
    setMarkAttendanceOpen(false);
  };


  // Selected Labour for Detailed Log Drawer
  const [selectedLabourId, setSelectedLabourId] = useState<string | null>(null);

  // Convert raw attendance map AND project logs into array of records
  const allAttendanceLogs = useMemo(() => {
    const centralLogs = Object.values(attendance);
    const projLogs: AttendanceRecord[] = projects.flatMap((p) =>
      (p.labourLogs || []).map((lg) => ({
        id: `${lg.labourId}_${lg.date}`,
        labourId: lg.labourId,
        labourName: lg.labourName,
        projectId: p.id,
        projectName: p.customerName,
        date: lg.date,
        status: lg.attendance || (lg.hoursWorked > 0 ? "Present" : "Absent"),
        inTime: lg.inTime,
        outTime: lg.outTime,
        hoursWorked: lg.hoursWorked,
        earnedMoney: lg.earnedMoney,
        workDescription: lg.workDescription,
        weeklyWage: lg.weeklyWage,
        inPhotoUrl: lg.inPhotoUrl,
        outPhotoUrl: lg.outPhotoUrl,
        inLocation: lg.inLocation,
        outLocation: lg.outLocation,
        verificationStatus: lg.verificationStatus || "Pending Verification",
        verifiedBy: lg.verifiedBy,
        verifiedDate: lg.verifiedDate,
        verificationComments: lg.verificationComments,
        isGpsWarning: lg.isGpsWarning,
      }))
    );

    const map = new Map<string, AttendanceRecord>();
    [...centralLogs, ...projLogs].forEach((item) => {
      const existing = map.get(item.id);
      if (!existing || (item.hoursWorked && item.hoursWorked > 0) || item.verificationStatus === "Verified") {
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
  }, [attendance, projects]);

  // Aggregate attendance and calculate weekly & monthly wages per labour
  const aggregatedPayroll = useMemo(() => {
    let targetLabours = labours;
    if (projectFilter !== "all") {
      const proj = projects.find((p) => p.id === projectFilter);
      if (proj && proj.assignedLabourIds && proj.assignedLabourIds.length > 0) {
        targetLabours = labours.filter(
          (lab) =>
            proj.assignedLabourIds.includes(lab.id) ||
            allAttendanceLogs.some((lg) => lg.labourId === lab.id && lg.projectId === projectFilter)
        );
      } else {
        targetLabours = labours.filter((lab) =>
          allAttendanceLogs.some((lg) => lg.labourId === lab.id && lg.projectId === projectFilter)
        );
      }
    }

    return targetLabours.map((lab) => {
      // Filter logs for this labour in selected month
      const labLogs = allAttendanceLogs.filter((log) => {
        const isLabour = log.labourId === lab.id;
        const matchesMonth = selectedMonth === "all" || !selectedMonth || log.date.startsWith(selectedMonth);
        const matchesProject = projectFilter === "all" || log.projectId === projectFilter;
        return isLabour && matchesMonth && matchesProject;
      });

      const presentCount = labLogs.filter(
        (l) => l.status === "Present" || Boolean(l.inTime && l.inTime.trim().length > 0) || (l.hoursWorked && l.hoursWorked > 0)
      ).length;
      const halfDayCount = labLogs.filter((l) => l.status === "Half Day").length;
      const absentCount = labLogs.filter((l) => l.status === "Absent").length;

      const overtimeHours = labLogs.reduce((acc, l) => {
        if (l.hoursWorked && l.hoursWorked > 8) {
          return acc + (l.hoursWorked - 8);
        }
        return acc + (l.status === "Overtime" ? (l.hoursWorked || 2) : 0);
      }, 0);

      const defaultWage = lab.defaultWeeklyWage || 1400;

      const totalEarnedFromLogs = labLogs.reduce((acc, l) => {
        if (l.earnedMoney) return acc + l.earnedMoney;
        return acc + calculateEarnedWage(defaultWage, l.hoursWorked || 0);
      }, 0);

      const calculatedWeeklyWage = totalEarnedFromLogs > 0
        ? totalEarnedFromLogs
        : Math.round((presentCount / 6) * defaultWage);

      const calculatedMonthlyWage = Math.round(calculatedWeeklyWage * 4.33);

      return {
        labour: lab,
        logs: labLogs,
        presentCount,
        halfDayCount,
        absentCount,
        overtimeHours,
        defaultWeeklyWage: defaultWage,
        calculatedWeeklyWage,
        calculatedMonthlyWage,
      };
    });
  }, [labours, projects, allAttendanceLogs, selectedMonth, projectFilter]);

  const totalDaysLogged = allAttendanceLogs.length;
  const totalPresentCount = aggregatedPayroll.reduce((acc, a) => acc + a.presentCount, 0);
  const totalOvertimeHours = aggregatedPayroll.reduce((acc, a) => acc + a.overtimeHours, 0);
  const totalMonthlyPayroll = aggregatedPayroll.reduce((acc, a) => acc + a.calculatedMonthlyWage, 0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredPayroll = useMemo(() => {
    return aggregatedPayroll.filter(({ labour }) => {
      const matchesSearch =
        !searchQuery ||
        labour.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        labour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        labour.phone.includes(searchQuery);

      const matchesType = typeFilter === "all" || labour.type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [aggregatedPayroll, searchQuery, typeFilter]);

  const totalPayrollItems = filteredPayroll.length;
  const totalPayrollPages = Math.ceil(totalPayrollItems / pageSize);
  const paginatedPayroll = useMemo(() => {
    return filteredPayroll.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredPayroll, currentPage, pageSize]);

  const activeLabourDetail = useMemo(() => {
    if (!selectedLabourId) return null;
    return aggregatedPayroll.find((a) => a.labour.id === selectedLabourId);
  }, [aggregatedPayroll, selectedLabourId]);

  return (
    <div className="space-y-6 w-full min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              if (labours.length > 0) setAttLabourId(labours[0].id);
              if (projects.length > 0) setAttProjectId(projects[0].id);
              setMarkAttendanceOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 rounded-xl gap-1.5 shadow-xs"
          >
            <CalendarCheck className="h-4 w-4" /> Mark Attendance
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success("Exporting Payroll Summary to Excel / PDF...")}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Summary
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Days Logged</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">{totalDaysLogged}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Total Present</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600">{totalPresentCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Overtime Hours</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-amber-600">{totalOvertimeHours} hrs</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">Monthly Payroll</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-purple-600">₹{totalMonthlyPayroll.toLocaleString("en-IN")}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 grid place-items-center text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px] rounded-lg">
                <SelectValue placeholder="Type: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 text-xs w-[170px] rounded-lg">
                <SelectValue placeholder="Project: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id} - {p.customerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Aggregated Attendance Table */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">WORKER</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">TYPE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">PRESENT</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">OVERTIME</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">BASE WAGE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">WEEKLY WAGE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">MONTHLY WAGE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                        <CalendarCheck className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">No attendance recorded yet.</p>
                        <p className="text-xs text-muted-foreground">Assign labour to active site projects to automatically track daily attendance and wages.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayroll.map(({ labour, presentCount, halfDayCount, overtimeHours, calculatedWeeklyWage, calculatedMonthlyWage }) => (
                  <TableRow key={labour.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {labour.id}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{labour.name}</div>
                      <div className="text-[11px] text-muted-foreground">{labour.phone}</div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          labour.type === "Permanent"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300"
                        }`}
                      >
                        {labour.type}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          presentCount > 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {presentCount} Days
                      </span>
                      {halfDayCount > 0 && (
                        <div className="text-[10px] text-amber-600 mt-0.5">({halfDayCount} half days)</div>
                      )}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {overtimeHours > 0 ? `${overtimeHours} hrs` : "—"}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-medium text-slate-600">
                      ₹{(labour.defaultWeeklyWage || 1400).toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      ₹{calculatedWeeklyWage.toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{calculatedMonthlyWage.toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setAttLabourId(labour.id);
                            if (projectFilter !== "all") setAttProjectId(projectFilter);
                            else if (projects.length > 0) setAttProjectId(projects[0].id);
                            setMarkAttendanceOpen(true);
                          }}
                          className="h-7 text-[11px] font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        >
                          <Clock className="h-3 w-3" /> Log Time
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLabourId(labour.id)}
                          className="h-7 text-[11px] font-semibold rounded-lg gap-1"
                        >
                          <Eye className="h-3 w-3 text-purple-600" /> View Logs
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataPagination
          currentPage={currentPage}
          totalPages={totalPayrollPages}
          totalItems={totalPayrollItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* DETAILED DAILY LOGS MODAL */}
      <Dialog open={!!selectedLabourId} onOpenChange={(open) => !open && setSelectedLabourId(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Daily Attendance Logs ({activeLabourDetail?.labour.name})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Every in/out time logged inside project details for this labour.
            </DialogDescription>
          </DialogHeader>

          {activeLabourDetail && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border flex items-center justify-between">
                <div>
                  <div className="font-bold text-foreground">{activeLabourDetail.labour.name} ({activeLabourDetail.labour.id})</div>
                  <div className="text-[11px] text-muted-foreground">{activeLabourDetail.labour.type} Staff • Base Wage: ₹{activeLabourDetail.labour.defaultWeeklyWage}/week</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600">Monthly Est: ₹{activeLabourDetail.calculatedMonthlyWage.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-muted-foreground">{activeLabourDetail.presentCount} Days Present</div>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-xl">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Date</TableHead>
                      <TableHead className="text-[11px] font-bold">Project</TableHead>
                      <TableHead className="text-[11px] font-bold text-center">In Time</TableHead>
                      <TableHead className="text-[11px] font-bold text-center">Out Time</TableHead>
                      <TableHead className="text-[11px] font-bold text-center">Status</TableHead>
                      <TableHead className="text-[11px] font-bold">Work Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLabourDetail.logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No daily logs recorded for this labour in selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeLabourDetail.logs.map((log, idx) => {
                        return (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="font-mono text-muted-foreground">{log.date}</TableCell>
                            <TableCell className="font-bold text-purple-700">{log.projectId || "Project Site"}</TableCell>
                            <TableCell className="text-center font-mono text-blue-600 font-semibold">{log.inTime || "—"}</TableCell>
                            <TableCell className="text-center font-mono text-slate-500">{log.outTime || "—"}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-xs">{log.workDescription || "On site"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter>
                <Button onClick={() => setSelectedLabourId(null)} className="h-9 text-xs rounded-xl">
                  Close Daily Logs
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <label className="text-xs font-semibold block mb-1">Select Labour Staff *</label>
              <Select value={attLabourId} onValueChange={setAttLabourId}>
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
              <label className="text-xs font-semibold block mb-1">Select Site Project *</label>
              <Select value={attProjectId} onValueChange={setAttProjectId}>
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
              <label className="text-xs font-semibold block mb-1">Attendance Date</label>
              <Input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="h-9 rounded-lg font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Start Time / In Time</label>
                <Input
                  value={attInTime}
                  onChange={(e) => setAttInTime(e.target.value)}
                  placeholder="09:00 AM"
                  className="h-9 rounded-lg font-mono font-semibold text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">End Time / Out Time</label>
                <Input
                  value={attOutTime}
                  onChange={(e) => setAttOutTime(e.target.value)}
                  placeholder="06:00 PM"
                  className="h-9 rounded-lg font-mono font-semibold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Check-In Photo</label>
                <PhotoCapture
                  folder="attendance"
                  label="Take Check-In Photo"
                  currentPhotoUrl={attInPhotoUrl}
                  onUploaded={(url) => setAttInPhotoUrl(url)}
                  size="sm"
                  variant="outline"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold block mb-1">Check-Out Photo</label>
                <PhotoCapture
                  folder="attendance"
                  label="Take Check-Out Photo"
                  currentPhotoUrl={attOutPhotoUrl}
                  onUploaded={(url) => setAttOutPhotoUrl(url)}
                  size="sm"
                  variant="outline"
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
