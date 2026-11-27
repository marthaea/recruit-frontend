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
        "shortlisting-reports",
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
      .optional()
      .catch(undefined),
    jobId: z.coerce.number().optional(),
    status: z.string().optional().catch(undefined),
    focus: z.enum(["pending", "stale", "invite", "closing", "low"]).optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: "HR Console — UCAA" }] }),
  component: AdminPage,
});
