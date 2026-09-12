import { createFileRoute } from "@tanstack/react-router";
import { VacanciesPage } from "@/features/jobs/pages/VacanciesPage";

export const Route = createFileRoute("/vacancies")({
  head: () => ({
    meta: [
      { title: "Current Vacancies — UCAA" },
      {
        name: "description",
        content: "Browse all open roles at the Civil Aviation Authority of Uganda.",
      },
      { property: "og:title", content: "Current Vacancies — UCAA" },
      {
        property: "og:description",
        content: "12 positions open across Air Traffic, Safety, Finance, ICT and Legal.",
      },
    ],
  }),
  component: VacanciesPage,
});
