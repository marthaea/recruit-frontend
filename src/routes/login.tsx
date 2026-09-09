import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/pages/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — CAA Uganda Recruitment" },
      {
        name: "description",
        content: "Sign in to your CAA Uganda Recruitment Portal candidate account.",
      },
    ],
  }),
  component: LoginPage,
});
