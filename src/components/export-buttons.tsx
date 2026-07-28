import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, string | number>;

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ rows, filename }: { rows: Row[]; filename: string }) {
  const exportCsv = () => {
    if (rows.length === 0) return toast.error("Nothing to export");
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    downloadFile(`${filename}.csv`, csv, "text/csv");
    toast.success("Excel exported");
  };

  const exportPdf = () => {
    if (rows.length === 0) return toast.error("Nothing to export");
    const headers = Object.keys(rows[0]);
    const html = `<!doctype html><html><head><title>${filename}</title>
      <style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}
      th{background:#f5f5f5}</style></head><body>
      <h2>${filename}</h2>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? "")}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      toast.success("PDF ready to save");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportCsv}>
        <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf}>
        <FileText className="mr-1.5 h-4 w-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" /> Print
      </Button>
    </div>
  );
}