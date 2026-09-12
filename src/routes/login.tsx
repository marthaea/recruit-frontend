import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/pages/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — UCAA Recruitment" },
      {
        name: "description",
        content: "Sign in to your UCAA Recruitment Portal candidate account.",
      },
    ],
  }),
  component: LoginPage,
});
