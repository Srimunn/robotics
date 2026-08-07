import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { useRobotics } from "@/lib/robotics-context";
import { importProjects, importMachines } from "@/server/imports";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  ShieldAlert,
  Database,
  ArrowRight,
  Sparkles,
  Info,
  XCircle,
  FolderPlus,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/import")({
  component: ImportComponent,
});

interface ParsedRow {
  rowNum: number;
  customerName: string;
  phone: string;
  location: string;
  natureOfWork: string;
  leakageType?: string;
  projectValue: number;
  receivedAmount: number;
  balanceAmount: number;
  paymentStatus: "Pending" | "Partial" | "Paid" | "Overdue";
  status: "Waiting" | "Scheduled" | "Ongoing" | "Completed" | "Closed";
  scheduledDate: Date;
  remarks: string;
  internalNotes: string;
  isValid: boolean;
  errorMessage?: string;
}

interface ParsedMachineRow {
  rowNum: number;
  toolName: string;
  category: string;
  brand: string;
  currentStock: number;
  availableQuantity: number;
  condition: "Good" | "Damaged" | "RepairRequired" | "Lost";
  unit: string;
  isValid: boolean;
  errorMessage?: string;
}

function extractBrand(desc: string): string {
  if (!desc) return "Local";
  const trimmed = desc.trim();
  if (trimmed.includes(" - ")) {
    const partBefore = trimmed.split(" - ")[0].trim();
    const firstWord = partBefore.split(/\s+/)[0];
    if (firstWord && firstWord.length >= 2 && !/^\d+$/.test(firstWord)) {
      return firstWord;
    }
  }
  const knownBrands = ["Bosch", "Hikoki", "Dongcheng", "Sun", "Planet", "Makita", "DeWalt", "Stanley", "Milwaukee"];
  for (const b of knownBrands) {
    if (trimmed.toLowerCase().includes(b.toLowerCase())) return b;
  }
  const firstWord = trimmed.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3 && !/^\d+$/.test(firstWord)) {
    return firstWord;
  }
  return "Local";
}

function cleanBaseToolName(desc: string): string {
  if (!desc) return "";
  let s = desc.trim();
  s = s.replace(/\s*-\s*(no\.?|no\s*)?\d+$/i, "");
  s = s.replace(/\s*-\s*no-?\d+$/i, "");
  return s.trim();
}

function normalizeMachineCondition(val: any): "Good" | "Damaged" | "RepairRequired" | "Lost" {
  if (!val) return "Good";
  const s = String(val).trim().toLowerCase();
  if (s.includes("servisable") && !s.includes("unservisable")) return "Good";
  if (s.includes("unservisable") || s.includes("repair")) return "RepairRequired";
  if (s.includes("missing") || s.includes("lost")) return "Lost";
  if (s.includes("damaged")) return "Damaged";
  return "Good";
}

