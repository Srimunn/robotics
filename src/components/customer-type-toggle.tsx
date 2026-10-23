import { cn } from "@/lib/utils";
import type { CustomerType } from "@/lib/robotics-types";

/** Two-button B2B (GST) / B2C (Non-GST) choice used on enquiries. */
export function CustomerTypeToggle({
  value,
  onChange,
  disabled,
}: {
  value?: CustomerType | "";
  onChange: (value: CustomerType) => void;
  disabled?: boolean;
}) {
  const options: { value: CustomerType; label: string; hint: string; active: string }[] = [
    {
      value: "B2B",
      label: "B2B",
      hint: "GST",
      active: "bg-indigo-600 border-indigo-600 text-white",
    },
    {
      value: "B2C",
      label: "B2C",
      hint: "Non-GST",
      active: "bg-teal-600 border-teal-600 text-white",
    },
  ];
  return (
    <div className="inline-flex gap-1.5" role="radiogroup" aria-label="Customer type">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 px-3 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60",
            value === o.value
              ? o.active
              : "bg-background border-input text-foreground hover:bg-accent",
          )}
        >
          {o.label} <span className="font-medium opacity-80">({o.hint})</span>
        </button>
      ))}
    </div>
  );
}

export function CustomerTypeBadge({ value }: { value?: CustomerType }) {
  if (!value) return <span className="text-[11px] text-muted-foreground">Not set</span>;
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
