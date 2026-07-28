import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/project-types";

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, string> = {
    Received:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300",
    "Part Payment":
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300",
    Pending:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={`${map[status]} font-medium`}>
      {status}
    </Badge>
  );
}