import { createFileRoute } from "@tanstack/react-router";
import { OngoingTable } from "@/components/ongoing-table";
import { StatsCards } from "@/components/stats-cards";

export const Route = createFileRoute("/ongoing")({
  head: () => ({
    meta: [
      { title: "Ongoing Works · BuildFlow" },
      { name: "description", content: "Track active site labour and daily work progress." },
      { property: "og:title", content: "Ongoing Works · BuildFlow" },
      { property: "og:description", content: "Track active site labour and daily work progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OngoingPage,
});

function OngoingPage() {
  return (
    <div className="space-y-6">
      <StatsCards />
      <OngoingTable readOnly={true} />
    </div>
  );
}