import { createFileRoute } from "@tanstack/react-router";
import { StatsCards } from "@/components/stats-cards";
import { ProjectsTable } from "@/components/projects-table";
import { useProjects } from "@/lib/projects-context";

export const Route = createFileRoute("/project")({
  head: () => ({
    meta: [
      { title: "Project · BuildFlow" },
      { name: "description", content: "Manage and modify all construction projects." },
      { property: "og:title", content: "Project · BuildFlow" },
      { property: "og:description", content: "Manage and modify all construction projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { projects } = useProjects();
  return (
    <div className="space-y-6">
      <StatsCards />
      <ProjectsTable title="Project" data={projects} showAdd={true} readOnly={false} />
    </div>
  );
}
