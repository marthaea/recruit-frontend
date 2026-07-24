import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Circle, Bell, FileText, Eye, Users, Award, Mail, Pencil, X, UserCog, Download, Camera } from "lucide-react";
import { useApp, canWithdraw, type Application, type CvProfile } from "@/context/AppContext";
import { downloadApplicationSummary } from "@/lib/admin-pdf";
import { PhotoCropModal } from "@/components/PhotoCropModal";
import { cv as cvApi, applications as appsApi } from "@/lib/api/client";
import { computeCvChecklist, computeCvCompletion } from "@/lib/cv-completion";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — CAA Uganda" },
      { name: "description", content: "Track your applications and complete your candidate profile." },
    ],
  }),
  component: DashboardPage,
});

const STATUS: Record<Application["status"], string> = {
  Shortlisted:    "bg-caa-success/10 text-caa-success",
  "Under Review": "bg-caa-navy-2/10 text-caa-navy-2",
  Pending:        "bg-caa-warning/15 text-caa-warning",
  Declined:       "bg-caa-danger/10 text-caa-danger",
  Interview:      "bg-purple-100 text-purple-700",
  "Assessment Scheduled": "bg-sky-100 text-sky-700",
  "Assessment Complete":  "bg-indigo-100 text-indigo-700",
  "Shortlisted II":       "bg-teal-100 text-teal-700",
  Offered:        "bg-teal-100 text-teal-700",
};

const NOTIF_ICON: Record<string, string> = {
  shortlisted: "✅", declined: "❌", interview: "📅", offered: "🎉", info: "ℹ️",
};

// The 4 internal Assessment-stage statuses collapse into a single "Assessment"
// dot here — candidates get an honest, simpler view than HR's detailed pipeline.
const PIPE_STEPS = ["Applied", "Shortlisted", "Interview", "Assessment", "Offered"] as const;
const PIPE_INDEX: Record<Application["status"], number> = {
  // Shortlisted II now sits between Shortlisted and Interview (CV-scoring stage)
  // — kept in the "Shortlisted" dot here since the candidate-facing pipeline
  // doesn't break out that level of detail.
  Pending: 0, "Under Review": 0, Shortlisted: 1, "Shortlisted II": 1, Interview: 2,
  "Assessment Scheduled": 3, "Assessment Complete": 3,
  Offered: 4, Declined: -1,
};

function AppPipeline({ status }: { status: Application["status"] }) {
  const declined = status === "Declined";
  const current = PIPE_INDEX[status] ?? 0;
  return (
    <div className="flex items-center gap-0 mt-3 w-full max-w-xs">
      {PIPE_STEPS.map((label, i) => {
        const done    = !declined && i < current;
        const active  = !declined && i === current;
        const isDone  = done || (!declined && i < current);
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors
                ${declined ? "bg-caa-border"
                  : done    ? "bg-caa-success"
                  : active  ? "bg-caa-navy"
                  : "bg-caa-surface border border-caa-border"}`}
              >
                {done ? (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                ) : (
                  <span className={`text-[9px] font-bold ${active ? "text-white" : "text-caa-muted"}`}>{i + 1}</span>
                )}
              </div>
              <span className={`text-[9px] mt-0.5 whitespace-nowrap font-medium
                ${declined ? "text-caa-muted"
                  : done    ? "text-caa-success"
                  : active  ? "text-caa-navy"
                  : "text-caa-muted"}`}
              >{label}</span>
            </div>
            {i < PIPE_STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 mb-3.5 ${isDone && !declined ? "bg-caa-success" : "bg-caa-border"}`} />
            )}
          </div>
        );
      })}
      {declined && (
        <span className="ml-2 px-2 py-0.5 text-[9px] font-bold rounded-full bg-caa-danger/10 text-caa-danger shrink-0">Declined</span>
      )}
    </div>
  );
}

