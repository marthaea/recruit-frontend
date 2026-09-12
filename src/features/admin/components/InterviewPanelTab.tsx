import { useEffect, useState } from "react";
import {
  Users2, UserPlus, X, Search, Mail, Archive, RefreshCw,
} from "lucide-react";
import { useApp, type Job } from "@/app/providers/AppContext";
import {
  staff as staffApi, interviewPanel as panelApi, type StaffMember, type PanelMember,
} from "@/services/api/client";
import { EmptyState, fi } from "./shared";

export function InterviewPanelTab({ jobs }: { jobs: Job[] }) {
  const { pushToast } = useApp();
  const [jobId, setJobId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [panel, setPanel] = useState<PanelMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<number | null>(null);

  const job = jobs.find((j) => j.id === jobId);

  useEffect(() => {
    staffApi.list().then((r) => { if (r.success) setStaffList(r.data); }).catch(() => {});
  }, []);

  const loadPanel = (id: number) => {
    setLoading(true);
    panelApi.list(id).then((r) => { if (r.success) setPanel(r.data); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (jobId) loadPanel(jobId);
  }, [jobId]);

  const onPanel = new Set(panel.map((p) => p.staffId));
  const filteredStaff = staffList.filter((s) => {
    if (onPanel.has(s.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.firstName} ${s.lastName} ${s.dept ?? ""} ${s.position ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q);
  });

  const addToPanel = async (s: StaffMember) => {
    if (!jobId) return;
    setBusyStaffId(s.id);
    try {
      await panelApi.add(jobId, s.id);
      pushToast({ type: "success", title: `${s.firstName} ${s.lastName} added to panel`, message: s.email ? "An invitation email has been queued." : "No email on file — they were not notified automatically." });
      loadPanel(jobId);
    } catch (err) {
      pushToast({ type: "warning", title: "Could not add panelist", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusyStaffId(null);
    }
  };

  const removeFromPanel = async (m: PanelMember) => {
    if (!jobId) return;
    setBusyStaffId(m.staffId);
    try {
      await panelApi.remove(m.id, jobId);
      pushToast({ type: "success", title: `${m.firstName} ${m.lastName} removed from panel` });
      loadPanel(jobId);
    } catch (err) {
      pushToast({ type: "warning", title: "Could not remove panelist", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusyStaffId(null);
    }
  };

  if (!jobId) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="font-bold text-xl text-caa-body">Interview Panel</h1>
          <p className="text-xs text-caa-muted mt-0.5">Select a vacancy to build its interview panel from available employees.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((j) => {
            const isClosed = (j.status && j.status !== "published") || new Date(j.closesAt) < new Date();
            return (
              <button key={j.id} onClick={() => setJobId(j.id)} className="caa-card p-4 text-left hover:border-caa-navy transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-caa-body">{j.title}</p>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isClosed ? "bg-caa-muted/15 text-caa-muted" : "bg-caa-success/10 text-caa-success"}`}>
                    {isClosed ? <Archive className="h-3 w-3" /> : null}{isClosed ? "Closed" : "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-caa-muted mt-1">{j.dept}</p>
              </button>
            );
          })}
          {jobs.length === 0 && <p className="text-xs text-caa-muted">No job listings yet.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button onClick={() => setJobId(null)} className="text-[11px] font-semibold text-caa-navy hover:underline mb-1 block">← All vacancies</button>
          <h1 className="font-bold text-xl text-caa-body">Interview Panel — {job?.title}</h1>
          <p className="text-xs text-caa-muted mt-0.5">Select employees to serve on this panel — each one receives an automatic invitation email.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available employees */}
        <div className="caa-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-caa-muted shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees by name, department, position…" className={fi} />
          </div>
          <div className="max-h-[480px] overflow-y-auto divide-y divide-caa-border">
            {filteredStaff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-caa-body truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-[11px] text-caa-muted truncate">{s.position ?? "—"} · {s.dept ?? "—"}</p>
                </div>
                <button
                  onClick={() => addToPanel(s)}
                  disabled={busyStaffId === s.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 disabled:opacity-60"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            ))}
            {filteredStaff.length === 0 && (
              <p className="text-xs text-caa-muted py-6 text-center">
                {staffList.length === 0 ? "No employee records on file." : "No matching employees, or everyone found is already on this panel."}
              </p>
            )}
          </div>
        </div>

        {/* Current panel */}
        <div className="caa-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-caa-body inline-flex items-center gap-1.5"><Users2 className="h-4 w-4" /> Panel members ({panel.length})</p>
            <button onClick={() => loadPanel(jobId)} disabled={loading} className="text-caa-muted hover:text-caa-navy disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {panel.length === 0 ? (
            <EmptyState icon={<Users2 />} title="No panelists selected yet" hint="Add employees from the list on the left to build this vacancy's interview panel." />
          ) : (
            <div className="divide-y divide-caa-border">
              {panel.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-caa-body truncate">{m.firstName} {m.lastName}</p>
                    <p className="text-[11px] text-caa-muted truncate">
                      {m.position ?? "—"} · {m.dept ?? "—"}
                      {m.email ? <> · <Mail className="h-2.5 w-2.5 inline -mt-0.5" /> {m.email}</> : " · no email on file"}
                    </p>
                    <p className="text-[10px] text-caa-muted mt-0.5">Invited by {m.invitedByName ?? "—"} · {new Date(m.invitedAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => removeFromPanel(m)}
                    disabled={busyStaffId === m.staffId}
                    className="shrink-0 p-1.5 rounded-md text-caa-danger hover:bg-caa-danger/10 disabled:opacity-60"
                    title="Remove from panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
