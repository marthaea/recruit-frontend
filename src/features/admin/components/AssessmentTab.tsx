import { useState, useEffect } from "react";
import {
  Calendar, ClipboardCheck, CheckCircle2, XCircle, CheckSquare, Square, Users2, User,
} from "lucide-react";
import {
  useApp, type Application, type Job, type JobCriteria,
} from "@/app/providers/AppContext";
import { assessments as assessmentsApi, type Assessment, type AssessmentKind } from "@/services/api/client";
import { Field, fi, EmptyState, toOffsetIso, fromOffsetIso } from "./shared";

export const TYPE_LABELS: Record<AssessmentKind, string> = {
  written: "Written", psychometric: "Psychometric", interview: "Interview", practical: "Practical",
};
export const ALL_TYPES: AssessmentKind[] = ["written", "psychometric", "interview", "practical"];
const emptyDraft = { scheduledAt: "", venue: "", score: "", passed: "", notes: "" };

// The job's own criteria decides which assessment(s) a candidate actually
// needs: Assessment 1 is always required, Assessment 2 only if the job was
// configured with one. Jobs with no assessment plan configured yet fall back
// to showing all four types, so existing candidates aren't hidden.
export function typesForJob(jobId: number | undefined, criteria: JobCriteria[]): AssessmentKind[] {
  const plan = criteria.find((c) => c.jobId === jobId)?.assessmentTypes;
  if (!plan) return ALL_TYPES;
  return plan.assessment2 ? [plan.assessment1, plan.assessment2] : [plan.assessment1];
}

/**
 * One component, two modes — schedulers (Assessment Schedule nav item) set
 * date/venue; recorders (Candidate Assessment nav item) set the outcome.
 * Same underlying `assessments` rows either way, just different editable
 * fields, mirroring JobsTab's viewMode pattern. Within each mode, a view
 * toggle switches between the individual candidate workflow and a batch
 * workflow (filter by job, multi-select, apply to everyone at once).
 */