// ── Live clock ────────────────────────────────────────────────────────────────
function useLiveTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function DashboardPage() {
  const { auth, sessionRestoring, applications, jobs, withdrawApplication, updateProfile, updatePhotoUrl, pushToast, notifications, markNotificationRead } = useApp();
  const [liveApps, setLiveApps] = useState<Application[] | null>(null);
  const navigate = useNavigate();
  const now = useLiveTime();

  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editProfile, setEditProfile] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [pf, setPf] = useState({ firstName: auth.firstName, lastName: auth.lastName, email: auth.email });

  useEffect(() => {
    setPf({ firstName: auth.firstName, lastName: auth.lastName, email: auth.email });
  }, [auth.firstName, auth.lastName, auth.email]);

  useEffect(() => {
    // A stored session looks logged-out for a moment on every fresh page load,
    // until AppContext confirms it against the backend (see sessionRestoring).
    // Redirecting here before that confirmation lands would kick out a
    // perfectly valid, already-logged-in candidate — wait for it to settle.
    if (sessionRestoring) return;
    if (!auth.isLoggedIn) navigate({ to: "/login" });
  }, [auth.isLoggedIn, sessionRestoring, navigate]);

  // Refresh application statuses from the server each time the dashboard is opened
  useEffect(() => {
    if (sessionRestoring || !auth.isLoggedIn || !auth.email) return;
    appsApi.list({ email: auth.email }).then((r) => {
      if (r.success) setLiveApps(r.data as unknown as Application[]);
    }).catch(() => {});
  }, [auth.isLoggedIn, auth.email, sessionRestoring]);

  // Load the CV profile to compute real completeness
  const [cvProfile, setCvProfile] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (sessionRestoring || !auth.isLoggedIn) return;
    cvApi.get().then((r) => {
      if (r.success && r.data) setCvProfile(r.data as unknown as Record<string, unknown>);
    }).catch(() => {});
  }, [auth.isLoggedIn, sessionRestoring]);

  // Greeting + time
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const timeStr = now.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const handlePhotoSave = useCallback(async (dataUrl: string, blob: Blob) => {
    updatePhotoUrl(dataUrl); // optimistic — show immediately
    setPhotoModalOpen(false);
    try {
      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
      const res = await cvApi.upload(file, "photo");
      if (res.success && res.data.url) {
        updatePhotoUrl(res.data.url);
        // Persist to DB so the photo survives logout/re-login
        await cvApi.save({ photoFile: res.data.url });
      }
    } catch {
      // keep the local data-URL — works fine without a server
    }
    pushToast({ type: "success", title: "Profile photo updated" });
  }, [updatePhotoUrl, pushToast]);

  if (!auth.isLoggedIn) return null;

  // Use fresh API data when available, fall back to context state
  const myApplications = (liveApps ?? applications).filter(
    (a) => a.candidateEmail?.toLowerCase() === auth.email?.toLowerCase()
  );

  const handleEdit = (a: Application) => {
    if (a.completion < 100) {
      navigate({ to: "/apply", search: { jobId: a.jobId ?? 1 } });
      pushToast({ type: "info", title: "Continue editing", message: `Resuming your ${a.title} application` });
    } else {
      pushToast({ type: "info", title: "Application complete", message: "This application is 100% tailored. You can still update before the closing date." });
      navigate({ to: "/apply", search: { jobId: a.jobId ?? 1 } });
    }
  };

  const confirmWithdraw = () => {
    if (confirmId == null) return;
    withdrawApplication(confirmId);
    setConfirmId(null);
    pushToast({ type: "success", title: "Application withdrawn", message: "You can re-apply any time before the closing date." });
  };

  const saveProfile = () => {
    updateProfile(pf);
    setEditProfile(false);
    pushToast({ type: "success", title: "Profile updated", message: "Your candidate profile changes have been saved." });
  };

  // Real profile completeness, computed from the saved CV profile
  const cvP = cvProfile as unknown as Partial<CvProfile> | null;
  const checklist = computeCvChecklist(cvP, auth.photoUrl);
  const completionPct = computeCvCompletion(cvP, auth.photoUrl);
  const nextMissing = checklist.find((c) => !c.done);

  return (
    <>
      <div className="caa-hero-bg py-10 px-4 sm:px-6">
        <div className="relative mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          {/* Left: avatar + greeting */}
          <div className="flex items-center gap-4">
            {/* Profile photo — click to change */}
            <button
              onClick={() => setPhotoModalOpen(true)}
              className="relative group shrink-0 focus:outline-none"
              aria-label="Change profile photo"
            >
              {auth.photoUrl ? (
                <img
                  src={auth.photoUrl}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover border-2 border-white/40 group-hover:border-white transition-colors shadow-md"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white/30 group-hover:bg-white/30 transition-colors flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl select-none">
                    {auth.firstName?.[0]}{auth.lastName?.[0]}
                  </span>
                </div>
              )}
              {/* Camera badge on hover */}
              <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-caa-gold border-2 border-[#0b2e5f] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-3 w-3 text-caa-navy" />
              </span>
            </button>

            {/* Greeting text + live clock */}
            <div>
              <p className="text-white/65 text-sm">
                {greeting} 👋 &nbsp;·&nbsp; {dateStr}
              </p>
              <h1 className="font-bold text-white text-3xl md:text-4xl mt-0.5">
                {auth.firstName} {auth.lastName}
              </h1>
              <p className="text-white/45 text-sm mt-1 font-mono tracking-wide">{timeStr}</p>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex gap-3">
            <Link to="/vacancies" className="px-4 py-2.5 text-sm border border-white/30 text-white rounded-md hover:bg-white/10 transition-colors">
              Browse Vacancies
            </Link>
            <button
              onClick={() => setEditProfile(true)}
              className="px-4 py-2.5 text-sm bg-white text-caa-navy font-semibold rounded-md hover:bg-caa-surface transition-colors inline-flex items-center gap-2"
            >
              <UserCog className="h-4 w-4" /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-8 pb-10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left col */}
          <div className="lg:col-span-2 space-y-5">
            {/* In-app notifications */}
            {notifications.filter((n) => n.recipientEmail === auth.email?.toLowerCase()).length > 0 && (
              <div className="caa-card p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-caa-border bg-caa-navy/4">
                  <Bell className="h-4 w-4 text-caa-navy" />
                  <h3 className="font-semibold text-sm text-caa-body">Notifications from CAA HR</h3>
                  <span className="ml-auto text-[11px] text-caa-muted">{notifications.filter((n) => n.recipientEmail === auth.email?.toLowerCase() && !n.read).length} unread</span>
                </div>
                <div className="divide-y divide-caa-border">
                  {notifications.filter((n) => n.recipientEmail === auth.email?.toLowerCase()).slice(0, 5).map((n) => (
                    <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.read ? "opacity-60" : ""}`}>
                      <span className="text-lg shrink-0">{NOTIF_ICON[n.type] ?? "ℹ️"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-caa-body">{n.title}</p>
                        <p className="text-xs text-caa-muted mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-caa-muted mt-1">{new Date(n.at).toLocaleString()}</p>
                      </div>
                      {!n.read && (
                        <button onClick={() => markNotificationRead(n.id)} className="shrink-0 text-[11px] text-caa-navy hover:underline">Mark read</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email notice */}
            <div className="caa-card p-4 flex items-start gap-3 border-l-[3px] border-l-caa-navy">
              <span className="h-9 w-9 rounded-full bg-caa-surface text-caa-navy flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4" />
              </span>
              <div className="text-sm">
                <p className="font-medium text-caa-body">Email notifications enabled</p>
                <p className="text-caa-muted mt-0.5">
                  Any new updates on approval, shortlisting or rejection will be sent to{" "}
                  <span className="text-caa-navy font-medium">{auth.email || "your registered email"}</span>. Please check your inbox and spam folder regularly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { l: "Applications Submitted", n: myApplications.length, color: "text-caa-navy" },
                { l: "Shortlisted", n: myApplications.filter((a) => a.status === "Shortlisted").length, color: "text-caa-navy-2" },
                { l: "Offers Received", n: myApplications.filter((a) => a.status === "Offered").length, color: "text-caa-success" },
              ].map((m) => (
                <div key={m.l} className="caa-card p-5">
                  <p className="text-xs text-caa-muted">{m.l}</p>
                  <p className={`font-bold text-4xl mt-2 ${m.color}`}>{m.n}</p>
                </div>
              ))}
            </div>

            <div className="caa-card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-caa-border">
                <h3 className="font-bold text-lg text-caa-body">My Applications</h3>
                <span className="text-xs text-caa-muted">Edit or withdraw any active application</span>
              </div>
              <div className="divide-y divide-caa-border">
                {myApplications.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-caa-muted">
                    You have no active applications. <Link to="/vacancies" className="text-caa-navy hover:text-caa-gold underline">Browse vacancies</Link>
                  </div>
                )}
                {myApplications.map((a) => (
                  <div key={a.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="h-10 w-10 rounded-full bg-caa-surface text-caa-navy text-xs font-semibold flex items-center justify-center shrink-0">
                      {a.abbr}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-caa-body truncate">{a.title}</p>
                      <p className="text-xs text-caa-muted mt-0.5">{a.dept} · Applied {a.date}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-32 bg-caa-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full ${a.completion === 100 ? "bg-caa-success" : "bg-caa-navy-2"}`}
                            style={{ width: `${a.completion}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-medium ${a.completion === 100 ? "text-caa-success" : "text-caa-muted"}`}>
                          {a.completion}% tailored
                        </span>
                      </div>
                      <AppPipeline status={a.status} />
                    </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUS[a.status]}`}>
                      {a.status}
                    </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(a)}
                          className="px-2.5 py-1.5 text-xs border border-caa-border text-caa-navy rounded-md hover:border-caa-navy hover:bg-caa-surface inline-flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            const job = jobs.find((j) => j.id === a.jobId);
                            downloadApplicationSummary(a, `${auth.firstName} ${auth.lastName}`, auth.email, job);
                            pushToast({ type: "success", title: "PDF downloaded", message: `Application summary for ${a.title}` });
                          }}
                          className="px-2.5 py-1.5 text-xs border border-caa-border text-caa-navy rounded-md hover:border-caa-navy hover:bg-caa-surface inline-flex items-center gap-1"
                          title="Download application summary PDF"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </button>
                        {canWithdraw(a.status) ? (
                          <button
                            onClick={() => setConfirmId(a.id)}
                            className="px-2.5 py-1.5 text-xs border border-caa-danger/40 text-caa-danger rounded-md hover:bg-caa-danger/5 inline-flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Withdraw
                          </button>
                        ) : (
                          <span
                            className="px-2.5 py-1.5 text-xs border border-caa-border text-caa-muted/70 rounded-md inline-flex items-center gap-1 cursor-not-allowed"
                            title="Applications can no longer be withdrawn once shortlisted"
                          >
                            <X className="h-3 w-3" /> Withdraw
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-5">
            <div className="caa-card p-5">
              <h3 className="font-bold text-base text-caa-body">Profile Completion</h3>
              <div className="mt-3 h-2 bg-caa-surface rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${completionPct === 100 ? "bg-caa-success" : "bg-gradient-to-r from-caa-navy to-caa-navy-2"}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="text-xs text-caa-muted mt-2">
                {completionPct === 100
                  ? "100% complete — your profile is ready for applications!"
                  : `${completionPct}% complete${nextMissing ? ` · next: ${nextMissing.label.toLowerCase()}` : ""}`}
              </p>
              {completionPct < 100 && (
                <p className="text-[11px] text-caa-muted mt-1">
                  A complete profile is filled into every application automatically — finish it once, reuse it everywhere.
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    {c.done ? (
                      <span className="h-5 w-5 rounded-full bg-caa-success flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    ) : (
                      <Circle className="h-5 w-5 text-caa-light" />
                    )}
                    <span className={c.done ? "text-caa-body" : "text-caa-muted"}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="caa-card p-5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-caa-navy" />
                <h3 className="font-bold text-base text-caa-body">Notifications</h3>
              </div>
              <div className="mt-3 space-y-3">
                <div className="border-l-2 border-caa-success pl-3 py-1">
                  <p className="text-sm font-medium text-caa-body">Shortlist confirmed</p>
                  <p className="text-xs text-caa-muted mt-0.5">Your application for Senior ATC has been shortlisted. Interview dates to follow.</p>
                </div>
                <div className="border-l-2 border-caa-navy-2 pl-3 py-1">
                  <p className="text-sm font-medium text-caa-body">Application received</p>
                  <p className="text-xs text-caa-muted mt-0.5">Finance Officer application successfully submitted.</p>
                </div>
              </div>
            </div>

            <div className="caa-card p-5">
              <h3 className="font-bold text-base text-caa-body">Application Timeline</h3>
              <ol className="mt-4 relative border-l border-caa-border ml-2 space-y-5">
                {[
                  { icon: <FileText className="h-3.5 w-3.5" />, label: "Submitted", date: "Jun 3, 2026", done: true, color: "bg-caa-success" },
                  { icon: <Eye className="h-3.5 w-3.5" />, label: "Under Review", date: "Jun 5, 2026", done: true, color: "bg-caa-navy-2" },
                  { icon: <Users className="h-3.5 w-3.5" />, label: "Shortlisted", date: "Jun 10, 2026", done: true, color: "bg-caa-navy" },
                  { icon: <Award className="h-3.5 w-3.5" />, label: "Interview", date: "Pending", done: false, color: "bg-caa-light" },
                ].map((s, i) => (
                  <li key={i} className="ml-4">
                    <span className={`absolute -left-[11px] h-5 w-5 rounded-full ${s.color} text-white flex items-center justify-center`}>{s.icon}</span>
                    <p className={`text-sm font-medium ${s.done ? "text-caa-body" : "text-caa-muted"}`}>{s.label}</p>
                    <p className="text-[11px] text-caa-muted">{s.date}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw confirmation modal */}
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 caa-fade-in p-4">
          <div className="caa-card p-6 max-w-md w-full caa-scale-in">
            <h3 className="font-bold text-lg text-caa-body">Withdraw application?</h3>
            <p className="text-sm text-caa-muted mt-2">
              This will remove your application from review. You can re-apply any time before the role closes.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmId(null)} className="px-4 py-2 text-sm border border-caa-border rounded-md text-caa-body hover:bg-caa-surface">
                Cancel
              </button>
              <button onClick={confirmWithdraw} className="px-4 py-2 text-sm bg-caa-danger text-white rounded-md hover:opacity-90">
                Yes, withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo crop modal */}
      <PhotoCropModal
        open={photoModalOpen}
        currentPhoto={auth.photoUrl}
        onClose={() => setPhotoModalOpen(false)}
        onSave={handlePhotoSave}
      />

      {/* Edit profile modal */}
      {editProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 caa-fade-in p-4">
          <div className="caa-card p-6 max-w-md w-full caa-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-caa-body">Edit your profile</h3>
              <button onClick={() => setEditProfile(false)} className="text-caa-muted hover:text-caa-body"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-caa-muted">First name</label>
                <input
                  value={pf.firstName}
                  onChange={(e) => setPf({ ...pf, firstName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy"
                />
              </div>
              <div>
                <label className="text-xs text-caa-muted">Last name</label>
                <input
                  value={pf.lastName}
                  onChange={(e) => setPf({ ...pf, lastName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy"
                />
              </div>
              <div>
                <label className="text-xs text-caa-muted">Email</label>
                <input
                  type="email"
                  value={pf.email}
                  onChange={(e) => setPf({ ...pf, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditProfile(false)} className="px-4 py-2 text-sm border border-caa-border rounded-md text-caa-body hover:bg-caa-surface">
                Cancel
              </button>
              <button onClick={saveProfile} className="px-4 py-2 text-sm bg-caa-navy text-white rounded-md hover:bg-caa-navy-2">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}