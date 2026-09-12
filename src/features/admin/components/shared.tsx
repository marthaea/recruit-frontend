import { useState, useRef, useEffect } from "react";
import {
  screeningAnswerPasses, type Job, type Application, type JobCriteria,
} from "@/app/providers/AppContext";
import { audit as auditApi } from "@/services/api/client";

// ─── Staff picklists (form labels — directory data comes from GET /api/staff) ─

export const DEPT_LIST = ["Air Traffic Mgmt", "Aviation Safety", "Finance & Admin", "ICT & Systems", "Legal", "Operations", "Human Resources", "Procurement", "Engineering", "Communications"];
export const POSITIONS = ["Director", "Manager", "Senior Officer", "Officer", "Analyst", "Coordinator", "Specialist", "Assistant"];

// ─── Colors ───────────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b", "Under Review": "#3b82f6", Shortlisted: "#10b981",
  Interview: "#8b5cf6",
  "Assessment Scheduled": "#0ea5e9", "Assessment Complete": "#6366f1",
  "Shortlisted II": "#14b8a6",
  Offered: "#0d9488", Declined: "#ef4444",
};

export function AnimatedSection({ children, delay = 0, className = "", ...rest }: { children: React.ReactNode; delay?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(18px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────




export function buildEmail(status: string, candidateName: string, jobTitle: string): { subject: string; body: string } {
  const ref = `UCAA/HR/${new Date().getFullYear()}`;
  const sign = `\n\nYours sincerely,\nHuman Resources Department\nUganda Civil Aviation Authority\nTel: +256 312 352 000  |  hr@caa.go.ug  |  www.caa.go.ug\n\nThis email was sent from the UCAA e-Recruitment Portal. UCAA does not charge fees at any stage of recruitment.`;

  switch (status) {
    case "Shortlisted":
      return {
        subject: `Shortlist Notification — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nWe are pleased to inform you that your application for the position of ${jobTitle} at the Uganda Civil Aviation Authority (UCAA) has been reviewed and you have been shortlisted for further consideration in our selection process.\n\nYou will be contacted shortly with details regarding the next steps. Please ensure your contact information is up to date on the UCAA e-Recruitment Portal.${sign}`,
      };
    case "Interview":
      return {
        subject: `Invitation for Oral Interview — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nFollowing a successful review of your application for the position of ${jobTitle}, we are pleased to invite you for an Oral Interview with the Uganda Civil Aviation Authority.\n\nInterview scheduling details will be communicated to you separately. Please confirm your availability by responding to this email within three (3) working days.\n\nKindly come prepared with:\n  • Original academic certificates and transcripts\n  • National Identity Card (NIN)\n  • Two recent passport-size photographs\n  • A copy of your submitted application${sign}`,
      };
    case "Assessment Scheduled":
      return {
        subject: `Assessment Scheduled — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nFollowing your oral interview for the position of ${jobTitle}, you have been scheduled for the next stage of assessment.\n\nDetails of the date, time, and venue will be communicated to you separately. Please ensure you are available and come prepared as instructed.${sign}`,
      };
    case "Assessment Complete":
      return {
        subject: `Assessment Completed — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nThank you for completing your assessment for the position of ${jobTitle}. Your results are now being reviewed by the selection panel.\n\nYou will be notified of the outcome in due course. Please log in to the UCAA e-Recruitment Portal to track your application status.${sign}`,
      };
    case "Shortlisted II":
      return {
        subject: `Further Shortlisting Notification — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nFollowing a further review of applications for the position of ${jobTitle}, we are pleased to inform you that you remain under consideration and are progressing to the next stage of our selection process.\n\nYou will be contacted shortly with further details, including interview arrangements where applicable.${sign}`,
      };
    case "Offered":
      return {
        subject: `Offer of Employment — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nFollowing your successful performance throughout the selection process, the Uganda Civil Aviation Authority is pleased to offer you the position of ${jobTitle}.\n\nA formal offer letter detailing your terms and conditions of employment will be delivered to you separately. Kindly review it and respond within five (5) working days of receipt.\n\nWe look forward to welcoming you to the CAA Uganda family.${sign}`,
      };
    case "Declined":
      return {
        subject: `Application Outcome — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nThank you for your interest in the position of ${jobTitle} at the Uganda Civil Aviation Authority and for the time and effort you invested in your application.\n\nAfter careful consideration of all applications received, we regret to inform you that your application has not been successful on this occasion. We encourage you to watch our portal for future opportunities.\n\nWe wish you every success in your career endeavours.${sign}`,
      };
    default:
      return {
        subject: `Application Update — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nThe status of your application for the position of ${jobTitle} has been updated to: ${status}.\n\nPlease log in to the UCAA e-Recruitment Portal for details.${sign}`,
      };
  }
}

// ─── Date/time offset helpers ──────────────────────────────────────────────────
// `<input type="datetime-local">` yields a plain "YYYY-MM-DDTHH:mm" string with
// no timezone offset; the backend requires a full ISO-8601 offset (it parses
// with Java's OffsetDateTime.parse, which throws on anything without one — this
// was the actual cause of assessment scheduling/rescheduling always failing).
// These convert using the browser's own local offset in both directions, so a
// round trip (save, reload, redisplay) always shows the same wall-clock time
// the user entered, not a UTC-shifted one.

export function toOffsetIso(localValue: string): string {
  const d = new Date(localValue);
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  const seconds = localValue.length > 16 ? "" : ":00";
  return `${localValue}${seconds}${sign}${oh}:${om}`;
}

export function fromOffsetIso(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Applications ─────────────────────────────────────────────────────────────

const QUAL_ORDER: Record<string, number> = {
  "O-Level": 0, "A-Level": 1, Certificate: 2, Diploma: 3, Degree: 4, Postgraduate: 5, Masters: 6, PhD: 7,
};

export function autoQualify(app: Application, job: Job | undefined, cv: any, jobCriteria: JobCriteria | undefined): { ok: boolean; checks: { label: string; pass: boolean; detail: string }[] } {
  if (!job) return { ok: false, checks: [] };
  const checks = [];

  // Effective qualification/experience requirement — a criteria override
  // takes precedence over the job's own default when set. Previously these
  // overrides (requiredQualLevel/minExperienceYears) were collected in
  // Criteria Setup but silently ignored by every screening path.
  const effectiveQual = jobCriteria?.requiredQualLevel ?? job.requiredQualification;
  const effectiveExp = jobCriteria?.minExperienceYears ?? job.requiredExperience;

  if (cv) {
    // ── Full CV-based evaluation (portal CV on file) ────────────────────

    // Age
    const age = Math.floor((Date.now() - new Date(cv.personal.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    checks.push({ label: "Age", pass: age >= job.minAge, detail: `Age ${age} vs min ${job.minAge}` });

    // Qualification
    const highestQual = cv.highestLevel || cv.qualifications?.[0]?.level || "";
    const qualOk = (QUAL_ORDER[highestQual] ?? -1) >= (QUAL_ORDER[effectiveQual] ?? 0);
    checks.push({ label: "Qualification", pass: qualOk, detail: `${highestQual || "Unknown"} vs required ${effectiveQual}` });

    // Experience
    const expYears = cv.experience?.length
      ? cv.experience.reduce((sum: number, e: any) => {
          if (!e.start || !e.end) return sum + 1;
          return sum + Math.max(0, new Date(e.end).getFullYear() - new Date(e.start).getFullYear());
        }, 0)
      : 0;
    checks.push({ label: "Experience", pass: expYears >= effectiveExp, detail: `~${expYears} yr(s) vs required ${effectiveExp}` });

    // CGPA
    if (jobCriteria?.minCgpa !== undefined && app.cgpa !== undefined) {
      checks.push({ label: "CGPA", pass: app.cgpa >= jobCriteria.minCgpa, detail: `${app.cgpa.toFixed(1)} vs min ${jobCriteria.minCgpa.toFixed(1)}` });
    }

    // Disqualifying universities — previously only enforced once, server-side,
    // at initial submission; now also checked here so re-screening and the
    // per-candidate detail view reflect it too.
    if (jobCriteria?.disqualifyingUniversities?.length) {
      const candidateUni = app.university || cv.qualifications?.[0]?.institution || "";
      const flagged = candidateUni && jobCriteria.disqualifyingUniversities.some((u) => candidateUni.toLowerCase().includes(u.toLowerCase()));
      checks.push({ label: "Institution", pass: !flagged, detail: flagged ? `${candidateUni} is on the disqualifying list` : "Not on the disqualifying list" });
    }

    // Keywords
    if (jobCriteria?.requiredKeywords?.length) {
      const cvText = JSON.stringify(cv).toLowerCase();
      const missing = jobCriteria.requiredKeywords.filter((k) => !cvText.includes(k.toLowerCase()));
      checks.push({ label: "Keywords", pass: missing.length === 0, detail: missing.length === 0 ? "All matched" : `Missing: ${missing.join(", ")}` });
    }

    // Screening questions — precise answer check when the candidate answered on the
    // application form (kind set); legacy text-only questions fall back to CV keyword matching.
    if (jobCriteria?.screeningQuestions?.length) {
      const cvText = JSON.stringify(cv).toLowerCase();
      for (const q of jobCriteria.screeningQuestions) {
        const qLabel = `${q.type === "qualifier" ? "Q" : "⚠"}: ${q.text.slice(0, 35)}${q.text.length > 35 ? "…" : ""}`;
        if (q.kind) {
          const answer = app.screeningAnswers?.[q.id];
          const pass = screeningAnswerPasses(q, answer);
          checks.push({ label: qLabel, pass, detail: answer ? `Answered "${answer}" — ${pass ? "meets" : "does not meet"} requirement` : "Not answered" });
          continue;
        }
        const words = q.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
        const matched = words.length > 0 && words.some((w) => cvText.includes(w));
        if (q.type === "qualifier") {
          checks.push({ label: qLabel, pass: matched, detail: matched ? "Evidence found in CV" : "No evidence in CV" });
        } else {
          checks.push({ label: qLabel, pass: !matched, detail: !matched ? "Not flagged" : "Disqualifying match found" });
        }
      }
    }
  } else {
    checks.push({
      label: "Portal CV",
      pass: false,
      detail: "No CV on file — fetch candidate profiles from the server before screening",
    });

    if (jobCriteria?.minCgpa !== undefined && app.cgpa !== undefined) {
      checks.push({ label: "CGPA", pass: app.cgpa >= jobCriteria.minCgpa, detail: `${app.cgpa.toFixed(1)} vs min ${jobCriteria.minCgpa.toFixed(1)}` });
    }

    if (jobCriteria?.disqualifyingUniversities?.length && app.university) {
      const flagged = jobCriteria.disqualifyingUniversities.some((u) => app.university!.toLowerCase().includes(u.toLowerCase()));
      checks.push({ label: "Institution", pass: !flagged, detail: flagged ? `${app.university} is on the disqualifying list` : "Not on the disqualifying list" });
    }

    if (jobCriteria?.screeningQuestions?.length) {
      for (const q of jobCriteria.screeningQuestions) {
        const qLabel = `${q.type === "qualifier" ? "Q" : "⚠"}: ${q.text.slice(0, 35)}${q.text.length > 35 ? "…" : ""}`;
        const answer = app.screeningAnswers?.[q.id];
        if (q.kind) {
          const pass = screeningAnswerPasses(q, answer);
          checks.push({ label: qLabel, pass, detail: answer ? `Answered "${answer}" — ${pass ? "meets" : "does not meet"} requirement` : "Not answered" });
        } else {
          checks.push({ label: qLabel, pass: false, detail: "Requires CV evidence — not available" });
        }
      }
    }
  }

  return { ok: checks.length > 0 && checks.every((c) => c.pass), checks };
}

export type ScreeningResult = { app: Application; ok: boolean; checks: { label: string; pass: boolean; detail: string }[] };

// ─── Accountability / audit reporting ──────────────────────────────────────────
// Writes a single, server-stored audit entry per confirmed screening run —
// who ran it, what threshold/criteria was used, and a per-candidate
// qualify/disqualify reason — so the Shortlisting Reports view can be built
// from tamper-evident backend data instead of reconstructing "why" after the
// fact. Best-effort: a failure here must never block the screening itself,
// since the candidate status changes have already been applied.
export type ScreeningAuditCandidate = {
  id: number; name?: string; email?: string; jobId?: number; jobTitle?: string;
  decision: "Shortlisted" | "Declined"; reasons: string[];
};

export async function logScreeningRun(params: {
  action: string;
  jobId?: number;
  jobTitle?: string;
  threshold?: Record<string, unknown>;
  candidates: ScreeningAuditCandidate[];
}) {
  const total = params.candidates.length;
  const qualified = params.candidates.filter((c) => c.decision === "Shortlisted").length;
  const disqualified = total - qualified;
  const metadata = {
    kind: "shortlisting-run",
    jobId: params.jobId ?? null,
    jobTitle: params.jobTitle ?? null,
    threshold: params.threshold ?? null,
    stats: { total, qualified, disqualified, qualifiedPct: total > 0 ? Math.round((qualified / total) * 1000) / 10 : 0 },
    candidates: params.candidates,
  };
  try {
    await auditApi.create({ action: params.action, target: params.jobTitle ?? `${total} candidate${total !== 1 ? "s" : ""}`, metadata });
  } catch {
    // Non-fatal — see comment above.
  }
}


export const fi = "w-full px-2.5 py-1.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy bg-white";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-caa-body mb-1">{label}</label>{children}</div>;
}
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy mb-3 pb-2 border-b border-caa-border">{title}</p><div className="space-y-3">{children}</div></div>;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {icon && <div className="text-caa-light mb-3 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>}
      <p className="text-sm font-semibold text-caa-body">{title}</p>
      {hint && <p className="text-xs text-caa-muted mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}
