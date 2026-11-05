import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useListColumns } from "@/lib/column-prefs";

/**
 * Short list view for a module page. Columns switched off in Settings > Columns are left out
 * of the table; each row gets an arrow that opens a strip under it with those details, and
 * the "All columns" switch shows the full wide table for the moment.
 */
export function useListView(moduleKey: string) {
  const cols = useListColumns(moduleKey);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const hidden = showAll ? [] : cols.hidden;
  const hasHidden = hidden.length > 0;

  return {
    moduleKey,
    /** Show this column in the table? */
    show: (key: string) => showAll || cols.isVisible(key),
    hidden,
    hasHidden,
    showAll,
    setShowAll,
    hiddenCount: cols.hidden.length,
    isExpanded: (id: string) => hasHidden && expanded.has(id),
    toggle: (id: string) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    /** Number of table columns for "no results" / detail rows, counting the arrow column. */
    span: (visibleColumnCount: number) => visibleColumnCount + (hasHidden ? 1 : 0),
  };
}

export type ListView = ReturnType<typeof useListView>;

/** "All columns" switch shown above a list table. Renders nothing when no column is hidden. */
export function ColumnsSwitch({ view }: { view: ListView }) {
  if (view.hiddenCount === 0) return null;
  return (
    <div className="flex items-center gap-1 print:hidden">
      <Button
        type="button"
        variant={view.showAll ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-8 text-xs rounded-lg gap-1.5",
          view.showAll && "bg-blue-600 hover:bg-blue-700 text-white",
        )}
        onClick={() => view.setShowAll(!view.showAll)}
        title={
          view.showAll ? "Show the short view again" : `Show ${view.hiddenCount} hidden column(s)`
        }
        data-testid="columns-switch"
      >
        <Columns3 className="h-4 w-4" />
        {view.showAll ? "Short view" : `All columns (+${view.hiddenCount})`}
      </Button>
      <Link
        to="/settings"
        search={{ tab: "COLUMNS" }}
        className="text-[11px] text-muted-foreground hover:text-blue-600 underline-offset-2 hover:underline px-1"
        title="Choose which columns show first (Settings > Columns)"
      >
        Edit
      </Link>
    </div>
  );
}

/** Header cell for the arrow column. */
export function ExpandHead({ view, className }: { view: ListView; className?: string }) {
  if (!view.hasHidden) return null;
  return <th className={cn("p-3 pl-3 pr-0 w-8", className)} aria-label="More details" />;
}

/** Arrow cell at the start of a row; opens the hidden details under the row. */
export function ExpandCell({
  view,
  id,
  className,
}: {
  view: ListView;
  id: string;
  className?: string;
}) {
  if (!view.hasHidden) return null;
  const open = view.isExpanded(id);
  return (
    <td
      className={cn("p-3 pl-3 pr-0 w-8 align-middle", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => view.toggle(id)}
        className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600"
        aria-label={open ? "Hide details" : "Show more details"}
        aria-expanded={open}
        data-testid="row-expand"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </td>
  );
}

export type DetailItem = { key: string; label?: string; node: ReactNode };

/** The strip under an opened row, listing only the columns hidden from the table. */
export function HiddenDetailsRow({
  view,
  id,
  colSpan,
  items,
}: {
  view: ListView;
  id: string;
  colSpan: number;
  items: DetailItem[];
}) {
  if (!view.isExpanded(id)) return null;
  const hiddenKeys = view.hidden.map((c) => c.key);
  const shown = items.filter((it) => hiddenKeys.includes(it.key));
  if (shown.length === 0) return null;
  return (
    <tr className="bg-slate-50/70 dark:bg-slate-900/40" data-testid="row-details">
      <td colSpan={colSpan} className="px-4 py-3 pl-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
          {shown.map((it) => (
            <div key={it.key} className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {it.label ?? view.hidden.find((c) => c.key === it.key)?.label}
              </div>
              <div className="mt-0.5 text-xs">{it.node}</div>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}
