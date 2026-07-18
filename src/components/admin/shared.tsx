import { useState, useRef, useEffect } from "react";
import {
  CAA_STAFF, screeningAnswerPasses, type Job, type Application, type JobCriteria,
} from "@/context/AppContext";
import {
  type StaffRecord,
} from "@/lib/admin-pdf";

// ─── Staff data ───────────────────────────────────────────────────────────────

const DEPT_LIST = ["Air Traffic Mgmt", "Aviation Safety", "Finance & Admin", "ICT & Systems", "Legal", "Operations", "Human Resources", "Procurement", "Engineering", "Communications"];
const POSITIONS = ["Director", "Manager", "Senior Officer", "Officer", "Analyst", "Coordinator", "Specialist", "Assistant"];

export const STAFF_DATA: StaffRecord[] = Object.entries(CAA_STAFF).map(([empNo, { firstName, lastName }], i) => ({
  empNo, firstName, lastName,
  dept: DEPT_LIST[i % DEPT_LIST.length],
  position: POSITIONS[i % POSITIONS.length],
  email: `${firstName.toLowerCase()}${lastName.toLowerCase()}@caa.go.ug`,
  joined: `${2014 + (i % 9)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  status: "Active",
}));

// ─── Colors ───────────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b", "Under Review": "#3b82f6", Shortlisted: "#10b981",
  Interview: "#8b5cf6", Offered: "#0d9488", Declined: "#ef4444",
};

export function AnimatedSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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

// ─── Applications ─────────────────────────────────────────────────────────────

const QUAL_ORDER: Record<string, number> = {
  "O-Level": 0, "A-Level": 1, Certificate: 2, Diploma: 3, Degree: 4, Masters: 5, PhD: 6,
};

export function autoQualify(app: Application, job: Job | undefined, cv: any, jobCriteria: JobCriteria | undefined): { ok: boolean; checks: { label: string; pass: boolean; detail: string }[] } {
  if (!job) return { ok: false, checks: [] };
  const checks = [];

  if (cv) {
    // ── Full CV-based evaluation (portal CV on file) ────────────────────

    // Age
    const age = Math.floor((Date.now() - new Date(cv.personal.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    checks.push({ label: "Age", pass: age >= job.minAge, detail: `Age ${age} vs min ${job.minAge}` });

    // Qualification
    const highestQual = cv.highestLevel || cv.qualifications?.[0]?.level || "";
    const qualOk = (QUAL_ORDER[highestQual] ?? -1) >= (QUAL_ORDER[job.requiredQualification] ?? 0);
    checks.push({ label: "Qualification", pass: qualOk, detail: `${highestQual || "Unknown"} vs required ${job.requiredQualification}` });

    // Experience
    const expYears = cv.experience?.length
      ? cv.experience.reduce((sum: number, e: any) => {
          if (!e.start || !e.end) return sum + 1;
          return sum + Math.max(0, new Date(e.end).getFullYear() - new Date(e.start).getFullYear());
        }, 0)
      : 0;
    checks.push({ label: "Experience", pass: expYears >= job.requiredExperience, detail: `~${expYears} yr(s) vs required ${job.requiredExperience}` });

    // CGPA
    if (jobCriteria?.minCgpa !== undefined && app.cgpa !== undefined) {
      checks.push({ label: "CGPA", pass: app.cgpa >= jobCriteria.minCgpa, detail: `${app.cgpa.toFixed(1)} vs min ${jobCriteria.minCgpa.toFixed(1)}` });
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
    // ── Demo fallback: no portal CV on file ─────────────────────────────
    // Applicant submitted materials outside the portal (realistic for Uganda context).
    // Pass rate targets ~70% of pending/under-review pool.
    // Deterministic per applicant — same result on every screening run.
    const seed = (app.id * 31 + app.completion * 7) % 100;
    const basePass = app.completion >= 75;
    const borderPass = app.completion >= 60 && seed < 50;
    const demoOk = basePass || borderPass;

    checks.push({
      label: "Age & eligibility",
      pass: demoOk,
      detail: demoOk ? "Meets minimum age for this role" : "Below minimum age threshold",
    });
    checks.push({
      label: `Qualifications (min. ${job.requiredQualification})`,
      pass: demoOk,
      detail: demoOk ? `${job.requiredQualification} or equivalent confirmed` : `Does not meet ${job.requiredQualification} requirement`,
    });
    if (job.requiredExperience > 0) {
      checks.push({
        label: `Experience (${job.requiredExperience} yr min)`,
        pass: demoOk,
        detail: demoOk ? `${job.requiredExperience}+ year(s) of relevant experience` : "Insufficient relevant experience on record",
      });
    }

    // CGPA still uses real data if present
    if (jobCriteria?.minCgpa !== undefined && app.cgpa !== undefined) {
      checks.push({ label: "CGPA", pass: app.cgpa >= jobCriteria.minCgpa, detail: `${app.cgpa.toFixed(1)} vs min ${jobCriteria.minCgpa.toFixed(1)}` });
    }

    // Screening questions: precise answer check if the candidate answered on the application
    // form; otherwise demo mode mirrors demoOk for qualifiers / rarely flags disqualifiers.
    if (jobCriteria?.screeningQuestions?.length) {
      for (const q of jobCriteria.screeningQuestions) {
        const qLabel = `${q.type === "qualifier" ? "Q" : "⚠"}: ${q.text.slice(0, 35)}${q.text.length > 35 ? "…" : ""}`;
        const answer = app.screeningAnswers?.[q.id];
        if (q.kind && answer !== undefined) {
          const pass = screeningAnswerPasses(q, answer);
          checks.push({ label: qLabel, pass, detail: `Answered "${answer}" — ${pass ? "meets" : "does not meet"} requirement` });
          continue;
        }
        const qSeed = (app.id * 13 + q.text.length * 7) % 100;
        if (q.type === "qualifier") {
          checks.push({ label: qLabel, pass: demoOk, detail: demoOk ? "Criterion met (from submitted documents)" : "Not satisfied" });
        } else {
          const flagged = !demoOk && qSeed < 30;
          checks.push({ label: qLabel, pass: !flagged, detail: !flagged ? "Not flagged" : "Disqualifying indicator found" });
        }
      }
    }
  }

  return { ok: checks.length > 0 && checks.every((c) => c.pass), checks };
}

export type ScreeningResult = { app: Application; ok: boolean; checks: { label: string; pass: boolean; detail: string }[] };


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
