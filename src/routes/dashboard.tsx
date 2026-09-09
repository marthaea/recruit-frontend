import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/candidate/pages/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — CAA Uganda" },
      {
        name: "description",
        content: "Track your applications and complete your candidate profile.",
      },
    ],
  }),
  component: DashboardPage,
});
