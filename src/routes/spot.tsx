import { createFileRoute } from "@tanstack/react-router";
import { ProjectsTable } from "@/components/projects-table";
import { StatsCards } from "@/components/stats-cards";
import { useProjects } from "@/lib/projects-context";

export const Route = createFileRoute("/spot")({
  head: () => ({
    meta: [
      { title: "Spot Payments · BuildFlow" },
      { name: "description", content: "All projects with received payments." },
      { property: "og:title", content: "Spot Payments · BuildFlow" },
      { property: "og:description", content: "All projects with received payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotPage,
});

function SpotPage() {
  const { projects } = useProjects();
  const spot = projects.filter((p) => p.paymentReceived > 0);
  return (
    <div className="space-y-6">
      <StatsCards />
      <ProjectsTable title="Spot Payments" data={spot} showAdd={false} readOnly={true} />
    </div>
  );
}