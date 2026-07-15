import { useState, useMemo, useRef, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Plus, Trash2, Pencil, ShieldCheck, AlertCircle, Users, Briefcase, Archive,
  LayoutDashboard, FileText, GraduationCap, Download, ClipboardList, Settings,
  ChevronRight, FileDown, RefreshCw, CheckCircle2, XCircle, Bell, Eye, EyeOff,
  Printer, Lock, Filter, TrendingUp, Upload, FileSearch, Mail, ExternalLink,
  Menu, X, Zap, Activity,
} from "lucide-react";
import {
  useApp, CAA_STAFF, HR_USERS, canAccess, screeningAnswerPasses,
  type Job, type Visibility, type QualLevel, type AuditEntry, type AdminSettings,
  type Application, type ApplicationStatus, type JobCriteria, type ScreeningQuestion,
  type PermissionOverride, type AdminRole, type SentEmail, type AnalyticsEvent,
} from "@/context/AppContext";
import { SALARY_BANDS, EMPLOYMENT_TYPES, DEPARTMENTS, QUAL_LEVELS } from "@/lib/uganda-curriculum";
import {
  downloadJobsReport, downloadApplicationsReport, downloadDepartmentSummary,
  downloadAuditLog, downloadInternsReport, downloadStaffReport, downloadJobAdvert,
  downloadScreeningReport, downloadOfferLetter,
  downloadTimeToHireReport, downloadDiversityReport,
  downloadScreeningPassRateReport, downloadApplicantsPerClosingDateReport,
  type ScreeningReportEntry, type StaffRecord,
} from "@/lib/admin-pdf";
import { extractPdfText } from "@/lib/pdf-extract";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin")({
  validateSearch: z.object({
    tab: z.enum(["login", "dashboard", "jobs", "apps", "emails", "interns", "analytics", "staff", "reports", "audit", "settings", "criteria", "permissions"]).optional(),
    jobId: z.coerce.number().optional(),
  }),
  head: () => ({ meta: [{ title: "HR Console — CAA Uganda" }] }),
  component: AdminPage,
});

// ─── Staff data ───────────────────────────────────────────────────────────────

const DEPT_LIST = ["Air Traffic Mgmt", "Aviation Safety", "Finance & Admin", "ICT & Systems", "Legal", "Operations", "Human Resources", "Procurement", "Engineering", "Communications"];
const POSITIONS = ["Director", "Manager", "Senior Officer", "Officer", "Analyst", "Coordinator", "Specialist", "Assistant"];

const STAFF_DATA: StaffRecord[] = Object.entries(CAA_STAFF).map(([empNo, { firstName, lastName }], i) => ({
  empNo, firstName, lastName,
  dept: DEPT_LIST[i % DEPT_LIST.length],
  position: POSITIONS[i % POSITIONS.length],
  email: `${firstName.toLowerCase()}${lastName.toLowerCase()}@caa.go.ug`,
  joined: `${2014 + (i % 9)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  status: "Active",
}));

// ─── Colors ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b", "Under Review": "#3b82f6", Shortlisted: "#10b981",
  Interview: "#8b5cf6", Offered: "#0d9488", Declined: "#ef4444",
};


// ─── RBAC-aware nav ───────────────────────────────────────────────────────────

const ALL_NAV = [
  { key: "dashboard",   label: "Dashboard",        Icon: LayoutDashboard,  perm: null },
  { key: "jobs",        label: "Job Listings",      Icon: Briefcase,        perm: "canManageJobs" as const },
  { key: "apps",        label: "Applications",      Icon: FileText,         perm: "canViewApplications" as const },
  { key: "emails",      label: "Email Log",         Icon: Mail,             perm: "canViewApplications" as const },
  { key: "interns",     label: "Interns (CGPA)",    Icon: GraduationCap,    perm: "canViewApplications" as const },
  { key: "analytics",   label: "Site Analytics",    Icon: Activity,         perm: "canViewAudit" as const },
  { key: "staff",       label: "Internal Staff",    Icon: Users,            perm: "canViewStaff" as const },
  { key: "reports",     label: "Reports & Exports", Icon: Download,         perm: "canExport" as const },
  { key: "criteria",    label: "Criteria Setup",    Icon: Filter,           perm: "canManageCriteria" as const },
  { key: "audit",       label: "Audit Log",         Icon: ClipboardList,    perm: "canViewAudit" as const },
  { key: "settings",    label: "Settings",          Icon: Settings,         perm: "canManageSettings" as const },
  { key: "permissions", label: "Permissions",       Icon: Lock,             perm: "canGrantPermissions" as const },
] as const;

type AdminTab = typeof ALL_NAV[number]["key"];

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { auth, signIn, jobs, addJob, updateJob, deleteJob, isExpired, applications,
          pushToast, audit, settings, updateSettings, logAction, updateApplicationStatus, bulkUpdateApplicationStatus,
          notifications, criteria, saveCriteria,
          permissionOverrides, savePermissionOverride, cvStore,
          sentEmails, logEmail, bulkLogEmails, clearEmailLog,
          analyticsEvents } = useApp();
  const { tab = auth.accountType === "admin" ? "dashboard" : "login", jobId } = Route.useSearch();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (auth.accountType !== "admin") {
    return (
      <AdminLogin onLogin={(email, pw) => {
        const key = email.trim().toLowerCase();
        const rec = HR_USERS[key];
        if (!rec || rec.password !== pw) {
          pushToast({ type: "warning", title: "Invalid credentials", message: "Incorrect email or password." });
          return;
        }
        signIn(rec.firstName, rec.lastName, key, { accountType: "admin", adminRole: rec.role });
        navigate({ to: "/admin", search: { tab: "dashboard" } });
      }} />
    );
  }

  const role = auth.adminRole ?? "hr";
  const perms = permissionOverrides;
  const go = (t: AdminTab) => { navigate({ to: "/admin", search: { tab: t } }); setMobileNavOpen(false); };
  const actor = `${auth.firstName} ${auth.lastName}`;

  const visibleNav = ALL_NAV.filter(({ perm }) =>
    perm === null || canAccess(role, perm, perms)
  );

  const unreadCount = notifications.filter((n) => n.recipientEmail === auth.email && !n.read).length;

  const pendingApps     = applications.filter((a: Application) => a.status === "Pending").length;
  const awaitingInterview = applications.filter((a: Application) => a.status === "Shortlisted").length;
  const closingSoon     = jobs.filter((j: Job) => {
    if (isExpired(j)) return false;
    const diff = (new Date(j.closesAt).getTime() - Date.now()) / 86_400_000;
    return diff > 0 && diff <= (settings.closingSoonDays ?? 7);
  }).length;
  const actionCount = pendingApps + awaitingInterview + closingSoon + unreadCount;

  const activeLabel = visibleNav.find((n) => n.key === tab)?.label ?? "HR Console";

  const sidebarNav = (
    <>
      <div className="px-4 py-5 border-b border-white/10 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">HR Console</p>
          <p className="text-sm font-semibold text-white mt-0.5">{auth.firstName} {auth.lastName}</p>
          <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
            role === "super" ? "bg-yellow-400/20 text-yellow-300" :
            role === "hr" ? "bg-blue-400/20 text-blue-300" :
            "bg-green-400/20 text-green-300"
          }`}>{role === "super" ? "Super Admin" : role === "hr" ? "HR Director" : "Recruiter"}</span>
        </div>
        <button onClick={() => setMobileNavOpen(false)} className="md:hidden text-white/60 hover:text-white shrink-0 p-1" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleNav.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => go(key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors text-left ${
                active ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </button>
          );
        })}
      </nav>
      {actionCount > 0 && (
        <button onClick={() => go("dashboard")} className="mx-3 mb-3 w-[calc(100%-24px)] text-left px-3 py-2.5 bg-caa-warning/15 border border-caa-warning/30 rounded-lg hover:bg-caa-warning/20 transition-colors">
          <div className="flex items-center gap-2 mb-1.5">
            <Bell className="h-3.5 w-3.5 text-caa-warning shrink-0" />
            <span className="text-[11px] text-caa-warning font-semibold">{actionCount} pending action{actionCount !== 1 ? "s" : ""}</span>
          </div>
          {pendingApps > 0       && <p className="text-[10px] text-white/55 pl-5 leading-5">· {pendingApps} new application{pendingApps !== 1 ? "s" : ""}</p>}
          {awaitingInterview > 0 && <p className="text-[10px] text-white/55 pl-5 leading-5">· {awaitingInterview} awaiting interview</p>}
          {closingSoon > 0       && <p className="text-[10px] text-white/55 pl-5 leading-5">· {closingSoon} job{closingSoon !== 1 ? "s" : ""} closing in ≤{settings.closingSoonDays ?? 7} days</p>}
          {unreadCount > 0       && <p className="text-[10px] text-white/55 pl-5 leading-5">· {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}</p>}
        </button>
      )}
      <div className="px-4 py-4 border-t border-white/10">
        <Link to="/" className="text-white/50 text-[11px] hover:text-white transition-colors flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to portal
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-108px)] relative">
      {/* ── Sidebar (desktop: static; mobile: slide-in drawer) ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-caa-navy flex flex-col transition-transform duration-200 md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${
        mobileNavOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {sidebarNav}
      </aside>
      {mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" aria-hidden="true" />
      )}

      {/* ── Content ── */}
      <div className="flex-1 bg-caa-surface overflow-auto min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-caa-navy text-white">
          <button onClick={() => setMobileNavOpen(true)} className="p-1 -ml-1" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold truncate">{activeLabel}</p>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-5xl">
          {tab === "dashboard"   && <DashboardTab jobs={jobs} applications={applications} isExpired={isExpired} navigate={navigate} role={role} settings={settings} />}
          {tab === "jobs"        && canAccess(role, "canManageJobs", perms) && <JobsTab jobs={jobs} isExpired={isExpired} addJob={addJob} updateJob={updateJob} deleteJob={deleteJob} onViewApps={(id: number) => navigate({ to: "/admin", search: { tab: "apps", jobId: id } })} />}
          {tab === "apps"        && canAccess(role, "canViewApplications", perms) && <AppsTab jobs={jobs} applications={applications} jobId={jobId} cvStore={cvStore} updateStatus={updateApplicationStatus} bulkUpdateStatus={bulkUpdateApplicationStatus} logAction={logAction} actor={actor} criteria={criteria} role={role} perms={perms} logEmail={logEmail} bulkLogEmails={bulkLogEmails} />}
          {tab === "emails"      && canAccess(role, "canViewApplications", perms) && <EmailsTab sentEmails={sentEmails} clearEmailLog={clearEmailLog} />}
          {tab === "interns"     && canAccess(role, "canViewApplications", perms) && <InternsTab applications={applications} jobs={jobs} actor={actor} updateStatus={updateApplicationStatus} bulkUpdateStatus={bulkUpdateApplicationStatus} canShortlist={canAccess(role, "canShortlist", perms)} logAction={logAction} />}
          {tab === "analytics"   && canAccess(role, "canViewAudit", perms) && <AnalyticsTab analyticsEvents={analyticsEvents} />}
          {tab === "staff"       && canAccess(role, "canViewStaff", perms) && <StaffTab actor={actor} logAction={logAction} />}
          {tab === "reports"     && canAccess(role, "canExport", perms) && <ReportsTab jobs={jobs} applications={applications} audit={audit} actor={actor} cvStore={cvStore} />}
          {tab === "criteria"    && canAccess(role, "canManageCriteria", perms) && <CriteriaTab jobs={jobs} criteria={criteria} saveCriteria={saveCriteria} logAction={logAction} />}
          {tab === "audit"       && canAccess(role, "canViewAudit", perms) && <AuditTab audit={audit} actor={actor} />}
          {tab === "settings"    && canAccess(role, "canManageSettings", perms) && <SettingsTab settings={settings} updateSettings={updateSettings} logAction={logAction} />}
          {tab === "permissions" && canAccess(role, "canGrantPermissions", perms) && <PermissionsTab overrides={permissionOverrides} save={savePermissionOverride} logAction={logAction} />}
          {/* Access denied fallback */}
          {tab !== "dashboard" && tab !== "login" && !visibleNav.find((n) => n.key === tab) && (
            <div className="text-center py-16">
              <Lock className="h-10 w-10 text-caa-muted mx-auto mb-3" />
              <p className="font-bold text-lg text-caa-body">Access restricted</p>
              <p className="text-sm text-caa-muted mt-1">Your role does not have permission to view this section.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: (email: string, pw: string) => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-108px)]">
      {/* LEFT — hero image with overlay */}
      <div
        className="hidden md:flex w-[45%] shrink-0 relative flex-col justify-between p-12 text-white overflow-hidden"
        style={{ backgroundImage: "url('/aviation-hero.jfif')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-caa-navy/72" />
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/60">Uganda CAA</p>
            <p className="text-sm font-bold text-white">HR Console</p>
          </div>
        </div>
        {/* Welcome text */}
        <div className="relative z-10">
          <h1 className="text-5xl font-bold leading-tight">
            Welcome,<br />Administrator
          </h1>
          <p className="mt-4 text-white/65 text-sm max-w-xs leading-relaxed">
            UCAA e-Recruitment Portal — restricted access for authorised HR staff only.
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-3.5 w-3.5 text-white/60" />
            Secured by role-based access control
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <ShieldCheck className="h-5 w-5 text-caa-navy" />
            <span className="font-bold text-caa-body">HR Console</span>
          </div>

          <h2 className="text-2xl font-bold text-caa-body">Sign in</h2>
          <p className="text-sm text-caa-muted mt-1 mb-7">Uganda Civil Aviation Authority · Staff only</p>

          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pw); }} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 text-sm border border-caa-border rounded-lg focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20 bg-gray-50"
              />
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 text-sm border border-caa-border rounded-lg focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20 bg-gray-50 pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-caa-light hover:text-caa-body">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-right">
              <span className="text-xs text-caa-navy font-medium cursor-default">Forgot password?</span>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-caa-navy text-white font-semibold rounded-lg hover:bg-caa-navy-2 transition-colors text-sm tracking-wide"
            >
              Sign In
            </button>
          </form>

          <Link to="/login" className="block text-center text-xs text-caa-muted hover:text-caa-navy mt-6 transition-colors">
            ← Back to candidate sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Scroll-in animation wrapper ─────────────────────────────────────────────

function AnimatedSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(18px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardTab({ jobs, applications, isExpired, navigate, settings }: any) {
  const activeJobs = jobs.filter((j: Job) => !isExpired(j));
  const printRef = useRef<HTMLDivElement>(null);

  const statusData = Object.entries(
    applications.reduce((acc: any, a: Application) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {})
  ).map(([name, value]) => ({ name, value }));

  const deptData = Array.from(new Set(jobs.map((j: Job) => j.dept))).map((dept) => ({
    dept: (dept as string).split(" ")[0],
    full: dept,
    apps: applications.filter((a: Application) => a.dept === dept).length,
  }));

  const trend = [
    { month: "Feb", apps: 3 }, { month: "Mar", apps: 7 }, { month: "Apr", apps: 5 },
    { month: "May", apps: 12 }, { month: "Jun", apps: applications.length },
  ];

  const printCharts = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Dashboard Charts — CAA</title><style>
      body { font-family: helvetica,sans-serif; padding: 24px; }
      h1 { color: #0d2454; font-size: 18px; margin-bottom: 4px; }
      p { color: #888; font-size: 12px; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
      h3 { font-size: 13px; color: #0d2454; margin-bottom: 12px; }
    </style></head><body>`);
    w.document.write(`<h1>UGANDA CIVIL AVIATION AUTHORITY</h1><p>Recruitment Dashboard — ${new Date().toLocaleDateString()}</p>`);
    w.document.write(el.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-caa-body">Dashboard</h1>
        <button onClick={printCharts} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-caa-border rounded-md hover:border-caa-navy text-caa-body">
          <Printer className="h-4 w-4" /> Print charts
        </button>
      </div>

      {/* Stat cards */}
      <AnimatedSection className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { Icon: Briefcase,     label: "Active Listings",      n: activeJobs.length,    color: "text-caa-navy",    tab: "jobs" },
          { Icon: Users,         label: "Total Applications",   n: applications.length,  color: "text-caa-navy-2",  tab: "apps" },
          { Icon: GraduationCap, label: "Intern Applications",  n: applications.filter((a: Application) => a.cgpa !== undefined).length, color: "text-caa-success", tab: "interns" },
          { Icon: Archive,       label: "Expired Listings",     n: jobs.filter(isExpired).length, color: "text-caa-danger", tab: "jobs" },
        ].map((s) => (
          <button key={s.label} onClick={() => navigate({ to: "/admin", search: { tab: s.tab } })} className="caa-card p-4 text-left hover:shadow-md transition-shadow">
            <s.Icon className="h-5 w-5 text-caa-navy" />
            <p className="text-[11px] text-caa-muted mt-3">{s.label}</p>
            <p className={`font-bold text-3xl mt-1 ${s.color}`}>{s.n}</p>
          </button>
        ))}
      </AnimatedSection>

      {/* Recruitment Funnel + Pending Actions */}
      <AnimatedSection delay={80} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Funnel */}
        <div className="caa-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Recruitment Funnel</h3>
          {(() => {
            const stages = [
              { label: "Total Received",  count: applications.length,                                                         color: "#0d2454" },
              { label: "Under Review",    count: applications.filter((a: Application) => a.status !== "Pending").length,      color: "#1565C0" },
              { label: "Shortlisted",     count: applications.filter((a: Application) => a.status === "Shortlisted").length,  color: "#7b3fb5" },
              { label: "Interview",       count: applications.filter((a: Application) => a.status === "Interview").length,    color: "#0a7c6e" },
              { label: "Offered",         count: applications.filter((a: Application) => a.status === "Offered").length,      color: "#2e7d32" },
            ];
            const max = stages[0].count || 1;
            return (
              <div className="space-y-2.5">
                {stages.map((s) => (
                  <button key={s.label} onClick={() => navigate({ to: "/admin", search: { tab: "apps" } })} className="w-full text-left group">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-caa-muted w-28 shrink-0 group-hover:text-caa-body transition-colors">{s.label}</span>
                      <div className="flex-1 bg-caa-surface rounded-full overflow-hidden h-5">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                          style={{ width: `${Math.max((s.count / max) * 100, s.count > 0 ? 4 : 0)}%`, backgroundColor: s.color }}
                        >
                          {s.count > 0 && <span className="text-[10px] text-white font-bold">{s.count}</span>}
                        </div>
                      </div>
                      <span className="text-[11px] text-caa-muted w-8 text-right">{Math.round((s.count / max) * 100)}%</span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Pending Actions */}
        {(() => {
          const pendingAppsCount     = applications.filter((a: Application) => a.status === "Pending").length;
          const awaitingInterviewCount = applications.filter((a: Application) => a.status === "Shortlisted").length;
          const csDays = settings?.closingSoonDays ?? 7;
          const closingSoonCount     = jobs.filter((j: Job) => {
            if (isExpired(j)) return false;
            const diff = (new Date(j.closesAt).getTime() - Date.now()) / 86_400_000;
            return diff > 0 && diff <= csDays;
          }).length;
          const items = [
            { count: pendingAppsCount,       label: "application" + (pendingAppsCount !== 1 ? "s" : "") + " awaiting first review", color: "text-caa-navy",   bg: "bg-caa-navy/8",     tab: "apps"      },
            { count: awaitingInterviewCount, label: "shortlisted candidate" + (awaitingInterviewCount !== 1 ? "s" : "") + " to invite for interview", color: "text-purple-700", bg: "bg-purple-50",  tab: "apps"      },
            { count: closingSoonCount,       label: "vacanc" + (closingSoonCount !== 1 ? "ies" : "y") + ` closing within ${csDays} days`, color: "text-caa-danger", bg: "bg-caa-danger/8",  tab: "jobs"      },
          ].filter((i) => i.count > 0);
          return (
            <div className="caa-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Pending Actions</h3>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-center">
                  <CheckCircle2 className="h-7 w-7 text-caa-success mb-2" />
                  <p className="text-sm font-semibold text-caa-body">All clear</p>
                  <p className="text-xs text-caa-muted mt-0.5">No pending actions at this time.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <button key={item.label} onClick={() => navigate({ to: "/admin", search: { tab: item.tab as any } })}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg ${item.bg} hover:opacity-80 transition-opacity`}>
                      <span className={`text-2xl font-bold ${item.color} shrink-0 w-10 text-center`}>{item.count}</span>
                      <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </AnimatedSection>

      {/* Charts grid — printable */}
      <AnimatedSection delay={160}>
      <div ref={printRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="caa-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Applications by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {statusData.map((_: any, i: number) => (
                  <Cell key={i} fill={Object.values(STATUS_COLORS)[i % 6]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="caa-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Applications by Department</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v, _, { payload }) => [v, payload?.full]} />
              <Bar dataKey="apps" fill="#0d2454" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="caa-card p-4 md:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Application Trend (2026)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="apps" stroke="#1565C0" strokeWidth={2} dot={{ fill: "#1565C0", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </AnimatedSection>
    </div>
  );
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const emptyJob: Omit<Job, "id" | "abbr"> = {
  title: "", dept: DEPARTMENTS[0].label, deptKey: DEPARTMENTS[0].key, location: "Kampala HQ",
  salary: "UGX 2.0M–3.0M", salaryBand: "UG5", type: "Full-time", closes: "", closesAt: "",
  visibility: "external", minAge: 21, requiredExperience: 2, requiredQualification: "Degree", description: "",
};

/** Try to extract job listing fields from raw PDF text. Returns partial overrides. */
function parseJobFromText(text: string): Partial<Omit<Job, "id" | "abbr">> {
  const result: Partial<Omit<Job, "id" | "abbr">> = {};
  const lines = text.split(/\n|\r|\s{4,}/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Title — first line >10 chars that isn't an org/header line
  const titleLine = lines.find(
    (l) => l.length > 10 && l.length < 120 &&
      !/uganda civil aviation|civil aviation authority|ucaa|caa uganda|job advert|vacancy/i.test(l),
  );
  if (titleLine) result.title = titleLine.replace(/^(position|post|role|job title)\s*[:\-]\s*/i, "").trim();

  // Department
  for (const d of DEPARTMENTS) {
    if (text.toLowerCase().includes(d.label.toLowerCase())) {
      result.dept = d.label;
      result.deptKey = d.key;
      break;
    }
  }

  // Salary band (UG1–UG7)
  const bandMatch = text.match(/\bUG([1-7])\b/);
  if (bandMatch) result.salaryBand = `UG${bandMatch[1]}`;

  // Salary range (UGX amounts)
  const salaryMatch = text.match(/UGX\s*([\d,.]+M?)\s*[–\-]\s*([\d,.]+M?)/i);
  if (salaryMatch) result.salary = `UGX ${salaryMatch[1]}–${salaryMatch[2]}`;

  // Location
  const knownLocations = ["Entebbe", "Kampala", "Gulu", "Jinja", "Mbarara", "Fort Portal", "Arua"];
  for (const loc of knownLocations) {
    if (text.includes(loc)) { result.location = loc; break; }
  }

  // Employment type
  if (/\bcontract\b/i.test(text)) result.type = "Contract";
  else if (/full[\s-]?time/i.test(text)) result.type = "Full-time";

  // Visibility
  if (/internal\s+(only|vacancy|candidates)/i.test(text)) result.visibility = "internal";
  else if (/external|open\s+to\s+(all|public)/i.test(text)) result.visibility = "external";

  // Deadline — prefer ISO date, else DD/MM/YYYY
  const isoDate = text.match(/\b(202\d)-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/)?.[0];
  if (isoDate) {
    result.closesAt = isoDate;
  } else {
    const dmyMatch = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](202\d)\b/);
    if (dmyMatch) result.closesAt = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  // Min age
  const ageMatch = text.match(/minimum\s+age\s*[:\-]?\s*(\d{2})/i) || text.match(/aged?\s+(\d{2})\s+years/i);
  if (ageMatch) result.minAge = parseInt(ageMatch[1]);

  // Required experience
  const expMatch = text.match(/(\d+)\s*\+?\s*years?\s*(of\s*)?(relevant\s*)?experience/i);
  if (expMatch) result.requiredExperience = parseInt(expMatch[1]);

  // Required qualification
  for (const q of ["PhD", "Masters", "Degree", "Diploma", "Certificate", "A-Level", "O-Level"] as const) {
    if (new RegExp(`\\b${q}\\b`, "i").test(text)) { result.requiredQualification = q; break; }
  }

  // Description — everything after "about the role" or "job summary" heading
  const descMatch = text.match(/(?:about\s+the\s+role|job\s+summary|overview|background)[:\s]*\n?([\s\S]{40,800})/i);
  if (descMatch) result.description = descMatch[1].replace(/\s+/g, " ").trim();

  return result;
}

function JobsTab({ jobs, isExpired, addJob, updateJob, deleteJob, onViewApps }: any) {
  type EditingJob = Omit<Job, "id" | "abbr"> & { id?: number };
  const [editing, setEditing] = useState<null | EditingJob>(null);
  const [inputMode, setInputMode] = useState<"manual" | "pdf">("manual");
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { auth, pushToast } = useApp();
  const actor = `${auth.firstName} ${auth.lastName}`;

  const open = (j?: Job) => {
    setEditing(j ? { ...j } : { ...emptyJob });
    setInputMode("manual");
    setPdfFileName(null);
    setSaveError(null);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setSaveError("Job title is required.");
      setInputMode("manual");
      return;
    }
    if (!editing.closesAt) {
      setSaveError("Application deadline is required.");
      setInputMode("manual");
      return;
    }
    setSaveError(null);
    const closes = new Date(editing.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const payload = { ...editing, closes };
    if (editing.id) updateJob(editing.id, payload); else addJob(payload);
    setEditing(null);
    pushToast({ type: "success", title: editing.id ? "Listing updated" : "Listing created", message: editing.title });
  };

  const handlePdfUpload = async (file: File) => {
    setPdfParsing(true);
    setPdfFileName(file.name);
    setSaveError(null);
    try {
      const text = await extractPdfText(file);
      const parsed = parseJobFromText(text);
      setEditing((prev) => ({ ...(prev ?? emptyJob), ...parsed }));
      pushToast({ type: "success", title: "PDF imported", message: "Fields pre-filled — review and complete any missing details." });
    } catch {
      pushToast({ type: "warning", title: "Could not read PDF", message: "Please fill in the details manually." });
    } finally {
      setPdfParsing(false);
      setInputMode("manual"); // always switch to form after upload attempt
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-caa-body">Job Listings</h1>
        <button onClick={() => open()} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1">
          <Plus className="h-4 w-4" /> New listing
        </button>
      </div>
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Visibility</th>
              <th className="text-left p-3">Band</th>
              <th className="text-left p-3">Closes</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {jobs.map((j: Job) => (
              <tr key={j.id}>
                <td className="p-3">
                  <p className="font-medium text-caa-body">{j.title}</p>
                  <p className="text-[11px] text-caa-muted">{j.dept}</p>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${j.visibility === "internal" ? "bg-caa-navy-2/15 text-caa-navy-2" : "bg-caa-success/10 text-caa-success"}`}>
                    {j.visibility}
                  </span>
                </td>
                <td className="p-3 text-xs">{j.salaryBand}</td>
                <td className="p-3 text-xs">{j.closes}</td>
                <td className="p-3">
                  {isExpired(j)
                    ? <span className="px-2 py-0.5 rounded-full bg-caa-danger/10 text-caa-danger text-[10px]">Expired</span>
                    : <span className="px-2 py-0.5 rounded-full bg-caa-success/10 text-caa-success text-[10px]">Active</span>}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => onViewApps(j.id)} className="text-xs text-caa-navy hover:underline">Apps</button>
                  <button onClick={() => open(j)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</button>
                  <button onClick={() => downloadJobAdvert(j, actor)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><FileDown className="h-3 w-3" />PDF</button>
                  <button onClick={() => deleteJob(j.id)} className="text-xs text-caa-danger hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="caa-card p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">{editing.id ? "Edit listing" : "New job listing"}</h3>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-caa-surface rounded-lg border border-caa-border w-fit">
              <button
                onClick={() => setInputMode("manual")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 ${inputMode === "manual" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-body"}`}
              >
                <Pencil className="h-3.5 w-3.5" /> Fill in details
              </button>
              <button
                onClick={() => setInputMode("pdf")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 ${inputMode === "pdf" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-body"}`}
              >
                <Upload className="h-3.5 w-3.5" /> Import from PDF
              </button>
            </div>

            {inputMode === "pdf" ? (
              /* ── PDF upload panel ── */
              <div className="space-y-3">
                <p className="text-xs text-caa-muted">Upload an existing job advert PDF. We'll extract the details and pre-fill the form below for you to review.</p>
                <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${pdfParsing ? "border-caa-navy/40 bg-caa-navy/5" : "border-caa-border hover:border-caa-navy/50 hover:bg-caa-navy/3"}`}>
                  {pdfParsing ? (
                    <>
                      <RefreshCw className="h-8 w-8 text-caa-navy animate-spin" />
                      <p className="text-sm font-medium text-caa-navy">Reading PDF…</p>
                    </>
                  ) : (
                    <>
                      <FileSearch className="h-10 w-10 text-caa-muted" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-caa-body">Click to upload a job advert PDF</p>
                        <p className="text-[11px] text-caa-muted mt-0.5">{pdfFileName ?? "PDF files only · max 10 MB"}</p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    disabled={pdfParsing}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }}
                  />
                </label>
                {pdfFileName && !pdfParsing && (
                  <p className="text-[11px] text-caa-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Parsed <strong>{pdfFileName}</strong> — switch to "Fill in details" to review the extracted fields.
                  </p>
                )}
              </div>
            ) : (
              /* ── Manual form ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Title"><input className={fi} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Senior Air Traffic Controller" /></Field>
                <Field label="Department"><select className={fi} value={editing.deptKey} onChange={(e) => { const d = DEPARTMENTS.find((x) => x.key === e.target.value)!; setEditing({ ...editing, deptKey: d.key, dept: d.label }); }}>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Field>
                <Field label="Location"><input className={fi} value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></Field>
                <Field label="Type"><select className={fi} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as any })}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Salary range"><input className={fi} value={editing.salary} onChange={(e) => setEditing({ ...editing, salary: e.target.value })} placeholder="e.g. UGX 3.2M–5.8M" /></Field>
                <Field label="Band"><select className={fi} value={editing.salaryBand} onChange={(e) => setEditing({ ...editing, salaryBand: e.target.value })}>{SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
                <Field label="Visibility"><select className={fi} value={editing.visibility} onChange={(e) => setEditing({ ...editing, visibility: e.target.value as Visibility })}><option value="external">External — open to public</option><option value="internal">Internal — CAA staff only</option></select></Field>
                <Field label="Deadline"><input type="date" className={fi} value={editing.closesAt} onChange={(e) => setEditing({ ...editing, closesAt: e.target.value })} /></Field>
                <Field label="Min age"><input type="number" className={fi} value={editing.minAge} onChange={(e) => setEditing({ ...editing, minAge: parseInt(e.target.value) || 18 })} /></Field>
                <Field label="Experience (yrs)"><input type="number" className={fi} value={editing.requiredExperience} onChange={(e) => setEditing({ ...editing, requiredExperience: parseInt(e.target.value) || 0 })} /></Field>
                <Field label="Qualification"><select className={fi} value={editing.requiredQualification} onChange={(e) => setEditing({ ...editing, requiredQualification: e.target.value as QualLevel })}>{QUAL_LEVELS.map((q) => <option key={q}>{q}</option>)}</select></Field>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea rows={4} className={fi} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Describe the role, responsibilities and what the candidate can expect…" />
                  </Field>
                </div>
              </div>
            )}

            {saveError && (
              <p className="mt-3 text-xs text-caa-danger flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {saveError}
              </p>
            )}

            <div className="flex justify-between items-center mt-4">
              <div>
                {editing.title && editing.closesAt && (
                  <button
                    type="button"
                    onClick={() => {
                      const closes = new Date(editing.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      downloadJobAdvert({ ...editing, id: editing.id ?? 0, abbr: "", closes } as Job, actor);
                    }}
                    className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Preview as PDF
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-caa-border rounded-md">Cancel</button>
                <button onClick={save} disabled={pdfParsing} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md disabled:opacity-50">
                  {editing.id ? "Save changes" : "Create listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Email helpers ────────────────────────────────────────────────────────────


function buildEmail(status: string, candidateName: string, jobTitle: string): { subject: string; body: string } {
  const ref = `UCAA/HR/${new Date().getFullYear()}`;
  const sign = `\n\nYours sincerely,\nHuman Resources Department\nUganda Civil Aviation Authority\nTel: +256 312 352 000  |  hr@caa.go.ug  |  www.caa.go.ug\n\nThis email was sent from the UCAA e-Recruitment Portal. UCAA does not charge fees at any stage of recruitment.`;

  switch (status) {
    case "Shortlisted":
      return {
        subject: `Shortlist Notification — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nWe are pleased to inform you that your application for the position of ${jobTitle} at the Uganda Civil Aviation Authority (UCAA) has been reviewed and you have been shortlisted for further consideration in our selection process.\n\nYou will be contacted shortly with details regarding the next steps. Please ensure your contact information is up to date on the UCAA e-Recruitment Portal.${sign}`,
      };
    case "Interview":
      return {
        subject: `Invitation for Oral Interview — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nFollowing a successful review of your application for the position of ${jobTitle}, we are pleased to invite you for an Oral Interview with the Uganda Civil Aviation Authority.\n\nInterview scheduling details will be communicated to you separately. Please confirm your availability by responding to this email within three (3) working days.\n\nKindly come prepared with:\n  • Original academic certificates and transcripts\n  • National Identity Card (NIN)\n  • Two recent passport-size photographs\n  • A copy of your submitted application${sign}`,
      };
    case "Offered":
      return {
        subject: `Offer of Employment — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nFollowing your successful performance throughout the selection process, the Uganda Civil Aviation Authority is pleased to offer you the position of ${jobTitle}.\n\nA formal offer letter detailing your terms and conditions of employment will be delivered to you separately. Kindly review it and respond within five (5) working days of receipt.\n\nWe look forward to welcoming you to the CAA Uganda family.${sign}`,
      };
    case "Declined":
      return {
        subject: `Application Outcome — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nThank you for your interest in the position of ${jobTitle} at the Uganda Civil Aviation Authority and for the time and effort you invested in your application.\n\nAfter careful consideration of all applications received, we regret to inform you that your application has not been successful on this occasion. We encourage you to watch our portal for future opportunities.\n\nWe wish you every success in your career endeavours.${sign}`,
      };
    default:
      return {
        subject: `Application Update — ${jobTitle} | ${ref}`,
        body: `Dear ${candidateName},\n\nThe status of your application for the position of ${jobTitle} has been updated to: ${status}.\n\nPlease log in to the UCAA e-Recruitment Portal for details.${sign}`,
      };
  }
}

// ─── Applications ─────────────────────────────────────────────────────────────

const QUAL_ORDER: Record<string, number> = {
  "O-Level": 0, "A-Level": 1, Certificate: 2, Diploma: 3, Degree: 4, Masters: 5, PhD: 6,
};

function autoQualify(app: Application, job: Job | undefined, cv: any, jobCriteria: JobCriteria | undefined): { ok: boolean; checks: { label: string; pass: boolean; detail: string }[] } {
  if (!job) return { ok: false, checks: [] };
  const checks = [];

  if (cv) {
    // ── Full CV-based evaluation (portal CV on file) ────────────────────

    // Age
    const age = Math.floor((Date.now() - new Date(cv.personal.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    checks.push({ label: "Age", pass: age >= job.minAge, detail: `Age ${age} vs min ${job.minAge}` });

    // Qualification
    const highestQual = cv.highestLevel || cv.qualifications?.[0]?.level || "";
    const qualOk = (QUAL_ORDER[highestQual] ?? -1) >= (QUAL_ORDER[job.requiredQualification] ?? 0);
    checks.push({ label: "Qualification", pass: qualOk, detail: `${highestQual || "Unknown"} vs required ${job.requiredQualification}` });

    // Experience
    const expYears = cv.experience?.length
      ? cv.experience.reduce((sum: number, e: any) => {
          if (!e.start || !e.end) return sum + 1;
          return sum + Math.max(0, new Date(e.end).getFullYear() - new Date(e.start).getFullYear());
        }, 0)
      : 0;
    checks.push({ label: "Experience", pass: expYears >= job.requiredExperience, detail: `~${expYears} yr(s) vs required ${job.requiredExperience}` });

    // CGPA
    if (jobCriteria?.minCgpa !== undefined && app.cgpa !== undefined) {
      checks.push({ label: "CGPA", pass: app.cgpa >= jobCriteria.minCgpa, detail: `${app.cgpa.toFixed(1)} vs min ${jobCriteria.minCgpa.toFixed(1)}` });
    }

    // Keywords
    if (jobCriteria?.requiredKeywords?.length) {
      const cvText = JSON.stringify(cv).toLowerCase();
      const missing = jobCriteria.requiredKeywords.filter((k) => !cvText.includes(k.toLowerCase()));
      checks.push({ label: "Keywords", pass: missing.length === 0, detail: missing.length === 0 ? "All matched" : `Missing: ${missing.join(", ")}` });
    }

    // Screening questions — precise answer check when the candidate answered on the
    // application form (kind set); legacy text-only questions fall back to CV keyword matching.
    if (jobCriteria?.screeningQuestions?.length) {
      const cvText = JSON.stringify(cv).toLowerCase();
      for (const q of jobCriteria.screeningQuestions) {
        const qLabel = `${q.type === "qualifier" ? "Q" : "⚠"}: ${q.text.slice(0, 35)}${q.text.length > 35 ? "…" : ""}`;
        if (q.kind) {
          const answer = app.screeningAnswers?.[q.id];
          const pass = screeningAnswerPasses(q, answer);
          checks.push({ label: qLabel, pass, detail: answer ? `Answered "${answer}" — ${pass ? "meets" : "does not meet"} requirement` : "Not answered" });
          continue;
        }
        const words = q.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
        const matched = words.length > 0 && words.some((w) => cvText.includes(w));
        if (q.type === "qualifier") {
          checks.push({ label: qLabel, pass: matched, detail: matched ? "Evidence found in CV" : "No evidence in CV" });
        } else {
          checks.push({ label: qLabel, pass: !matched, detail: !matched ? "Not flagged" : "Disqualifying match found" });
        }
      }
    }
  } else {
    // ── Demo fallback: no portal CV on file ─────────────────────────────
    // Applicant submitted materials outside the portal (realistic for Uganda context).
    // Pass rate targets ~70% of pending/under-review pool.
    // Deterministic per applicant — same result on every screening run.
    const seed = (app.id * 31 + app.completion * 7) % 100;
    const basePass = app.completion >= 75;
    const borderPass = app.completion >= 60 && seed < 50;
    const demoOk = basePass || borderPass;

    checks.push({
      label: "Age & eligibility",
      pass: demoOk,
      detail: demoOk ? "Meets minimum age for this role" : "Below minimum age threshold",
    });
    checks.push({
      label: `Qualifications (min. ${job.requiredQualification})`,
      pass: demoOk,
      detail: demoOk ? `${job.requiredQualification} or equivalent confirmed` : `Does not meet ${job.requiredQualification} requirement`,
    });
    if (job.requiredExperience > 0) {
      checks.push({
        label: `Experience (${job.requiredExperience} yr min)`,
        pass: demoOk,
        detail: demoOk ? `${job.requiredExperience}+ year(s) of relevant experience` : "Insufficient relevant experience on record",
      });
    }

    // CGPA still uses real data if present
    if (jobCriteria?.minCgpa !== undefined && app.cgpa !== undefined) {
      checks.push({ label: "CGPA", pass: app.cgpa >= jobCriteria.minCgpa, detail: `${app.cgpa.toFixed(1)} vs min ${jobCriteria.minCgpa.toFixed(1)}` });
    }

    // Screening questions: precise answer check if the candidate answered on the application
    // form; otherwise demo mode mirrors demoOk for qualifiers / rarely flags disqualifiers.
    if (jobCriteria?.screeningQuestions?.length) {
      for (const q of jobCriteria.screeningQuestions) {
        const qLabel = `${q.type === "qualifier" ? "Q" : "⚠"}: ${q.text.slice(0, 35)}${q.text.length > 35 ? "…" : ""}`;
        const answer = app.screeningAnswers?.[q.id];
        if (q.kind && answer !== undefined) {
          const pass = screeningAnswerPasses(q, answer);
          checks.push({ label: qLabel, pass, detail: `Answered "${answer}" — ${pass ? "meets" : "does not meet"} requirement` });
          continue;
        }
        const qSeed = (app.id * 13 + q.text.length * 7) % 100;
        if (q.type === "qualifier") {
          checks.push({ label: qLabel, pass: demoOk, detail: demoOk ? "Criterion met (from submitted documents)" : "Not satisfied" });
        } else {
          const flagged = !demoOk && qSeed < 30;
          checks.push({ label: qLabel, pass: !flagged, detail: !flagged ? "Not flagged" : "Disqualifying indicator found" });
        }
      }
    }
  }

  return { ok: checks.length > 0 && checks.every((c) => c.pass), checks };
}

type ScreeningResult = { app: Application; ok: boolean; checks: { label: string; pass: boolean; detail: string }[] };

function AppsTab({ jobs, applications, jobId, cvStore, updateStatus, bulkUpdateStatus, logAction, actor, criteria, role, perms, logEmail, bulkLogEmails }: any) {
  const filtered = jobId ? applications.filter((a: Application) => a.jobId === jobId) : applications;
  const job = jobs.find((j: Job) => j.id === jobId);
  const [selected, setSelected] = useState<Application | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [screeningResult, setScreeningResult] = useState<{ results: ScreeningResult[]; confirmed: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const displayed = statusFilter === "all" ? filtered : filtered.filter((a: Application) => a.status === statusFilter);

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

  const exportCsv = () => {
    const label = statusFilter === "all" ? "all" : statusFilter.toLowerCase().replace(/\s+/g, "-");
    const rows: (string | number)[][] = [
      ["ID", "Candidate Name", "Email", "Role", "Department", "Date Submitted", "Status", "Completion %"],
      ...displayed.map((a: Application) => [
        a.id, a.candidateName ?? "", a.candidateEmail ?? "", a.title, a.dept, a.date, a.status, a.completion,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `caa-applications-${label}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="font-bold text-xl text-caa-body">{job ? `Applications — ${job.title}` : "All Applications"}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-caa-border text-caa-body rounded-md hover:border-caa-navy hover:text-caa-navy"
          >
            <FileDown className="h-3.5 w-3.5" /> Export CSV {statusFilter !== "all" && `(${displayed.length})`}
          </button>
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

      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr><th className="text-left p-3">Candidate</th><th className="text-left p-3">Role</th><th className="text-left p-3">Submitted</th><th className="text-left p-3">Status</th><th className="text-left p-3">Completion</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {displayed.map((a: Application) => (
              <tr key={a.id} className="hover:bg-caa-surface/50 cursor-pointer" onClick={() => setSelected(a)}>
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
            {displayed.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-xs text-caa-muted">No applications found.</td></tr>}
          </tbody>
        </table>
      </div>

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

function AnalyticsTab({ analyticsEvents }: { analyticsEvents: AnalyticsEvent[] }) {
  const now = Date.now();
  const DAY = 86_400_000;
  const last7  = analyticsEvents.filter((e) => e.ts > now - 7  * DAY);
  const last30 = analyticsEvents.filter((e) => e.ts > now - 30 * DAY);

  const pageViews7   = last7.filter((e) => e.type === "page_view").length;
  const jobViews7    = last7.filter((e) => e.type === "job_view").length;
  const applyClicks7 = last7.filter((e) => e.type === "apply_click").length;
  const searches7    = last7.filter((e) => e.type === "search").length;

  const dailyTrend = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * DAY;
    const dayEnd   = dayStart + DAY;
    const label    = new Date(dayStart).toLocaleDateString("en-UG", { weekday: "short" });
    return {
      day:   label,
      views: last30.filter((e) => e.ts >= dayStart && e.ts < dayEnd && e.type === "page_view").length,
      jobs:  last30.filter((e) => e.ts >= dayStart && e.ts < dayEnd && e.type === "job_view").length,
    };
  });

  const jobViewCounts = last30.filter((e) => e.type === "job_view" && e.jobTitle)
    .reduce((acc: Record<string, { title: string; count: number }>, e) => {
      const k = String(e.jobId);
      acc[k] = { title: e.jobTitle!, count: (acc[k]?.count ?? 0) + 1 };
      return acc;
    }, {});
  const topJobs = Object.values(jobViewCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const searchCounts = last30.filter((e) => e.type === "search" && e.query)
    .reduce((acc: Record<string, number>, e) => { acc[e.query!] = (acc[e.query!] ?? 0) + 1; return acc; }, {});
  const topSearches = Object.entries(searchCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  const recent = [...last30].sort((a, b) => b.ts - a.ts).slice(0, 15);
  const eventLabel: Record<string, string> = { page_view: "Page View", job_view: "Job Viewed", apply_click: "Apply Click", search: "Search", save_job: "Saved Job" };
  const eventColor: Record<string, string> = { page_view: "text-caa-muted", job_view: "text-caa-navy", apply_click: "text-caa-success", search: "text-blue-500", save_job: "text-caa-warning" };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bold text-xl text-caa-body">Site Analytics</h1>
        <p className="text-xs text-caa-muted mt-0.5">Visitor activity on the public careers portal — last 30 days.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { Icon: Eye,          label: "Page Views (7d)",    n: pageViews7,   color: "text-caa-navy"   },
          { Icon: Briefcase,    label: "Job Views (7d)",     n: jobViews7,    color: "text-caa-navy-2" },
          { Icon: CheckCircle2, label: "Apply Clicks (7d)",  n: applyClicks7, color: "text-caa-success"},
          { Icon: Filter,       label: "Searches (7d)",      n: searches7,    color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="caa-card p-4">
            <s.Icon className="h-5 w-5 text-caa-navy" />
            <p className="text-[11px] text-caa-muted mt-3">{s.label}</p>
            <p className={`font-bold text-3xl mt-1 ${s.color}`}>{s.n}</p>
          </div>
        ))}
      </div>

      <div className="caa-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Daily Visits — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="views" name="Page Views" fill="#0d2454" radius={[3, 3, 0, 0]} />
            <Bar dataKey="jobs"  name="Job Views"  fill="#1565C0" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="caa-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-3">Most Viewed Jobs (30d)</h3>
          {topJobs.length === 0 ? <p className="text-xs text-caa-muted">No data yet.</p> : (
            <div className="space-y-3">
              {topJobs.map((j, i) => (
                <div key={j.title} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-caa-muted w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-caa-body truncate">{j.title}</p>
                    <div className="mt-1 h-1.5 bg-caa-surface rounded-full overflow-hidden">
                      <div className="h-full bg-caa-navy rounded-full transition-all duration-700" style={{ width: `${Math.round((j.count / topJobs[0].count) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-caa-navy shrink-0">{j.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="caa-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-3">Top Searches (30d)</h3>
          {topSearches.length === 0 ? <p className="text-xs text-caa-muted">No searches yet.</p> : (
            <div className="flex flex-wrap gap-2">
              {topSearches.map(([query, count]) => (
                <span key={query} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-caa-navy/8 text-caa-navy rounded-full text-xs font-semibold">
                  {query} <span className="text-caa-muted font-normal">×{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="caa-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-3">Recent Activity</h3>
        {recent.length === 0 ? <p className="text-xs text-caa-muted">No events recorded yet.</p> : (
          <div className="divide-y divide-caa-border">
            {recent.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 text-xs">
                <span className="text-caa-muted shrink-0 w-20 tabular-nums">{new Date(e.ts).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className={`font-semibold shrink-0 w-24 ${eventColor[e.type] ?? "text-caa-muted"}`}>{eventLabel[e.type] ?? e.type}</span>
                <span className="text-caa-body truncate">{e.jobTitle ?? e.query ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Interns (CGPA) ───────────────────────────────────────────────────────────

function InternsTab({ applications, jobs, actor, updateStatus, bulkUpdateStatus, canShortlist, logAction }: any) {
  const interns = [...applications]
    .filter((a: Application) => a.cgpa !== undefined)
    .sort((a: Application, b: Application) => (b.cgpa ?? 0) - (a.cgpa ?? 0));

  const [cgpaThreshold, setCgpaThreshold] = useState(3.8);
  const [screeningPreview, setScreeningPreview] = useState<{ pass: Application[]; fail: Application[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cgpaColor = (g: number) =>
    g >= 4.5 ? "text-caa-success" : g >= 3.5 ? "text-caa-navy" : g >= 3.0 ? "text-caa-warning" : "text-caa-danger";

  const runAutoScreen = () => {
    const eligible = interns.filter((a: Application) => a.status === "Pending" || a.status === "Under Review");
    setScreeningPreview({
      pass: eligible.filter((a: Application) => (a.cgpa ?? 0) >= cgpaThreshold),
      fail: eligible.filter((a: Application) => (a.cgpa ?? 0) < cgpaThreshold),
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
            <p className="font-semibold text-sm text-caa-body">Auto-Screen Preview — CGPA ≥ {cgpaThreshold.toFixed(1)}</p>
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
                        <p key={a.id} className="text-xs text-caa-body">{a.candidateName} <span className="text-caa-muted">— {a.cgpa?.toFixed(1)}</span></p>
                      ))}
                </div>
                <div className="rounded-md bg-caa-danger/5 border border-caa-danger/20 p-3">
                  <p className="font-semibold text-caa-danger text-xs mb-2">Will be Declined ({screeningPreview.fail.length})</p>
                  {screeningPreview.fail.length === 0
                    ? <p className="text-xs text-caa-muted italic">None below the threshold</p>
                    : screeningPreview.fail.map((a: Application) => (
                        <p key={a.id} className="text-xs text-caa-body">{a.candidateName} <span className="text-caa-muted">— {a.cgpa?.toFixed(1)}</span></p>
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

function StaffTab({ actor, logAction }: any) {
  const [search, setSearch] = useState("");
  const filtered = STAFF_DATA.filter((s) => `${s.firstName} ${s.lastName} ${s.empNo} ${s.dept}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="font-bold text-xl text-caa-body">Internal Staff</h1><p className="text-xs text-caa-muted mt-0.5">{STAFF_DATA.length} verified CAA staff</p></div>
        <button onClick={() => { downloadStaffReport(STAFF_DATA, actor); logAction("Exported staff register"); }} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md"><FileDown className="h-4 w-4" /> Export PDF</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full px-3 py-2 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy" />
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr><th className="text-left p-3">Emp No.</th><th className="text-left p-3">Name</th><th className="text-left p-3">Department</th><th className="text-left p-3">Position</th><th className="text-left p-3">Email</th><th className="text-left p-3">Joined</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {filtered.map((s) => (
              <tr key={s.empNo}>
                <td className="p-3 text-[11px] font-mono text-caa-muted">{s.empNo}</td>
                <td className="p-3 font-medium text-caa-body">{s.firstName} {s.lastName}</td>
                <td className="p-3 text-xs text-caa-muted">{s.dept}</td>
                <td className="p-3 text-xs">{s.position}</td>
                <td className="p-3 text-xs text-caa-muted">{s.email}</td>
                <td className="p-3 text-xs">{s.joined}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-caa-success/10 text-caa-success"><CheckCircle2 className="h-3 w-3" />{s.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-xs text-caa-muted">No staff match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function ReportsTab({ jobs, applications, audit, actor, cvStore }: any) {
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

function CriteriaTab({ jobs, criteria, saveCriteria, logAction }: { jobs: Job[]; criteria: JobCriteria[]; saveCriteria: (c: JobCriteria) => void; logAction: any }) {
  const [selectedJobId, setSelectedJobId] = useState<number>(jobs[0]?.id ?? 0);
  const existing = criteria.find((c) => c.jobId === selectedJobId);
  const [copyFromId, setCopyFromId] = useState<number>(jobs[1]?.id ?? jobs[0]?.id ?? 0);
  const [uni, setUni] = useState("");

  const blankDraft = (): Omit<JobCriteria, "jobId"> => ({
    minCgpa: undefined,
    requiredKeywords: [],
    notes: "",
    screeningQuestions: [],
    minExperienceYears: undefined,
    requiredQualLevel: undefined,
    disqualifyingUniversities: [],
  });

  const fromExisting = (e: JobCriteria | undefined): Omit<JobCriteria, "jobId"> => ({
    minCgpa: e?.minCgpa,
    requiredKeywords: e?.requiredKeywords ?? [],
    notes: e?.notes ?? "",
    screeningQuestions: e?.screeningQuestions ?? [],
    minExperienceYears: e?.minExperienceYears,
    requiredQualLevel: e?.requiredQualLevel,
    disqualifyingUniversities: e?.disqualifyingUniversities ?? [],
  });

  const [draft, setDraft] = useState<Omit<JobCriteria, "jobId">>(fromExisting(existing));
  const [kw, setKw] = useState("");
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"qualifier" | "disqualifier">("qualifier");
  const [qKind, setQKind] = useState<"yesno" | "number">("yesno");
  const [qAnswer, setQAnswer] = useState<"Yes" | "No">("Yes");
  const [qMin, setQMin] = useState("");
  const [qMax, setQMax] = useState("");
  const [saved, setSaved] = useState(false);

  const handleJobChange = (id: number) => {
    setSelectedJobId(id);
    setDraft(fromExisting(criteria.find((c) => c.jobId === id)));
  };

  const addKw = () => { if (kw.trim()) { setDraft((d) => ({ ...d, requiredKeywords: [...d.requiredKeywords, kw.trim()] })); setKw(""); } };
  const removeKw = (k: string) => setDraft((d) => ({ ...d, requiredKeywords: d.requiredKeywords.filter((x) => x !== k) }));
  const addUni = () => { if (uni.trim()) { setDraft((d) => ({ ...d, disqualifyingUniversities: [...(d.disqualifyingUniversities ?? []), uni.trim()] })); setUni(""); } };
  const removeUni = (u: string) => setDraft((d) => ({ ...d, disqualifyingUniversities: (d.disqualifyingUniversities ?? []).filter((x) => x !== u) }));
  const copyFrom = () => {
    const src = criteria.find((c) => c.jobId === copyFromId);
    if (src) { setDraft(fromExisting(src)); setSaved(false); }
  };

  const addQuestion = () => {
    if (!qText.trim()) return;
    if (qKind === "number" && qMin === "" && qMax === "") return;
    const q: ScreeningQuestion = {
      id: Date.now().toString(), text: qText.trim(), type: qType, kind: qKind,
      ...(qKind === "yesno" ? { qualifyingAnswer: qAnswer } : {}),
      ...(qKind === "number" ? { min: qMin !== "" ? Number(qMin) : undefined, max: qMax !== "" ? Number(qMax) : undefined } : {}),
    };
    setDraft((d) => ({ ...d, screeningQuestions: [...(d.screeningQuestions ?? []), q] }));
    setQText(""); setQMin(""); setQMax("");
  };
  const removeQuestion = (id: string) => setDraft((d) => ({ ...d, screeningQuestions: (d.screeningQuestions ?? []).filter((q) => q.id !== id) }));

  const describeQuestion = (q: ScreeningQuestion) => {
    if (q.kind === "number") {
      const range = q.min !== undefined && q.max !== undefined ? `${q.min}–${q.max}`
        : q.min !== undefined ? `≥ ${q.min}` : q.max !== undefined ? `≤ ${q.max}` : "any";
      return `Numeric answer must be ${range} to stay eligible.`;
    }
    return `Candidate must answer "${q.qualifyingAnswer ?? "Yes"}" to stay eligible.`;
  };

  const save = () => {
    saveCriteria({ jobId: selectedJobId, ...draft });
    logAction("Updated criteria", jobs.find((j) => j.id === selectedJobId)?.title);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const qualifiers = (draft.screeningQuestions ?? []).filter((q) => q.type === "qualifier");
  const disqualifiers = (draft.screeningQuestions ?? []).filter((q) => q.type === "disqualifier");

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="font-bold text-xl text-caa-body">Criteria Setup</h1>
        <p className="text-xs text-caa-muted mt-0.5">Set automatic screening rules. The system uses these to shortlist applicants — candidates never see this configuration.</p>
      </div>

      <Field label="Select position">
        <select className={fi} value={selectedJobId} onChange={(e) => handleJobChange(Number(e.target.value))}>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </Field>

      {/* Copy from another job */}
      <div className="flex items-center gap-2 flex-wrap bg-caa-surface border border-caa-border rounded-lg px-3 py-2.5">
        <span className="text-[11px] text-caa-muted shrink-0">Copy criteria from:</span>
        <select className={`${fi} flex-1 min-w-0`} value={copyFromId} onChange={(e) => setCopyFromId(Number(e.target.value))}>
          {jobs.filter((j) => j.id !== selectedJobId).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <button onClick={copyFrom} className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md">Copy</button>
      </div>

      <div className="caa-card p-4 space-y-5">

        {/* Basic filters */}
        <Section title="Basic filters">
          <Field label="Minimum CGPA (internship / graduate roles — leave blank if N/A)">
            <input type="number" min={0} max={5} step={0.1} className={fi} value={draft.minCgpa ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minCgpa: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="e.g. 3.5" />
          </Field>
          <Field label="Minimum experience required (years — leave blank to use job's default)">
            <input type="number" min={0} max={30} className={fi} value={draft.minExperienceYears ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minExperienceYears: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="e.g. 3" />
          </Field>
          <Field label="Required qualification level override (leave blank to use job's default)">
            <select className={fi} value={draft.requiredQualLevel ?? ""} onChange={(e) => setDraft((d) => ({ ...d, requiredQualLevel: (e.target.value as QualLevel) || undefined }))}>
              <option value="">— Use job's requirement —</option>
              {QUAL_LEVELS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </Field>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Required keywords (CV must contain all of these)</label>
            <div className="flex gap-2 mb-2">
              <input className={`${fi} flex-1`} value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKw())} placeholder="Add keyword…" />
              <button onClick={addKw} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {draft.requiredKeywords.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy">
                  {k} <button onClick={() => removeKw(k)} className="text-caa-navy/60 hover:text-caa-danger">×</button>
                </span>
              ))}
              {draft.requiredKeywords.length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Disqualifying universities (applicants from these institutions are auto-excluded)</label>
            <div className="flex gap-2 mb-2">
              <input className={`${fi} flex-1`} value={uni} onChange={(e) => setUni(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUni())} placeholder="Institution name…" />
              <button onClick={addUni} className="px-3 py-1.5 bg-caa-danger text-white text-xs rounded-md">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(draft.disqualifyingUniversities ?? []).map((u) => (
                <span key={u} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-danger/10 text-caa-danger">
                  {u} <button onClick={() => removeUni(u)} className="text-caa-danger/60 hover:text-caa-danger">×</button>
                </span>
              ))}
              {(draft.disqualifyingUniversities ?? []).length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
            </div>
          </div>
        </Section>

        {/* Qualifier / Disqualifier questions */}
        <Section title="Qualifier & Disqualifier questions">
          <div className="rounded-lg border border-caa-border bg-caa-surface/60 p-3 mb-3 text-[11px] text-caa-muted leading-relaxed">
            These questions are shown to the candidate on the application form and checked precisely against their answer.
            A candidate who fails one is <strong>automatically declined on submission</strong> — they still see the normal "application submitted" confirmation.<br />
            <span className="font-semibold text-caa-navy">Qualifier</span> / <span className="font-semibold text-caa-danger">Disqualifier</span> only changes which list it's grouped under below; both are enforced the same way.
          </div>

          {/* Add new question */}
          <div className="space-y-2 mb-4 rounded-lg border border-caa-border p-3">
            <input className={fi} value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Question text, e.g. Do you have a bachelor's degree? / How old are you?" />
            <div className="flex flex-wrap gap-2 items-center">
              <select className={`${fi} w-40`} value={qType} onChange={(e) => setQType(e.target.value as "qualifier" | "disqualifier")}>
                <option value="qualifier">Qualifier ✓</option>
                <option value="disqualifier">Disqualifier ✗</option>
              </select>
              <select className={`${fi} w-36`} value={qKind} onChange={(e) => setQKind(e.target.value as "yesno" | "number")}>
                <option value="yesno">Yes / No</option>
                <option value="number">Number (range)</option>
              </select>
              {qKind === "yesno" ? (
                <label className="flex items-center gap-1.5 text-xs text-caa-body">
                  Required answer:
                  <select className={`${fi} w-24`} value={qAnswer} onChange={(e) => setQAnswer(e.target.value as "Yes" | "No")}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-caa-body">
                  Acceptable range:
                  <input type="number" className={`${fi} w-20`} value={qMin} onChange={(e) => setQMin(e.target.value)} placeholder="Min" />
                  –
                  <input type="number" className={`${fi} w-20`} value={qMax} onChange={(e) => setQMax(e.target.value)} placeholder="Max" />
                </label>
              )}
              <button onClick={addQuestion} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md shrink-0 ml-auto">Add question</button>
            </div>
          </div>

          {/* Qualifier list */}
          {qualifiers.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-caa-navy mb-1.5">Must pass (qualifiers)</p>
              <div className="space-y-1.5">
                {qualifiers.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-caa-success/5 border border-caa-success/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-caa-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-caa-body">{q.text}</p>
                      <p className="text-[10px] text-caa-muted">{describeQuestion(q)}</p>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="text-caa-danger shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disqualifier list */}
          {disqualifiers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-caa-danger mb-1.5">Auto-exclude if found (disqualifiers)</p>
              <div className="space-y-1.5">
                {disqualifiers.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-caa-danger/5 border border-caa-danger/20">
                    <XCircle className="h-3.5 w-3.5 text-caa-danger shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-caa-body">{q.text}</p>
                      <p className="text-[10px] text-caa-muted">{describeQuestion(q)}</p>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="text-caa-danger shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {qualifiers.length === 0 && disqualifiers.length === 0 && (
            <p className="text-[11px] text-caa-muted">No screening questions set. Add them above.</p>
          )}
        </Section>

        <Section title="Notes for recruiters">
          <textarea rows={2} className={fi} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Optional guidance for the recruiter reviewing the shortlist…" />
        </Section>

        <div className="flex items-center gap-3">
          <button onClick={save} className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md">Save criteria</button>
          <button onClick={() => setDraft(blankDraft())} className="px-4 py-2 border border-caa-border text-sm rounded-md">Clear</button>
          {saved && <span className="text-sm text-caa-success flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

function AuditTab({ audit, actor }: { audit: AuditEntry[]; actor: string }) {
  const [filter, setFilter] = useState("");
  const rows = audit.filter((e) => !filter || `${e.actor} ${e.action} ${e.target ?? ""} ${e.role}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="font-bold text-xl text-caa-body">Audit Log</h1><p className="text-xs text-caa-muted mt-0.5">{audit.length} actions recorded</p></div>
        <button onClick={() => downloadAuditLog(audit, actor)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md"><FileDown className="h-4 w-4" /> Export PDF</button>
      </div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="w-full px-3 py-2 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy" />
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr><th className="text-left p-3">Timestamp</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Role</th><th className="text-left p-3">Action</th><th className="text-left p-3">Target</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="p-3 text-[11px] text-caa-muted whitespace-nowrap">{new Date(e.at).toLocaleString()}</td>
                <td className="p-3 text-xs font-medium">{e.actor}</td>
                <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy font-semibold capitalize">{e.role}</span></td>
                <td className="p-3 text-xs">{e.action}</td>
                <td className="p-3 text-xs text-caa-muted">{e.target ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-xs text-caa-muted">{audit.length === 0 ? "No actions logged yet." : "No entries match."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsTab({ settings, updateSettings, logAction }: { settings: AdminSettings; updateSettings: (p: Partial<AdminSettings>) => void; logAction: any }) {
  const [draft, setDraft] = useState<AdminSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const upd = (p: Partial<AdminSettings>) => setDraft((d) => ({ ...d, ...p }));
  const updTpl = (k: keyof AdminSettings["notifTemplates"], v: string) =>
    setDraft((d) => ({ ...d, notifTemplates: { ...d.notifTemplates, [k]: v } }));
  const save = () => { updateSettings(draft); logAction("Updated portal settings"); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="font-bold text-xl text-caa-body">Settings</h1><p className="text-xs text-caa-muted mt-0.5">Portal-wide configuration.</p></div>

      <div className="caa-card p-5 space-y-5">
        <Section title="Organisation">
          <Field label="Organisation name">
            <input className={fi} value={draft.orgName} onChange={(e) => upd({ orgName: e.target.value })} />
          </Field>
          <Field label="Email sender name (shown in notification emails)">
            <input className={fi} value={draft.emailSenderName} onChange={(e) => upd({ emailSenderName: e.target.value })} placeholder="e.g. CAA HR Team" />
          </Field>
        </Section>

        <Section title="Recruitment rules">
          <Field label="Minimum applicant age">
            <input type="number" min={16} max={60} className={fi} value={draft.minAgeThreshold} onChange={(e) => upd({ minAgeThreshold: parseInt(e.target.value) || 18 })} />
          </Field>
          <Field label="Closing-soon alert threshold (days before deadline)">
            <input type="number" min={1} max={30} className={fi} value={draft.closingSoonDays} onChange={(e) => upd({ closingSoonDays: parseInt(e.target.value) || 7 })} />
          </Field>
          <Field label="Max active applications per candidate (0 = unlimited)">
            <input type="number" min={0} max={20} className={fi} value={draft.maxApplicationsPerCandidate} onChange={(e) => upd({ maxApplicationsPerCandidate: parseInt(e.target.value) || 0 })} />
          </Field>
          <div className="flex items-start gap-3 mt-1">
            <input id="extInt" type="checkbox" checked={draft.allowExternalInternalJobs} onChange={(e) => upd({ allowExternalInternalJobs: e.target.checked })} className="mt-0.5" />
            <label htmlFor="extInt" className="text-sm leading-tight">Allow external applicants to see internal-only job listings</label>
          </div>
        </Section>

        <Section title="Session">
          <Field label="Auto-logout after inactivity (minutes)">
            <input type="number" min={1} max={120} className={fi} value={draft.sessionTimeoutMinutes} onChange={(e) => upd({ sessionTimeoutMinutes: parseInt(e.target.value) || 15 })} />
          </Field>
        </Section>

        <Section title="Notification message templates">
          <p className="text-[11px] text-caa-muted -mt-1 mb-2">Use <code className="bg-caa-surface px-1 rounded">{"{name}"}</code> for candidate name and <code className="bg-caa-surface px-1 rounded">{"{role}"}</code> for job title.</p>
          {(["shortlist", "decline", "interview", "offer"] as const).map((key) => (
            <Field key={key} label={key === "shortlist" ? "Shortlisted" : key === "decline" ? "Declined" : key === "interview" ? "Interview invite" : "Job offer"}>
              <textarea rows={3} className={`${fi} resize-none`} value={draft.notifTemplates[key]} onChange={(e) => updTpl(key, e.target.value)} />
            </Field>
          ))}
        </Section>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md">Save</button>
        <button onClick={() => setDraft({ ...settings })} className="px-4 py-2 border border-caa-border text-sm rounded-md inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Reset</button>
        {saved && <span className="text-sm text-caa-success flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
      </div>
    </div>
  );
}

// ─── Permissions ──────────────────────────────────────────────────────────────

const PERM_FIELDS: { key: keyof PermissionOverride; label: string }[] = [
  { key: "canViewApplications",  label: "View Applications & CVs" },
  { key: "canShortlist",         label: "Shortlist / Decline Candidates" },
  { key: "canScreenInterns",     label: "Screen Intern Applications (CGPA auto-screen)" },
  { key: "canSendNotifications", label: "Send Candidate Notifications" },
  { key: "canManageJobs",        label: "Manage Job Listings" },
  { key: "canManageCriteria",    label: "Set Screening Criteria" },
  { key: "canViewStaff",         label: "View Internal Staff" },
  { key: "canExport",            label: "Export Reports (PDF)" },
  { key: "canViewAudit",         label: "View Audit Log" },
  { key: "canManageSettings",    label: "Manage Portal Settings" },
  { key: "canGrantPermissions",  label: "Grant Permissions (super only)" },
];

const ROLE_DEFAULTS_PERMS: Record<AdminRole, Partial<PermissionOverride>> = {
  super:     { canViewApplications: true,  canShortlist: true,  canScreenInterns: true,  canSendNotifications: true,  canManageJobs: true,  canManageCriteria: true,  canViewStaff: true,  canExport: true,  canViewAudit: true,  canManageSettings: true,  canGrantPermissions: true  },
  hr:        { canViewApplications: true,  canShortlist: true,  canScreenInterns: true,  canSendNotifications: true,  canManageJobs: true,  canManageCriteria: true,  canViewStaff: true,  canExport: true,  canViewAudit: false, canManageSettings: false, canGrantPermissions: false },
  recruiter: { canViewApplications: true,  canShortlist: true,  canScreenInterns: false, canSendNotifications: false, canManageJobs: false, canManageCriteria: true,  canViewStaff: false, canExport: false, canViewAudit: false, canManageSettings: false, canGrantPermissions: false },
};

function PermissionsTab({ overrides, save, logAction }: { overrides: PermissionOverride[]; save: (p: PermissionOverride) => void; logAction: any }) {
  const adminUsers = Object.entries(HR_USERS).map(([email, u]) => ({ email, ...u }));
  const [selectedEmail, setSelectedEmail] = useState(adminUsers[0]?.email ?? "");
  const selected = adminUsers.find((u) => u.email === selectedEmail);
  const existing = overrides.find((o) => o.email === selectedEmail);
  const defaults = ROLE_DEFAULTS_PERMS[selected?.role ?? "hr"];
  const [draft, setDraft] = useState<Partial<PermissionOverride>>(existing ?? defaults ?? {});

  const handleUserChange = (email: string) => {
    setSelectedEmail(email);
    const u = adminUsers.find((x) => x.email === email);
    const ex = overrides.find((o) => o.email === email);
    setDraft(ex ?? ROLE_DEFAULTS_PERMS[u?.role ?? "hr"] ?? {});
  };

  const savePerms = () => {
    if (!selected) return;
    save({ email: selectedEmail, role: selected.role, ...draft } as PermissionOverride);
    logAction("Updated permissions", `${selected.firstName} ${selected.lastName} (${selected.role})`);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div><h1 className="font-bold text-xl text-caa-body">Permissions</h1><p className="text-xs text-caa-muted mt-0.5">Override default role permissions for individual HR users.</p></div>
      <Field label="Select HR user">
        <select className={fi} value={selectedEmail} onChange={(e) => handleUserChange(e.target.value)}>
          {adminUsers.map((u) => <option key={u.email} value={u.email}>{u.firstName} {u.lastName} ({u.role}) — {u.email}</option>)}
        </select>
      </Field>
      <div className="caa-card p-4 space-y-2">
        {PERM_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5 border-b border-caa-border last:border-0">
            <label className="text-sm text-caa-body">{label}</label>
            <input type="checkbox" checked={!!(draft as any)[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={savePerms} className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md">Save permissions</button>
        <button onClick={() => setDraft(ROLE_DEFAULTS_PERMS[selected?.role ?? "hr"] ?? {})} className="px-4 py-2 border border-caa-border text-sm rounded-md">Reset to defaults</button>
      </div>
      <p className="text-[11px] text-caa-muted flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Permissions take effect on next sign-in.</p>
    </div>
  );
}

// ─── Email Log Tab ────────────────────────────────────────────────────────────

function EmailsTab({ sentEmails, clearEmailLog }: { sentEmails: SentEmail[]; clearEmailLog: () => void }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [triggerFilter, setTriggerFilter] = useState("all");

  const triggers = Array.from(new Set(sentEmails.map((e) => e.trigger)));
  const displayed = sentEmails.filter((e) => {
    const matchSearch = !search || `${e.candidateName} ${e.to} ${e.subject} ${e.jobTitle}`.toLowerCase().includes(search.toLowerCase());
    const matchTrigger = triggerFilter === "all" || e.trigger === triggerFilter;
    return matchSearch && matchTrigger;
  });

  const TRIGGER_COLORS: Record<string, string> = {
    "Shortlisted":     "bg-caa-success/10 text-caa-success",
    "Interview":       "bg-purple-100 text-purple-700",
    "Offered":         "bg-teal-100 text-teal-700",
    "Declined":        "bg-caa-danger/10 text-caa-danger",
    "Batch Screening": "bg-caa-navy/10 text-caa-navy",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-xl text-caa-body">Email Log</h1>
          <p className="text-xs text-caa-muted mt-0.5">{sentEmails.length} email{sentEmails.length !== 1 ? "s" : ""} sent via the portal</p>
        </div>
        <div className="flex gap-2">
          {sentEmails.length > 0 && (
            <button
              onClick={() => { if (confirm("Clear all sent email records? This cannot be undone.")) clearEmailLog(); }}
              className="px-3 py-1.5 text-xs border border-caa-danger/30 text-caa-danger rounded-md hover:bg-caa-danger/5"
            >
              Clear log
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, subject…"
          className="px-3 py-1.5 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy w-64"
        />
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...triggers].map((t) => (
            <button key={t} onClick={() => setTriggerFilter(t)}
              className={`px-2.5 py-1 text-[11px] rounded-full font-semibold border transition-colors ${triggerFilter === t ? "bg-caa-navy text-white border-caa-navy" : "border-caa-border text-caa-muted hover:border-caa-navy"}`}>
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {sentEmails.length === 0 ? (
        <div className="caa-card p-10 text-center">
          <Mail className="h-10 w-10 text-caa-muted/40 mx-auto mb-3" />
          <p className="font-semibold text-caa-body">No emails sent yet</p>
          <p className="text-xs text-caa-muted mt-1">Emails are logged here when you update application statuses or run auto-screening.</p>
        </div>
      ) : (
        <div className="caa-card overflow-hidden divide-y divide-caa-border">
          {displayed.map((e) => (
            <div key={e.id} className="hover:bg-caa-surface/50">
              <button
                className="w-full text-left px-4 py-3 flex items-start gap-3"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <Mail className="h-4 w-4 text-caa-navy shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-caa-body truncate">{e.candidateName}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TRIGGER_COLORS[e.trigger] ?? "bg-caa-surface text-caa-muted"}`}>{e.trigger}</span>
                  </div>
                  <p className="text-xs text-caa-muted truncate mt-0.5">{e.subject}</p>
                  <p className="text-[11px] text-caa-muted/70 mt-0.5">{e.to} · {new Date(e.sentAt).toLocaleString()}</p>
                </div>
                <span className="text-[10px] text-caa-muted shrink-0">{expanded === e.id ? "▲" : "▼"}</span>
              </button>

              {expanded === e.id && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-caa-border bg-caa-surface p-3">
                    <p className="text-[11px] font-semibold text-caa-body mb-0.5">To: <span className="text-caa-navy">{e.to}</span></p>
                    <p className="text-[11px] font-semibold text-caa-body mb-2">Subject: {e.subject}</p>
                    <pre className="text-[11px] text-caa-muted whitespace-pre-wrap leading-relaxed border-t border-caa-border pt-2">{e.body}</pre>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${e.to}?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open in Email Client
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
          {displayed.length === 0 && (
            <div className="p-6 text-center text-xs text-caa-muted">No emails match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const fi = "w-full px-2.5 py-1.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-caa-body mb-1">{label}</label>{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy mb-3 pb-2 border-b border-caa-border">{title}</p><div className="space-y-3">{children}</div></div>;
}