export function AssessmentTab({ jobs, applications, criteria, mode }: { jobs: Job[]; applications: Application[]; criteria: JobCriteria[]; mode: "schedule" | "record" }) {
  const { pushToast, logAction } = useApp();
  const relevant = applications.filter((a) =>
    ["Interview", "Assessment Scheduled", "Assessment Complete"].includes(a.status)
  );
  const [view, setView] = useState<"individual" | "batch">("individual");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-xl text-caa-body">{mode === "schedule" ? "Assessment Schedule" : "Candidate Assessment"}</h1>
          <p className="text-xs text-caa-muted mt-0.5">
            {mode === "schedule" ? "Set the date, time, and venue for each candidate's assessments." : "Record the outcome of each candidate's assessments."}
          </p>
        </div>
        <div className="flex rounded-md border border-caa-border overflow-hidden shrink-0">
          <button onClick={() => setView("individual")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === "individual" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-navy bg-white"}`}>
            <User className="h-3.5 w-3.5" /> Individual
          </button>
          <button onClick={() => setView("batch")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === "batch" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-navy bg-white"}`}>
            <Users2 className="h-3.5 w-3.5" /> Batch
          </button>
        </div>
      </div>

      {relevant.length === 0 ? (
        <EmptyState icon={<ClipboardCheck />} title="No candidates awaiting assessment" hint="Candidates appear here once they reach the Interview stage." />
      ) : view === "individual" ? (
        <IndividualView jobs={jobs} criteria={criteria} relevant={relevant} mode={mode} pushToast={pushToast} logAction={logAction} />
      ) : (
        <BatchView jobs={jobs} criteria={criteria} relevant={relevant} mode={mode} pushToast={pushToast} logAction={logAction} />
      )}
    </div>
  );
}

// ─── Individual workflow ────────────────────────────────────────────────────────

function IndividualView({ jobs, criteria, relevant, mode, pushToast, logAction }: {
  jobs: Job[]; criteria: JobCriteria[]; relevant: Application[]; mode: "schedule" | "record";
  pushToast: (t: any) => void; logAction: (a: string, t?: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(relevant[0]?.id ?? null);
  const [rows, setRows] = useState<Record<AssessmentKind, Assessment | null>>({ written: null, psychometric: null, interview: null, practical: null });
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<AssessmentKind, typeof emptyDraft>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, emptyDraft])) as any
  );
  const [saving, setSaving] = useState<AssessmentKind | null>(null);

  const selected = relevant.find((a) => a.id === selectedId) ?? null;
  const job = jobs.find((j) => j.id === selected?.jobId);
  const types = typesForJob(selected?.jobId, criteria);

  useEffect(() => {
    if (!selectedId) { setRows({ written: null, psychometric: null, interview: null, practical: null }); return; }
    setLoading(true);
    assessmentsApi.list(selectedId).then((r) => {
      if (!r.success) return;
      const byType: any = { written: null, psychometric: null, interview: null, practical: null };
      const nextDrafts: any = Object.fromEntries(ALL_TYPES.map((t) => [t, emptyDraft]));
      for (const row of r.data) {
        byType[row.type] = row;
        nextDrafts[row.type] = {
          scheduledAt: row.scheduledAt ? fromOffsetIso(row.scheduledAt) : "",
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

  const updDraft = (type: AssessmentKind, patch: Partial<typeof emptyDraft>) =>
    setDrafts((d) => ({ ...d, [type]: { ...d[type], ...patch } }));

  const saveSchedule = async (type: AssessmentKind) => {
    if (!selectedId) return;
    const d = drafts[type];
    if (!d.scheduledAt) { pushToast({ type: "warning", title: "Pick a date and time" }); return; }
    setSaving(type);
    try {
      const r = await assessmentsApi.schedule(selectedId, type, { scheduledAt: toOffsetIso(d.scheduledAt), venue: d.venue || undefined });
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
            {types.map((type, i) => {
              const row = rows[type];
              const d = drafts[type];
              return (
                <div key={type} className="border border-caa-border rounded-md p-3 bg-caa-surface/40">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-caa-body">
                      Assessment {i + 1} — {TYPE_LABELS[type]}
                    </p>
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
                        <Calendar className="h-3.5 w-3.5" /> {saving === type ? "Saving…" : row?.scheduledAt ? "Reschedule" : "Schedule"}
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
  );
}

// ─── Batch workflow ──────────────────────────────────────────────────────────────
// Filter by job (or work across all of them), multi-select candidates, and
// apply one assessment action to everyone selected at once — either the same
// date/time/venue (schedule mode) or one row of inputs per candidate saved
// together in one go (record mode, since outcomes can't be identical).

function BatchView({ jobs, criteria, relevant, mode, pushToast, logAction }: {
  jobs: Job[]; criteria: JobCriteria[]; relevant: Application[]; mode: "schedule" | "record";
  pushToast: (t: any) => void; logAction: (a: string, t?: string) => void;
}) {
  const [jobFilter, setJobFilter] = useState<number | "all">("all");
  const [type, setType] = useState<AssessmentKind>("interview");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [records, setRecords] = useState<Record<number, { score: string; passed: string; notes: string }>>({});
  const [running, setRunning] = useState(false);

  const filtered = jobFilter === "all" ? relevant : relevant.filter((a) => a.jobId === jobFilter);
  const jobsWithCandidates = jobs.filter((j) => relevant.some((a) => a.jobId === j.id));

  const toggle = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((a) => a.id)));
  const clearSelection = () => setSelected(new Set());

  const emptyRecord = { score: "", passed: "", notes: "" };
  const updRecord = (id: number, patch: Partial<typeof emptyRecord>) =>
    setRecords((r) => ({ ...r, [id]: { ...emptyRecord, ...r[id], ...patch } }));

  const runBatchSchedule = async () => {
    if (!scheduledAt) { pushToast({ type: "warning", title: "Pick a date and time" }); return; }
    if (selected.size === 0) { pushToast({ type: "warning", title: "Select at least one candidate" }); return; }
    setRunning(true);
    let ok = 0, fail = 0;
    const iso = toOffsetIso(scheduledAt);
    for (const id of selected) {
      try {
        const r = await assessmentsApi.schedule(id, type, { scheduledAt: iso, venue: venue || undefined });
        if (r.success) ok++; else fail++;
      } catch { fail++; }
    }
    logAction?.(`Batch-scheduled ${TYPE_LABELS[type]} assessment for ${ok} candidate(s)`);
    pushToast(fail === 0
      ? { type: "success", title: `${TYPE_LABELS[type]} assessment scheduled for ${ok} candidate${ok !== 1 ? "s" : ""}` }
      : { type: "warning", title: `Scheduled ${ok}, failed ${fail}`, message: "Check the affected candidates individually." });
    setRunning(false);
    clearSelection();
  };

  const runBatchRecord = async () => {
    const entries = Array.from(selected).map((id) => [id, records[id]] as const).filter(([, d]) => d && d.passed !== "");
    if (entries.length === 0) { pushToast({ type: "warning", title: "Select pass/fail for at least one candidate" }); return; }
    setRunning(true);
    let ok = 0, fail = 0;
    for (const [id, d] of entries) {
      try {
        const r = await assessmentsApi.record(id, type, {
          score: d.score !== "" ? parseFloat(d.score) : undefined,
          passed: d.passed === "yes",
          notes: d.notes || undefined,
        });
        if (r.success) ok++; else fail++;
      } catch { fail++; }
    }
    logAction?.(`Batch-recorded ${TYPE_LABELS[type]} assessment results for ${ok} candidate(s)`);
    pushToast(fail === 0
      ? { type: "success", title: `${TYPE_LABELS[type]} results recorded for ${ok} candidate${ok !== 1 ? "s" : ""}` }
      : { type: "warning", title: `Recorded ${ok}, failed ${fail}`, message: "Check the affected candidates individually." });
    setRunning(false);
    clearSelection();
    setRecords({});
  };

  return (
    <div className="space-y-4">
      <div className="caa-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Vacancy">
            <select className={fi} value={jobFilter} onChange={(e) => { setJobFilter(e.target.value === "all" ? "all" : Number(e.target.value)); clearSelection(); }}>
              <option value="all">All vacancies</option>
              {jobsWithCandidates.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </Field>
          <Field label="Assessment type">
            <select className={fi} value={type} onChange={(e) => setType(e.target.value as AssessmentKind)}>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button onClick={selectAllFiltered} className="px-3 py-1.5 text-xs font-semibold border border-caa-border rounded-md hover:border-caa-navy text-caa-body">
              Select all {filtered.length} shown
            </button>
            {selected.size > 0 && (
              <button onClick={clearSelection} className="px-3 py-1.5 text-xs border border-caa-border rounded-md text-caa-muted hover:text-caa-body">Clear</button>
            )}
          </div>
        </div>

        {mode === "schedule" && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end pt-1 border-t border-caa-border">
            <Field label="Date & time (applied to every selected candidate)"><input type="datetime-local" className={fi} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>
            <Field label="Venue"><input className={fi} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. HR Boardroom, HQ" /></Field>
            <button onClick={runBatchSchedule} disabled={running || selected.size === 0} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60 inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {running ? "Scheduling…" : `Schedule ${selected.size || ""}`}
            </button>
          </div>
        )}
      </div>

      <div className="caa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr>
              <th className="text-left p-3 w-8">
                <button onClick={() => (selected.size === filtered.length ? clearSelection() : selectAllFiltered())} title="Select all">
                  {filtered.length > 0 && selected.size === filtered.length ? <CheckSquare className="h-4 w-4 text-caa-navy" /> : <Square className="h-4 w-4 text-caa-muted" />}
                </button>
              </th>
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Vacancy</th>
              {mode === "record" && (
                <>
                  <th className="text-left p-3 w-24">Score</th>
                  <th className="text-left p-3 w-32">Outcome</th>
                  <th className="text-left p-3">Notes</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {filtered.map((a) => {
              const isSel = selected.has(a.id);
              const d = records[a.id] ?? { score: "", passed: "", notes: "" };
              return (
                <tr key={a.id} className={isSel ? "bg-caa-navy/4" : ""}>
                  <td className="p-3" onClick={() => toggle(a.id)}>
                    <button>{isSel ? <CheckSquare className="h-4 w-4 text-caa-navy" /> : <Square className="h-4 w-4 text-caa-muted" />}</button>
                  </td>
                  <td className="p-3 cursor-pointer" onClick={() => toggle(a.id)}>
                    <p className="font-medium text-caa-body">{a.candidateName ?? "Candidate"}</p>
                    <p className="text-[11px] text-caa-muted">{a.status}</p>
                  </td>
                  <td className="p-3 text-xs text-caa-muted">{a.title}</td>
                  {mode === "record" && (
                    <>
                      <td className="p-3"><input type="number" step="0.1" disabled={!isSel} className={fi} value={d.score} onChange={(e) => updRecord(a.id, { score: e.target.value })} /></td>
                      <td className="p-3">
                        <select disabled={!isSel} className={fi} value={d.passed} onChange={(e) => updRecord(a.id, { passed: e.target.value })}>
                          <option value="">Select…</option>
                          <option value="yes">Passed</option>
                          <option value="no">Failed</option>
                        </select>
                      </td>
                      <td className="p-3"><input disabled={!isSel} className={fi} value={d.notes} onChange={(e) => updRecord(a.id, { notes: e.target.value })} /></td>
                    </>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={mode === "record" ? 6 : 3}><EmptyState icon={<Users2 />} title="No candidates match this filter" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {mode === "record" && (
        <button onClick={runBatchRecord} disabled={running || selected.size === 0} className="px-4 py-2 text-sm font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60">
          {running ? "Saving…" : `Save ${selected.size || ""} result${selected.size !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
