import { useState, useEffect } from "react";
import { useNavigate, Link, useSearch } from "@tanstack/react-router";
import {
  Users, Briefcase, LayoutDashboard, FileText, GraduationCap, Download,
  ClipboardList, Settings, ChevronRight, Bell, Lock, Mail, Menu, X,
  Activity, RefreshCw, ClipboardCheck, CheckSquare, ListChecks, Users2, UserCog,
  CalendarClock,
} from "lucide-react";
import {
  useApp, canAccess, ROLE_DEFAULTS, ADMIN_ROLE_LABELS,
  type Job, type Application,
} from "@/app/providers/AppContext";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { DashboardTab } from "@/features/admin/components/DashboardTab";
import { JobsTab } from "@/features/admin/components/JobsTab";
import { AppsTab } from "@/features/admin/components/ApplicationsTab";
import { CandidateScoringPanel } from "@/features/admin/components/CandidateScoringPanel";
import { AnalyticsTab } from "@/features/admin/components/AnalyticsTab";
import { InternsTab } from "@/features/admin/components/InternsTab";
import { StaffTab } from "@/features/admin/components/StaffTab";
import { ReportsTab } from "@/features/admin/components/ReportsTab";
import { AuditTab } from "@/features/admin/components/AuditTab";
import { ShortlistingReportsTab } from "@/features/admin/components/ShortlistingReportsTab";
import { InterviewPanelTab } from "@/features/admin/components/InterviewPanelTab";
import { SettingsTab } from "@/features/admin/components/SettingsTab";
import { PermissionsTab } from "@/features/admin/components/PermissionsTab";
import { AdministrationTab } from "@/features/admin/components/AdministrationTab";
import { AssessmentTab } from "@/features/admin/components/AssessmentTab";
import { EmailsTab } from "@/features/admin/components/EmailsTab";
import { useOnboardingTour, OnboardingPrompt, OnboardingSpotlight, type TourDef, type TourStep } from "@/features/onboarding/OnboardingTour";

const ADMIN_TOUR_INTRO_STEPS: TourStep[] = [
  { target: '[data-tour="admin-stats"]', title: "Your dashboard at a glance", body: "Key numbers for the whole recruitment pipeline — click any card to jump straight to that section." },
  { target: '[data-tour="nav-sidebar"]', title: "Everything lives in the sidebar", body: "Recruitment, People & Insights, System, and Administration are grouped here — you'll only see the sections your role has access to." },
  { target: '[data-tour="pending-actions"]', title: "Don't miss what needs attention", body: "New applications, candidates awaiting interview, and vacancies closing soon all surface right here." },
];

/** Walks a hiring admin through actually posting a vacancy — appended to the
 *  base tour only for roles that can reach Create Job (see `canCreateJobs`
 *  below), since spotlighting a nav item/form the viewer can't open would
 *  just show an empty centered card. */
function createJobTourSteps(go: (t: AdminTab) => void): TourStep[] {
  return [
    {
      target: '[data-tour="nav-jobs"]',
      title: "Posting a new vacancy",
      body: "When a position opens up, head here — Create Job in the Recruitment section. Let's walk through it together.",
    },
    {
      target: '[data-tour="job-basic-details"]',
      title: "Start with the basics",
      body: "We've opened a blank listing so you can see the form (the same \"New listing\" button does this yourself, any time). Title, reference number, department, location and salary scale all live here.",
      onEnter: () => go("jobs"),
    },
    {
      target: '[data-tour="job-requirements"]',
      title: "Set the requirements",
      body: "Add essential and desirable requirements — each one can become a candidate-facing qualifying question, a hard disqualifier, or stay silent for internal screening only.",
    },
    {
      target: '[data-tour="job-save-actions"]',
      title: "Save or submit for review",
      body: "\"Save as draft\" keeps your work without publishing anything. \"Save & submit for review\" sends it into the approval workflow before it goes live to candidates.",
    },
  ];
}

