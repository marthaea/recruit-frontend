import { useState, useEffect } from "react";
import {
  Calendar, ClipboardCheck, CheckCircle2, XCircle,
} from "lucide-react";
import {
  useApp, type Application, type Job,
} from "@/context/AppContext";
import { assessments as assessmentsApi, type Assessment, type AssessmentKind } from "@/lib/api/client";
import { Field, fi, EmptyState } from "./shared";

const TYPE_LABELS: Record<AssessmentKind, string> = {
  written: "Written", psychometric: "Psychometric", interview: "Interview", practical: "Practical",
};
const TYPES: AssessmentKind[] = ["written", "psychometric", "interview", "practical"];

/**
 * One component, two modes — schedulers (Assessment Schedule nav item) set
 * date/venue; recorders (Candidate Assessment nav item) set the outcome.
 * Same underlying `assessments` rows either way, just different editable
 * fields, mirroring JobsTab's viewMode pattern.
 */
export function AssessmentTab({ jobs, applications, mode }: { jobs: Job[]; applications: Application[]; mode: "schedule" | "record" }) {
  const { pushToast, logAction } = useApp();
  const relevant = applications.filter((a) =>
    ["Interview", "Assessment Scheduled", "Assessment Complete"].includes(a.status)
  );
  const [selectedId, setSelectedId] = useState<number | null>(relevant[0]?.id ?? null);
  const [rows, setRows] = useState<Record<AssessmentKind, Assessment | null>>({ written: null, psychometric: null, interview: null, practical: null });
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<AssessmentKind, { scheduledAt: string; venue: string; score: string; passed: string; notes: string }>>(
    Object.fromEntries(TYPES.map((t) => [t, { scheduledAt: "", venue: "", score: "", passed: "", notes: "" }])) as any
  );
  const [saving, setSaving] = useState<AssessmentKind | null>(null);

  const selected = relevant.find((a) => a.id === selectedId) ?? null;
  const job = jobs.find((j) => j.id === selected?.jobId);

  useEffect(() => {
    if (!selectedId) { setRows({ written: null, psychometric: null, interview: null, practical: null }); return; }
    setLoading(true);
    assessmentsApi.list(selectedId).then((r) => {
      if (!r.success) return;
      const byType: any = { written: null, psychometric: null, interview: null, practical: null };
      const nextDrafts: any = {};
      for (const t of TYPES) nextDrafts[t] = { scheduledAt: "", venue: "", score: "", passed: "", notes: "" };
      for (const row of r.data) {
        byType[row.type] = row;
        nextDrafts[row.type] = {
          scheduledAt: row.scheduledAt ? row.scheduledAt.slice(0, 16) : "",
          venue: row.venue ?? "",
          score: row.score != null ? String(row.score) : "",
          passed: row.passed == null ? "" : row.passed ? "yes" : "no",
          notes: row.notes ?? "",
        };
      }
      setRows(byType);
      setDrafts(nextDrafts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedId]);

  const updDraft = (type: AssessmentKind, patch: Partial<typeof drafts[AssessmentKind]>) =>
    setDrafts((d) => ({ ...d, [type]: { ...d[type], ...patch } }));

  const saveSchedule = async (type: AssessmentKind) => {
    if (!selectedId) return;
    const d = drafts[type];
    if (!d.scheduledAt) { pushToast({ type: "warning", title: "Pick a date and time" }); return; }
    setSaving(type);
    try {
      const r = await assessmentsApi.schedule(selectedId, type, { scheduledAt: d.scheduledAt, venue: d.venue || undefined });
      if (r.success) {
        setRows((rw) => ({ ...rw, [type]: r.data }));
        logAction?.(`Scheduled ${TYPE_LABELS[type]} assessment`, selected?.candidateName);
        pushToast({ type: "success", title: `${TYPE_LABELS[type]} assessment scheduled` });
      }
    } catch (err) {
      pushToast({ type: "warning", title: "Could not schedule assessment", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSaving(null);
    }
  };

  const saveResult = async (type: AssessmentKind) => {
    if (!selectedId) return;
    const d = drafts[type];
    if (d.passed === "") { pushToast({ type: "warning", title: "Select pass or fail" }); return; }
    setSaving(type);
    try {
      const r = await assessmentsApi.record(selectedId, type, {
        score: d.score !== "" ? parseFloat(d.score) : undefined,
        passed: d.passed === "yes",
        notes: d.notes || undefined,
      });
      if (r.success) {
        setRows((rw) => ({ ...rw, [type]: r.data }));
        logAction?.(`Recorded ${TYPE_LABELS[type]} assessment result`, selected?.candidateName);
        pushToast({ type: "success", title: `${TYPE_LABELS[type]} result recorded` });
      }
    } catch (err) {
      pushToast({ type: "warning", title: "Could not record result", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-xl text-caa-body">{mode === "schedule" ? "Assessment Schedule" : "Candidate Assessment"}</h1>
        <p className="text-xs text-caa-muted mt-0.5">
          {mode === "schedule" ? "Set the date, time, and venue for each candidate's assessments." : "Record the outcome of each candidate's assessments."}
        </p>
      </div>

      {relevant.length === 0 ? (
        <EmptyState icon={<ClipboardCheck />} title="No candidates awaiting assessment" hint="Candidates appear here once they reach the Interview stage." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="caa-card overflow-hidden">
            <div className="divide-y divide-caa-border max-h-[560px] overflow-y-auto">
              {relevant.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm ${selectedId === a.id ? "bg-caa-navy/8" : "hover:bg-caa-surface"}`}
                >
                  <p className="font-medium text-caa-body truncate">{a.candidateName ?? "Candidate"}</p>
                  <p className="text-[11px] text-caa-muted truncate">{a.title} · {a.status}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="caa-card p-4">
            {!selected ? (
              <p className="text-sm text-caa-muted">Select a candidate to continue.</p>
            ) : loading ? (
              <p className="text-sm text-caa-muted">Loading…</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-caa-body">{selected.candidateName}</p>
                  <p className="text-xs text-caa-muted">{selected.title} · {job?.dept ?? selected.dept}</p>
                </div>
                {TYPES.map((type) => {
                  const row = rows[type];
                  const d = drafts[type];
                  return (
                    <div key={type} className="border border-caa-border rounded-md p-3 bg-caa-surface/40">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-caa-body">{TYPE_LABELS[type]} Assessment</p>
                        {row?.passed != null && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.passed ? "bg-caa-success/10 text-caa-success" : "bg-caa-danger/10 text-caa-danger"}`}>
                            {row.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {row.passed ? "Passed" : "Failed"}
                          </span>
                        )}
                      </div>

                      {mode === "schedule" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                          <Field label="Date & time"><input type="datetime-local" className={fi} value={d.scheduledAt} onChange={(e) => updDraft(type, { scheduledAt: e.target.value })} /></Field>
                          <Field label="Venue"><input className={fi} value={d.venue} onChange={(e) => updDraft(type, { venue: e.target.value })} placeholder="e.g. HR Boardroom, HQ" /></Field>
                          <button onClick={() => saveSchedule(type)} disabled={saving === type} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60 inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" /> {saving === type ? "Saving…" : "Schedule"}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {!row?.scheduledAt ? (
                            <p className="text-xs text-caa-muted">Not yet scheduled.</p>
                          ) : (
                            <>
                              <p className="text-[11px] text-caa-muted">Scheduled: {new Date(row.scheduledAt).toLocaleString()} {row.venue ? `· ${row.venue}` : ""}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-[100px_140px_1fr] gap-2">
                                <Field label="Score"><input type="number" step="0.1" className={fi} value={d.score} onChange={(e) => updDraft(type, { score: e.target.value })} /></Field>
                                <Field label="Outcome">
                                  <select className={fi} value={d.passed} onChange={(e) => updDraft(type, { passed: e.target.value })}>
                                    <option value="">Select…</option>
                                    <option value="yes">Passed</option>
                                    <option value="no">Failed</option>
                                  </select>
                                </Field>
                                <Field label="Notes"><input className={fi} value={d.notes} onChange={(e) => updDraft(type, { notes: e.target.value })} /></Field>
                              </div>
                              <button onClick={() => saveResult(type)} disabled={saving === type} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60">
                                {saving === type ? "Saving…" : "Save result"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
