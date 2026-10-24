import * as XLSX from "xlsx";

export type ExportCell = string | number | null | undefined;
export type ExportRow = Record<string, ExportCell>;

const today = () => new Date().toISOString().slice(0, 10);

/** File-name safe: "Payments / Receivables" -> "Payments_Receivables". */
export function safeFileName(name: string) {
  return (
    name
      .replace(/[^\w-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "Export"
  );
}

function escapeHtml(value: ExportCell) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanCell(value: ExportCell): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  // Full ISO timestamps read better as plain dates
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return value;
}

/** PDF cells read better with Indian digit grouping (1,05,000). */
function pdfCell(value: ExportCell): string {
  const v = cleanCell(value);
  return typeof v === "number" ? v.toLocaleString("en-IN") : v;
}

/** Downloads rows as a real .xlsx workbook. Numbers stay numbers so Excel can total them. */
export function exportRowsToExcel(filename: string, rows: ExportRow[], sheetName = "Data") {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const aoa = [headers, ...rows.map((r) => headers.map((h) => cleanCell(r[h])))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map((h, i) => {
    let max = h.length;
    for (let r = 1; r < aoa.length; r++) max = Math.max(max, String(aoa[r][i] ?? "").length);
    return { wch: Math.min(Math.max(max + 2, 10), 60) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(filename)}_${today()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a printable A4-landscape table and the browser print dialog ("Save as PDF").
 * Returns false when the popup was blocked.
 */
export function exportRowsToPdf(
  title: string,
  rows: ExportRow[],
  opts: { subtitle?: string; companyName?: string } = {},
) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const docTitle = `${safeFileName(title)}_${today()}`;
  w.document
    .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(docTitle)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
  .header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px; }
  .company { font-size: 16px; font-weight: 800; color: #1e3a8a; }
  .title { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .meta { font-size: 10px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 6px 8px; border: 1px solid #cbd5e1; background: #f1f5f9; text-align: left; font-size: 9px; text-transform: uppercase; }
  td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9.5px; color: #334155; vertical-align: top; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .footer { margin-top: 12px; font-size: 9px; color: #94a3b8; text-align: right; }
  @media print { body { padding: 0; } @page { size: A4 landscape; margin: 10mm; } }
</style></head><body>
<div class="header">
  <div class="company">${escapeHtml(opts.companyName || "Service_OS")}</div>
  <div class="title">${escapeHtml(title)}</div>
  <div class="meta">${opts.subtitle ? `${escapeHtml(opts.subtitle)} • ` : ""}${rows.length} record(s) • Generated ${escapeHtml(generated)}</div>
</div>
<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(pdfCell(r[h]))}</td>`).join("")}</tr>`).join("")}</tbody></table>
<div class="footer">Generated via Service_OS</div>
<script>window.onload = function () { window.print(); };</script>
</body></html>`);
  w.document.close();
  return true;
}
