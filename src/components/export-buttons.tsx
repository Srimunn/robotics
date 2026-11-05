import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRobotics } from "@/lib/robotics-context";
import { exportRowsToExcel, exportRowsToPdf, type ExportRow } from "@/lib/table-export";
import { pickRowColumns, useColumnChooser, type ExportKind } from "@/components/choose-columns-dialog";

/**
 * Excel + PDF download for a list page. Pass the whole filtered list (not just the visible page).
 * `rows` may be a function so the export rows are only built when a button is clicked.
 * Each click first opens the "Choose columns" box; `printKey` names the saved column choice
 * (see PRINT_REPORTS in lib/column-prefs).
 */
export function ExportButtons({
  rows,
  filename,
  title,
  subtitle,
  printKey,
  before,
}: {
  printKey?: string;
  /** Extra controls shown in the same row, before the Excel / PDF buttons. */
  before?: ReactNode;
  rows: ExportRow[] | (() => ExportRow[]);
  filename: string;
  title?: string;
  subtitle?: string;
}) {
  const { settings, currentUser } = useRobotics();
  const chooser = useColumnChooser();

  // Labour logins never get bulk downloads.
  if (currentUser?.role === "Labor") return null;

  const getRows = () => (typeof rows === "function" ? rows() : rows);
  const reportKey = printKey || `list.${filename}`;

  const runExcel = (data: ExportRow[]) => {
    try {
      exportRowsToExcel(filename, data, title || filename);
      toast.success(`Excel downloaded (${data.length} rows)`);
    } catch (err: any) {
      toast.error("Export failed: " + (err?.message || err));
    }
  };

  const runPdf = (data: ExportRow[]) => {
    const ok = exportRowsToPdf(title || filename, data, {
      subtitle,
      companyName: settings?.companyName,
    });
    if (ok) toast.success('PDF ready: choose "Save as PDF" in the print window');
    else toast.error("Please allow popups to download the PDF");
  };

  const startExport = (kind: ExportKind) => {
    const data = getRows();
    if (data.length === 0) return toast.error("Nothing to export");
    const headers = Object.keys(data[0]);
    chooser.choose({
      reportKey,
      title: title || filename,
      headers,
      kind,
      onConfirm: (selected) => {
        const picked = pickRowColumns(data, selected);
        if (kind === "Excel") runExcel(picked);
        else runPdf(picked);
      },
    });
  };

  const exportExcel = () => startExport("Excel");
  const exportPdf = () => startExport("PDF");

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {before}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs rounded-lg"
        onClick={exportExcel}
        data-testid="export-excel"
      >
        <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" /> Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs rounded-lg"
        onClick={exportPdf}
        data-testid="export-pdf"
      >
        <FileText className="mr-1.5 h-4 w-4 text-rose-600" /> PDF
      </Button>
      {chooser.dialog}
    </div>
  );
}
