import { useState, useEffect, useCallback } from "react";
import { Download, FileDown, Upload, RefreshCw, Zap, FileText } from "lucide-react";
import { useApp, type Job, type Application } from "@/context/AppContext";
import { candidateScores as scoresApi, type CandidateScoreSummary } from "@/lib/api/client";
import { downloadCandidateCv } from "@/lib/admin-pdf";
import { downloadCsv } from "@/lib/csv-export";
import { fi } from "./shared";

// Shortlisted II is the CV-scoring stage: multiple admins/panelists each
// score+comment a candidate independently (candidate_scores table, one row
// per scorer — unlike the Phase 2b `assessments` table this doesn't
// overwrite between reviewers), the system averages them, and "Auto-shortlist
// by score" advances the strongest candidates to Interview.
export function CandidateScoringPanel({ jobs, applications, jobId, cvStore, actor, bulkUpdateStatus, logAction, onSelectJob, onClearJob }: any) {
  const { pushToast, auth, loadCvsForEmails } = useApp();
  const [rows, setRows] = useState<CandidateScoreSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [drafts, setDrafts] = useState<Record<number, { score: string; comment: string }>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const job = jobs.find((j: Job) => j.id === jobId);

  const load = useCallback(() => {
    if (!jobId) return;
    setLoading(true);
    scoresApi.summary({ jobId, status: "Shortlisted II" }).then((r) => {
      if (r.success) {
        const summary = r.data as unknown as CandidateScoreSummary[];
        setRows(summary);
        setDrafts({});
        // See ApplicationsTab.tsx — cvStore is never populated for a real
        // candidate's CV without an on-demand fetch like this.
        loadCvsForEmails(summary.map((row) => row.candidateEmail).filter(Boolean));
      }
    }).catch(() => {
      pushToast({ type: "warning", title: "Could not load scores", message: "Please try again." });
    }).finally(() => setLoading(false));
  }, [jobId, pushToast]);

  useEffect(() => { load(); }, [load]);

  if (!jobId) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="font-bold text-xl text-caa-body">Shortlisted II — Panel Scoring</h1>
          <p className="text-xs text-caa-muted mt-0.5">Select a vacancy with candidates at the Shortlisted II stage.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((j: Job) => {
            const count = applications.filter((a: Application) => a.jobId === j.id && a.status === "Shortlisted II").length;
            return (
              <button key={j.id} onClick={() => onSelectJob(j.id)} className="caa-card p-4 text-left hover:border-caa-navy transition-colors">
                <p className="font-semibold text-sm text-caa-body">{j.title}</p>
                <p className="text-[11px] text-caa-muted mt-1">{j.dept}</p>
                <p className="text-xs font-semibold text-caa-navy mt-2">{count} at Shortlisted II</p>
              </button>
            );
          })}
          {jobs.length === 0 && <p className="text-xs text-caa-muted">No job listings yet.</p>}
        </div>
      </div>
    );
  }

  const draftFor = (appId: number) => {
    if (drafts[appId]) return drafts[appId];
    const row = rows.find((r) => r.applicationId === appId);
    const mine = row?.scores.find((s) => s.scorerEmail?.toLowerCase() === auth.email.toLowerCase());
    return { score: mine ? String(mine.score) : "", comment: mine?.comment ?? "" };
  };

  const saveScore = async (appId: number) => {
    const d = draftFor(appId);
    const score = parseFloat(d.score);
    if (Number.isNaN(score)) { pushToast({ type: "warning", title: "Enter a numeric score first" }); return; }
    setSaving(appId);
    try {
      await scoresApi.save(appId, { score, comment: d.comment || undefined });
      logAction(`Scored candidate #${appId}`, `${score}`);
      load();
    } catch (err) {
      pushToast({ type: "warning", title: "Could not save score", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSaving(null);
    }
  };

  const scored = rows.filter((r) => r.average !== null);
  const runAutoShortlist = () => {
    if (scored.length === 0) return;
    const advance = scored.filter((r) => (r.average ?? 0) >= threshold);
    const decline = scored.filter((r) => (r.average ?? 0) < threshold);
    bulkUpdateStatus([
      ...advance.map((r) => ({ id: r.applicationId, status: "Interview" as const })),
      ...decline.map((r) => ({ id: r.applicationId, status: "Declined" as const })),
    ]);
    logAction(`Auto-shortlisted by score (≥${threshold}) — ${advance.length} advanced to Interview, ${decline.length} declined`, job?.title);
    pushToast({ type: "success", title: "Auto-shortlist applied", message: `${advance.length} advanced, ${decline.length} declined.` });
    load();
  };

  const exportForOfflineScoring = () => {
    downloadCsv(`caa-scoring-${job?.abbr ?? jobId}`, ["Application ID", "Candidate", "Email", "Score", "Comment"],
      rows.map((r) => [r.applicationId, r.candidateName, r.candidateEmail, r.average ?? "", ""]));
  };

  const importScores = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const dataLines = lines.slice(1); // skip header
      let saved = 0;
      for (const line of dataLines) {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
        const [appIdStr, , , scoreStr, comment] = cols;
        const appId = parseInt(appIdStr);
        const score = parseFloat(scoreStr);
        if (!appId || Number.isNaN(score)) continue;
        await scoresApi.save(appId, { score, comment: comment || undefined });
        saved++;
      }
      pushToast({ type: "success", title: "Scores imported", message: `${saved} score(s) saved.` });
      load();
    } catch {
      pushToast({ type: "warning", title: "Import failed", message: "Check the file format and try again." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {onClearJob && <button onClick={onClearJob} className="text-[11px] font-semibold text-caa-navy hover:underline mb-1 block">← All vacancies</button>}
          <h1 className="font-bold text-xl text-caa-body">Shortlisted II — {job?.title ?? "Panel Scoring"}</h1>
          <p className="text-xs text-caa-muted mt-0.5">Each admin scores independently — everyone's score and comment is visible to the panel, never to the candidate.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportForOfflineScoring} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-border rounded-md hover:border-caa-navy"><FileDown className="h-3.5 w-3.5" /> Export for offline scoring</button>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-border rounded-md hover:border-caa-navy cursor-pointer">
            {importing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import scores
            <input type="file" accept=".csv" className="sr-only" disabled={importing} onChange={(e) => { const f = e.target.files?.[0]; if (f) importScores(f); }} />
          </label>
        </div>
      </div>

      <div className="caa-card p-3 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-caa-body">Auto-shortlist by score — advance candidates averaging ≥</label>
        <input type="number" min={0} max={100} className="w-20 text-xs font-semibold border border-caa-border rounded px-2 py-1.5 text-center" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)} />
        <button onClick={runAutoShortlist} disabled={scored.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-50"><Zap className="h-3.5 w-3.5" /> Run ({scored.length} scored)</button>
        <p className="text-[11px] text-caa-muted">Advances candidates to Interview; the rest are Declined. Unscored candidates are skipped.</p>
      </div>

      {loading ? (
        <p className="text-xs text-caa-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="caa-card p-6 text-center text-xs text-caa-muted">No candidates are currently at Shortlisted II for this vacancy.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const app = applications.find((a: Application) => a.id === r.applicationId);
            const cv = app?.candidateEmail ? cvStore[app.candidateEmail.toLowerCase()] : undefined;
            const draft = draftFor(r.applicationId);
            return (
              <div key={r.applicationId} className="caa-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="font-semibold text-sm text-caa-body">{r.candidateName}</p>
                    <p className="text-[11px] text-caa-muted">{r.candidateEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.average !== null && (
                      <span className="text-sm font-bold text-caa-navy">Avg {r.average.toFixed(1)} <span className="text-[10px] font-normal text-caa-muted">({r.scores.length} score{r.scores.length !== 1 ? "s" : ""})</span></span>
                    )}
                    {cv && (
                      <button onClick={() => downloadCandidateCv(cv, app, actor)} className="inline-flex items-center gap-1 text-xs text-caa-navy hover:underline"><Download className="h-3.5 w-3.5" /> CV</button>
                    )}
                  </div>
                </div>

                {r.scores.length > 0 && (
                  <div className="mb-3 rounded-md border border-caa-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-caa-surface text-caa-muted">
                        <tr><th className="text-left p-2">Panelist</th><th className="text-left p-2">Score</th><th className="text-left p-2">Comment</th></tr>
                      </thead>
                      <tbody className="divide-y divide-caa-border">
                        {r.scores.map((s) => (
                          <tr key={s.id}><td className="p-2 font-medium text-caa-body">{s.scorerName}</td><td className="p-2 font-semibold text-caa-navy">{s.score}</td><td className="p-2 text-caa-muted">{s.comment || "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-[11px] text-caa-muted mb-1">Your score (0–100)</label>
                    <input type="number" min={0} max={100} className="w-20 text-xs border border-caa-border rounded px-2 py-1.5" value={draft.score} onChange={(e) => setDrafts((d) => ({ ...d, [r.applicationId]: { ...draft, score: e.target.value } }))} />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] text-caa-muted mb-1">Your comment (visible to other panelists only)</label>
                    <input className={fi} value={draft.comment} onChange={(e) => setDrafts((d) => ({ ...d, [r.applicationId]: { ...draft, comment: e.target.value } }))} placeholder="Optional notes for the panel…" />
                  </div>
                  <button onClick={() => saveScore(r.applicationId)} disabled={saving === r.applicationId} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-50">
                    {saving === r.applicationId ? "Saving…" : "Save score"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
