import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/completed")({
  component: () => <Navigate to="/project" replace />,
});