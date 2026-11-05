import { useState, type ReactNode } from "react";
import { Columns3, FileSpreadsheet, FileText, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { defaultPrintSelection, isPrintColumnOn, savePrintColumns } from "@/lib/column-prefs";

export type ExportKind = "PDF" | "Excel";

type Request = {
  reportKey: string;
  title: string;
  headers: string[];
  kind: ExportKind;
  onConfirm: (selected: string[]) => void;
};

/**
 * "Choose columns" box shown before a PDF or Excel export. The ticks start from the choice
 * saved on this computer (Settings page or the last export) and are saved again on confirm.
 *
 * Usage: const chooser = useColumnChooser(); ... chooser.choose({...}); ... {chooser.dialog}
 */
export function useColumnChooser(): {
  choose: (req: Request) => void;
  dialog: ReactNode;
} {
  const [req, setReq] = useState<Request | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const choose = (r: Request) => {
    setSelected(r.headers.filter((h) => isPrintColumnOn(r.reportKey, h)));
    setReq(r);
  };

  const close = () => setReq(null);

  const confirm = () => {
    if (!req || selected.length === 0) return;
    // Keep the original column order, whatever order the boxes were ticked in.
    const ordered = req.headers.filter((h) => selected.includes(h));
    savePrintColumns(req.reportKey, req.headers, ordered);
    const run = req.onConfirm;
    setReq(null);
    run(ordered);
  };

  const toggle = (h: string, on: boolean) =>
    setSelected((prev) => (on ? [...prev, h] : prev.filter((x) => x !== h)));

  const dialog = (
    <Dialog open={req !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-2xl rounded-xl" data-testid="choose-columns-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Columns3 className="h-4 w-4 text-blue-600" /> Choose columns for {req?.kind}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {req?.title}: tick the columns you want in the{" "}
            {req?.kind === "Excel" ? "file" : "printout"}. Your choice is remembered on this
            computer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelected(req?.headers ?? [])}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelected([])}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => req && setSelected(defaultPrintSelection(req.reportKey, req.headers))}
          >
            <RotateCcw className="h-3 w-3" /> Default
          </Button>
          <span className="ml-auto text-muted-foreground" data-testid="choose-columns-count">
            {selected.length} of {req?.headers.length ?? 0} columns
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 max-h-[50vh] overflow-y-auto rounded-lg border p-3">
          {req?.headers.map((h) => (
            <label key={h} className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <Checkbox
                checked={selected.includes(h)}
                onCheckedChange={(v) => toggle(h, v === true)}
                aria-label={h}
              />
              <span>{h}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selected.length === 0}
            onClick={confirm}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            data-testid="choose-columns-confirm"
          >
            {req?.kind === "Excel" ? (
              <>
                <FileSpreadsheet className="h-4 w-4" /> Download Excel
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" /> Print / Save PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { choose, dialog };
}

/** Keeps only the chosen columns of row objects, in the chosen order. */
export function pickRowColumns<T extends Record<string, unknown>>(rows: T[], selected: string[]) {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const h of selected) out[h] = r[h];
    return out as T;
  });
}

/** Keeps only the chosen columns of an array-of-arrays table. */
export function pickArrayColumns<T>(headers: string[], rows: T[][], selected: string[]) {
  const idx = selected.map((h) => headers.indexOf(h)).filter((i) => i >= 0);
  return {
    headers: idx.map((i) => headers[i]),
    rows: rows.map((r) => idx.map((i) => r[i])),
    indexes: idx,
  };
}
