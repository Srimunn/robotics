import { Card } from "@/components/ui/card";
import {
  FolderKanban,
  HardHat,
  Clock,
  Wallet,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { useProjects } from "@/lib/projects-context";
import { formatCurrency, getBalance } from "@/lib/project-types";

export function StatsCards() {
  const { projects, ongoing } = useProjects();
  const totalValue = projects.reduce((s, p) => s + p.projectValue, 0);
  const pendingAmount = projects.reduce((s, p) => s + getBalance(p), 0);
  const spotPayment = projects.reduce((s, p) => s + p.paymentReceived, 0);
  const netProfitLoss = spotPayment - pendingAmount;

  const cards = [
    {
      label: "Total Project Value",
      value: formatCurrency(totalValue),
      subtext: `${projects.length} Total Projects`,
      icon: IndianRupee,
      gradient: "from-blue-500 to-indigo-500",
      textColor: "text-foreground",
    },
    {
      label: "Profit (Received)",
      value: formatCurrency(spotPayment),
      subtext: "Money Collected",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Loss / Pending Risk",
      value: formatCurrency(pendingAmount),
      subtext: "Balance Outstanding",
      icon: TrendingDown,
      gradient: "from-rose-500 to-red-500",
      textColor: "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Net P&L Balance",
      value: formatCurrency(netProfitLoss),
      subtext: netProfitLoss >= 0 ? "Surplus Profit" : "Net Deficit",
      icon: Scale,
      gradient: netProfitLoss >= 0 ? "from-emerald-600 to-teal-600" : "from-amber-500 to-red-500",
      textColor:
        netProfitLoss >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Ongoing Sites",
      value: ongoing.length,
      subtext: "Active Site Works",
      icon: HardHat,
      gradient: "from-amber-500 to-orange-500",
      textColor: "text-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card
          key={c.label}
          className="relative overflow-hidden border-0 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div
            className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-10`}
          />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </div>
              <div className={`mt-2 truncate text-2xl font-bold ${c.textColor}`}>{c.value}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {c.subtext}
              </div>
            </div>
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-md`}
            >
              <c.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
