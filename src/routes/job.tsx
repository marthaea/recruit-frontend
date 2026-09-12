import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { JobDetailPage } from "@/features/jobs/pages/JobDetailPage";

export const Route = createFileRoute("/job")({
  validateSearch: z.object({ jobId: z.coerce.number() }),
  head: () => ({ meta: [{ title: "Job Details — UCAA" }] }),
  component: JobDetailPage,
});
