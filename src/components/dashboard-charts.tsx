import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useProjects } from "@/lib/projects-context";
import { getStatus } from "@/lib/project-types";

const COLORS = ["#10b981", "#f97316", "#ef4444"];

export function DashboardCharts() {
  const { projects } = useProjects();

  const statusCounts: Record<string, number> = { Received: 0, "Part Payment": 0, Pending: 0 };
  projects.forEach((p) => (statusCounts[getStatus(p)] += 1));
  const pieData = [
    { name: "Received", value: statusCounts.Received },
    { name: "Partial", value: statusCounts["Part Payment"] },
    { name: "Pending", value: statusCounts.Pending },
  ];

  const barData = projects.slice(0, 8).map((p) => ({
    name: p.clientName.split(" ")[0],
    Value: p.projectValue,
    Payment: p.paymentReceived,
  }));

  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en", { month: "short" }),
    };
  });
  const lineData = months.map((m) => {
    const total = projects
      .filter((p) => {
        const d = new Date(p.date);
        return `${d.getFullYear()}-${d.getMonth()}` === m.key;
      })
      .reduce((s, p) => s + p.paymentReceived, 0);
    return { month: m.label, income: total };
  });
  if (lineData.every((d) => d.income === 0) && projects.length) {
    lineData[lineData.length - 1].income = projects.reduce((s, p) => s + p.paymentReceived, 0);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold">Payment Status Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold">Project Value vs Payment</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Payment" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5 lg:col-span-3">
        <h3 className="mb-4 text-sm font-semibold">Monthly Income Trend</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: "#6366f1" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
