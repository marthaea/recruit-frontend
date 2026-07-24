import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Bookmark, BookmarkCheck, AlertCircle, Printer, Clock } from "lucide-react";
import { useApp, type JobRequirement } from "@/context/AppContext";
import { criteria as criteriaApi } from "@/lib/api/client";
import { closingLabel, isClosingSoon } from "@/lib/deadline";
import { JobDocument } from "@/components/JobDocument";

export const Route = createFileRoute("/job")({
  validateSearch: z.object({ jobId: z.coerce.number() }),
  head: () => ({ meta: [{ title: "Job Details — CAA Uganda" }] }),
  component: JobDetailPage,
});

// ─── Saved-jobs helpers ───────────────────────────────────────────────────────

const SAVED_KEY = "caa_saved_jobs_v1";
function readSaved(): number[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function writeSaved(ids: number[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

function JobDetailPage() {
  const { jobId } = Route.useSearch();
  const { jobs, auth, openSignInPrompt, pushToast, trackEvent, settings } = useApp();
  const navigate = useNavigate();
  const job = jobs.find((j) => j.id === jobId);
  const [saved, setSaved] = useState(false);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);

  useEffect(() => { setSaved(readSaved().includes(jobId)); }, [jobId]);
  useEffect(() => {
    if (job) trackEvent({ type: "job_view", jobId: job.id, jobTitle: job.title });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Public, candidate-safe requirements — fetched separately from the admin-only
  // criteria context, since candidates never have permission to load that.
  useEffect(() => {
    criteriaApi.getPublic(jobId).then((r) => {
      if (r.success) setRequirements((r.data.requirements as unknown as JobRequirement[]) ?? []);
    }).catch(() => {});
  }, [jobId]);

  if (!job) {
    return (
      <div className="px-4 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-caa-danger mx-auto mb-4" />
        <h2 className="font-bold text-xl text-caa-body">Vacancy not found</h2>
        <p className="text-sm text-caa-muted mt-2 mb-6">This listing may have been removed or the link is invalid.</p>
        <Link to="/vacancies" className="inline-flex items-center gap-2 px-5 py-2.5 bg-caa-navy text-white text-sm font-semibold rounded-md hover:bg-caa-navy-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Vacancies
        </Link>
      </div>
    );
  }

  const isExpired = new Date(job.closesAt) < new Date();

  const toggleSaved = () => {
    const cur = readSaved();
    const next = cur.includes(jobId) ? cur.filter((i) => i !== jobId) : [...cur, jobId];
    writeSaved(next);
    setSaved(next.includes(jobId));
    pushToast({ type: "info", title: next.includes(jobId) ? "Saved for later" : "Removed from saved", message: job.title });
    if (next.includes(jobId)) trackEvent({ type: "save_job", jobId: job.id, jobTitle: job.title });
  };

  const handleApply = () => {
    trackEvent({ type: "apply_click", jobId: job.id, jobTitle: job.title });
    if (!auth.isLoggedIn) { openSignInPrompt(); return; }
    navigate({ to: "/apply", search: { jobId } });
  };

  return (
    <div className="bg-gray-100 min-h-screen py-6 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* ── Action bar (outside document) ───────────────────── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Link
            to="/vacancies"
            className="inline-flex items-center gap-1.5 text-caa-navy text-sm font-semibold hover:text-caa-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> All Vacancies
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 rounded bg-white hover:border-caa-navy text-gray-600 hover:text-caa-navy transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button
              onClick={toggleSaved}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 rounded bg-white hover:border-caa-navy text-gray-600 hover:text-caa-navy transition-colors"
            >
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        <JobDocument job={job} requirements={requirements} />

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        {isExpired ? (
          <p className="mt-4 text-center text-sm font-semibold text-caa-danger">Applications for this vacancy have closed.</p>
        ) : (
          <>
            {closingLabel(job.closesAt) && (
              <p className={`mt-4 text-center text-sm font-semibold flex items-center justify-center gap-1.5 ${
                isClosingSoon(job.closesAt, settings.closingSoonDays) ? "text-amber-700" : "text-caa-muted"
              }`}>
                <Clock className="h-4 w-4" /> {closingLabel(job.closesAt)} to apply
              </p>
            )}
          <div className="mt-4 flex justify-center gap-3 pb-6">
            <button
              onClick={toggleSaved}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-400 rounded text-sm font-semibold bg-white hover:border-caa-navy hover:text-caa-navy transition-colors"
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? "Saved" : "Save for later"}
            </button>
            <button
              onClick={handleApply}
              className="px-8 py-2.5 bg-caa-navy text-white text-sm font-semibold rounded hover:bg-caa-navy-2 transition-colors"
            >
              Apply Now
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
