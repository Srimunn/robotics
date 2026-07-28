import { createFileRoute } from "@tanstack/react-router";
import { StatsCards } from "@/components/stats-cards";
import { DashboardCharts } from "@/components/dashboard-charts";
import { ProjectsTable } from "@/components/projects-table";
import { useProjects } from "@/lib/projects-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildFlow · Construction Project Dashboard" },
      { name: "description", content: "Manage completed projects, ongoing works, and payments with a modern construction ERP dashboard." },
      { property: "og:title", content: "BuildFlow · Construction Project Dashboard" },
      { property: "og:description", content: "Manage completed projects, ongoing works, and payments with a modern construction ERP dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { projects } = useProjects();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your projects, payments and ongoing sites.
        </p>
      </div>
      <StatsCards />
      <DashboardCharts />
      <div className="pt-2">
        <ProjectsTable title="Recent Projects" data={projects.slice(0, 10)} />
      </div>
    </div>
  );
}
