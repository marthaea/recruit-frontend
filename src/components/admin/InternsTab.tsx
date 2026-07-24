import { useState } from "react";
import {
  FileDown, Zap,
} from "lucide-react";
import {
  type Application, type JobCriteria,
} from "@/context/AppContext";
import {
  downloadInternsReport,
} from "@/lib/admin-pdf";
import { STATUS_COLORS } from "./shared";

export function InternsTab({ applications, jobs, criteria, actor, updateStatus, bulkUpdateStatus, canShortlist, logAction }: any) {
  const interns = [...applications]
    .filter((a: Application) => a.cgpa !== undefined)
    .sort((a: Application, b: Application) => (b.cgpa ?? 0) - (a.cgpa ?? 0));

  const [cgpaThreshold, setCgpaThreshold] = useState(3.8);
  const [screeningPreview, setScreeningPreview] = useState<{ pass: Application[]; fail: Application[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cgpaColor = (g: number) =>
    g >= 4.5 ? "text-caa-success" : g >= 3.5 ? "text-caa-navy" : g >= 3.0 ? "text-caa-warning" : "text-caa-danger";

  // Effective threshold per candidate: the candidate's own job may have a
  // minCgpa configured in Criteria Setup — previously this ran a single
  // global CGPA cutoff against every job identically, ignoring any per-job
  // criteria entirely. The manual field below still applies as the default/
  // override for jobs that have no criteria configured.
  const effectiveThreshold = (a: Application) => {
    const jc = (criteria as JobCriteria[] | undefined)?.find((c) => c.jobId === a.jobId);
    return jc?.minCgpa !== undefined ? jc.minCgpa : cgpaThreshold;
  };

  const runAutoScreen = () => {
    const eligible = interns.filter((a: Application) => a.status === "Pending" || a.status === "Under Review");
    setScreeningPreview({
      pass: eligible.filter((a: Application) => (a.cgpa ?? 0) >= effectiveThreshold(a)),
      fail: eligible.filter((a: Application) => (a.cgpa ?? 0) < effectiveThreshold(a)),
    });
  };

  const confirmAutoScreen = () => {
    if (!screeningPreview) return;
    setIsProcessing(true);
    setTimeout(() => {
      bulkUpdateStatus([
        ...screeningPreview.pass.map((a: Application) => ({ id: a.id, status: "Shortlisted" as const })),
        ...screeningPreview.fail.map((a: Application) => ({ id: a.id, status: "Declined" as const })),
      ]);
      logAction(`Auto-screened ${screeningPreview.pass.length + screeningPreview.fail.length} intern(s) — CGPA ≥ ${cgpaThreshold.toFixed(1)}`);
      setScreeningPreview(null);
      setIsProcessing(false);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold text-xl text-caa-body">Interns (CGPA)</h1>
          <p className="text-xs text-caa-muted mt-0.5">Ranked by CGPA — highest first</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canShortlist && (
            <div className="flex items-center gap-2 bg-caa-surface border border-caa-border rounded-lg px-3 py-2">
              <label className="text-xs text-caa-muted whitespace-nowrap">Auto-screen CGPA ≥</label>
              <input
                type="number" min={0} max={5} step={0.1}
                value={cgpaThreshold}
                onChange={(e) => setCgpaThreshold(parseFloat(e.target.value) || 0)}
                className="w-14 text-xs font-semibold text-caa-body border border-caa-border rounded px-1.5 py-1 text-center focus:outline-none focus:border-caa-navy"
              />
              <button
                onClick={runAutoScreen}
                className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" /> Run Auto-Screen
              </button>
            </div>
          )}
          <button
            onClick={() => downloadInternsReport(interns, jobs, actor)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-caa-surface border border-caa-border text-caa-body rounded-md"
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      {screeningPreview && (
        <div className="caa-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-caa-navy" />
            <p className="font-semibold text-sm text-caa-body">Auto-Screen Preview — CGPA ≥ {cgpaThreshold.toFixed(1)} (default; jobs with their own minimum CGPA in Criteria Setup use that instead)</p>
          </div>
          {(screeningPreview.pass.length + screeningPreview.fail.length) === 0 ? (
            <p className="text-xs text-caa-muted">No eligible applicants (Pending or Under Review) to screen.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md bg-caa-success/5 border border-caa-success/20 p-3">
                  <p className="font-semibold text-caa-success text-xs mb-2">Will be Shortlisted ({screeningPreview.pass.length})</p>
                  {screeningPreview.pass.length === 0
                    ? <p className="text-xs text-caa-muted italic">None meet the threshold</p>
                    : screeningPreview.pass.map((a: Application) => (
                        <p key={a.id} className="text-xs text-caa-body">{a.candidateName} <span className="text-caa-muted">— {a.cgpa?.toFixed(1)} (min {effectiveThreshold(a).toFixed(1)})</span></p>
                      ))}
                </div>
                <div className="rounded-md bg-caa-danger/5 border border-caa-danger/20 p-3">
                  <p className="font-semibold text-caa-danger text-xs mb-2">Will be Declined ({screeningPreview.fail.length})</p>
                  {screeningPreview.fail.length === 0
                    ? <p className="text-xs text-caa-muted italic">None below the threshold</p>
                    : screeningPreview.fail.map((a: Application) => (
                        <p key={a.id} className="text-xs text-caa-body">{a.candidateName} <span className="text-caa-muted">— {a.cgpa?.toFixed(1)} (min {effectiveThreshold(a).toFixed(1)})</span></p>
                      ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={confirmAutoScreen}
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 disabled:opacity-60"
                >
                  {isProcessing ? "Processing…" : "Confirm & Apply"}
                </button>
                <button
                  onClick={() => setScreeningPreview(null)}
                  className="px-4 py-1.5 text-xs font-semibold border border-caa-border rounded-md text-caa-muted hover:text-caa-body"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr>
              <th className="text-left p-3">Rank</th>
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Position</th>
              <th className="text-left p-3">University</th>
              <th className="text-left p-3">CGPA</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Date</th>
              {canShortlist && <th className="text-right p-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {interns.map((a: Application, i: number) => (
              <tr key={a.id}>
                <td className="p-3">
                  <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-caa-surface text-caa-muted"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="p-3">
                  <p className="font-medium text-caa-body">{a.candidateName ?? "—"}</p>
                  <p className="text-[11px] text-caa-muted">{a.candidateEmail ?? "—"}</p>
                </td>
                <td className="p-3 text-xs text-caa-muted">{a.title}</td>
                <td className="p-3 text-xs">{a.university ?? "—"}</td>
                <td className="p-3">
                  <span className={`font-bold text-base ${cgpaColor(a.cgpa ?? 0)}`}>{a.cgpa?.toFixed(1) ?? "—"}</span>
                  <span className="text-[10px] text-caa-muted ml-1">/ 5.0</span>
                </td>
                <td className="p-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: (STATUS_COLORS[a.status] ?? "#999") + "20", color: STATUS_COLORS[a.status] ?? "#999" }}>
                    {a.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-caa-muted">{a.date}</td>
                {canShortlist && (
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        disabled={a.status === "Shortlisted"}
                        onClick={() => { updateStatus(a.id, "Shortlisted", a.candidateEmail, ""); logAction("Shortlisted intern", a.candidateName); }}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-caa-success/10 text-caa-success hover:bg-caa-success/20 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                      >Shortlist</button>
                      <button
                        disabled={a.status === "Declined"}
                        onClick={() => { updateStatus(a.id, "Declined", a.candidateEmail, ""); logAction("Declined intern", a.candidateName); }}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-caa-danger/10 text-caa-danger hover:bg-caa-danger/20 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                      >Decline</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {interns.length === 0 && (
              <tr><td colSpan={canShortlist ? 8 : 7} className="p-6 text-center text-xs text-caa-muted">No intern applications on record.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Internal Staff ───────────────────────────────────────────────────────────

