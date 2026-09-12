import { useEffect, useState } from "react";
import {
  ClipboardList, ChevronDown, ChevronRight, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import { audit as auditApi, type AuditEntry } from "@/services/api/client";
import { EmptyState } from "./shared";

type ScreeningCandidate = {
  id: number; name?: string; email?: string; jobId?: number; jobTitle?: string;
  decision: "Shortlisted" | "Declined"; reasons: string[];
};
type ScreeningMetadata = {
  kind: "shortlisting-run";
  jobId: number | null; jobTitle: string | null; threshold: Record<string, unknown> | null;
  stats: { total: number; qualified: number; disqualified: number; qualifiedPct: number };
  candidates: ScreeningCandidate[];
};

function isScreeningRun(e: AuditEntry): e is AuditEntry & { metadata: ScreeningMetadata } {
  return (e.metadata as { kind?: string } | undefined)?.kind === "shortlisting-run";
}

export function ShortlistingReportsTab() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    auditApi.list({ limit: 200 }).then((r) => {
      if (r.success) setEntries(r.data.filter(isScreeningRun));
    }).catch(() => setEntries([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const runs = (entries ?? []).filter(isScreeningRun);
  const totals = runs.reduce((acc, e) => ({
    total: acc.total + e.metadata.stats.total,
    qualified: acc.qualified + e.metadata.stats.qualified,
    disqualified: acc.disqualified + e.metadata.stats.disqualified,
  }), { total: 0, qualified: 0, disqualified: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-xl text-caa-body">Shortlisting Reports</h1>
          <p className="text-xs text-caa-muted mt-0.5">
            Who ran each auto-shortlist, the threshold used, and every candidate's outcome — for audit and justification purposes.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-border rounded-md hover:border-caa-navy text-caa-body disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {runs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="caa-card p-3 text-center">
            <p className="text-2xl font-bold text-caa-body">{runs.length}</p>
            <p className="text-[11px] text-caa-muted mt-0.5">Screening runs</p>
          </div>
          <div className="caa-card p-3 text-center">
            <p className="text-2xl font-bold text-caa-body">{totals.total}</p>
            <p className="text-[11px] text-caa-muted mt-0.5">Candidates evaluated</p>
          </div>
          <div className="caa-card p-3 text-center">
            <p className="text-2xl font-bold text-caa-success">{totals.qualified}</p>
            <p className="text-[11px] text-caa-muted mt-0.5">Qualified ({totals.total > 0 ? Math.round((totals.qualified / totals.total) * 100) : 0}%)</p>
          </div>
          <div className="caa-card p-3 text-center">
            <p className="text-2xl font-bold text-caa-danger">{totals.disqualified}</p>
            <p className="text-[11px] text-caa-muted mt-0.5">Disqualified ({totals.total > 0 ? Math.round((totals.disqualified / totals.total) * 100) : 0}%)</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {runs.length === 0 && !loading && (
          <EmptyState
            icon={<ClipboardList />}
            title="No screening runs recorded yet"
            hint="Every confirmed auto-shortlist on the Shortlisting or Interns (CGPA) tabs will appear here with its full accountability trail."
          />
        )}
        {runs.map((e) => {
          const m = e.metadata;
          const isOpen = expanded.has(e.id);
          return (
            <div key={e.id} className="caa-card overflow-hidden">
              <button onClick={() => toggle(e.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-caa-surface/60">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-caa-body">{e.action}{m.jobTitle ? ` — ${m.jobTitle}` : ""}</p>
                  <p className="text-[11px] text-caa-muted mt-0.5">
                    Set by <strong>{e.actor}</strong> <span className="capitalize">({e.role.replace(/_/g, " ")})</span> · {new Date(e.at).toLocaleString()}
                    {m.threshold && Object.keys(m.threshold).length > 0 && (
                      <> · Threshold: {Object.entries(m.threshold).map(([k, v]) => `${k}=${v}`).join(", ")}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-caa-success">{m.stats.qualified} qualified</span>
                  <span className="text-xs font-semibold text-caa-danger">{m.stats.disqualified} disqualified</span>
                  <span className="text-[11px] text-caa-muted">({m.stats.qualifiedPct}%)</span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-caa-muted" /> : <ChevronRight className="h-4 w-4 text-caa-muted" />}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-caa-border max-h-80 overflow-y-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead className="bg-caa-surface text-caa-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Candidate</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">Decision</th>
                        <th className="text-left p-2">Reasons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-caa-border">
                      {m.candidates.map((c) => (
                        <tr key={c.id}>
                          <td className="p-2 font-medium text-caa-body">{c.name ?? "—"}<br /><span className="text-[10px] text-caa-muted font-normal">{c.email}</span></td>
                          <td className="p-2 text-caa-muted">{c.jobTitle ?? "—"}</td>
                          <td className="p-2">
                            {c.decision === "Shortlisted"
                              ? <span className="text-caa-success font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Shortlisted</span>
                              : <span className="text-caa-danger font-semibold inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> Declined</span>}
                          </td>
                          <td className="p-2 text-caa-muted">{c.reasons.join("; ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
