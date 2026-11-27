import type { Job, Application } from "@/app/providers/AppContext";
import type { TourStep } from "@/features/onboarding/OnboardingTour";

// "Needs your attention" on the HR dashboard. One place computes each item's
// list, so the dashboard's counts and the guided spotlight that opens when HR
// clicks an item always agree.

export type AttentionFocus = "pending" | "stale" | "invite" | "closing" | "low";

const DAY = 86_400_000;
const parseDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const daysAgo = (s: string) => { const d = parseDate(s); return d ? Math.floor((Date.now() - d.getTime()) / DAY) : null; };
const daysUntil = (s: string) => Math.ceil((new Date(s).getTime() - Date.now()) / DAY);

export function computeAttention(jobs: Job[], applications: Application[], isExpired: (j: Job) => boolean, closingSoonDays = 7) {
  const pending = applications.filter((a) => a.status === "Pending");
  const stale = pending
    .filter((a) => { const d = parseDate(a.date); return d != null && (Date.now() - d.getTime()) / DAY > 7; })
    .sort((a, b) => (daysAgo(b.date) ?? 0) - (daysAgo(a.date) ?? 0));
  const invite = applications.filter((a) => a.status === "Shortlisted");
  const openJobs = jobs.filter((j) => !isExpired(j));
  const closing = openJobs
    .filter((j) => { const d = (new Date(j.closesAt).getTime() - Date.now()) / DAY; return d > 0 && d <= closingSoonDays; })
    .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
  const applicantsFor = (j: Job) => applications.filter((a) => a.jobId === j.id).length;
  const low = openJobs.filter((j) => {
    const d = (new Date(j.closesAt).getTime() - Date.now()) / DAY;
    return d > 0 && d <= 3 && applicantsFor(j) < 3;
  });
  return { pending, stale, invite, closing, low, applicantsFor };
}

/** Where each item takes HR: which tab, and which status filter to pre-apply. */
export const ATTENTION_TARGET: Record<AttentionFocus, { tab: "apps" | "jobs"; status?: string }> = {
  pending: { tab: "apps", status: "Pending" },
  stale:   { tab: "apps", status: "Pending" },
  invite:  { tab: "apps", status: "Shortlisted" },
  closing: { tab: "jobs" },
  low:     { tab: "jobs" },
};

const MAX_ROW_STEPS = 5;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
// A no-op onEnter makes the spotlight wait a beat before measuring, so the
// tab it was just sent to has rendered its rows.
const settle = () => {};

export function buildAttentionSteps(focus: AttentionFocus, data: ReturnType<typeof computeAttention>, closingSoonDays = 7): TourStep[] {
  const { pending, stale, invite, closing, low, applicantsFor } = data;

  if (focus === "pending") {
    const first = pending[0];
    return [
      { target: '[data-attention="status-bar"]', onEnter: settle, title: plural(pending.length, "application awaiting first review", "applications awaiting first review"),
        body: "The list is filtered to Pending, so only applications nobody has screened yet are showing." },
      ...(first ? [{ target: `[data-app-row="${first.id}"]`, title: "Start here",
        body: `${first.candidateName ?? "This candidate"} applied for ${first.title} on ${first.date}. Click the row to open their CV and set a status.` }] : []),
    ];
  }

  if (focus === "stale") {
    return [
      { target: '[data-attention="status-bar"]', onEnter: settle, title: plural(stale.length, "application waiting over 7 days", "applications waiting over 7 days"),
        body: `These are still Pending a week or more after the candidate applied. The ${Math.min(stale.length, MAX_ROW_STEPS)} longest waits are next.` },
      ...stale.slice(0, MAX_ROW_STEPS).map((a) => ({
        target: `[data-app-row="${a.id}"]`,
        title: `Waiting ${daysAgo(a.date)} days`,
        body: `${a.candidateName ?? "Candidate"} applied for ${a.title} on ${a.date} and hasn't been reviewed. Click the row to open it.`,
      })),
    ];
  }

  if (focus === "invite") {
    const first = invite[0];
    return [
      { target: '[data-attention="status-bar"]', onEnter: settle, title: plural(invite.length, "shortlisted candidate to invite", "shortlisted candidates to invite"),
        body: "The list is filtered to Shortlisted. These candidates passed screening and are waiting to be moved on to interview." },
      ...(first ? [{ target: `[data-app-row="${first.id}"]`, title: "Open a candidate",
        body: `Click ${first.candidateName ?? "the candidate"} (${first.title}) to review their CV and move them to Interview.` }] : []),
    ];
  }

  const jobsList = focus === "closing" ? closing : low;
  return jobsList.slice(0, MAX_ROW_STEPS + 1).map((j, i) => {
    const n = applicantsFor(j);
    const left = daysUntil(j.closesAt);
    return {
      target: `[data-job-row="${j.id}"]`,
      onEnter: i === 0 ? settle : undefined,
      title: `${j.title} closes in ${plural(left, "day", "days")}`,
      body: focus === "closing"
        ? `Closing within ${closingSoonDays} days with ${plural(n, "applicant", "applicants")} so far. Use Apps to start screening, or Edit to extend the closing date.`
        : `Only ${plural(n, "applicant", "applicants")} with ${plural(left, "day", "days")} left. Use Edit to extend the closing date and give more candidates time to apply.`,
    };
  });
}
