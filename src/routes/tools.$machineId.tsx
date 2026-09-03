import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import { generateMachineHistoryReport } from "~/server/reports";
import {
  Wrench,
  ArrowLeft,
  FileDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  History,
  MapPin,
  Building2,
  Calendar,
  User,
  ExternalLink,
  Layers,
  Box,
  RotateCcw,
  Send,
  Loader2,
  Activity,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { MachineIssueRecord, StockAuditLog } from "@/lib/robotics-types";

export const Route = createFileRoute("/tools/$machineId")({
  component: MachineDetailPage,
});

/** Helper to download base64 PDF in the browser */
function downloadPdfBlob(base64: string, filename: string) {
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
}

/** Formatter for date string */
function formatDate(val: any): string {
  if (!val) return "—";
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10) || "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(val).slice(0, 10) || "—";
  }
}

/** Formatter for date-time string */
function formatDateTime(val: any): string {
  if (!val) return "—";
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 16) || "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(val).slice(0, 16) || "—";
  }
}

function MachineDetailPage() {
  const { machineId } = Route.useParams();
  const navigate = useNavigate();
  const { machines, machineIssues, projects, stockAuditLogs, isLoading } = useRobotics();

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // 1. Current Machine Record
  const machine = useMemo(() => {
    return machines.find((m) => m.id === machineId);
  }, [machines, machineId]);

  // Project map for quick lookup (e.g. location, customer)
  const projectMap = useMemo(() => {
    return new Map(projects.map((p) => [p.id, p]));
  }, [projects]);

  // 2. Machine Issue Records (all, chronological with most recent first)
  const machineIssueHistory = useMemo(() => {
    return machineIssues
      .filter((iss) => iss.machineId === machineId)
      .sort((a, b) => {
        const timeA = new Date(a.issueDate).getTime() || 0;
        const timeB = new Date(b.issueDate).getTime() || 0;
        return timeB - timeA;
      });
  }, [machineIssues, machineId]);

  // 3. Currently Deployed to Sites
  const currentlyDeployed = useMemo(() => {
    return machineIssueHistory.filter(
      (iss) =>
        iss.status === "Issued" ||
        (iss.status as string) === "Partially Returned" ||
        (iss.status as string) === "PartiallyReturned"
    );
  }, [machineIssueHistory]);

  // 4. Stock Audit Logs for this machine
  const machineAuditLogs = useMemo(() => {
    return stockAuditLogs
      .filter((log) => log.itemId === machineId)
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });
  }, [stockAuditLogs, machineId]);

  // 5. Quick Stats
  const totalLifetimeIssued = machineIssueHistory.length;
  const damagedOrLostReturns = useMemo(() => {
    return machineIssueHistory.filter(
      (iss) =>
        iss.conditionOnReturn === "Damaged" ||
        iss.conditionOnReturn === "Lost" ||
        iss.conditionOnReturn === "Repair Required" ||
        (iss.conditionOnReturn as string) === "RepairRequired" ||
        (iss.status as string) === "Under Repair" ||
        (iss.status as string) === "UnderRepair" ||
        (iss.status as string) === "Lost"
    ).length;
  }, [machineIssueHistory]);
  const activeIssuesCount = currentlyDeployed.length;

  // Handle PDF Generation
  const handleDownloadPdf = async () => {
    if (!machine) return;
    setIsDownloadingPdf(true);
    try {
      const res = await generateMachineHistoryReport({
        data: { machineId: machine.id },
      });
      if (res?.base64) {
        downloadPdfBlob(res.base64, res.filename || `machine-${machine.id}-history.pdf`);
        toast.success(`Downloaded ${machine.toolName} History Report PDF!`);
      } else {
        toast.error("Failed to generate Machine History Report PDF");
      }
    } catch (err: any) {
      console.error("Machine PDF Error:", err);
      toast.error(err?.message || "Error generating Machine History PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Helper for condition badge styling
  const getConditionBadge = (cond?: string | null) => {
    switch (cond) {
      case "Good":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold text-xs">
            Good
          </Badge>
        );
      case "Damaged":
      case "RepairRequired":
      case "Repair Required":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 font-semibold text-xs">
            Repair Required
          </Badge>
        );
      case "Lost":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-semibold text-xs">
            Lost
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 text-xs">
            {cond || "Unknown"}
          </Badge>
        );
    }
  };

  // Helper for action type badge
  const getActionBadge = (action: string) => {
    switch (action) {
      case "Issue":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium text-[11px]">Issue</Badge>;
      case "Return":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-[11px]">Return</Badge>;
      case "StockAddition":
      case "Stock Addition":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-[11px]">Stock Addition</Badge>;
      case "StockAdjustment":
      case "Stock Adjustment":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium text-[11px]">Stock Adjustment</Badge>;
      case "RepairMove":
      case "Repair Move":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-medium text-[11px]">Repair Move</Badge>;
      case "LostMove":
      case "Lost Move":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium text-[11px]">Lost Move</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px]">{action}</Badge>;
    }
  };

  if (!machine && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/machines">
            <Button variant="outline" size="sm" className="rounded-lg gap-2 text-xs">
              <ArrowLeft className="h-4 w-4" /> Back to Tools
            </Button>
          </Link>
        </div>
        <Card className="rounded-xl border border-border p-12 text-center bg-white dark:bg-card">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Machine Not Found</h2>
            <p className="text-xs text-muted-foreground max-w-sm">
              The machine with ID <span className="font-mono font-bold text-foreground">{machineId}</span> could not be located in the inventory.
            </p>
            <Link to="/machines">
              <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Return to Tools List
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading && !machine) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-muted-foreground">Loading machine profile & history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/machines">
            <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Tools
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900">
              {machine?.id}
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              {machine?.toolName}
            </h1>
          </div>
        </div>

        {/* Action: Download Tool History Report */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            size="sm"
            className="rounded-lg gap-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Download Tool History Report (PDF)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/30 border-b border-border/60 py-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                Tool Specifications & Identity
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed registry metadata and current physical health condition
              </CardDescription>
            </div>
            <div>
              {getConditionBadge(machine?.condition)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tool Name</p>
              <p className="text-sm font-semibold text-foreground">{machine?.toolName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Brand</p>
              <p className="text-sm font-semibold text-foreground">{machine?.brand || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Category</p>
              <Badge variant="outline" className="text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                {machine?.category}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Attachment</p>
              <p className="text-sm font-semibold text-foreground">{machine?.attachment || "Standard Attachment"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Unit of Measure</p>
              <p className="text-sm font-semibold text-foreground">{machine?.unit || "Nos"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Current Condition</p>
              <div>{getConditionBadge(machine?.condition)}</div>
            </div>
          </div>

          {machine?.remarks && (
            <div className="mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Equipment Notes:</span> {machine.remarks}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Summary Cards (Matching Tools page style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Stock */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Stock</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">
                {machine?.currentStock ?? 0} <span className="text-xs font-normal text-muted-foreground">{machine?.unit}</span>
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <Box className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Available Stock */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available Stock</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                {machine?.availableQuantity ?? 0} <span className="text-xs font-normal text-muted-foreground">{machine?.unit}</span>
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Issued to Sites */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Issued to Sites</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-amber-600 dark:text-amber-400">
                {machine?.issuedQuantity ?? 0} <span className="text-xs font-normal text-muted-foreground">{machine?.unit}</span>
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Under Repair */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Under Repair</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-rose-600 dark:text-rose-400">
                {machine?.repairQuantity ?? 0} <span className="text-xs font-normal text-muted-foreground">{machine?.unit}</span>
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Lost / Unaccounted */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-700 dark:text-rose-500 uppercase tracking-wider">Lost / Missing</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-rose-700 dark:text-rose-500">
                {machine?.lostQuantity ?? 0} <span className="text-xs font-normal text-muted-foreground">{machine?.unit}</span>
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-100 dark:bg-rose-950/60 grid place-items-center text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 grid place-items-center shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-blue-900 dark:text-blue-200">Lifetime Times Issued</p>
            <h4 className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalLifetimeIssued} records</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 grid place-items-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">Returned Damaged / Lost</p>
            <h4 className="text-xl font-bold text-amber-700 dark:text-amber-300">{damagedOrLostReturns} times</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 grid place-items-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">Currently Active Issues</p>
            <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{activeIssuesCount} site(s)</h4>
          </div>
        </div>
      </div>

      {/* Currently Deployed Section */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/30 border-b border-border/60 py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-amber-600" />
                Currently Deployed to Sites
              </CardTitle>
              <CardDescription className="text-xs">
                Active deployments currently at client project sites awaiting return
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-bold bg-amber-50 text-amber-700 border-amber-200">
              {currentlyDeployed.length} Active Deployment(s)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {currentlyDeployed.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600/70 stroke-[1.5]" />
              <p className="font-semibold text-foreground text-sm">No active site deployments</p>
              <p className="max-w-md">All available units are currently resting in company storage or undergoing maintenance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-muted-foreground w-36">PROJECT ID</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">CUSTOMER NAME</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground min-w-[180px]">SITE LOCATION</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground text-center">QUANTITY</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">ISSUE DATE</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">ISSUED BY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentlyDeployed.map((iss) => {
                    const linkedProject = projectMap.get(iss.projectId);
                    const locationDisplay = linkedProject?.location || iss.projectName || "—";

                    return (
                      <TableRow key={iss.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell className="font-mono text-xs font-bold">
                          <Link
                            to="/projects"
                            search={{ openId: iss.projectId }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{iss.projectId}</span>
                            <ExternalLink className="h-3 w-3 inline-block opacity-70" />
                          </Link>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{iss.customerName}</div>
                          {iss.projectName && iss.projectName !== iss.customerName && (
                            <div className="text-[11px] text-muted-foreground">{iss.projectName}</div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]">{locationDisplay}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs font-bold bg-amber-50 text-amber-700 border-amber-200">
                            {iss.quantity} {machine?.unit}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                          {formatDate(iss.issueDate)}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {iss.issuedBy || "Store Incharge"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Issue & Return History Section */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/30 border-b border-border/60 py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                Complete Issue & Return History
              </CardTitle>
              <CardDescription className="text-xs">
                Full chronological ledger of every project issue, return timestamp, condition check, and remarks
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {machineIssueHistory.length} Total Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {machineIssueHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <Box className="h-8 w-8 text-slate-300 stroke-[1.5]" />
              <p className="font-semibold text-foreground text-sm">No issue records found</p>
              <p>This equipment has not been issued to any project site yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-muted-foreground w-28">STATUS</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground w-36">PROJECT ID</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground min-w-[170px]">CUSTOMER</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground text-center">QTY</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">ISSUE DATE</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">ISSUED BY</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">RETURN DATE</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">RETURN CONDITION</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">RETURNED BY</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground min-w-[150px]">REMARKS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineIssueHistory.map((rec) => {
                    const isIssued = rec.status === "Issued";
                    const isReturned = rec.status === "Returned";

                    return (
                      <TableRow key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isIssued
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : isReturned
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {rec.status}
                          </Badge>
                        </TableCell>

                        {/* Project ID */}
                        <TableCell className="font-mono text-xs font-bold">
                          <Link
                            to="/projects"
                            search={{ openId: rec.projectId }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{rec.projectId}</span>
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </Link>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground truncate max-w-[180px]">{rec.customerName}</div>
                        </TableCell>

                        {/* Quantity */}
                        <TableCell className="text-center font-bold text-xs">
                          {rec.quantity} {machine?.unit}
                        </TableCell>

                        {/* Issue Date */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(rec.issueDate)}
                        </TableCell>

                        {/* Issued By */}
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.issuedBy || "—"}
                        </TableCell>

                        {/* Return Date */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {rec.actualReturnedDate ? formatDate(rec.actualReturnedDate) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Condition on Return */}
                        <TableCell>
                          {rec.conditionOnReturn ? (
                            getConditionBadge(rec.conditionOnReturn)
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Returned By */}
                        <TableCell className="text-xs text-muted-foreground">
                          {isReturned ? (rec.issuedBy || "Store Incharge") : "—"}
                        </TableCell>

                        {/* Return Remarks */}
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.returnRemarks || rec.remarks || <span className="text-slate-400">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Audit Trail Section */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/30 border-b border-border/60 py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                Stock Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable chronological event log for every stock addition, dispatch, return, and inventory reconciliation
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {machineAuditLogs.length} Audit Entries
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {machineAuditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-2">
              <FileSpreadsheet className="h-8 w-8 text-slate-300 stroke-[1.5]" />
              <p className="font-semibold text-foreground text-sm">No audit logs recorded</p>
              <p>Stock adjustments and dispatch events for this machine will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-muted-foreground min-w-[160px]">TIMESTAMP</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">ACTION TYPE</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground text-center">QTY CHANGE</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground text-center">PREV → NEW AVAIL</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground">ACTOR</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">NOTES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineAuditLogs.map((log) => {
                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </TableCell>

                        <TableCell>
                          {getActionBadge(log.actionType)}
                        </TableCell>

                        <TableCell className="text-center font-bold text-xs">
                          {log.quantity} {machine?.unit}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs">
                          <span className="text-muted-foreground">{log.previousAvailable ?? "—"}</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="font-bold text-foreground">{log.newAvailable ?? "—"}</span>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {log.issuedByOrActor || "Administrator"}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {log.notes || <span className="text-slate-400">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
