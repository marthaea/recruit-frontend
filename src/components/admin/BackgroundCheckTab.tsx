import { useState, useEffect } from "react";
import {
  Mail, ShieldCheck, RefreshCw,
} from "lucide-react";
import {
  useApp, type Application, type Job,
} from "@/context/AppContext";
import { backgroundChecks as bgApi, type BackgroundCheck, type BackgroundCheckStatus } from "@/lib/api/client";
import { fi, EmptyState } from "./shared";

const STATUS_LABELS: Record<BackgroundCheckStatus, string> = {
  pending: "Pending", contacted: "Contacted", verified: "Verified",
  could_not_reach: "Could Not Reach", declined_to_confirm: "Declined to Confirm",
};
const STATUS_STYLES: Record<BackgroundCheckStatus, string> = {
  pending: "bg-caa-muted/15 text-caa-muted",
  contacted: "bg-amber-100 text-amber-700",
  verified: "bg-caa-success/10 text-caa-success",
  could_not_reach: "bg-caa-danger/10 text-caa-danger",
  declined_to_confirm: "bg-caa-danger/10 text-caa-danger",
};
const STATUS_OPTIONS: BackgroundCheckStatus[] = ["pending", "contacted", "verified", "could_not_reach", "declined_to_confirm"];

export function BackgroundCheckTab({ jobs, applications }: { jobs: Job[]; applications: Application[] }) {
  const { pushToast, logAction } = useApp();
  const relevant = applications.filter((a) => a.status === "Shortlisted II" || a.status === "Background Check");
  const [selectedId, setSelectedId] = useState<number | null>(relevant[0]?.id ?? null);
  const [checks, setChecks] = useState<BackgroundCheck[] | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const selected = relevant.find((a) => a.id === selectedId) ?? null;
  const job = jobs.find((j) => j.id === selected?.jobId);

  const load = (applicationId: number) => {
    bgApi.list(applicationId).then((r) => { if (r.success) setChecks(r.data); }).catch(() => {});
  };
  useEffect(() => { if (selectedId) load(selectedId); else setChecks(null); }, [selectedId]);

  const initiate = async () => {
    if (!selectedId) return;
    setInitializing(true);
    try {
      const r = await bgApi.init(selectedId);
      if (r.success) {
        setChecks(r.data);
        logAction?.("Initiated background check", selected?.candidateName);
        pushToast({ type: "success", title: "Background check initiated", message: "Referee contact details loaded from the candidate's CV." });
      }
    } catch (err) {
      pushToast({ type: "warning", title: "Could not initiate background check", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setInitializing(false);
    }
  };

  const sendEmail = async (check: BackgroundCheck) => {
    setSendingId(check.id);
    try {
      const r = await bgApi.sendEmail(check.id);
      if (r.success) {
        setChecks((prev) => prev?.map((c) => (c.id === check.id ? r.data : c)) ?? null);
        logAction?.("Sent background check request email", check.refereeName ?? undefined);
        pushToast({ type: "success", title: "Verification email sent", message: check.refereeEmail ?? undefined });
      }
    } catch (err) {
      pushToast({ type: "warning", title: "Could not send email", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSendingId(null);
    }
  };

  const updateStatus = async (check: BackgroundCheck, status: BackgroundCheckStatus) => {
    try {
      const r = await bgApi.update(check.id, { status });
      if (r.success) {
        setChecks((prev) => prev?.map((c) => (c.id === check.id ? r.data : c)) ?? null);
        logAction?.("Updated background check status", `${check.refereeName ?? "Referee"} — ${status}`);
      }
    } catch (err) {
      pushToast({ type: "warning", title: "Could not update status", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-xl text-caa-body">Background Check</h1>
        <p className="text-xs text-caa-muted mt-0.5">Contact and verify each candidate's referees before final offer.</p>
      </div>

      {relevant.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="No candidates awaiting background checks" hint="Candidates appear here once they reach Shortlisted II." />
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
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-caa-body">{selected.candidateName}</p>
                  <p className="text-xs text-caa-muted">{selected.title} · {job?.dept ?? selected.dept}</p>
                </div>

                {checks === null ? (
                  <p className="text-xs text-caa-muted">Loading…</p>
                ) : checks.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-caa-muted mb-3">No background check started yet for this candidate.</p>
                    <button onClick={initiate} disabled={initializing} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60 inline-flex items-center gap-1.5 mx-auto">
                      {initializing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {initializing ? "Loading referees…" : "Start background check"}
                    </button>
                  </div>
                ) : (
                  checks.map((c) => (
                    <div key={c.id} className="border border-caa-border rounded-md p-3 bg-caa-surface/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-caa-body">Referee {c.refereeIndex + 1}: {c.refereeName ?? "—"}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                      </div>
                      <p className="text-[11px] text-caa-muted mb-2">{c.refereeEmail ?? "No email on file"} {c.refereePhone ? `· ${c.refereePhone}` : ""}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => sendEmail(c)}
                          disabled={!c.refereeEmail || sendingId === c.id}
                          className="px-2.5 py-1 text-xs font-semibold border border-caa-navy text-caa-navy rounded-md hover:bg-caa-navy/5 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" /> {sendingId === c.id ? "Sending…" : c.contactedAt ? "Resend request" : "Send verification email"}
                        </button>
                        <select className={`${fi} w-auto`} value={c.status} onChange={(e) => updateStatus(c, e.target.value as BackgroundCheckStatus)}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                        {c.contactedAt && <span className="text-[11px] text-caa-muted">Last contacted {new Date(c.contactedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
