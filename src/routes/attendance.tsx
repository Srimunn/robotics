import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics, calculateHoursFromTimes, calculateEarnedWage, calculateOvertimeHours, calculatePaidHours, payForDay } from "@/lib/robotics-context";
import { canEdit } from "@/lib/permissions";
import type { AttendanceRecord, LabourType } from "@/lib/robotics-types";
import * as XLSX from "xlsx";
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
import { ExportButtons } from "@/components/export-buttons";
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

// Daily wage for a labour: the stored daily wage, else the weekly wage spread over a 6-day week.
function dailyWageOf(lab?: { dailyWage?: number | null; defaultWeeklyWage?: number | null }): number {
  return lab?.dailyWage ?? Math.round((lab?.defaultWeeklyWage || 1400) / 6);
}

const DEFAULT_IN_TIME = "09:30 AM";
const DEFAULT_OUT_TIME = "06:00 PM";

// Local YYYY-MM-DD (toISOString would give yesterday's date before 5:30 AM in India).
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday of the current week.
function startOfThisWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateStr(d);
}

// Every date from start to end inclusive, as YYYY-MM-DD.
function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (d <= last && out.length < 400) {
    out.push(localDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Sunday is the weekly off; dates after today aren't due yet.
const isSunday = (date: string) => new Date(`${date}T00:00:00`).getDay() === 0;
const isWorkingDayToCount = (date: string) => !isSunday(date) && date <= localDateStr(new Date());

const isFullDay = (l: AttendanceRecord) =>
  l.status === "Present" || l.status === "Overtime" || (l.status !== "Half Day" && l.status !== "Absent" && l.status !== "Leave" && ((l.hoursWorked || 0) > 0 || Boolean(l.inTime && l.inTime.trim())));

function AttendancePageComponent() {
  const { labours, attendance, projects, updateProjectLabourLog, verifyAttendanceRecord, currentUser } = useRobotics();

  const canFullEdit = canEdit(currentUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [rangeStart, setRangeStart] = useState<string>(startOfThisWeek());
  const [rangeEnd, setRangeEnd] = useState<string>(localDateStr(new Date()));

  // Mark Attendance Modal state
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [attLabourId, setAttLabourId] = useState("");
  const [attProjectId, setAttProjectId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attInTime, setAttInTime] = useState(DEFAULT_IN_TIME);
  const [attOutTime, setAttOutTime] = useState(DEFAULT_OUT_TIME);
  const [attWorkDesc, setAttWorkDesc] = useState("On-site servicing");
  const [attStatus, setAttStatus] = useState<"Present" | "Half Day" | "Absent">("Present");
  const [attInPhotoUrl, setAttInPhotoUrl] = useState("");
  const [attOutPhotoUrl, setAttOutPhotoUrl] = useState("");

  // Fill the form for one person on one date: what was already marked that day (so a wrong
  // mark can be corrected on the same site), or a fresh 9:30–6:00 form. Nothing carries over
  // from the previous person.
  const loadDay = (labourId: string, date: string, fallbackProjectId: string) => {
    const existing = allAttendanceLogs.find((l) => l.labourId === labourId && l.date.slice(0, 10) === date);
    setAttLabourId(labourId);
    setAttDate(date);
    setAttProjectId(existing?.projectId || fallbackProjectId);
    setAttInTime(existing?.inTime || DEFAULT_IN_TIME);
    setAttOutTime(existing?.outTime || DEFAULT_OUT_TIME);
    setAttStatus(
      !existing ? "Present" : existing.status === "Half Day" ? "Half Day" : isFullDay(existing) ? "Present" : "Absent"
    );
    setAttInPhotoUrl("");
    setAttOutPhotoUrl("");
    setAttWorkDesc(existing?.workDescription || "On-site servicing");
  };

  const openMarkAttendance = (labourId: string, projectId: string) => {
    loadDay(labourId, attDate, projectId);
    setMarkAttendanceOpen(true);
  };

  const handleMarkAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attLabourId) {
      toast.error("Please select a Labour staff member");
      return;
    }
    const lab = labours.find((l) => l.id === attLabourId);
    const targetProj = projects.find((p) => p.id === attProjectId) || projects[0];
    const weeklyWage = lab?.defaultWeeklyWage || 1400;
    if (!targetProj) {
      toast.error("Please select a site project");
      return;
    }

    if (targetProj) {
      updateProjectLabourLog(targetProj.id, {
        labourId: attLabourId,
        labourName: lab?.name || attLabourId,
        labourType: lab?.type || "Permanent",
        weeklyWage: weeklyWage,
        date: attDate,
        // Absent clears the times, which the server records as Absent with 0 hours and ₹0.
        inTime: attStatus === "Absent" ? "" : attInTime,
        outTime: attStatus === "Absent" ? "" : attOutTime,
        inPhotoUrl: attInPhotoUrl || undefined,
        outPhotoUrl: attOutPhotoUrl || undefined,
        attendance: attStatus,
        hoursWorked: attStatus === "Absent" ? 0 : calculateHoursFromTimes(attInTime, attOutTime),
        earnedMoney: calculateEarnedWage(dailyWageOf(lab), attStatus, calculateHoursFromTimes(attInTime, attOutTime)),
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

    // One record per person per day. The central attendance record holds the latest mark
    // (including a correction to Absent), so it wins over the site log for that day.
    const map = new Map<string, AttendanceRecord>();
    centralLogs.forEach((item) => map.set(item.id, item));
    projLogs.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });

    return Array.from(map.values());
  }, [attendance, projects]);

  const rangeDates = useMemo(() => (rangeStart && rangeEnd ? datesBetween(rangeStart, rangeEnd) : []), [rangeStart, rangeEnd]);

  // Aggregate attendance and calculate weekly & monthly wages per labour
  const aggregatedPayroll = useMemo(() => {
    let targetLabours = labours.filter((l) => l.isActive !== false);
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
      // Logs for this labour inside the selected From–To dates
      const labLogs = allAttendanceLogs
        .filter((log) => {
          const d = log.date.slice(0, 10);
          const inRange = (!rangeStart || d >= rangeStart) && (!rangeEnd || d <= rangeEnd);
          const matchesProject = projectFilter === "all" || log.projectId === projectFilter;
          return log.labourId === lab.id && inRange && matchesProject;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const presentCount = labLogs.filter(isFullDay).length;
      const halfDayCount = labLogs.filter((l) => l.status === "Half Day").length;
      // A working day (Mon–Sat, up to today) with no mark at all counts as absent too.
      const markedDates = new Set(labLogs.map((l) => l.date.slice(0, 10)));
      const unmarkedDays =
        projectFilter === "all" ? rangeDates.filter((d) => isWorkingDayToCount(d) && !markedDates.has(d)).length : 0;
      const absentCount = labLogs.filter((l) => l.status === "Absent" || l.status === "Leave").length + unmarkedDays;
      const totalHours = Math.round(labLogs.reduce((acc, l) => acc + calculatePaidHours(l.hoursWorked), 0) * 10) / 10;

      // Same rules as the payroll report: overtime only on full days, beyond the 9:30–6:00 shift.
      const overtimeHours =
        Math.round(labLogs.reduce((acc, l) => acc + (isFullDay(l) ? calculateOvertimeHours(l.hoursWorked) : 0), 0) * 10) / 10;

      const periodEarnings = labLogs.reduce(
        (acc, l) => acc + payForDay(dailyWageOf(lab), l.status, l.hoursWorked),
        0
      );

      return {
        labour: lab,
        logs: labLogs,
        presentCount,
        halfDayCount,
        absentCount,
        totalHours,
        overtimeHours,
        periodEarnings,
      };
    });
  }, [labours, projects, allAttendanceLogs, rangeDates, projectFilter]);

  const totalDaysLogged = aggregatedPayroll.reduce((acc, a) => acc + a.logs.length, 0);
  const totalPresentCount = aggregatedPayroll.reduce((acc, a) => acc + a.presentCount, 0);
  const totalOvertimeHours = Math.round(aggregatedPayroll.reduce((acc, a) => acc + a.overtimeHours, 0) * 10) / 10;
  const totalPeriodPayroll = aggregatedPayroll.reduce((acc, a) => acc + a.periodEarnings, 0);

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

  const exportAttendanceRows = () =>
    filteredPayroll.map((a) => ({
      "Labour ID": a.labour.id,
      Name: a.labour.name,
      Phone: a.labour.phone,
      Type: a.labour.type,
      Period: `${rangeStart} to ${rangeEnd}`,
      Present: a.presentCount,
      "Half Day": a.halfDayCount,
      Absent: a.absentCount,
      "Hours Worked": a.totalHours,
      "Overtime (hrs)": a.overtimeHours,
      "Daily Wage (INR)": dailyWageOf(a.labour),
      "Earned (INR)": a.periodEarnings,
    }));

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
          <ExportButtons
            rows={exportAttendanceRows}
            filename="Attendance"
            title="Attendance & Wages"
            subtitle={[
              `Dates: ${rangeStart} to ${rangeEnd}`,
              projectFilter !== "all" ? `Project: ${projectFilter}` : "",
              typeFilter !== "all" ? `Type: ${typeFilter}` : "",
              searchQuery ? `Search: "${searchQuery}"` : "",
            ].filter(Boolean).join(" • ")}
          />
          {canFullEdit && (
            <Button
              onClick={() => openMarkAttendance(labours[0]?.id || "", projects[0]?.id || "")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 rounded-xl gap-1.5 shadow-xs"
            >
              <CalendarCheck className="h-4 w-4" /> Mark Attendance
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (!allAttendanceLogs || allAttendanceLogs.length === 0) {
                toast.error("No attendance data available to export");
                return;
              }

              const headers = ["Labour Name", "Date", "Project", "In Time", "Out Time", "Hours", "Status"];
              const cleanRows = allAttendanceLogs.map((log) => {
                const labName = log.labourName || labours.find((l) => l.id === log.labourId)?.name || log.labourId;
                const projName = log.projectName || log.projectId || "N/A";
                const dateStr = log.date ? String(log.date).slice(0, 10) : "N/A";
                const inT = log.inTime || "N/A";
                const outT = log.outTime || "N/A";
                const hrs = log.hoursWorked !== undefined && log.hoursWorked !== null ? String(log.hoursWorked) : "0";
                const st = log.status || "N/A";

                return [labName, dateStr, projName, inT, outT, hrs, st];
              });

              const aoa = [headers, ...cleanRows];
              const ws = XLSX.utils.aoa_to_sheet(aoa);

              const colWidths = headers.map((header, colIndex) => {
                let maxLen = header.length;
                for (const row of cleanRows) {
                  const cellValue = String(row[colIndex] || "");
                  if (cellValue.length > maxLen) {
                    maxLen = cellValue.length;
                  }
                }
                return { wch: Math.max(maxLen + 5, 16) };
              });
              ws["!cols"] = colWidths;

              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");

              const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
              const blob = new Blob([excelBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `Attendance_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              toast.success(`Exported ${allAttendanceLogs.length} attendance records to Excel!`);
            }}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            All Logs (Excel)
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
              <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">Payroll (Selected Dates)</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-purple-600">₹{totalPeriodPayroll.toLocaleString("en-IN")}</h3>
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
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">From</span>
              <Input
                type="date"
                value={rangeStart}
                max={rangeEnd || undefined}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-9 w-[140px] text-xs rounded-lg font-mono"
              />
              <span className="text-[11px] font-bold text-muted-foreground">To</span>
              <Input
                type="date"
                value={rangeEnd}
                min={rangeStart || undefined}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-9 w-[140px] text-xs rounded-lg font-mono"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setRangeStart(startOfThisWeek());
                  setRangeEnd(localDateStr(new Date()));
                }}
                className="h-9 text-xs rounded-lg"
              >
                This Week
              </Button>
            </div>

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
        <Table containerClassName="max-h-[calc(100vh-280px)] min-h-[350px]">
          <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-2xs">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">WORKER</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">TYPE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">PRESENT</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">HOURS</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">OVERTIME</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">DAILY WAGE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">EARNED (SELECTED DATES)</TableHead>
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
                        <p className="text-base font-semibold text-foreground">No labour staff to show.</p>
                        <p className="text-xs text-muted-foreground">Assign labour to active site projects to automatically track daily attendance and wages.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayroll.map(({ labour, presentCount, halfDayCount, absentCount, totalHours, overtimeHours, periodEarnings }) => (
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
                      {absentCount > 0 && (
                        <div className="text-[10px] text-rose-600 mt-0.5">({absentCount} absent)</div>
                      )}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {totalHours} hrs
                    </TableCell>

                    <TableCell className="text-center">
                      {overtimeHours > 0 ? (
                        <span className="inline-block text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {Math.round(overtimeHours * 10) / 10} hrs
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-medium text-slate-600">
                      ₹{(labour.dailyWage ?? Math.round((labour.defaultWeeklyWage || 1400) / 6)).toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{periodEarnings.toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canFullEdit && (
                          <Button
                            size="sm"
                            onClick={() => openMarkAttendance(labour.id, projectFilter !== "all" ? projectFilter : projects[0]?.id || "")}
                            className="h-7 text-[11px] font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                          >
                            <Clock className="h-3 w-3" /> Log Time
                          </Button>
                        )}
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

      {/* DAY-BY-DAY ATTENDANCE REGISTER FOR THE SELECTED DATES */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" /> Daily Attendance Register
          </CardTitle>
          <CardDescription className="text-xs">
            {rangeStart} to {rangeEnd} • P = Present, ½ = Half Day, A = Absent (dashed A = not marked, counted as absent), Off = Sunday. Hover a cell for in/out times.
          </CardDescription>
        </CardHeader>
        {rangeDates.length > 31 ? (
          <CardContent className="p-6 text-center text-xs text-muted-foreground">
            Choose 31 days or fewer to see the day-by-day register.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="p-2 pl-4 text-left font-bold text-muted-foreground sticky left-0 bg-slate-50 dark:bg-slate-900 min-w-[150px]">Worker</th>
                  {rangeDates.map((d) => {
                    const dt = new Date(`${d}T00:00:00`);
                    const isSunday = dt.getDay() === 0;
                    return (
                      <th key={d} className={`p-2 text-center font-bold min-w-[44px] ${isSunday ? "text-rose-500" : "text-muted-foreground"}`}>
                        <div>{dt.getDate()}</div>
                        <div className="text-[9px] font-medium">{dt.toLocaleDateString("en-IN", { weekday: "short" })}</div>
                      </th>
                    );
                  })}
                  <th className="p-2 text-center font-bold text-muted-foreground">Present</th>
                  <th className="p-2 pr-4 text-right font-bold text-muted-foreground">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayroll.map(({ labour, logs, presentCount, halfDayCount, periodEarnings }) => {
                  const byDate = new Map(logs.map((l) => [l.date.slice(0, 10), l]));
                  return (
                    <tr key={labour.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                      <td className="p-2 pl-4 font-semibold text-foreground sticky left-0 bg-white dark:bg-card">
                        {labour.name}
                        <div className="text-[10px] font-mono text-muted-foreground">{labour.id}</div>
                      </td>
                      {rangeDates.map((d) => {
                        const log = byDate.get(d);
                        let label = "";
                        let cls = "text-slate-300 dark:text-slate-600";
                        if (!log && isWorkingDayToCount(d)) {
                          label = "A";
                          cls = "bg-rose-50 text-rose-500 border border-dashed border-rose-300 dark:bg-rose-950/40 dark:text-rose-400";
                        } else if (!log && isSunday(d)) {
                          label = "Off";
                          cls = "text-[9px] text-slate-400";
                        }
                        if (log) {
                          if (log.status === "Half Day") {
                            label = "½";
                            cls = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                          } else if (log.status === "Absent" || log.status === "Leave") {
                            label = "A";
                            cls = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                          } else if (isFullDay(log)) {
                            label = "P";
                            cls = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                          }
                        }
                        const ot = log && isFullDay(log) ? calculateOvertimeHours(log.hoursWorked) : 0;
                        const tip = log
                          ? `${log.status} • ${log.inTime || "—"} to ${log.outTime || "—"} • ${calculatePaidHours(log.hoursWorked)} working hrs${ot > 0 ? ` (+${ot} OT)` : ""}`
                          : isWorkingDayToCount(d)
                          ? "Not marked: counted as absent"
                          : isSunday(d)
                          ? "Sunday (weekly off)"
                          : "Not due yet";
                        return (
                          <td key={d} className="p-1 text-center" title={tip}>
                            <span className={`inline-grid place-items-center h-7 w-7 rounded-md font-bold ${cls}`}>{label}</span>
                            {ot > 0 && <div className="text-[9px] font-mono text-amber-600">+{ot}h</div>}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center font-bold text-emerald-700">
                        {presentCount}
                        {halfDayCount > 0 && <span className="text-amber-600"> + {halfDayCount} half</span>}
                      </td>
                      <td className="p-2 pr-4 text-right font-mono font-bold text-emerald-700">₹{periodEarnings.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  <div className="text-[11px] text-muted-foreground">{activeLabourDetail.labour.type} Staff • Daily Wage: ₹{activeLabourDetail.labour.dailyWage ?? Math.round((activeLabourDetail.labour.defaultWeeklyWage || 1400) / 6)}/day</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600">Earned: ₹{activeLabourDetail.periodEarnings.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-muted-foreground">{activeLabourDetail.presentCount} Days Present</div>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-xl">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Date</TableHead>
                      <TableHead className="text-[11px] font-bold">Project</TableHead>
                      <TableHead className="text-[11px] font-bold">Location</TableHead>
                      <TableHead className="text-[11px] font-bold text-center">In Time</TableHead>
                      <TableHead className="text-[11px] font-bold text-center">Out Time</TableHead>
                      <TableHead className="text-[11px] font-bold text-center">Status</TableHead>
                      <TableHead className="text-[11px] font-bold">Work Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLabourDetail.logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                          No daily logs recorded for this labour in selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeLabourDetail.logs.map((log, idx) => {
                        const proj = projects.find((p) => p.id === log.projectId);
                        const siteLoc = log.projectLocation || proj?.location || "—";
                        return (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="font-mono text-muted-foreground">{log.date}</TableCell>
                            <TableCell className="font-bold text-purple-700">{log.projectId || "Project Site"}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{siteLoc}</TableCell>
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
              <Select value={attLabourId} onValueChange={(v) => loadDay(v, attDate, attProjectId)}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Choose Labour..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {labours.filter((l) => l.isActive !== false).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.type} - ₹{(l.dailyWage ?? Math.round((l.defaultWeeklyWage || 1400) / 6)).toLocaleString("en-IN")}/day)
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
                onChange={(e) => loadDay(attLabourId, e.target.value, attProjectId)}
                className="h-9 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Attendance</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Present", "Half Day", "Absent"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setAttStatus(st)}
                    className={`h-9 rounded-lg border text-xs font-bold transition-colors ${
                      attStatus === st
                        ? st === "Present"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : st === "Half Day"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-rose-600 text-white border-rose-600"
                        : "bg-background text-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {attStatus !== "Absent" && (
            <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Start Time / In Time</label>
                <Input
                  value={attInTime}
                  onChange={(e) => setAttInTime(e.target.value)}
                  placeholder="09:30 AM"
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
            </>
            )}


            {/* REALTIME HOURS & EARNED MONEY BOX */}
            {(() => {
              const selectedL = labours.find((l) => l.id === attLabourId);
              const wage = dailyWageOf(selectedL);
              const clockHours = attStatus === "Absent" ? 0 : calculateHoursFromTimes(attInTime, attOutTime);
              const hours = calculatePaidHours(clockHours);
              const money = calculateEarnedWage(wage, attStatus, clockHours);
              return (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-emerald-900 dark:text-emerald-300 font-bold">Working Hours (after 30 min lunch):</span>
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

            <DialogFooter className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold w-full sm:w-auto">
                Save & Mark Attendance
              </Button>
              <Button type="button" variant="outline" onClick={() => setMarkAttendanceOpen(false)} className="rounded-lg text-xs w-full sm:w-auto">
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
