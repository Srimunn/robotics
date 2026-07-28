import { createFileRoute } from "@tanstack/react-router";
import { ProjectsTable } from "@/components/projects-table";
import { useProjects } from "@/lib/projects-context";
import { getBalance } from "@/lib/project-types";

export const Route = createFileRoute("/pending")({
  head: () => ({
    meta: [
      { title: "Pending Payments · BuildFlow" },
      { name: "description", content: "Projects with outstanding balance amounts." },
      { property: "og:title", content: "Pending Payments · BuildFlow" },
      { property: "og:description", content: "Projects with outstanding balance amounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { projects } = useProjects();
  const pending = projects.filter((p) => getBalance(p) > 0);
  return <ProjectsTable title="Pending Payments" data={pending} showAdd={false} />;
}