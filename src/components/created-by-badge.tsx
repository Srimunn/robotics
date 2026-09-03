import { Badge } from "@/components/ui/badge";

interface CreatedByBadgeProps {
  role?: string | null;
  className?: string;
}

export function CreatedByBadge({ role, className = "" }: CreatedByBadgeProps) {
  if (!role) return null;

  const normalized = role.toUpperCase();
  let badgeStyles = "bg-slate-100 text-slate-700 border-slate-200";

  if (normalized === "CEO" || normalized === "ADMIN") {
    badgeStyles = "bg-purple-100 text-purple-800 border-purple-200";
  } else if (normalized === "RS") {
    badgeStyles = "bg-blue-100 text-blue-800 border-blue-200";
  } else if (normalized === "DRS") {
    badgeStyles = "bg-indigo-100 text-indigo-800 border-indigo-200";
  } else if (normalized === "CS") {
    badgeStyles = "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (normalized === "BS") {
    badgeStyles = "bg-amber-100 text-amber-800 border-amber-200";
  }

  return (
    <Badge
      variant="outline"
      className={`font-extrabold text-[10px] px-1.5 py-0 shrink-0 border inline-flex items-center shadow-none ${badgeStyles} ${className}`}
      title={`Created by: ${role}`}
    >
      {role}
    </Badge>
  );
}