// ─── RBAC-aware nav, grouped into sidebar sections ────────────────────────────

const ALL_NAV = [
  { key: "dashboard",        label: "Dashboard",        Icon: LayoutDashboard,  perm: null,                              group: "Overview" },
  { key: "jobs",             label: "Create Job",       Icon: Briefcase,        perm: "canManageJobs" as const,          group: "Recruitment" },
  { key: "review-jobs",      label: "Review Job",       Icon: ClipboardCheck,   perm: "canReviewJob" as const,           group: "Recruitment" },
  { key: "approve-jobs",     label: "Approve & Publish", Icon: CheckSquare,     perm: "canApproveJob" as const,          group: "Recruitment" },
  { key: "apps",             label: "Applications",     Icon: FileText,         perm: "canViewApplications" as const,    group: "Recruitment" },
  { key: "shortlisting",     label: "Shortlisting",     Icon: ListChecks,       perm: "canShortlist" as const,           group: "Recruitment" },
  { key: "interview-panel",  label: "Interview Panel",  Icon: Users2,           perm: "canShortlist" as const,           group: "Recruitment" },
  { key: "assessment-schedule", label: "Assessment Schedule", Icon: CalendarClock, perm: "canScheduleAssessment" as const, group: "Recruitment" },
  { key: "candidate-assessment", label: "Candidate Assessment", Icon: ClipboardCheck, perm: "canRecordAssessment" as const, group: "Recruitment" },
  { key: "shortlisting-ii",  label: "Shortlisting II",  Icon: ListChecks,       perm: "canShortlist" as const,           group: "Recruitment" },
  // Visible to whoever runs shortlisting OR whoever's role exists to audit it —
  // a single-permission gate would exclude one of those two groups, so this
  // entry's perm is a "|"-separated list of alternatives (see hasAnyPerm below).
  { key: "shortlisting-reports", label: "Shortlisting Reports", Icon: ClipboardList, perm: "canShortlist|canViewAudit" as any, group: "Recruitment" },
  { key: "interns",          label: "Interns (CGPA)",   Icon: GraduationCap,    perm: "canViewApplications" as const,    group: "Recruitment" },
  { key: "emails",           label: "Email Log",        Icon: Mail,             perm: "canViewApplications" as const,    group: "Recruitment" },
  { key: "staff",            label: "Internal Staff",   Icon: Users,            perm: "canViewStaff" as const,           group: "People & Insights" },
  // hr_officer/hr/recruiter run recruitment day to day and need site-traffic
  // visibility, not just auditors — same "|"-separated pattern as Shortlisting
  // Reports above.
  { key: "analytics",        label: "Site Analytics",   Icon: Activity,         perm: "canViewAudit|canShortlist" as any, group: "People & Insights" },
  { key: "reports",          label: "Reports & Exports", Icon: Download,        perm: "canExport" as const,              group: "People & Insights" },
  { key: "audit",            label: "Audit Log",        Icon: ClipboardList,    perm: "canViewAudit" as const,           group: "System" },
  { key: "settings",         label: "Settings",         Icon: Settings,         perm: "canManageSettings" as const,      group: "System" },
  { key: "administration",   label: "Manage Admins",    Icon: UserCog,          perm: "canManageAdmins" as const,        group: "Administration" },
  { key: "permissions",      label: "Assign Rights",    Icon: Lock,             perm: "canAssignRights" as const,        group: "Administration" },
] as const;

type AdminTab = typeof ALL_NAV[number]["key"];

