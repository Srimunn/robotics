import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  HardHat,
  Clock,
  Wallet,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { useProjects } from "@/lib/projects-context";
import { formatCurrency, getBalance, getStatus } from "@/lib/project-types";

export function StatsCards() {
  const { projects, ongoing } = useProjects();
  const completed = projects.filter((p) => getStatus(p) === "Received").length;
  const totalValue = projects.reduce((s, p) => s + p.projectValue, 0);
  const pendingAmount = projects.reduce((s, p) => s + getBalance(p), 0);
  const spotPayment = projects.reduce((s, p) => s + p.paymentReceived, 0);

  const cards = [
    { label: "Completed Projects", value: completed, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500" },
    { label: "Total Value", value: formatCurrency(totalValue), icon: IndianRupee, gradient: "from-blue-500 to-indigo-500" },
    { label: "Pending Amount", value: formatCurrency(pendingAmount), icon: Clock, gradient: "from-orange-500 to-red-500" },
    { label: "Spot Payment", value: formatCurrency(spotPayment), icon: Wallet, gradient: "from-violet-500 to-fuchsia-500" },
    { label: "Ongoing Works", value: ongoing.length, icon: HardHat, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card
          key={c.label}
          className="relative overflow-hidden border-0 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-10`} />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-2 truncate text-2xl font-bold">{c.value}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" /> Live
              </div>
            </div>
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-md`}>
              <c.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}