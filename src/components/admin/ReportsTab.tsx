import { useState } from "react";
import {
  Users, Briefcase, Archive, FileText, GraduationCap, Download, ClipboardList, FileDown, Filter, TrendingUp, FileSearch,
} from "lucide-react";
import {
  type Application,
} from "@/context/AppContext";
import {
  downloadJobsReport, downloadApplicationsReport, downloadDepartmentSummary, downloadAuditLog, downloadInternsReport, downloadStaffReport, downloadTimeToHireReport, downloadDiversityReport, downloadScreeningPassRateReport, downloadApplicantsPerClosingDateReport,
} from "@/lib/admin-pdf";
import { STAFF_DATA, fi } from "./shared";

export function ReportsTab({ jobs, applications, audit, actor, cvStore }: any) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const rangeApps = (apps: Application[]) => {
    if (!fromDate && !toDate) return apps;
    return apps.filter((a: Application) => {
      const d = new Date(a.date);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate)) return false;
      return true;
    });
  };

  const internApps = applications.filter((a: Application) => a.cgpa !== undefined);
  const filteredApps = rangeApps(applications);

  const reports = [
    { title: "Vacancies Report",             desc: `${jobs.length} job listings`,                                                   Icon: Briefcase,     action: () => downloadJobsReport(jobs, actor) },
    { title: "Applications Report",          desc: `${filteredApps.length} applications${fromDate || toDate ? " (filtered)" : ""}`, Icon: FileText,      action: () => downloadApplicationsReport(filteredApps, jobs, actor) },
    { title: "Department Summary",           desc: "Applications and shortlisted counts by department",                             Icon: TrendingUp,    action: () => downloadDepartmentSummary(jobs, filteredApps, actor) },
    { title: "Intern CGPA Ranking",          desc: `${internApps.length} intern applications ranked by CGPA`,                      Icon: GraduationCap, action: () => downloadInternsReport(internApps, jobs, actor) },
    { title: "Internal Staff Register",      desc: `${STAFF_DATA.length} CAA staff records`,                                       Icon: Users,         action: () => downloadStaffReport(STAFF_DATA, actor) },
    { title: "Audit Log",                    desc: `${audit.length} recorded admin actions`,                                       Icon: ClipboardList, action: () => downloadAuditLog(audit, actor) },
    { title: "Time-to-Hire Report",          desc: "Average days from application to offer, per vacancy",                          Icon: TrendingUp,    action: () => downloadTimeToHireReport(filteredApps, jobs, actor) },
    { title: "Diversity Summary",            desc: "Gender breakdown of applicants based on CV data",                              Icon: Users,         action: () => downloadDiversityReport(filteredApps, cvStore, actor) },
    { title: "Screening Pass Rate",          desc: "Shortlist conversion rate per vacancy",                                        Icon: FileSearch,    action: () => downloadScreeningPassRateReport(filteredApps, jobs, actor) },
    { title: "Applicants per Closing Date",  desc: "Application volume grouped by vacancy deadline",                               Icon: Archive,       action: () => downloadApplicantsPerClosingDateReport(filteredApps, jobs, actor, fromDate, toDate) },
  ];

  return (
    <div className="space-y-4">
      <div><h1 className="font-bold text-xl text-caa-body">Reports & Exports</h1><p className="text-xs text-caa-muted mt-0.5">PDFs styled to the UCAA letterhead standard.</p></div>

      {/* Date-range filter */}
      <div className="caa-card p-4 flex flex-wrap items-end gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy w-full -mb-1">Filter applications by date range</p>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-caa-muted mb-1">From</label>
          <input type="date" className={fi} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-caa-muted mb-1">To</label>
          <input type="date" className={fi} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); }} className="px-3 py-1.5 text-xs border border-caa-border rounded-md text-caa-muted hover:border-caa-navy">
            Clear filter
          </button>
        )}
        {(fromDate || toDate) && (
          <p className="text-[11px] text-caa-navy w-full -mt-1">{filteredApps.length} of {applications.length} applications match this range.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div key={r.title} className="caa-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-caa-navy/8 flex items-center justify-center shrink-0"><r.Icon className="h-4.5 w-4.5 text-caa-navy" /></div>
              <div><p className="font-semibold text-sm text-caa-body">{r.title}</p><p className="text-xs text-caa-muted mt-0.5 leading-relaxed">{r.desc}</p></div>
            </div>
            <button onClick={r.action} className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2"><FileDown className="h-3.5 w-3.5" /> Download PDF</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Criteria Setup ───────────────────────────────────────────────────────────

