import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRobotics } from "@/lib/robotics-context";
import { exportRowsToExcel, exportRowsToPdf, type ExportRow } from "@/lib/table-export";

/**
 * Excel + PDF download for a list page. Pass the whole filtered list (not just the visible page).
 * `rows` may be a function so the export rows are only built when a button is clicked.
 */
export function ExportButtons({
  rows,
  filename,
  title,
  subtitle,
}: {
  rows: ExportRow[] | (() => ExportRow[]);
  filename: string;
  title?: string;
  subtitle?: string;
}) {
  const { settings, currentUser } = useRobotics();

  // Labour logins never get bulk downloads.
  if (currentUser?.role === "Labor") return null;

  const getRows = () => (typeof rows === "function" ? rows() : rows);

  const exportExcel = () => {
    const data = getRows();
    if (data.length === 0) return toast.error("Nothing to export");
    try {
      exportRowsToExcel(filename, data, title || filename);
      toast.success(`Excel downloaded (${data.length} rows)`);
    } catch (err: any) {
      toast.error("Export failed: " + (err?.message || err));
    }
  };

  const exportPdf = () => {
    const data = getRows();
    if (data.length === 0) return toast.error("Nothing to export");
    const ok = exportRowsToPdf(title || filename, data, {
      subtitle,
      companyName: settings?.companyName,
    });
    if (ok) toast.success('PDF ready: choose "Save as PDF" in the print window');
    else toast.error("Please allow popups to download the PDF");
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
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
    </div>
  );
}
