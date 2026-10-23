import { cn } from "@/lib/utils";
import type { CustomerType } from "@/lib/robotics-types";

interface Option<T> {
  value: T;
  label: string;
  active: string;
}

function ChoiceToggle<T extends string | boolean>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value?: T | "";
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex gap-1.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 px-3 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60",
            value === o.value ? o.active : "bg-background border-input text-foreground hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** B2B / B2C choice. Independent of GST. */
export function CustomerTypeToggle(props: {
  value?: CustomerType | "";
  onChange: (value: CustomerType) => void;
  disabled?: boolean;
}) {
  return (
    <ChoiceToggle<CustomerType>
      {...props}
      ariaLabel="Customer type"
      options={[
        { value: "B2B", label: "B2B", active: "bg-indigo-600 border-indigo-600 text-white" },
        { value: "B2C", label: "B2C", active: "bg-teal-600 border-teal-600 text-white" },
      ]}
    />
  );
}

/** GST / Non-GST choice. Independent of B2B/B2C. */
export function GstToggle(props: {
  value?: boolean | "";
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ChoiceToggle<boolean>
      {...props}
      ariaLabel="GST"
      options={[
        { value: true, label: "GST", active: "bg-purple-600 border-purple-600 text-white" },
        { value: false, label: "Non-GST", active: "bg-slate-700 border-slate-700 text-white" },
      ]}
    />
  );
}

const NotSet = () => <span className="text-[11px] text-muted-foreground whitespace-nowrap">Not set</span>;

export function CustomerTypeBadge({ value }: { value?: CustomerType }) {
  if (!value) return <NotSet />;
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border whitespace-nowrap",
        value === "B2B"
          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-teal-50 text-teal-700 border-teal-200",
      )}
    >
      {value}
    </span>
  );
}

export function GstBadge({ value }: { value?: boolean }) {
  if (value === undefined) return <NotSet />;
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border whitespace-nowrap",
        value ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-50 text-slate-600 border-slate-200",
      )}
    >
      {value ? "GST" : "Non-GST"}
    </span>
  );
}

/** Text used in Excel/PDF exports. */
export const typeLabel = (v?: CustomerType) => v || "Not set";
export const gstLabel = (v?: boolean) => (v === undefined ? "Not set" : v ? "GST" : "Non-GST");
