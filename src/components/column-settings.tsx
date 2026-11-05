import { useState } from "react";
import { Columns3, Printer, RotateCcw, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  LIST_MODULES,
  PRINT_REPORTS,
  resetListColumns,
  resetPrintColumns,
  setListColumnVisible,
  setPrintColumn,
  useListColumns,
  usePrintColumns,
} from "@/lib/column-prefs";

/**
 * Settings > Columns. Two lists of toggles, both saved on this computer only:
 * which columns each module's list page shows first, and which columns go into each
 * printout / export. Nothing here is saved to the server.
 */
export function ColumnSettings() {
  const [moduleKey, setModuleKey] = useState(LIST_MODULES[0].key);
  const [reportKey, setReportKey] = useState(PRINT_REPORTS[0].key);
  const groups = Array.from(new Set(PRINT_REPORTS.map((r) => r.group)));

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900 p-3 text-blue-900 dark:text-blue-200">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          These choices only change what you see and print on <strong>this computer</strong>. They
          are saved in this browser, not in the database, and never change any customer, project or
          payment data.
        </p>
      </div>

      <Card
        className="rounded-xl border border-border shadow-xs bg-white dark:bg-card"
        data-testid="list-column-settings"
      >
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-blue-600" /> Columns shown on each module page
          </CardTitle>
          <CardDescription className="text-xs">
            Switched-off columns are hidden from the list. Open them from the arrow at the start of
            each row, or with the "All columns" button above the table.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          <ModulePicker
            items={LIST_MODULES.map((m) => ({ key: m.key, title: m.title }))}
            value={moduleKey}
            onChange={setModuleKey}
            testId="list-module-picker"
          />
          <ListModuleToggles moduleKey={moduleKey} />
        </CardContent>
      </Card>

      <Card
        className="rounded-xl border border-border shadow-xs bg-white dark:bg-card"
        data-testid="print-column-settings"
      >
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Printer className="h-4 w-4 text-blue-600" /> Columns in printouts and exports
          </CardTitle>
          <CardDescription className="text-xs">
            Ticked columns are pre-selected in the "Choose columns" box that opens when you click
            PDF or Excel. You can still change them there before printing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {g}
                </div>
                <ModulePicker
                  items={PRINT_REPORTS.filter((r) => r.group === g).map((r) => ({
                    key: r.key,
                    title: r.title,
                  }))}
                  value={reportKey}
                  onChange={setReportKey}
                  testId={`print-report-picker-${g.replace(/\s+/g, "-").toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <PrintReportToggles reportKey={reportKey} />
        </CardContent>
      </Card>
    </div>
  );
}

function ModulePicker({
  items,
  value,
  onChange,
  testId,
}: {
  items: { key: string; title: string }[];
  value: string;
  onChange: (key: string) => void;
  testId?: string;
}) {
  return (
    <div className="flex md:flex-col flex-wrap gap-1" data-testid={testId}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cn(
            "text-left rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
            value === it.key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-card border-border hover:bg-slate-50 dark:hover:bg-slate-900",
          )}
        >
          {it.title}
        </button>
      ))}
    </div>
  );
}

function ListModuleToggles({ moduleKey }: { moduleKey: string }) {
  const { columns, isVisible } = useListColumns(moduleKey);
  const module = LIST_MODULES.find((m) => m.key === moduleKey)!;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{module.title}</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => resetListColumns(moduleKey)}
        >
          <RotateCcw className="h-3 w-3" /> Reset to default
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {columns.map((c) => (
          <label
            key={c.key}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
              c.required
                ? "bg-slate-50 dark:bg-slate-900/50 text-muted-foreground"
                : "cursor-pointer",
            )}
          >
            <span>
              {c.label}
              {c.required && <span className="block text-[10px]">Always shown</span>}
            </span>
            <Switch
              checked={isVisible(c.key)}
              disabled={c.required}
              onCheckedChange={(v) => setListColumnVisible(moduleKey, c.key, v)}
              aria-label={`Show ${c.label} on ${module.title}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function PrintReportToggles({ reportKey }: { reportKey: string }) {
  const isOn = usePrintColumns(reportKey);
  const report = PRINT_REPORTS.find((r) => r.key === reportKey)!;
  const onCount = report.columns.filter((h) => isOn(h)).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">{report.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {onCount} of {report.columns.length} columns ticked
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => resetPrintColumns(reportKey)}
        >
          <RotateCcw className="h-3 w-3" /> Reset to default
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {report.columns.map((h) => (
          <label
            key={h}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer select-none"
          >
            <Checkbox
              checked={isOn(h)}
              onCheckedChange={(v) => setPrintColumn(reportKey, h, v === true)}
              aria-label={h}
            />
            <span>{h}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
