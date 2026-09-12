import { useState } from "react";
import { X, Zap } from "lucide-react";
import { useApp, type Job, type JobCriteria } from "@/app/providers/AppContext";
import { assessments as assessmentsApi, type AssessmentKind } from "@/services/api/client";
import { useModalA11y } from "@/hooks/useModalA11y";
import { toOffsetIso, fi } from "./shared";
import { TYPE_LABELS, ALL_TYPES, typesForJob } from "./AssessmentTab";

export type InviteCandidate = { applicationId: number; candidateName?: string; candidateEmail?: string };

interface Props {
  job: Job | undefined;
  criteria: JobCriteria[];
  candidates: InviteCandidate[];
  onClose: () => void;
  onDone: (result: { ok: number; fail: number }) => void;
  logAction?: (action: string, target?: string) => void;
}

/**
 * Shared entry point into the assessment system from either shortlisting
 * stage — scheduling here (assessmentsApi.schedule, same call the Assessment
 * Schedule tab's own batch view makes) both books the assessment and moves
 * each candidate's status to "Assessment Scheduled" server-side, which is
 * also what queues their real notification email (Phase 6 outbox pattern).
 * One modal, reused from the post-Shortlist-1 decision banner and from
 * Shortlisted II's auto-shortlist-by-score action.
 */
export function AssessmentInviteModal({ job, criteria, candidates, onClose, onDone, logAction }: Props) {
  const { pushToast } = useApp();
  const types = typesForJob(job?.id, criteria);
  const options = types.length > 0 ? types : ALL_TYPES;
  const [type, setType] = useState<AssessmentKind>(options[0] ?? "interview");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [running, setRunning] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>(onClose);

  const send = async () => {
    if (!scheduledAt) { pushToast({ type: "warning", title: "Pick a date and time" }); return; }
    setRunning(true);
    let ok = 0, fail = 0;
    const iso = toOffsetIso(scheduledAt);
    for (const c of candidates) {
      try {
        const r = await assessmentsApi.schedule(c.applicationId, type, { scheduledAt: iso, venue: venue || undefined });
        if (r.success) ok++; else fail++;
      } catch {
        fail++;
      }
    }
    logAction?.(`Invited ${ok} candidate(s) to ${TYPE_LABELS[type]} assessment`, job?.title);
    pushToast(fail === 0
      ? { type: "success", title: `${TYPE_LABELS[type]} assessment invitations sent`, message: `${ok} candidate${ok !== 1 ? "s" : ""} notified by email.` }
      : { type: "warning", title: `Sent ${ok}, failed ${fail}`, message: "Check the affected candidates individually in the Assessment Schedule tab." });
    setRunning(false);
    onDone({ ok, fail });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Invite candidates to assessment" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg text-caa-body">Invite to assessment</h2>
          <button onClick={onClose} aria-label="Close" className="text-caa-muted hover:text-caa-body">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-caa-muted mb-4">
          {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} will be scheduled and notified by email.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Assessment type</label>
            <select className={fi} value={type} onChange={(e) => setType(e.target.value as AssessmentKind)}>
              {options.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Date &amp; time</label>
            <input type="datetime-local" className={fi} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Venue (optional)</label>
            <input className={fi} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. UCAA HQ, Boardroom 2" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-caa-border text-caa-body rounded-lg text-sm hover:bg-caa-surface">
            Cancel
          </button>
          <button onClick={send} disabled={running} className="flex-1 py-2.5 bg-caa-navy text-white rounded-lg text-sm font-semibold hover:bg-caa-navy-2 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" /> {running ? "Sending…" : "Send invitations"}
          </button>
        </div>
      </div>
    </div>
  );
}