function findHeaderValue(row: Record<string, any>, possibleHeaders: string[]): any {
  const rowKeys = Object.keys(row);
  // 1. Exact match (case-insensitive & trimmed)
  for (const ph of possibleHeaders) {
    const phClean = ph.trim().toLowerCase();
    const key = rowKeys.find((k) => k.trim().toLowerCase() === phClean);
    if (key !== undefined && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  // 2. Partial match (key contains phClean)
  for (const ph of possibleHeaders) {
    const phClean = ph.trim().toLowerCase();
    const key = rowKeys.find((k) => k.trim().toLowerCase().includes(phClean));
    if (key !== undefined && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return undefined;
}

function parseNumeric(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function cleanPhoneString(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val).replace(/\s+/g, "").trim();
}

function normalizePaymentStatus(val: any): "Pending" | "Partial" | "Paid" | "Overdue" {
  if (!val) return "Pending";
  const s = String(val).trim().toLowerCase();
  if (s.includes("received") || s.includes("paid") || s === "full") return "Paid";
  if (s.includes("part") || s.includes("partial")) return "Partial";
  if (s.includes("overdue")) return "Overdue";
  return "Pending";
}

function parseDateCell(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number") {
    const parsed = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

function ImportComponent() {
  const { currentUser } = useRobotics();

  const [activeTab, setActiveTab] = useState<"HISTORICAL" | "OUTSTANDING" | "MACHINES">("HISTORICAL");
  const [fileName, setFileName] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsedMachineRows, setParsedMachineRows] = useState<ParsedMachineRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSheetData = useCallback(
    (wb: XLSX.WorkBook, sheetName: string, tab: "HISTORICAL" | "OUTSTANDING" | "MACHINES") => {
      setIsParsing(true);
      try {
        const worksheet = wb.Sheets[sheetName];
        if (!worksheet) {
          setParsedRows([]);
          setParsedMachineRows([]);
          setIsParsing(false);
          return;
        }

        // Get 2D raw array of cell values
        const grid: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        if (!grid || grid.length === 0) {
          setParsedRows([]);
          setParsedMachineRows([]);
          setIsParsing(false);
          return;
        }

        if (tab === "MACHINES") {
          let currentCategory = "General Tools";
          interface MachineGroup {
            toolName: string;
            category: string;
            brand: string;
            stock: number;
            conditionMap: Record<string, number>;
          }
          const groups: Record<string, MachineGroup> = {};

          for (let r = 3; r < grid.length; r++) {
            const rowCells = grid[r];
            if (!Array.isArray(rowCells)) continue;

            const colA = rowCells[0] !== undefined && rowCells[0] !== null ? String(rowCells[0]).trim() : "";
            const colB = rowCells[1] !== undefined && rowCells[1] !== null ? String(rowCells[1]).trim() : "";
            const colC = rowCells[2] !== undefined && rowCells[2] !== null ? String(rowCells[2]).trim() : "";
            const colD = rowCells[3] !== undefined && rowCells[3] !== null ? String(rowCells[3]).trim() : "";
            const colE = rowCells[4] !== undefined && rowCells[4] !== null ? String(rowCells[4]).trim() : "";

            // Category header row: text ONLY in colA, empty colB, colC, colD
            if (colA && !colB && !colC && !colD) {
              const aLower = colA.toLowerCase();
              if (!aLower.includes("s.no") && !aLower.includes("incharge") && !aLower.includes("description")) {
                currentCategory = colA;
              }
              continue;
            }

            // Individual machine row: colB has text
            if (colB && !colB.toLowerCase().includes("description")) {
              const baseName = cleanBaseToolName(colB);
              if (!baseName) continue;

              const brand = extractBrand(colB);
              const cond = normalizeMachineCondition(colE);

              const qtyErode = parseNumeric(colC) || (colC === "1" ? 1 : 0);
              const qtyYercaud = parseNumeric(colD) || (colD === "1" ? 1 : 0);
              const itemQty = Math.max(1, qtyErode + qtyYercaud);

              const groupKey = `${baseName.toLowerCase()}___${currentCategory.toLowerCase()}`;

              if (!groups[groupKey]) {
                groups[groupKey] = {
                  toolName: baseName,
                  category: currentCategory,
                  brand,
                  stock: itemQty,
                  conditionMap: { [cond]: itemQty },
                };
              } else {
                groups[groupKey].stock += itemQty;
                groups[groupKey].conditionMap[cond] = (groups[groupKey].conditionMap[cond] || 0) + itemQty;
              }
            }
          }

          const mRows: ParsedMachineRow[] = Object.values(groups).map((g, idx) => {
            let bestCond: "Good" | "Damaged" | "RepairRequired" | "Lost" = "Good";
            let maxCount = -1;
            for (const [c, cnt] of Object.entries(g.conditionMap)) {
              if (cnt > maxCount) {
                maxCount = cnt;
                bestCond = c as any;
              }
            }

            return {
              rowNum: idx + 1,
              toolName: g.toolName,
              category: g.category,
              brand: g.brand,
              currentStock: g.stock,
              availableQuantity: g.stock,
              condition: bestCond,
              unit: "Nos",
              isValid: true,
            };
          });

          setParsedMachineRows(mRows);
          setParsedRows([]);
          setIsParsing(false);
          return;
        }

        // Find header row containing "Client Name" or "Client.Name" (case-insensitive)
        let headerRowIndex = -1;
        for (let r = 0; r < grid.length; r++) {
          const rowCells = grid[r];
          if (Array.isArray(rowCells)) {
            const hasClientName = rowCells.some((cell) => {
              if (cell === undefined || cell === null) return false;
              const s = String(cell).trim().toLowerCase();
              return s.includes("client.name") || s.includes("client name") || s.includes("customer name");
            });
            if (hasClientName) {
              headerRowIndex = r;
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          setParsedRows([]);
          setParsedMachineRows([]);
          setIsParsing(false);
          return;
        }

        // Map column names to 0-based column indices
        const headerRow = grid[headerRowIndex] || [];
        const colMap: Record<string, number> = {};

        headerRow.forEach((cellVal, colIdx) => {
          if (!cellVal) return;
          const str = String(cellVal).trim().toLowerCase();

          if (str.includes("client.name") || str.includes("client name") || str.includes("customer name")) {
            colMap.customerName = colIdx;
          } else if (
            str.includes("contact.no") ||
            str.includes("contact number") ||
            str.includes("phone") ||
            str.includes("mobile") ||
            str.includes("contact")
          ) {
            colMap.phone = colIdx;
          } else if (str.includes("location") || str.includes("address")) {
            colMap.location = colIdx;
          } else if (
            str.includes("scope of work") ||
            str.includes("nature of work") ||
            str.includes("nature") ||
            str.includes("scope")
          ) {
            colMap.natureOfWork = colIdx;
          } else if (str.includes("bal.amt") || str.includes("balance amount") || str.includes("balance")) {
            colMap.balanceAmount = colIdx;
          } else if (
            str.includes("tot.amt") ||
            str === "value" ||
            str.includes("project value") ||
            str.includes("total value") ||
            str.includes("contract value") ||
            (str === "amount" && colMap.projectValue === undefined)
          ) {
            colMap.projectValue = colIdx;
          } else if (str.includes("payment status") || (str === "status" && colMap.paymentStatus === undefined)) {
            colMap.paymentStatus = colIdx;
          } else if (
            str.includes("rec.amt") ||
            str === "payment" ||
            str.includes("received amount") ||
            str.includes("paid amount") ||
            str === "received" ||
            str === "paid"
          ) {
            colMap.receivedAmount = colIdx;
          } else if (
            str.includes("bill.date") ||
            str === "date" ||
            str.includes("project date") ||
            str.includes("start date")
          ) {
            colMap.scheduledDate = colIdx;
          } else if (str.includes("remarks") || str.includes("over due") || str.includes("overdue")) {
            colMap.remarks = colIdx;
          }
        });

        const rows: ParsedRow[] = [];
        let currentStatus: "Completed" | "Ongoing" = sheetName.toLowerCase().includes("ongoing") ? "Ongoing" : "Completed";

        for (let r = headerRowIndex + 1; r < grid.length; r++) {
          const rowCells = grid[r];
          if (!Array.isArray(rowCells)) continue;

          const rowText = rowCells.map((c) => String(c || "")).join(" ").toLowerCase();

          // Section header detection
          if (rowText.includes("ongoing works") || rowText.includes("ongoing projects")) {
            currentStatus = "Ongoing";
            continue;
          }
          if (rowText.includes("completed projects") || rowText.includes("completed works")) {
            currentStatus = "Completed";
            continue;
          }
          // Total / summary row skipping
          if (rowText.includes("total") || rowText.includes("grand total")) {
            continue;
          }

          const getCell = (colIdx: number | undefined) => {
            if (colIdx === undefined || colIdx < 0 || colIdx >= rowCells.length) return undefined;
            return rowCells[colIdx];
          };

          const rawClient = getCell(colMap.customerName);
          const customerName = rawClient !== undefined && rawClient !== null ? String(rawClient).trim() : "";

          // Skip rows with empty client name or header repeats / total rows
          const clientLower = customerName.toLowerCase();
          if (
            !customerName ||
            clientLower === "client.name" ||
            clientLower === "client name" ||
            clientLower.includes("total")
          ) {
            continue;
          }

          const phone = cleanPhoneString(getCell(colMap.phone));
          const location = getCell(colMap.location) ? String(getCell(colMap.location)).trim() : "Not specified";
          const natureOfWork = getCell(colMap.natureOfWork)
            ? String(getCell(colMap.natureOfWork)).trim()
            : tab === "HISTORICAL"
            ? "General Waterproofing"
            : "Waterproofing Repair & Restoration";

          const projectValue = parseNumeric(getCell(colMap.projectValue));
          const balanceAmount = parseNumeric(getCell(colMap.balanceAmount));
          const receivedAmount =
            tab === "HISTORICAL"
              ? parseNumeric(getCell(colMap.receivedAmount))
              : Math.max(0, projectValue - balanceAmount);

          let paymentStatus: "Pending" | "Partial" | "Paid" | "Overdue" = "Pending";
          if (tab === "HISTORICAL") {
            paymentStatus = normalizePaymentStatus(getCell(colMap.paymentStatus));
          } else {
            const rawPayStatus = getCell(colMap.paymentStatus);
            if (rawPayStatus) {
              paymentStatus = normalizePaymentStatus(rawPayStatus);
            } else if (balanceAmount <= 0) {
              paymentStatus = "Paid";
            } else if (receivedAmount > 0) {
              paymentStatus = "Partial";
            } else {
              paymentStatus = "Pending";
            }
          }

          const scheduledDate = parseDateCell(getCell(colMap.scheduledDate));
          const rawRemarks = getCell(colMap.remarks);
          const remarks =
            rawRemarks !== undefined && rawRemarks !== null && String(rawRemarks).trim() !== ""
              ? String(rawRemarks).trim()
              : `${tab === "HISTORICAL" ? "Historical Project Import" : "Outstanding Ledger Record"} (${sheetName})`;

          rows.push({
            rowNum: rows.length + 1,
            customerName,
            phone,
            location,
            natureOfWork,
            leakageType: natureOfWork,
            projectValue,
            receivedAmount,
            balanceAmount,
            paymentStatus,
            status: tab === "HISTORICAL" ? currentStatus : "Completed",
            scheduledDate,
            remarks,
            internalNotes: `Sheet: ${sheetName}`,
            isValid: true,
          });
        }

        setParsedRows(rows);
        setParsedMachineRows([]);
      } catch (err: any) {
        toast.error(`Error parsing sheet: ${err.message || "Invalid structure"}`);
        setParsedRows([]);
        setParsedMachineRows([]);
      } finally {
        setIsParsing(false);
      }
    },
    []
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const initialSheet = wb.SheetNames[0];
          setSelectedSheet(initialSheet);
          parseSheetData(wb, initialSheet, activeTab);
        }
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      parseSheetData(workbook, sheet, activeTab);
    }
  };

  const handleTabChange = (tabStr: string) => {
    const tab = tabStr as "HISTORICAL" | "OUTSTANDING" | "MACHINES";
    setActiveTab(tab);
    if (workbook && selectedSheet) {
      parseSheetData(workbook, selectedSheet, tab);
    }
  };

  const handleCommitImport = async () => {
    if (activeTab === "MACHINES") {
      const validRows = parsedMachineRows.filter((r) => r.isValid);
      if (validRows.length === 0) {
        toast.error("No valid machine rows to import.");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = validRows.map((r) => ({
          toolName: r.toolName,
          category: r.category,
          brand: r.brand,
          currentStock: r.currentStock,
          availableQuantity: r.availableQuantity,
          unit: r.unit || "Nos",
          condition: r.condition,
          remarks: "Imported via Machine.xlsx Bulk Import Utility",
        }));

        const res = await importMachines({ data: { machines: payload } });
        setImportResult(res);
        toast.success(`Import summary: ${res.inserted} machine(s) imported.`);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message || "Server error"}`);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid project rows to import.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        customerName: r.customerName,
        phone: r.phone,
        location: r.location,
        natureOfWork: r.natureOfWork,
        leakageType: r.leakageType || r.natureOfWork,
        scheduledDate: r.scheduledDate,
        projectValue: r.projectValue,
        receivedAmount: r.receivedAmount,
        balanceAmount: r.balanceAmount,
        paymentStatus: r.paymentStatus,
        status: r.status,
        remarks: r.remarks,
        internalNotes: r.internalNotes,
      }));

      const res = await importProjects({ data: { projects: payload } });
      setImportResult(res);
      toast.success(
        `Import summary: ${res.inserted} project(s) imported, ${res.skipped} duplicate(s) skipped.`
      );
    } catch (err: any) {
      toast.error(`Import failed: ${err.message || "Server error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentUser?.role !== "CEO") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-rose-200 bg-rose-50/40 text-center p-6 shadow-md rounded-xl">
          <CardHeader className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-rose-100 grid place-items-center text-rose-600 mb-2">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Executive Access Restricted
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-1">
              The Excel Bulk Import utility is reserved exclusively for Executive / CEO role.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalCount = activeTab === "MACHINES" ? parsedMachineRows.length : parsedRows.length;
  const validCount = activeTab === "MACHINES" ? parsedMachineRows.filter((r) => r.isValid).length : parsedRows.filter((r) => !r.isValid && false).length;
  const invalidCount = activeTab === "MACHINES" ? parsedMachineRows.filter((r) => !r.isValid).length : parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-slate-200 dark:border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
                Excel Bulk Import Engine
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                CEO executive utility for historical projects, payments & machine inventory
              </p>
            </div>
          </div>
        </div>

        <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 font-bold">
          <Database className="h-3.5 w-3.5 mr-1.5" /> Database Sync Ready
        </Badge>
      </div>

      {/* Tabs for Historical Projects vs Outstanding Payments vs Machines & Tools */}
      <Tabs defaultValue="HISTORICAL" onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl bg-slate-100 p-1 rounded-xl">
          <TabsTrigger
            value="HISTORICAL"
            className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
          >
            Historical Projects
          </TabsTrigger>
          <TabsTrigger
            value="OUTSTANDING"
            className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
          >
            Outstanding Payments
          </TabsTrigger>
          <TabsTrigger
            value="MACHINES"
            className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <Wrench className="h-3.5 w-3.5" /> Machines & Tools
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Card className="border border-slate-200 rounded-xl shadow-xs bg-white">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    {activeTab === "HISTORICAL"
                      ? "1. Select Historical Projects Excel File"
                      : activeTab === "OUTSTANDING"
                      ? "1. Select Outstanding Payments Excel File"
                      : "1. Select Machine.xlsx Inventory File"}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {activeTab === "HISTORICAL"
                      ? "Upload .xlsx or .xls file containing 'Completed projects' or 'Ongoing works' worksheets."
                      : activeTab === "OUTSTANDING"
                      ? "Upload .xlsx file with sheets like 'BAD Debits', 'Collection list', or 'MD Follows'."
                      : "Upload Machine.xlsx containing grouped machine categories, descriptions, locations & condition."}
                  </CardDescription>
                </div>

                {/* Sheet Selector if workbook loaded */}
                {sheetNames.length > 0 && (
                  <div className="flex items-center gap-2 min-w-[220px]">
                    <span className="text-xs font-bold text-slate-600 shrink-0">Active Sheet:</span>
                    <Select value={selectedSheet} onValueChange={handleSheetChange}>
                      <SelectTrigger className="h-9 font-bold text-xs rounded-lg border-slate-300 bg-slate-50">
                        <SelectValue placeholder="Select Worksheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetNames.map((name) => (
                          <SelectItem key={name} value={name} className="font-semibold text-xs">
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Dropzone Area */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 grid place-items-center shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {fileName ? (
                    <span className="text-blue-700 font-extrabold flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4" /> {fileName}
                    </span>
                  ) : (
                    "Click to upload or drag & drop Excel workbook"
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500">
                  Supports .xlsx, .xls, .csv files (SheetJS client-side parsing)
                </p>
              </div>

              {/* Import Results Banner if available */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-bold">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-emerald-900">Batch Import Successfully Processed</h4>
                      <p className="text-xs font-bold text-emerald-700">
                        Imported <span className="underline">{importResult.inserted}</span> record(s) &bull; Skipped <span className="underline">{importResult.skipped}</span> duplicate record(s)
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setParsedRows([]);
                      setParsedMachineRows([]);
                      setWorkbook(null);
                      setFileName(null);
                      setImportResult(null);
                    }}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs"
                  >
                    Clear & Import Another File
                  </Button>
                </div>
              )}

              {/* Parsed Data Preview Section */}
              {totalCount > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="text-slate-700 flex items-center gap-1">
                        <FolderPlus className="h-4 w-4 text-blue-600" /> Total Items: <Badge className="bg-slate-200 text-slate-800 ml-1">{totalCount}</Badge>
                      </span>
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Valid: <Badge className="bg-emerald-100 text-emerald-800 ml-1">{validCount}</Badge>
                      </span>
                      {invalidCount > 0 && (
                        <span className="text-rose-700 flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-rose-600" /> Invalid: <Badge className="bg-rose-100 text-rose-800 ml-1">{invalidCount}</Badge>
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={handleCommitImport}
                      disabled={isSubmitting || validCount === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-9 px-5 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 animate-spin" /> Committing DB Transaction...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Commit Import ({validCount} {activeTab === "MACHINES" ? "Tools" : "Projects"}) <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Table Preview */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    {activeTab === "MACHINES" ? (
                      <Table>
                        <TableHeader className="bg-slate-100/80">
                          <TableRow>
                            <TableHead className="w-12 text-center text-slate-700 font-extrabold text-xs">#</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Validation</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Tool Name</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Category</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Brand</TableHead>
                            <TableHead className="text-center text-slate-700 font-extrabold text-xs">Stock</TableHead>
                            <TableHead className="text-center text-slate-700 font-extrabold text-xs">Condition</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedMachineRows.slice(0, 20).map((row) => (
                            <TableRow key={row.rowNum} className={!row.isValid ? "bg-rose-50/50" : "hover:bg-slate-50"}>
                              <TableCell className="text-center font-bold text-slate-500 text-xs">{row.rowNum}</TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                                    Valid
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-[10px]">
                                    {row.errorMessage || "Error"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-bold text-slate-900 text-xs">{row.toolName}</TableCell>
                              <TableCell className="font-semibold text-slate-600 text-xs">{row.category}</TableCell>
                              <TableCell className="font-medium text-slate-600 text-xs">{row.brand}</TableCell>
                              <TableCell className="text-center font-extrabold text-blue-700 text-xs">
                                {row.currentStock} Nos
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={`font-bold text-[10px] ${
                                    row.condition === "Good"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : row.condition === "RepairRequired"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {row.condition === "RepairRequired" ? "Repair Required" : row.condition}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Table>
                        <TableHeader className="bg-slate-100/80">
                          <TableRow>
                            <TableHead className="w-12 text-center text-slate-700 font-extrabold text-xs">#</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Validation</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Client Name</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Contact</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Location</TableHead>
                            <TableHead className="text-slate-700 font-extrabold text-xs">Nature of Work</TableHead>
                            <TableHead className="text-right text-slate-700 font-extrabold text-xs">Value (₹)</TableHead>
                            <TableHead className="text-right text-slate-700 font-extrabold text-xs">Received (₹)</TableHead>
                            <TableHead className="text-right text-slate-700 font-extrabold text-xs">Balance (₹)</TableHead>
                            <TableHead className="text-center text-slate-700 font-extrabold text-xs">Pay Status</TableHead>
                            <TableHead className="text-center text-slate-700 font-extrabold text-xs">Proj Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 20).map((row) => (
                            <TableRow key={row.rowNum} className={!row.isValid ? "bg-rose-50/50" : "hover:bg-slate-50"}>
                              <TableCell className="text-center font-bold text-slate-500 text-xs">{row.rowNum}</TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                                    Valid
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-[10px]">
                                    {row.errorMessage || "Error"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-bold text-slate-900 text-xs">{row.customerName || "-"}</TableCell>
                              <TableCell className="font-semibold text-slate-600 text-xs">{row.phone || "-"}</TableCell>
                              <TableCell className="font-medium text-slate-600 text-xs">{row.location || "-"}</TableCell>
                              <TableCell className="font-medium text-slate-700 text-xs max-w-[180px] truncate">
                                {row.natureOfWork}
                              </TableCell>
                              <TableCell className="text-right font-extrabold text-slate-900 text-xs">
                                ₹{row.projectValue.toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-700 text-xs">
                                ₹{row.receivedAmount.toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell className="text-right font-bold text-rose-600 text-xs">
                                ₹{row.balanceAmount.toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={`font-bold text-[10px] ${
                                    row.paymentStatus === "Paid"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : row.paymentStatus === "Partial"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {row.paymentStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-blue-100 text-blue-800 font-bold text-[10px]">
                                  {row.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {totalCount > 20 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-1">
                        <Info className="h-3.5 w-3.5 text-blue-600" /> Showing first 20 of {totalCount} parsed rows in preview table
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
