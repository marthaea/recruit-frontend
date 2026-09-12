import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ApplyPage } from "@/features/applications/pages/ApplyPage";

export const Route = createFileRoute("/apply")({
  validateSearch: z.object({ jobId: z.coerce.number().optional() }),
  head: () => ({ meta: [{ title: "Apply — UCAA" }] }),
  component: ApplyPage,
});
