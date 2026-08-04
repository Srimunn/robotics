import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
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

export const Route = createFileRoute("/attendance")({
  component: AttendancePageComponent,
});

function AttendancePageComponent() {
  const { labours, attendance, projects } = useRobotics();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");

  // Selected Labour for Detailed Log Drawer
  const [selectedLabourId, setSelectedLabourId] = useState<string | null>(null);

  // Convert raw attendance map into array of records
  const allAttendanceLogs = useMemo(() => {
    return Object.values(attendance);
  }, [attendance]);

  // Aggregate attendance and calculate weekly & monthly wages per labour
  const aggregatedPayroll = useMemo(() => {
    return labours.map((lab) => {
      // Filter logs for this labour in selected month
      const labLogs = allAttendanceLogs.filter((log) => {
        const isLabour = log.labourId === lab.id;
        const matchesMonth = !selectedMonth || log.date.startsWith(selectedMonth);
        const matchesProject = projectFilter === "all" || log.projectId === projectFilter;
        return isLabour && matchesMonth && matchesProject;
      });

      const presentCount = labLogs.filter((l) => l.status === "Present").length;
      const halfDayCount = labLogs.filter((l) => l.status === "Half Day").length;
      const absentCount = labLogs.filter((l) => l.status === "Absent").length;
      const overtimeHours = labLogs.reduce((acc, l) => acc + (l.status === "Overtime" ? (l.hoursWorked || 2) : 0), 0);

      // Wage math rules:
      // Effective Days = Present + (Half Day * 0.5)
      const effectiveDays = presentCount + halfDayCount * 0.5;
      const dailyEquivalent = (lab.defaultWeeklyWage || 14000) / 6;
      const overtimeRatePerHour = dailyEquivalent / 8;

      const calculatedWeeklyWage = Math.round(effectiveDays * dailyEquivalent + overtimeHours * overtimeRatePerHour);
      const calculatedMonthlyWage = Math.round(calculatedWeeklyWage * 4.33);

      return {
        labour: lab,
        logs: labLogs,
        presentCount,
        halfDayCount,
        absentCount,
        overtimeHours,
        effectiveDays,
        calculatedWeeklyWage,
        calculatedMonthlyWage,
      };
    });
  }, [labours, allAttendanceLogs, selectedMonth, projectFilter]);

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
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance & Payroll Aggregation Hub</h1>
              <p className="text-xs text-muted-foreground">
                Automated attendance aggregation from active projects. Zero duplicate entry. Real-time weekly & monthly wage calculations.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => toast.success("Exporting Payroll Summary to Excel / PDF...")}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Payroll Summary
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
              <p className="text-[10px] text-muted-foreground mt-0.5">Recorded on active sites</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Days Present</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">{totalPresentCount}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Full site attendance</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Overtime Hours</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-purple-600 dark:text-purple-400">{totalOvertimeHours} hrs</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Logged extra shifts</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 grid place-items-center text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Monthly Payroll</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-amber-600 dark:text-amber-400">
                ₹{totalMonthlyPayroll.toLocaleString("en-IN")}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Calculated total wages</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center text-amber-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Labour Name, ID, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 text-xs w-[140px] rounded-lg"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-[150px] rounded-lg">
                  <SelectValue placeholder="Labour Type: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="permanent">Permanent Staff</SelectItem>
                  <SelectItem value="contract">Contract Staff</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Aggregated Attendance Table */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">Labour ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">Labour Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Type</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">Days Present</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">Overtime</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Default Weekly Wage</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Calculated Weekly Wage</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Calculated Monthly Wage</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">Action</TableHead>
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
                      <div className="text-[11px] text-muted-foreground">📞 {labour.phone}</div>
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
                      <span className="font-bold text-emerald-600 text-xs bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
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
                      ₹{(labour.defaultWeeklyWage || 14000).toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      ₹{calculatedWeeklyWage.toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{calculatedMonthlyWage.toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLabourId(labour.id)}
                        className="h-7 text-[11px] font-semibold rounded-lg gap-1"
                      >
                        <Eye className="h-3 w-3 text-purple-600" /> View Daily Logs
                      </Button>
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
                      activeLabourDetail.logs.map((log, idx) => (
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
                      ))
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
    </div>
  );
}
