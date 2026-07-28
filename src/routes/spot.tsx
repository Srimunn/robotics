import { createFileRoute } from "@tanstack/react-router";
import { ProjectsTable } from "@/components/projects-table";
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
  return <ProjectsTable title="Spot Payments" data={spot} showAdd={false} />;
}