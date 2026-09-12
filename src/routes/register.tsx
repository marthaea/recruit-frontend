import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Candidate Profile — UCAA Recruitment" },
      {
        name: "description",
        content:
          "Build your UCAA candidate profile — personal details, education, certifications and references.",
      },
    ],
  }),
  component: RegisterPage,
});
