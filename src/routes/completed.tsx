import { createFileRoute } from "@tanstack/react-router";
import { ProjectsTable } from "@/components/projects-table";
import { useProjects } from "@/lib/projects-context";

export const Route = createFileRoute("/completed")({
  head: () => ({
    meta: [
      { title: "Completed Projects · BuildFlow" },
      { name: "description", content: "All completed construction projects with payment tracking." },
      { property: "og:title", content: "Completed Projects · BuildFlow" },
      { property: "og:description", content: "All completed construction projects with payment tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompletedPage,
});

function CompletedPage() {
  const { projects } = useProjects();
  return <ProjectsTable title="Completed Projects" data={projects} />;
}