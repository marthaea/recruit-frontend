import { useState, useEffect } from "react";
import {
  Users, Briefcase, Archive, FileText, GraduationCap, Download, ClipboardList, FileDown, Filter, TrendingUp, FileSearch,
  CalendarClock, Plane,
} from "lucide-react";
import {
  useApp,
  APPLICATION_STATUSES,
  type Application,
} from "@/context/AppContext";
import {
  downloadJobsReport, downloadJobRequirementsReport, downloadApplicationsReport, downloadDepartmentSummary, downloadAuditLog, downloadInternsReport, downloadStaffReport, downloadTimeToHireReport, downloadDiversityReport, downloadScreeningPassRateReport, downloadApplicantsPerClosingDateReport,
  downloadAssessmentScheduleReport, downloadCandidateAssessmentReport, downloadDeploymentReport,
} from "@/lib/admin-pdf";
import { assessments as assessmentsApi, applications as appsApi } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv-export";
import { STAFF_DATA, fi, Field } from "./shared";

const jobActiveLabel = (j: any) => (j.status === "published" && new Date(j.closesAt) >= new Date()) ? "Active" : "Closed";

export function ReportsTab({ jobs, applications, audit, actor, cvStore }: any) {
  const { departments, loadDepartments, pushToast } = useApp();
  useEffect(() => { loadDepartments(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [assessmentRows, setAssessmentRows] = useState<any[]>([]);
  useEffect(() => {
    assessmentsApi.listAll().then((r) => { if (r.success) setAssessmentRows(r.data); }).catch(() => {});
  }, []);

  const [deploying, setDeploying] = useState<Record<number, { station: string; date: string }>>({});
  const saveDeployment = async (appId: number) => {
    const d = deploying[appId];
    if (!d) return;
    try {
      await appsApi.setDeployment(appId, { deploymentStation: d.station || undefined, deploymentDate: d.date || undefined });
      pushToast({ type: "success", title: "Deployment saved" });
    } catch (err) {
      pushToast({ type: "warning", title: "Could not save deployment", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const hasFilters = !!(fromDate || toDate || deptFilter || jobFilter || statusFilter);

  const applyFilters = (apps: Application[]) => apps.filter((a: Application) => {
    if (fromDate && new Date(a.date) < new Date(fromDate)) return false;
    if (toDate && new Date(a.date) > new Date(toDate)) return false;
    if (deptFilter && a.dept !== deptFilter) return false;
    if (jobFilter && String(a.jobId) !== jobFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  const filteredJobs = deptFilter ? jobs.filter((j: any) => j.dept === deptFilter) : jobs;
  const internApps = applyFilters(applications.filter((a: Application) => a.cgpa !== undefined));
  const filteredApps = applyFilters(applications);
  const filteredStaff = deptFilter ? STAFF_DATA.filter((s) => s.dept === deptFilter) : STAFF_DATA;

  const jobTitleFilter = jobFilter ? jobs.find((j: any) => String(j.id) === jobFilter)?.title : undefined;
  const filteredAssessmentRows = assessmentRows.filter((r) =>
    (!deptFilter || r.dept === deptFilter) && (!jobTitleFilter || r.jobTitle === jobTitleFilter)
  );
  const offeredApps = filteredApps.filter((a) => a.status === "Offered");

  const reports = [
    { title: "Vacancies Report",             desc: `${filteredJobs.length} job listings`,                                           Icon: Briefcase,     action: () => downloadJobsReport(filteredJobs, actor),
      csv: () => downloadCsv("caa-vacancies", ["Title", "Department", "Location", "Employment Category", "Sourcing Type", "Salary Scale", "Status", "Active/Closed", "Closes", "Vacancies"],
        filteredJobs.map((j: any) => [j.title, j.dept, j.location, j.type, j.visibility, j.salaryBand, j.status ?? "published", jobActiveLabel(j), j.closes, j.vacancies ?? 1])) },
    { title: "Job Requirement Report",       desc: "Qualification, experience, and salary requirements per vacancy",               Icon: FileText,      action: () => downloadJobRequirementsReport(filteredJobs, actor),
      csv: () => downloadCsv("caa-job-requirements", ["Title", "Min Age", "Required Experience (yrs)", "Required Qualification", "Salary Scale", "Active/Closed"],
        filteredJobs.map((j: any) => [j.title, j.minAge, j.requiredExperience, j.requiredQualification, j.salaryBand, jobActiveLabel(j)])) },
    { title: "Applications Report",          desc: `${filteredApps.length} applications${hasFilters ? " (filtered)" : ""}`,        Icon: FileText,      action: () => downloadApplicationsReport(filteredApps, filteredJobs, actor),
      csv: () => downloadCsv("caa-applications", ["ID", "Candidate", "Email", "Role", "Department", "Date", "Status", "Completion%"],
        filteredApps.map((a) => [a.id, a.candidateName ?? "", a.candidateEmail ?? "", a.title, a.dept, a.date, a.status, a.completion])) },
    { title: "Candidate Shortlisting Report", desc: "Applications currently at Shortlisted stage",                                 Icon: FileSearch,    action: () => downloadApplicationsReport(filteredApps.filter((a) => a.status === "Shortlisted"), filteredJobs, actor, "Candidate Shortlisting Report"),
      csv: () => downloadCsv("caa-shortlisting", ["ID", "Candidate", "Email", "Role", "Department", "Date", "Completion%"],
        filteredApps.filter((a) => a.status === "Shortlisted").map((a) => [a.id, a.candidateName ?? "", a.candidateEmail ?? "", a.title, a.dept, a.date, a.completion])) },
    { title: "Department Summary",           desc: "Applications and shortlisted counts by department",                             Icon: TrendingUp,    action: () => downloadDepartmentSummary(filteredJobs, filteredApps, actor),
      csv: () => { const depts = Array.from(new Set(filteredJobs.map((j: any) => j.dept)));
        downloadCsv("caa-department-summary", ["Department", "Listings", "Applications", "Shortlisted", "Offered"],
          depts.map((d) => { const dJobs = filteredJobs.filter((j: any) => j.dept === d); const dApps = filteredApps.filter((a) => dJobs.some((j: any) => j.id === a.jobId));
            return [d as string, dJobs.length, dApps.length, dApps.filter((a) => a.status === "Shortlisted").length, dApps.filter((a) => a.status === "Offered").length]; })); } },
    { title: "Intern CGPA Ranking",          desc: `${internApps.length} intern applications ranked by CGPA`,                      Icon: GraduationCap, action: () => downloadInternsReport(internApps, filteredJobs, actor),
      csv: () => downloadCsv("caa-intern-cgpa-ranking", ["Candidate", "Email", "Role", "CGPA", "University", "Status"],
        [...internApps].sort((a, b) => (b.cgpa ?? 0) - (a.cgpa ?? 0)).map((a) => [a.candidateName ?? "", a.candidateEmail ?? "", a.title, a.cgpa ?? "", a.university ?? "", a.status])) },
    { title: "Internal Staff Register",      desc: `${filteredStaff.length} CAA staff records`,                                     Icon: Users,         action: () => downloadStaffReport(filteredStaff, actor),
      csv: () => downloadCsv("caa-staff-register", ["Emp No", "Full Name", "Department", "Position", "Email", "Joined", "Status"],
        filteredStaff.map((s) => [s.empNo, `${s.firstName} ${s.lastName}`, s.dept, s.position, s.email, s.joined, s.status])) },
    { title: "Audit Log",                    desc: `${audit.length} recorded admin actions`,                                       Icon: ClipboardList, action: () => downloadAuditLog(audit, actor),
      csv: () => downloadCsv("caa-audit-log", ["Timestamp", "Actor", "Role", "Action", "Target"],
        audit.map((e: any) => [new Date(e.at).toLocaleString(), e.actor, e.role, e.action, e.target ?? ""])) },
    { title: "Time-to-Hire Report",          desc: "Average days from application to offer, per vacancy",                          Icon: TrendingUp,    action: () => downloadTimeToHireReport(filteredApps, filteredJobs, actor),
      csv: () => { const jobMap = new Map(filteredJobs.map((j: any) => [j.id, j])); const byJob: Record<number, { title: string; count: number; totalDays: number; offered: number }> = {};
        filteredApps.forEach((a) => { if (!a.jobId) return; const d = new Date(a.date); if (Number.isNaN(d.getTime())) return; const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
          if (!byJob[a.jobId]) byJob[a.jobId] = { title: (jobMap.get(a.jobId) as any)?.title ?? `Job #${a.jobId}`, count: 0, totalDays: 0, offered: 0 };
          byJob[a.jobId].count++; byJob[a.jobId].totalDays += days; if (a.status === "Offered") byJob[a.jobId].offered++; });
        downloadCsv("caa-time-to-hire", ["Job Title", "Applications", "Offers Made", "Avg Days (all)", "Avg Days (to offer)"],
          Object.values(byJob).map((v) => [v.title, v.count, v.offered, v.count > 0 ? Math.round(v.totalDays / v.count) : "", v.offered > 0 ? Math.round(v.totalDays / v.offered) : ""])); } },
    { title: "Diversity Summary",            desc: "Gender breakdown of applicants based on CV data",                              Icon: Users,         action: () => downloadDiversityReport(filteredApps, cvStore, actor),
      csv: () => { let male = 0, female = 0, other = 0, unknown = 0;
        filteredApps.forEach((a) => { const cv = a.candidateEmail ? cvStore[a.candidateEmail.toLowerCase()] : undefined; const g = (cv?.personal?.gender ?? "").toLowerCase();
          if (g === "male") male++; else if (g === "female") female++; else if (g) other++; else unknown++; });
        downloadCsv("caa-diversity-summary", ["Gender", "Count"], [["Male", male], ["Female", female], ["Other", other], ["Not available", unknown], ["TOTAL", filteredApps.length]]); } },
    { title: "Screening Pass Rate",          desc: "Shortlist conversion rate per vacancy",                                        Icon: FileSearch,    action: () => downloadScreeningPassRateReport(filteredApps, filteredJobs, actor),
      csv: () => { const jobMap = new Map(filteredJobs.map((j: any) => [j.id, j])); const byJob: Record<number, { title: string; total: number; passed: number; declined: number }> = {};
        filteredApps.forEach((a) => { if (!a.jobId) return; if (!byJob[a.jobId]) byJob[a.jobId] = { title: (jobMap.get(a.jobId) as any)?.title ?? `Job #${a.jobId}`, total: 0, passed: 0, declined: 0 };
          byJob[a.jobId].total++; if (["Shortlisted", "Shortlisted II", "Interview", "Offered"].includes(a.status)) byJob[a.jobId].passed++; if (a.status === "Declined") byJob[a.jobId].declined++; });
        downloadCsv("caa-screening-pass-rate", ["Job Title", "Total Applications", "Shortlisted+", "Declined", "Pass Rate %"],
          Object.values(byJob).map((v) => [v.title, v.total, v.passed, v.declined, v.total > 0 ? ((v.passed / v.total) * 100).toFixed(1) : ""])); } },
    { title: "Applicants per Closing Date",  desc: "Application volume grouped by vacancy deadline",                               Icon: Archive,       action: () => downloadApplicantsPerClosingDateReport(filteredApps, filteredJobs, actor, fromDate, toDate),
      csv: () => { const jobMap = new Map(filteredJobs.map((j: any) => [j.id, j])); const byJob: Record<number, { title: string; closes: string; count: number }> = {};
        filteredApps.forEach((a) => { if (!a.jobId) return; const j = jobMap.get(a.jobId) as any; if (!byJob[a.jobId]) byJob[a.jobId] = { title: j?.title ?? `Job #${a.jobId}`, closes: j?.closes ?? "—", count: 0 }; byJob[a.jobId].count++; });
        downloadCsv("caa-applicants-per-closing-date", ["Job Title", "Closing Date", "Applications Received"],
          Object.values(byJob).map((v) => [v.title, v.closes, v.count])); } },
    { title: "Assessment Schedule Report",   desc: `${filteredAssessmentRows.filter((r) => r.scheduledAt).length} scheduled assessments`, Icon: CalendarClock, action: () => downloadAssessmentScheduleReport(filteredAssessmentRows, actor),
      csv: () => downloadCsv("caa-assessment-schedule", ["Candidate", "Role", "Type", "Scheduled At", "Venue"],
        filteredAssessmentRows.map((r) => [r.candidateName ?? "", r.jobTitle ?? "", r.type ?? "", r.scheduledAt ?? "", r.venue ?? ""])) },
    { title: "Candidate Assessment Report",  desc: `${filteredAssessmentRows.filter((r) => r.passed !== null).length} recorded results`, Icon: FileSearch,    action: () => downloadCandidateAssessmentReport(filteredAssessmentRows, actor),
      csv: () => downloadCsv("caa-candidate-assessment", ["Candidate", "Role", "Type", "Score", "Passed", "Notes"],
        filteredAssessmentRows.map((r) => [r.candidateName ?? "", r.jobTitle ?? "", r.type ?? "", r.score ?? "", r.passed === true ? "Yes" : r.passed === false ? "No" : "", r.notes ?? ""])) },
    { title: "Candidate Deployment Report",  desc: `${offeredApps.length} offered candidates`,                                      Icon: Plane,         action: () => downloadDeploymentReport(filteredApps, actor),
      csv: () => downloadCsv("caa-deployment", ["Candidate", "Email", "Role", "Deployment Station", "Reporting Date"],
        offeredApps.map((a) => [a.candidateName ?? "", a.candidateEmail ?? "", a.title, a.deploymentStation ?? "", a.deploymentDate ?? ""])) },
  ];

  return (
    <div className="space-y-4">
      <div><h1 className="font-bold text-xl text-caa-body">Reports & Exports</h1><p className="text-xs text-caa-muted mt-0.5">PDFs styled to the UCAA letterhead standard.</p></div>

      {/* Filters */}
      <div className="caa-card p-4 flex flex-wrap items-end gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy w-full -mb-1">Filter reports</p>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-caa-muted mb-1">From</label>
          <input type="date" className={fi} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-caa-muted mb-1">To</label>
          <input type="date" className={fi} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-caa-muted mb-1">Department</label>
          <select className={fi} value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setJobFilter(""); }}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-caa-muted mb-1">Job</label>
          <select className={fi} value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
            <option value="">All jobs</option>
            {filteredJobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-caa-muted mb-1">Status</label>
          <select className={fi} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {hasFilters && (
          <button onClick={() => { setFromDate(""); setToDate(""); setDeptFilter(""); setJobFilter(""); setStatusFilter(""); }} className="px-3 py-1.5 text-xs border border-caa-border rounded-md text-caa-muted hover:border-caa-navy">
            Clear filters
          </button>
        )}
        {hasFilters && (
          <p className="text-[11px] text-caa-navy w-full -mt-1">{filteredApps.length} of {applications.length} applications match these filters.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div key={r.title} className="caa-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-caa-navy/8 flex items-center justify-center shrink-0"><r.Icon className="h-4.5 w-4.5 text-caa-navy" /></div>
              <div><p className="font-semibold text-sm text-caa-body">{r.title}</p><p className="text-xs text-caa-muted mt-0.5 leading-relaxed">{r.desc}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={r.action} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2"><FileDown className="h-3.5 w-3.5" /> PDF</button>
              <button onClick={r.csv} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-navy text-caa-navy rounded-md hover:bg-caa-navy/5"><Download className="h-3.5 w-3.5" /> CSV</button>
            </div>
          </div>
        ))}
      </div>

      {offeredApps.length > 0 && (
        <div className="caa-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy mb-3">Set candidate deployment</p>
          <div className="space-y-2">
            {offeredApps.map((a: Application) => {
              const draft = deploying[a.id] ?? { station: a.deploymentStation ?? "", date: a.deploymentDate ?? "" };
              return (
                <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end border-b border-caa-border pb-2 last:border-0">
                  <Field label={a.candidateName ?? "Candidate"}>
                    <p className="text-xs text-caa-muted pt-1.5">{a.title}</p>
                  </Field>
                  <Field label="Deployment station">
                    <input className={fi} value={draft.station} onChange={(e) => setDeploying((d) => ({ ...d, [a.id]: { ...draft, station: e.target.value } }))} placeholder="e.g. Entebbe International Airport" />
                  </Field>
                  <Field label="Reporting date">
                    <input type="date" className={fi} value={draft.date} onChange={(e) => setDeploying((d) => ({ ...d, [a.id]: { ...draft, date: e.target.value } }))} />
                  </Field>
                  <button onClick={() => saveDeployment(a.id)} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md">Save</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Criteria Setup ───────────────────────────────────────────────────────────

