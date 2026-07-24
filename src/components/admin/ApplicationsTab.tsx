import { useState, useMemo, useEffect } from "react";
import {
  AlertCircle, FileText, Download, ClipboardList, ChevronRight, FileDown, RefreshCw, CheckCircle2, XCircle, Eye, FileSearch, ExternalLink,
  LayoutGrid, List, CheckSquare, Square, Archive,
} from "lucide-react";
import {
  useApp, canAccess, type Job, type Application, type ApplicationStatus, type JobCriteria,
} from "@/context/AppContext";
import {
  downloadScreeningReport, downloadOfferLetter, downloadCandidateCv, downloadCandidateCvsZip, type ScreeningReportEntry,
} from "@/lib/admin-pdf";
import { applications as appsApi } from "@/lib/api/client";
import { buildEmail, autoQualify, STATUS_COLORS, fi, EmptyState, type ScreeningResult } from "./shared";

export function AppsTab({ jobs, applications, jobId, cvStore, updateStatus, bulkUpdateStatus, logAction, actor, criteria, role, perms, logEmail, bulkLogEmails, initialStatusFilter, onSelectJob, onClearJob }: any) {
  const { pushToast, loadCvsForEmails } = useApp();
  const [viewingAll, setViewingAll] = useState(false);
  const filtered = jobId ? applications.filter((a: Application) => a.jobId === jobId) : applications;
  const job = jobs.find((j: Job) => j.id === jobId);
  const [selected, setSelected] = useState<Application | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? "all");
  const [screeningResult, setScreeningResult] = useState<{ results: ScreeningResult[]; confirmed: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<"table" | "board">("table");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [downloadingCvs, setDownloadingCvs] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const displayed = statusFilter === "all" ? filtered : filtered.filter((a: Application) => a.status === statusFilter);

  // cvStore was previously only ever populated from 2 hardcoded demo profiles
  // plus whatever CV the CURRENT browser session happened to save — meaning a
  // real admin almost never actually saw a real candidate's CV data (and
  // autoQualify() silently fell back to its fake demo-simulation path
  // instead of evaluating it). Fetch on demand for whichever candidates are
  // currently visible — only once scoped to a single job (jobId set), never
  // on the flat cross-job list, which can be hundreds of applications and
  // would fire that many simultaneous requests.
  useEffect(() => {
    if (!jobId) return;
    const emails = displayed.map((a: Application) => a.candidateEmail).filter(Boolean);
    if (emails.length > 0) loadCvsForEmails(emails);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, displayed.map((a: Application) => a.candidateEmail).join(',')]);

  // Job-picker landing — only for the plain "Applications" entry point (no
  // specific job, no forced status filter like Shortlisting/Interview Panel).
  // Previously this showed every application across every job in one flat
  // list with no way to scope down except the status pills.
  const showJobPicker = !jobId && !initialStatusFilter && !viewingAll && !!onSelectJob;
  if (showJobPicker) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-bold text-xl text-caa-body">Applications</h1>
            <p className="text-xs text-caa-muted mt-0.5">Select a vacancy to review its applications.</p>
          </div>
          <button onClick={() => setViewingAll(true)} className="text-xs font-semibold text-caa-navy hover:underline">
            View all applications across every job →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((j: Job) => {
            const count = applications.filter((a: Application) => a.jobId === j.id).length;
            const isClosed = (j.status && j.status !== "published") || new Date(j.closesAt) < new Date();
            return (
              <button
                key={j.id}
                onClick={() => onSelectJob(j.id)}
                className="caa-card p-4 text-left hover:border-caa-navy transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-caa-body">{j.title}</p>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isClosed ? "bg-caa-muted/15 text-caa-muted" : "bg-caa-success/10 text-caa-success"}`}>
                    {isClosed ? <Archive className="h-3 w-3" /> : null}{isClosed ? "Closed" : "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-caa-muted mt-1">{j.dept}</p>
                <p className="text-xs font-semibold text-caa-navy mt-2">{count} application{count !== 1 ? "s" : ""}</p>
              </button>
            );
          })}
          {jobs.length === 0 && <p className="text-xs text-caa-muted">No job listings yet.</p>}
        </div>
      </div>
    );
  }

  // ── Kanban board ────────────────────────────────────────────────────────────
  const BOARD_COLUMNS: ApplicationStatus[] = [
    "Pending", "Under Review", "Shortlisted", "Shortlisted II", "Interview",
    "Assessment Scheduled", "Assessment Complete",
    "Offered", "Declined",
  ];
  const NOTIFY_STATUSES: ApplicationStatus[] = [
    "Shortlisted", "Shortlisted II", "Interview", "Assessment Scheduled", "Assessment Complete",
    "Offered", "Declined",
  ];
  const canMove = canAccess(role, "canShortlist", perms);

  const handleBoardDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!canMove) return;
    const id = Number(e.dataTransfer.getData("text/plain"));
    const app = filtered.find((a: Application) => a.id === id);
    if (!app || app.status === status) return;
    if (NOTIFY_STATUSES.includes(status)) {
      const { subject, body } = buildEmail(status, app.candidateName ?? "Applicant", app.title);
      updateStatus(app.id, status, app.candidateEmail, body);
      logEmail({ to: app.candidateEmail ?? "", candidateName: app.candidateName ?? "Applicant", subject, body, trigger: status, jobTitle: app.title });
    } else {
      updateStatus(app.id, status);
    }
    logAction(`Moved application #${app.id} to ${status} via pipeline board`, app.candidateName ?? app.candidateEmail);
  };

  const approveAllForInterview = () => {
    setIsProcessing(true);
    // Let the loading state paint before the (synchronous) bulk write runs.
    setTimeout(() => {
      const shortlisted = filtered.filter((a: Application) => a.status === "Shortlisted");
      bulkUpdateStatus(shortlisted.map((a: Application) => ({ id: a.id, status: "Interview" })));
      bulkLogEmails(shortlisted.map((a: Application) => {
        const { subject, body } = buildEmail("Interview", a.candidateName ?? "Applicant", a.title);
        return { to: a.candidateEmail ?? "", candidateName: a.candidateName ?? "Applicant", subject, body, trigger: "Interview Approval", jobTitle: a.title };
      }));
      logAction(`Approved ${shortlisted.length} shortlisted candidates for interview`);
      setStatusFilter("Interview");
      setIsProcessing(false);
    }, 0);
  };

  const runScreening = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const eligible = filtered.filter((a: Application) => a.status === "Pending" || a.status === "Under Review");
      const results: ScreeningResult[] = eligible.map((a: Application) => {
        const j = jobs.find((jj: Job) => jj.id === a.jobId);
        const cv = cvStore[a.candidateEmail?.toLowerCase() ?? ""];
        const c = criteria.find((cr: JobCriteria) => cr.jobId === a.jobId);
        const { ok, checks } = autoQualify(a, j, cv, c);
        return { app: a, ok, checks };
      });
      setScreeningResult({ results, confirmed: false });
      setIsProcessing(false);
    }, 0);
  };

  const confirmScreening = () => {
    if (!screeningResult) return;
    setIsProcessing(true);
    setTimeout(() => {
      const passed = screeningResult.results.filter((r) => r.ok);
      const failed = screeningResult.results.filter((r) => !r.ok);
      bulkUpdateStatus([
        ...passed.map((r) => ({ id: r.app.id, status: "Shortlisted" as const })),
        ...failed.map((r) => ({ id: r.app.id, status: "Declined" as const })),
      ]);
      bulkLogEmails([
        ...passed.map((r) => {
          const { subject, body } = buildEmail("Shortlisted", r.app.candidateName ?? "Applicant", r.app.title);
          return { to: r.app.candidateEmail ?? "", candidateName: r.app.candidateName ?? "Applicant", subject, body, trigger: "Batch Screening", jobTitle: r.app.title };
        }),
        ...failed.map((r) => {
          const { subject, body } = buildEmail("Declined", r.app.candidateName ?? "Applicant", r.app.title);
          return { to: r.app.candidateEmail ?? "", candidateName: r.app.candidateName ?? "Applicant", subject, body, trigger: "Batch Screening", jobTitle: r.app.title };
        }),
      ]);
      logAction(`Auto-screening: shortlisted ${passed.length}, declined ${failed.length}`);
      setScreeningResult((prev) => prev ? { ...prev, confirmed: true } : null);
      setIsProcessing(false);
    }, 0);
  };

  const exportScreeningReport = () => {
    if (!screeningResult) return;
    const entries: ScreeningReportEntry[] = screeningResult.results.map((r) => ({
      id: r.app.id,
      name: r.app.candidateName ?? "—",
      email: r.app.candidateEmail ?? "—",
      role: r.app.title,
      dept: r.app.dept,
      date: r.app.date,
      pass: r.ok,
      failedChecks: r.checks.filter((c) => !c.pass).map((c) => c.label),
    }));
    downloadScreeningReport(entries, actor);
  };

  const eligible = filtered.filter((a: Application) => a.status === "Pending" || a.status === "Under Review");

  // Pulls straight from the database (server-side, up to 5000 rows) rather
  // than the `applications` already loaded into the frontend — the list
  // endpoint that populates that array caps at 500, so a purely client-side
  // export silently truncated for any org with more applications than that.
  const exportCsv = async () => {
    const label = statusFilter === "all" ? "all" : statusFilter.toLowerCase().replace(/\s+/g, "-");
    setExportingCsv(true);
    try {
      await appsApi.exportCsv(
        { jobId: jobId ?? undefined, status: statusFilter !== "all" ? statusFilter : undefined },
        `caa-applications-${label}-${Date.now()}.csv`,
      );
    } catch (err) {
      pushToast({ type: "warning", title: "Export failed", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setExportingCsv(false);
    }
  };

  const toggleSelected = (id: number) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSelectAllDisplayed = () => setSelectedIds((prev) => {
    const allSelected = displayed.length > 0 && displayed.every((a: Application) => prev.has(a.id));
    return allSelected ? new Set() : new Set(displayed.map((a: Application) => a.id));
  });

  const downloadSelectedCvs = async () => {
    const selectedApps = displayed.filter((a: Application) => selectedIds.has(a.id));
    const withCv = selectedApps.filter((a: Application) => cvStore[a.candidateEmail?.toLowerCase() ?? ""]);
    if (withCv.length === 0) {
      pushToast({ type: "warning", title: "No CVs to download", message: "None of the selected candidates have a CV on file." });
      return;
    }
    setDownloadingCvs(true);
    try {
      await downloadCandidateCvsZip(
        withCv.map((a: Application) => ({ cv: cvStore[a.candidateEmail!.toLowerCase()], app: a })),
        actor,
      );
    } finally {
      setDownloadingCvs(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {jobId && onClearJob && !initialStatusFilter && (
            <button onClick={onClearJob} className="text-[11px] font-semibold text-caa-navy hover:underline mb-1 block">← All vacancies</button>
          )}
          <h1 className="font-bold text-xl text-caa-body">{job ? `Applications — ${job.title}` : "All Applications"}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Table / Board view toggle */}
          <div className="flex rounded-md border border-caa-border overflow-hidden">
            <button
              onClick={() => setView("table")}
              title="Table view"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === "table" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-navy bg-white"}`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView("board")}
              title="Pipeline board view — drag candidates between stages"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === "board" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-navy bg-white"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
          </div>
          <button
            onClick={exportCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-border text-caa-body rounded-md hover:border-caa-navy hover:text-caa-navy disabled:opacity-60"
          >
            {exportingCsv ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} {exportingCsv ? "Exporting…" : "Export CSV"}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={downloadSelectedCvs}
              disabled={downloadingCvs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60"
            >
              {downloadingCvs ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {downloadingCvs ? "Zipping…" : `Download ${selectedIds.size} selected CV${selectedIds.size !== 1 ? "s" : ""}`}
            </button>
          )}
          {canAccess(role, "canShortlist", perms) && (
            eligible.length > 0 ? (
              <button
                onClick={runScreening}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 shrink-0 disabled:opacity-60 disabled:cursor-wait"
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                {isProcessing ? "Screening…" : `Run Auto-Screening (${eligible.length})`}
              </button>
            ) : filtered.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-caa-success bg-caa-success/10 rounded-full shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" /> All applicants screened
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Screening result panel */}
      {screeningResult && !screeningResult.confirmed && (
        <div className="caa-card border-2 border-caa-navy/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-caa-body">Screening results</p>
              <p className="text-xs text-caa-muted mt-0.5">System evaluated {screeningResult.results.length} pending application{screeningResult.results.length !== 1 ? "s" : ""} against the criteria for each position.</p>
            </div>
            <button onClick={() => setScreeningResult(null)} className="text-caa-muted hover:text-caa-body"><XCircle className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-caa-success/10 border border-caa-success/20 p-3 text-center">
              <p className="text-3xl font-bold text-caa-success">{screeningResult.results.filter((r) => r.ok).length}</p>
              <p className="text-xs text-caa-success font-medium mt-1">Pass — will be shortlisted</p>
            </div>
            <div className="rounded-lg bg-caa-danger/10 border border-caa-danger/20 p-3 text-center">
              <p className="text-3xl font-bold text-caa-danger">{screeningResult.results.filter((r) => !r.ok).length}</p>
              <p className="text-xs text-caa-danger font-medium mt-1">Fail — will be declined</p>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="rounded-md border border-caa-border max-h-64 overflow-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead className="bg-caa-surface text-caa-muted sticky top-0">
                <tr><th className="text-left p-2">Candidate</th><th className="text-left p-2">Role</th><th className="text-left p-2">Result</th><th className="text-left p-2">Failed checks</th></tr>
              </thead>
              <tbody className="divide-y divide-caa-border">
                {screeningResult.results.map((r) => (
                  <tr key={r.app.id} className={r.ok ? "bg-white" : "bg-caa-danger/3"}>
                    <td className="p-2 font-medium text-caa-body">{r.app.candidateName ?? "—"}</td>
                    <td className="p-2 text-caa-muted">{r.app.abbr}</td>
                    <td className="p-2">
                      {r.ok
                        ? <span className="text-caa-success font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pass</span>
                        : <span className="text-caa-danger font-semibold flex items-center gap-1"><XCircle className="h-3 w-3" /> Fail</span>}
                    </td>
                    <td className="p-2 text-caa-muted">{r.checks.filter((c) => !c.pass).map((c) => c.label).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              onClick={confirmScreening}
              disabled={isProcessing || screeningResult.confirmed}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 disabled:opacity-60 disabled:cursor-wait"
            >
              {isProcessing && <RefreshCw className="h-4 w-4 animate-spin" />}
              {isProcessing ? "Applying…" : "Confirm & Apply Results"}
            </button>
            <button onClick={exportScreeningReport} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-caa-navy text-caa-navy rounded-md hover:bg-caa-navy/5">
              <FileDown className="h-4 w-4" /> Export Report PDF
            </button>
            <button onClick={() => setScreeningResult(null)} className="px-4 py-2 text-sm border border-caa-border rounded-md">Cancel</button>
          </div>
          <p className="text-[11px] text-caa-muted">Passing applicants will move to <strong>Shortlisted</strong>. Failing applicants will be <strong>Declined</strong>. You can still override individual statuses afterwards.</p>
        </div>
      )}

      {screeningResult?.confirmed && (
        <div className="rounded-lg border border-caa-success/30 bg-caa-success/5 p-3 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-caa-success shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-caa-success">Screening applied — {screeningResult.results.filter((r) => r.ok).length} shortlisted, {screeningResult.results.filter((r) => !r.ok).length} declined.</p>
            <p className="text-xs text-caa-success/80 mt-0.5">Next step: review the shortlist below or export the PDF, then use <strong>Approve All for Interview</strong> to advance candidates to the interview stage.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setStatusFilter("Shortlisted"); setScreeningResult(null); }} className="px-3 py-1 text-xs font-semibold bg-caa-success text-white rounded-md">View Shortlist</button>
            <button onClick={() => setScreeningResult(null)} className="text-caa-success/60 hover:text-caa-success"><XCircle className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Pending-after-screening notice */}
      {filtered.some((a: Application) => a.status === "Pending" || a.status === "Under Review") &&
       filtered.some((a: Application) => a.status === "Shortlisted" || a.status === "Interview") && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700">
            <strong>{filtered.filter((a: Application) => a.status === "Pending" || a.status === "Under Review").length} application{filtered.filter((a: Application) => a.status === "Pending" || a.status === "Under Review").length !== 1 ? "s" : ""}</strong> are pending — received after the last screening batch or not yet processed. Run supplementary screening to include them.
          </p>
        </div>
      )}

      {/* Pipeline status bar */}
      {(() => {
        const stages = [
          { status: "Pending",      label: "Pending",      tip: "Awaiting screening" },
          { status: "Under Review", label: "Under Review", tip: "Manually flagged for review" },
          { status: "Shortlisted",  label: "Shortlisted",  tip: "Passed screening — awaiting HR approval" },
          { status: "Interview",    label: "Interview",    tip: "Approved for oral interview" },
          { status: "Offered",      label: "Offered",      tip: "Position offered" },
        ];
        const declinedCount = filtered.filter((a: Application) => a.status === "Declined").length;
        return (
          <div className="caa-card p-3">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 text-[11px] rounded-md font-semibold border transition-colors ${statusFilter === "all" ? "bg-caa-navy text-white border-caa-navy" : "border-caa-border text-caa-muted hover:border-caa-navy"}`}
              >
                All ({filtered.length})
              </button>
              <ChevronRight className="h-3 w-3 text-caa-border shrink-0" />
              {stages.map((st, i) => {
                const count = filtered.filter((a: Application) => a.status === st.status).length;
                const active = statusFilter === st.status;
                return (
                  <div key={st.status} className="flex items-center gap-1">
                    <button
                      onClick={() => setStatusFilter(st.status)}
                      title={st.tip}
                      className={`px-2.5 py-1 text-[11px] rounded-md font-semibold border transition-colors ${active ? "text-white border-transparent" : "border-caa-border text-caa-muted hover:border-caa-navy"}`}
                      style={active ? { backgroundColor: STATUS_COLORS[st.status], borderColor: STATUS_COLORS[st.status] } : {}}
                    >
                      {st.label} <span className={`ml-0.5 ${active ? "opacity-80" : ""}`}>({count})</span>
                    </button>
                    {i < stages.length - 1 && <ChevronRight className="h-3 w-3 text-caa-border shrink-0" />}
                  </div>
                );
              })}
              <button
                onClick={() => setStatusFilter("Declined")}
                className={`ml-auto px-2.5 py-1 text-[11px] rounded-md font-semibold border transition-colors ${statusFilter === "Declined" ? "bg-caa-danger text-white border-caa-danger" : "border-caa-border text-caa-danger/70 hover:border-caa-danger"}`}
              >
                Declined ({declinedCount})
              </button>
            </div>
          </div>
        );
      })()}

      {/* Approve for Interview banner */}
      {statusFilter === "Shortlisted" && displayed.length > 0 && canAccess(role, "canShortlist", perms) && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 flex items-start gap-3">
          <ClipboardList className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-purple-800">{displayed.length} shortlisted candidate{displayed.length !== 1 ? "s" : ""} awaiting HR review</p>
            <p className="text-[11px] text-purple-600 mt-0.5">Review the list below or export the shortlist PDF. When satisfied, approve all candidates to proceed to oral interview.</p>
          </div>
          <button
            onClick={approveAllForInterview}
            disabled={isProcessing}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:opacity-60 disabled:cursor-wait"
          >
            {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {isProcessing ? "Approving…" : "Approve All for Interview"}
          </button>
        </div>
      )}

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2 items-start">
          {BOARD_COLUMNS.map((status) => {
            const col = filtered.filter((a: Application) => a.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => { if (canMove) { e.preventDefault(); setDragOverCol(status); } }}
                onDragLeave={() => setDragOverCol((c) => (c === status ? null : c))}
                onDrop={(e) => handleBoardDrop(e, status)}
                className={`w-56 shrink-0 rounded-lg border transition-colors ${dragOverCol === status ? "border-caa-navy bg-caa-navy/5" : "border-caa-border bg-caa-surface/60"}`}
              >
                <div className="px-3 py-2 flex items-center gap-2 border-b border-caa-border">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] ?? "#999" }} />
                  <span className="text-xs font-semibold text-caa-body">{status}</span>
                  <span className="ml-auto text-[11px] text-caa-muted">{col.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px] max-h-[440px] overflow-y-auto">
                  {col.map((a: Application) => (
                    <div
                      key={a.id}
                      draggable={canMove}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                      onClick={() => setSelected(a)}
                      className={`caa-card p-2.5 cursor-pointer hover:border-caa-navy ${canMove ? "active:cursor-grabbing" : ""}`}
                      title={canMove ? "Drag to another stage, or click to open" : "Click to open"}
                    >
                      <p className="text-xs font-semibold text-caa-body truncate">{a.candidateName ?? "Candidate"}</p>
                      <p className="text-[11px] text-caa-muted truncate mt-0.5">{a.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-caa-muted">{a.date}</span>
                        <span className="text-[10px] text-caa-muted">{a.completion}%</span>
                      </div>
                    </div>
                  ))}
                  {col.length === 0 && (
                    <p className="text-[11px] text-caa-muted text-center py-5">{canMove ? "Drop candidates here" : "No candidates"}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr>
              <th className="text-left p-3 w-8">
                <button onClick={toggleSelectAllDisplayed} title="Select all">
                  {displayed.length > 0 && displayed.every((a: Application) => selectedIds.has(a.id)) ? <CheckSquare className="h-4 w-4 text-caa-navy" /> : <Square className="h-4 w-4 text-caa-muted" />}
                </button>
              </th>
              <th className="text-left p-3">Candidate</th><th className="text-left p-3">Role</th><th className="text-left p-3">Submitted</th><th className="text-left p-3">Status</th><th className="text-left p-3">Completion</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {displayed.map((a: Application) => (
              <tr key={a.id} className="hover:bg-caa-surface/50 cursor-pointer" onClick={() => setSelected(a)}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleSelected(a.id)}>
                    {selectedIds.has(a.id) ? <CheckSquare className="h-4 w-4 text-caa-navy" /> : <Square className="h-4 w-4 text-caa-muted" />}
                  </button>
                </td>
                <td className="p-3"><p className="font-medium text-caa-body">{a.candidateName ?? "Candidate"}</p><p className="text-[11px] text-caa-muted">{a.candidateEmail ?? "—"}</p></td>
                <td className="p-3 text-xs text-caa-muted">{a.title}</td>
                <td className="p-3 text-xs">{a.date}</td>
                <td className="p-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: (STATUS_COLORS[a.status] ?? "#999") + "20", color: STATUS_COLORS[a.status] ?? "#999" }}>{a.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-caa-border rounded-full overflow-hidden"><div className="h-full bg-caa-navy rounded-full" style={{ width: `${a.completion}%` }} /></div>
                    <span className="text-[11px] text-caa-muted">{a.completion}%</span>
                  </div>
                </td>
                <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setSelected(a)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> View CV</button>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={7}>
                <EmptyState
                  icon={<FileText />}
                  title={statusFilter === "all" ? "No applications yet" : `No ${statusFilter.toLowerCase()} applications`}
                  hint={statusFilter === "all"
                    ? "Applications submitted through the portal will appear here for review."
                    : "Change the status filter above to see applications in other stages."}
                />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {selected && (
        <AppDetailModal
          app={selected}
          job={jobs.find((j: Job) => j.id === selected.jobId)}
          cv={cvStore[selected.candidateEmail?.toLowerCase() ?? ""]}
          criteria={criteria.find((c: JobCriteria) => c.jobId === selected.jobId)}
          canShortlist={canAccess(role, "canShortlist", perms)}
          onClose={() => setSelected(null)}
          onUpdateStatus={(status: ApplicationStatus, msg: string) => {
            updateStatus(selected.id, status, selected.candidateEmail, msg);
            logAction(`Set application #${selected.id} to ${status}`, selected.candidateName ?? selected.candidateEmail);
            const { subject, body } = buildEmail(status, selected.candidateName ?? "Applicant", selected.title);
            logEmail({ to: selected.candidateEmail ?? "", candidateName: selected.candidateName ?? "Applicant", subject, body, trigger: status, jobTitle: selected.title });
            setSelected((prev) => prev ? { ...prev, status } as Application : null);
          }}
          actor={actor}
        />
      )}
    </div>
  );
}

// ─── Application Detail Modal ─────────────────────────────────────────────────

function AppDetailModal({ app, job, cv, criteria, canShortlist, onClose, onUpdateStatus, actor }: any) {
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [notifMsg, setNotifMsg] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const { ok, checks } = useMemo(() => autoQualify(app, job, cv, criteria), [app, job, cv, criteria]);

  const actionButtons = [
    { status: "Shortlisted", label: "Shortlist",       color: "bg-caa-success text-white"  },
    { status: "Interview",   label: "Invite Interview", color: "bg-purple-600 text-white"   },
    { status: "Offered",     label: "Make Offer",       color: "bg-teal-600 text-white"     },
    { status: "Declined",    label: "Decline",          color: "bg-caa-danger text-white"   },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="caa-card w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-caa-border">
          <div>
            <h2 className="font-bold text-lg text-caa-body">{app.candidateName ?? "Candidate"}</h2>
            <p className="text-sm text-caa-muted mt-0.5">{app.title} · Submitted {app.date}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: (STATUS_COLORS[app.status] ?? "#999") + "20", color: STATUS_COLORS[app.status] ?? "#999" }}>{app.status}</span>
            <button onClick={onClose} className="text-caa-muted hover:text-caa-body"><XCircle className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Auto-qualification result */}
          <div className={`rounded-lg p-4 border ${ok ? "border-caa-success/30 bg-caa-success/5" : "border-caa-danger/30 bg-caa-danger/5"}`}>
            <div className="flex items-center gap-2 mb-3">
              {ok ? <CheckCircle2 className="h-5 w-5 text-caa-success" /> : <XCircle className="h-5 w-5 text-caa-danger" />}
              <span className={`font-bold text-sm ${ok ? "text-caa-success" : "text-caa-danger"}`}>
                {ok ? "Applicant meets requirements" : "One or more requirements not met"}
              </span>
            </div>
            {checks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {checks.map((c: any) => (
                  <div key={c.label} className={`px-2.5 py-1.5 rounded-md text-[11px] border ${c.pass ? "border-caa-success/20 bg-white" : "border-caa-danger/20 bg-white"}`}>
                    <span className={`font-semibold ${c.pass ? "text-caa-success" : "text-caa-danger"}`}>{c.pass ? "✓" : "✗"} {c.label}</span>
                    <p className="text-caa-muted mt-0.5">{c.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-caa-muted">CV data not yet available — candidate hasn't submitted their CV through this portal. Analysis cannot run.</p>
            )}
          </div>

          {/* CV data */}
          {cv ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy">Candidate CV</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {[
                  ["Full name", `${cv.personal.firstName} ${cv.personal.otherName ?? ""} ${cv.personal.lastName}`.trim()],
                  ["Email", cv.personal.email || app.candidateEmail],
                  ["Phone", cv.personal.phone || "—"],
                  ["Date of birth", cv.personal.dob || "—"],
                  ["Gender", cv.personal.gender || "—"],
                  ["Nationality", cv.personal.nationality || "—"],
                  ["NIN", cv.personal.nin || "—"],
                  ["Address", cv.personal.address || "—"],
                ].map(([label, value]) => (
                  <div key={label}><span className="text-caa-muted text-xs">{label}:</span> <span className="font-medium text-caa-body">{value}</span></div>
                ))}
              </div>
              {cv.qualifications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-caa-navy mb-1">Qualifications</p>
                  <div className="space-y-1">
                    {cv.qualifications.map((q: any, i: number) => (
                      <p key={i} className="text-xs text-caa-body">{q.level} — {q.course || q.school} ({q.institution || q.school}, {q.year})</p>
                    ))}
                  </div>
                </div>
              )}
              {cv.experience.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-caa-navy mb-1">Experience</p>
                  {cv.experience.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-caa-body">{e.title} at {e.organisation} ({e.start}–{e.end})</p>
                  ))}
                </div>
              )}
              {cv.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-caa-navy mb-1">Skills</p>
                  <p className="text-xs text-caa-body">{cv.skills.join(" · ")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-caa-border p-4 text-sm text-caa-muted text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-caa-muted/50" />
              CV not on file — candidate applied before completing their portal profile, or the CV was submitted in a different session.
            </div>
          )}

          {/* Action buttons */}
          {canShortlist && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-2">Update status & notify candidate</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {actionButtons.map((btn) => (
                  <button
                    key={btn.status}
                    disabled={app.status === btn.status}
                    onClick={() => {
                      const em = buildEmail(btn.status, app.candidateName ?? "Applicant", app.title);
                      setConfirmStatus(btn.status);
                      setEmailSubject(em.subject);
                      setNotifMsg(em.body);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md disabled:opacity-40 transition-opacity ${btn.color}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              {confirmStatus && (
                <div className="border border-caa-border rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-caa-muted uppercase tracking-widest mb-1">Email preview — to <span className="text-caa-navy normal-case">{app.candidateEmail}</span></p>
                    <p className="text-xs font-semibold text-caa-body mb-1">Subject: {emailSubject}</p>
                    <textarea rows={6} className={`${fi} text-xs font-mono`} value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => { onUpdateStatus(confirmStatus, notifMsg); setConfirmStatus(null); }}
                      className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md"
                    >
                      Confirm status update
                    </button>
                    <a
                      href={`mailto:${app.candidateEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(notifMsg)}`}
                      onClick={() => { onUpdateStatus(confirmStatus, notifMsg); setConfirmStatus(null); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-navy text-caa-navy rounded-md hover:bg-caa-navy/5"
                    >
                      <ExternalLink className="h-3 w-3" /> Send via email client
                    </a>
                    <button onClick={() => setConfirmStatus(null)} className="px-3 py-1.5 text-xs border border-caa-border rounded-md">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CV download — available whenever the candidate has a CV on file */}
          {cv && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-caa-navy/5 border border-caa-navy/15">
              <FileText className="h-5 w-5 text-caa-navy shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-caa-navy">Candidate CV</p>
                <p className="text-[11px] text-caa-muted mt-0.5">Download this candidate's CV as a system-generated PDF.</p>
              </div>
              <button
                onClick={() => downloadCandidateCv(cv, app, actor)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-navy text-caa-navy rounded-md hover:bg-caa-navy/5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Download CV PDF
              </button>
            </div>
          )}

          {/* Offer letter download — visible once candidate is Offered */}
          {app.status === "Offered" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-caa-success/8 border border-caa-success/20">
              <CheckCircle2 className="h-5 w-5 text-caa-success shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-caa-success">Offer extended</p>
                <p className="text-[11px] text-caa-muted mt-0.5">Generate the formal offer letter for this candidate.</p>
              </div>
              <button
                onClick={() => downloadOfferLetter(app, job, actor)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-success text-white rounded-md hover:opacity-90 shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Offer Letter PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Site Analytics ───────────────────────────────────────────────────────────

