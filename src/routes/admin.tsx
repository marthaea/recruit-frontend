import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminPage } from "@/features/admin/pages/AdminPage";

export const Route = createFileRoute("/admin")({
  validateSearch: z.object({
    tab: z
      .enum([
        "login",
        "dashboard",
        "jobs",
        "review-jobs",
        "approve-jobs",
        "apps",
        "shortlisting",
        "interview-panel",
        "assessment-schedule",
        "candidate-assessment",
        "shortlisting-ii",
        "emails",
        "interns",
        "analytics",
        "staff",
        "reports",
        "audit",
        "settings",
        "permissions",
        "administration",
      ])
      .optional(),
    jobId: z.coerce.number().optional(),
  }),
  head: () => ({ meta: [{ title: "HR Console — CAA Uganda" }] }),
  component: AdminPage,
});
