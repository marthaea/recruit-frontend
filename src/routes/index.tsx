import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/jobs/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CAA Uganda Recruitment Portal — Careers in Aviation" },
      {
        name: "description",
        content:
          "Apply for open roles at Uganda's Civil Aviation Authority. Browse current vacancies and manage your applications.",
      },
      { property: "og:title", content: "CAA Uganda Recruitment Portal" },
      { property: "og:description", content: "Build your career in aviation excellence." },
    ],
  }),
  component: HomePage,
});
