import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Users, Briefcase, LayoutDashboard, FileText, GraduationCap, Download,
  ClipboardList, Settings, ChevronRight, Bell, Lock, Filter, Mail, Menu, X,
  Activity,
} from "lucide-react";
import {
  useApp, canAccess,
  type Job, type Application,
} from "@/context/AppContext";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { DashboardTab } from "@/components/admin/DashboardTab";
import { JobsTab } from "@/components/admin/JobsTab";
import { AppsTab } from "@/components/admin/ApplicationsTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { InternsTab } from "@/components/admin/InternsTab";
import { StaffTab } from "@/components/admin/StaffTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { CriteriaTab } from "@/components/admin/CriteriaTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { PermissionsTab } from "@/components/admin/PermissionsTab";
import { EmailsTab } from "@/components/admin/EmailsTab";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin")({
  validateSearch: z.object({
    tab: z.enum(["login", "dashboard", "jobs", "apps", "emails", "interns", "analytics", "staff", "reports", "audit", "settings", "criteria", "permissions"]).optional(),
    jobId: z.coerce.number().optional(),
  }),
  head: () => ({ meta: [{ title: "HR Console — CAA Uganda" }] }),
  component: AdminPage,
});

// ─── RBAC-aware nav, grouped into sidebar sections ────────────────────────────

const ALL_NAV = [
  { key: "dashboard",   label: "Dashboard",        Icon: LayoutDashboard,  perm: null,                            group: "Overview" },
  { key: "jobs",        label: "Job Listings",      Icon: Briefcase,        perm: "canManageJobs" as const,        group: "Recruitment" },
  { key: "apps",        label: "Applications",      Icon: FileText,         perm: "canViewApplications" as const,  group: "Recruitment" },
  { key: "interns",     label: "Interns (CGPA)",    Icon: GraduationCap,    perm: "canViewApplications" as const,  group: "Recruitment" },
  { key: "criteria",    label: "Criteria Setup",    Icon: Filter,           perm: "canManageCriteria" as const,    group: "Recruitment" },
  { key: "emails",      label: "Email Log",         Icon: Mail,             perm: "canViewApplications" as const,  group: "Recruitment" },
  { key: "staff",       label: "Internal Staff",    Icon: Users,            perm: "canViewStaff" as const,         group: "People & Insights" },
  { key: "analytics",   label: "Site Analytics",    Icon: Activity,         perm: "canViewAudit" as const,         group: "People & Insights" },
  { key: "reports",     label: "Reports & Exports", Icon: Download,         perm: "canExport" as const,            group: "People & Insights" },
  { key: "audit",       label: "Audit Log",         Icon: ClipboardList,    perm: "canViewAudit" as const,         group: "System" },
  { key: "settings",    label: "Settings",          Icon: Settings,         perm: "canManageSettings" as const,    group: "System" },
  { key: "permissions", label: "Permissions",       Icon: Lock,             perm: "canGrantPermissions" as const,  group: "System" },
] as const;

type AdminTab = typeof ALL_NAV[number]["key"];

const NAV_GROUPS = ["Overview", "Recruitment", "People & Insights", "System"] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { auth, apiSignIn, jobs, addJob, updateJob, deleteJob, isExpired, applications,
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
      <AdminLogin onLogin={async (email, pw) => {
        let u;
        try {
          u = await apiSignIn(email.trim(), pw);
        } catch (err) {
          pushToast({ type: "warning", title: "Sign in failed", message: err instanceof Error ? err.message : "Incorrect email or password." });
          return;
        }
        if (u.accountType !== "admin") {
          pushToast({ type: "warning", title: "Access denied", message: "This account does not have HR Console access." });
          return;
        }
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
        {NAV_GROUPS.map((group) => {
          const items = visibleNav.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-1">
              {group !== "Overview" && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">{group}</p>
              )}
              {items.map(({ key, label, Icon }) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={() => go(key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors text-left ${
                      active ? "bg-white/15 text-white border-l-2 border-caa-gold" : "text-white/65 hover:bg-white/8 hover:text-white border-l-2 border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" /> {label}
                  </button>
                );
              })}
            </div>
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
          {tab === "staff"       && canAccess(role, "canViewStaff", perms) && <StaffTab actor={actor} logAction={logAction} pushToast={pushToast} />}
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