const NAV_GROUPS = ["Overview", "Recruitment", "People & Insights", "System", "Administration"] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { auth, sessionRestoring, apiSignIn, jobs, addJob, updateJob, deleteJob, isExpired, applications,
          pushToast, audit, settings, updateSettings, logAction, updateApplicationStatus, bulkUpdateApplicationStatus,
          notifications, criteria,
          permissionOverrides, savePermissionOverride, cvStore,
          sentEmails, logEmail, bulkLogEmails, clearEmailLog } = useApp();
  const { tab = auth.accountType === "admin" ? "dashboard" : "login", jobId } = useSearch({
    from: "/admin",
  });
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Plain derived values, not hooks — safe to compute ahead of the early
  // returns below so the tour def (built from them) can feed the hook that
  // must itself run before those returns. Meaningless (but harmless) until
  // auth.accountType is really "admin".
  const role = auth.adminRole ?? "hr";
  const perms = permissionOverrides;
  const go = (t: AdminTab) => { navigate({ to: "/admin", search: { tab: t } }); setMobileNavOpen(false); };
  const canCreateJobs = canAccess(role, "canManageJobs", perms);
  const adminTour: TourDef = {
    key: "admin",
    welcomeTitle: "Welcome to the HR Console",
    welcomeBody: "Want a quick orientation? We'll point out where the dashboard, the sidebar sections, and pending actions live — and walk through posting a vacancy — takes a couple of minutes.",
    steps: canCreateJobs ? [...ADMIN_TOUR_INTRO_STEPS, ...createJobTourSteps(go)] : ADMIN_TOUR_INTRO_STEPS,
  };
  // Hooks must run before the early returns below (sessionRestoring / not-an-admin) —
  // the tour itself only ever activates once auth.accountType is really "admin".
  const tour = useOnboardingTour(adminTour, auth.accountType === "admin" ? auth.email : null);
  // On mobile the sidebar is a closed-by-default drawer — a tour step
  // spotlighting it would otherwise target an element sitting off-screen
  // at translateX(-100%). Force it open for the whole tour; desktop already
  // shows the sidebar unconditionally so this is a no-op there.
  useEffect(() => {
    if (tour.stage === "touring") setMobileNavOpen(true);
  }, [tour.stage]);

  // A stored session looks logged-in immediately (see AppContext's mount
  // effect) but isn't confirmed against the backend yet. Rendering the real
  // dashboard here would fire authenticated fetches with no token — wait for
  // confirmation instead of racing it (this was the actual cause of /admin
  // bouncing back to candidate sign-in on a fresh load).
  if (sessionRestoring) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-108px)]">
        <RefreshCw className="h-6 w-6 text-caa-navy animate-spin" />
      </div>
    );
  }

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

  const actor = `${auth.firstName} ${auth.lastName}`;

  // A nav entry's perm can be a single key, or "|"-separated alternatives
  // (any one grants access) — used by Shortlisting Reports, which two
  // otherwise-disjoint role groups both need to reach.
  const hasAnyPerm = (permKey: string) => permKey.split("|").some((p) => canAccess(role, p as any, perms));
  const visibleNav = ALL_NAV.filter(({ perm }) =>
    perm === null || hasAnyPerm(perm as string)
  );

  const unreadCount = notifications.filter((n) => n.recipientEmail === auth.email && !n.read).length;

  const pendingApps     = applications.filter((a: Application) => a.status === "Pending").length;
  const awaitingInterview = applications.filter((a: Application) => a.status === "Shortlisted").length;
  // Live counts surfaced as small badges on a couple of nav items — same
  // numbers already computed for the pending-actions panel below, just
  // exposed at the point of navigation too.
  const navBadges: Partial<Record<AdminTab, number>> = {
    apps: pendingApps,
    shortlisting: awaitingInterview,
  };
  const closingSoon     = jobs.filter((j: Job) => {
    if (isExpired(j)) return false;
    const diff = (new Date(j.closesAt).getTime() - Date.now()) / 86_400_000;
    return diff > 0 && diff <= (settings.closingSoonDays ?? 7);
  }).length;
  const actionCount = pendingApps + awaitingInterview + closingSoon + unreadCount;

  const activeLabel = visibleNav.find((n) => n.key === tab)?.label ?? "HR Console";

  const sidebarNav = (
    <>
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">HR Console</p>
          <button onClick={() => setMobileNavOpen(false)} className="md:hidden text-white/60 hover:text-white shrink-0 p-1 -mt-1 -mr-1" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          {auth.photoUrl ? (
            <img src={auth.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover border border-white/15 shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs select-none">{auth.firstName?.[0]}{auth.lastName?.[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{auth.firstName} {auth.lastName}</p>
            <span className={`mt-0.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              role === "super" ? "bg-yellow-400/20 text-yellow-300" :
              role === "hr" ? "bg-blue-400/20 text-blue-300" :
              "bg-green-400/20 text-green-300"
            }`}>{ADMIN_ROLE_LABELS[role]}</span>
          </div>
        </div>
      </div>
      <nav data-tour="nav-sidebar" className="flex-1 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const items = visibleNav.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-1 px-2">
              {group !== "Overview" && (
                <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">{group}</p>
              )}
              {items.map(({ key, label, Icon }) => {
                const active = tab === key;
                const badge = navBadges[key];
                return (
                  <button key={key} data-tour={`nav-${key}`} onClick={() => go(key)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors text-left mb-0.5 ${
                      active ? "bg-white/15 text-white shadow-sm" : "text-white/65 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {!!badge && (
                      <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none shrink-0 ${active ? "bg-white/25 text-white" : "bg-white/10 text-white/70"}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      {actionCount > 0 && (
        <button data-tour="pending-actions" onClick={() => go("dashboard")} className="mx-3 mb-3 w-[calc(100%-24px)] text-left px-3 py-2.5 bg-caa-warning/15 border border-caa-warning/30 rounded-xl hover:bg-caa-warning/20 transition-colors">
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
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <button onClick={() => { go("dashboard"); tour.restart(); }} className="text-white/50 text-[11px] hover:text-white transition-colors flex items-center gap-1.5">
          Take a tour
        </button>
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
        {/* Previously max-w-5xl with no mx-auto — on a wide monitor this hugged
            the sidebar's left edge and left a large uncentered void on the
            right, which reads as a real layout defect for data-dense views
            (tables, the Kanban board) rather than intentional whitespace. */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1600px] mx-auto">
          {tab === "dashboard"   && <DashboardTab jobs={jobs} applications={applications} isExpired={isExpired} navigate={navigate} role={role} settings={settings} auth={auth} />}
          {tab === "jobs"        && canAccess(role, "canManageJobs", perms) && <JobsTab jobs={jobs} applications={applications} isExpired={isExpired} addJob={addJob} updateJob={updateJob} deleteJob={deleteJob} onViewApps={(id: number) => navigate({ to: "/admin", search: { tab: "apps", jobId: id } })} viewMode="create" tourAutoOpen={tour.stage === "touring"} />}
          {tab === "review-jobs" && canAccess(role, "canReviewJob", perms) && <JobsTab jobs={jobs} applications={applications} isExpired={isExpired} onViewApps={(id: number) => navigate({ to: "/admin", search: { tab: "apps", jobId: id } })} viewMode="review" />}
          {tab === "approve-jobs" && canAccess(role, "canApproveJob", perms) && <JobsTab jobs={jobs} applications={applications} isExpired={isExpired} onViewApps={(id: number) => navigate({ to: "/admin", search: { tab: "apps", jobId: id } })} viewMode="approve" />}
          {tab === "apps"        && canAccess(role, "canViewApplications", perms) && <AppsTab jobs={jobs} applications={applications} jobId={jobId} cvStore={cvStore} updateStatus={updateApplicationStatus} bulkUpdateStatus={bulkUpdateApplicationStatus} logAction={logAction} actor={actor} criteria={criteria} role={role} perms={perms} logEmail={logEmail} bulkLogEmails={bulkLogEmails} mode="list" onSelectJob={(id: number) => navigate({ to: "/admin", search: { tab: "apps", jobId: id } })} onClearJob={() => navigate({ to: "/admin", search: { tab: "apps" } })} />}
          {tab === "shortlisting" && canAccess(role, "canShortlist", perms) && <AppsTab jobs={jobs} applications={applications} jobId={jobId} cvStore={cvStore} updateStatus={updateApplicationStatus} bulkUpdateStatus={bulkUpdateApplicationStatus} logAction={logAction} actor={actor} criteria={criteria} role={role} perms={perms} logEmail={logEmail} bulkLogEmails={bulkLogEmails} mode="shortlist" initialStatusFilter="Shortlisted" />}
          {tab === "interview-panel" && canAccess(role, "canShortlist", perms) && <InterviewPanelTab jobs={jobs} />}
          {tab === "assessment-schedule" && canAccess(role, "canScheduleAssessment", perms) && <AssessmentTab jobs={jobs} applications={applications} criteria={criteria} mode="schedule" />}
          {tab === "candidate-assessment" && canAccess(role, "canRecordAssessment", perms) && <AssessmentTab jobs={jobs} applications={applications} criteria={criteria} mode="record" />}
          {tab === "shortlisting-ii" && canAccess(role, "canShortlist", perms) && <CandidateScoringPanel jobs={jobs} applications={applications} jobId={jobId} cvStore={cvStore} actor={actor} criteria={criteria} bulkUpdateStatus={bulkUpdateApplicationStatus} logAction={logAction} onSelectJob={(id: number) => navigate({ to: "/admin", search: { tab: "shortlisting-ii", jobId: id } })} onClearJob={() => navigate({ to: "/admin", search: { tab: "shortlisting-ii" } })} />}
          {tab === "shortlisting-reports" && hasAnyPerm("canShortlist|canViewAudit") && <ShortlistingReportsTab />}
          {tab === "emails"      && canAccess(role, "canViewApplications", perms) && <EmailsTab sentEmails={sentEmails} clearEmailLog={clearEmailLog} />}
          {tab === "interns"     && canAccess(role, "canViewApplications", perms) && <InternsTab applications={applications} jobs={jobs} criteria={criteria} actor={actor} settings={settings} updateStatus={updateApplicationStatus} bulkUpdateStatus={bulkUpdateApplicationStatus} canShortlist={canAccess(role, "canShortlist", perms)} logAction={logAction} />}
          {tab === "analytics"   && hasAnyPerm("canViewAudit|canShortlist") && <AnalyticsTab />}
          {tab === "staff"       && canAccess(role, "canViewStaff", perms) && <StaffTab actor={actor} logAction={logAction} pushToast={pushToast} />}
          {tab === "reports"     && canAccess(role, "canExport", perms) && <ReportsTab jobs={jobs} applications={applications} audit={audit} actor={actor} cvStore={cvStore} />}
          {tab === "audit"       && canAccess(role, "canViewAudit", perms) && <AuditTab audit={audit} actor={actor} />}
          {tab === "settings"    && canAccess(role, "canManageSettings", perms) && <SettingsTab settings={settings} updateSettings={updateSettings} logAction={logAction} />}
          {tab === "administration" && canAccess(role, "canManageAdmins", perms) && <AdministrationTab logAction={logAction} />}
          {tab === "permissions" && canAccess(role, "canAssignRights", perms) && <PermissionsTab overrides={permissionOverrides} save={savePermissionOverride} logAction={logAction} roleDefaults={ROLE_DEFAULTS} />}
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

      {tour.stage === "prompt" && <OnboardingPrompt def={adminTour} onAccept={tour.accept} onSkip={tour.dismiss} />}
      {tour.stage === "touring" && <OnboardingSpotlight steps={adminTour.steps} onFinish={tour.dismiss} onSkip={tour.dismiss} />}
    </div>
  );
}
