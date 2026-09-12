import { useRef, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Users, Briefcase, Archive, GraduationCap, CheckCircle2, Printer, Camera,
} from "lucide-react";
import {
  useApp, type Job, type Application,
} from "@/app/providers/AppContext";
import { cv as cvApi } from "@/services/api/client";
import { PhotoCropModal } from "@/features/candidate/components/PhotoCropModal";
import { AnimatedSection, STATUS_COLORS } from "./shared";

export function DashboardTab({ jobs, applications, isExpired, navigate, settings, auth }: any) {
  const { updatePhotoUrl, pushToast } = useApp();
  const activeJobs = jobs.filter((j: Job) => !isExpired(j));
  const printRef = useRef<HTMLDivElement>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const handlePhotoSave = async (dataUrl: string, blob: Blob) => {
    updatePhotoUrl(dataUrl); // optimistic — show immediately
    setPhotoModalOpen(false);
    try {
      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
      const res = await cvApi.upload(file, "photo");
      // Unlike a candidate's photo, this isn't saved to a CV profile (admins
      // don't have one) — it persists locally (state + localStorage) the
      // same way it already did before the upload finished, just backed by
      // a real server file instead of a data URL.
      if (res.success && res.data.url) updatePhotoUrl(res.data.url);
    } catch {
      // keep the local data-URL — still shows correctly without a server copy
    }
    pushToast({ type: "success", title: "Profile photo updated" });
  };

  const statusData = Object.entries(
    applications.reduce((acc: any, a: Application) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {})
  ).map(([name, value]) => ({ name, value }));

  const deptData = Array.from(new Set(jobs.map((j: Job) => j.dept))).map((dept) => ({
    dept: (dept as string).split(" ")[0],
    full: dept,
    apps: applications.filter((a: Application) => a.dept === dept).length,
  }));

  // Real trend + week-over-week movement, computed from application dates
  const parseDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
  const now = Date.now();
  const appsInWindow = (fromDays: number, toDays: number) =>
    applications.filter((a: Application) => {
      const d = parseDate(a.date);
      if (!d) return false;
      const age = (now - d.getTime()) / 86_400_000;
      return age >= fromDays && age < toDays;
    }).length;
  const thisWeek = appsInWindow(0, 7);
  const lastWeek = appsInWindow(7, 14);
  const weekDelta = thisWeek - lastWeek;

  const trend = (() => {
    const months: { key: string; month: string; apps: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString("en", { month: "short" }), apps: 0 });
    }
    for (const a of applications as Application[]) {
      const d = parseDate(a.date);
      if (!d) continue;
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.apps++;
    }
    return months;
  })();

  const printCharts = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Dashboard Charts — UCAA</title><style>
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

  const today = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5">
      {/* Profile header — square (not circular, per earlier fix) profile photo,
          greeting, and the day's real actions in one card instead of two bare
          text rows. */}
      <div className="admin-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => setPhotoModalOpen(true)}
            className="relative group shrink-0 focus:outline-none"
            aria-label="Change profile photo"
          >
            {auth?.photoUrl ? (
              <img
                src={auth.photoUrl}
                alt="Profile"
                className="h-20 w-20 rounded-2xl object-cover border border-caa-border shadow-sm group-hover:border-caa-navy transition-colors"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-caa-navy/10 border border-caa-border group-hover:border-caa-navy flex items-center justify-center transition-colors">
                <span className="text-caa-navy font-bold text-xl select-none">
                  {auth?.firstName?.[0]}{auth?.lastName?.[0]}
                </span>
              </div>
            )}
            {/* Camera badge on hover */}
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-caa-navy border-2 border-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-3.5 w-3.5 text-white" />
            </span>
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-2xl text-caa-body truncate">Hi {auth?.firstName ?? "there"}</h1>
            <p className="text-xs text-caa-muted mt-0.5">{today}</p>
          </div>
        </div>
        <button onClick={printCharts} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium border border-caa-border rounded-xl hover:border-caa-navy hover:bg-caa-navy/5 text-caa-body transition-colors shrink-0">
          <Printer className="h-4 w-4" /> Print charts
        </button>
      </div>

      {/* Stat cards */}
      <AnimatedSection data-tour="admin-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { Icon: Briefcase,     label: "Active Listings",      n: activeJobs.length,    color: "text-caa-navy",     bg: "bg-caa-navy/10",     tab: "jobs" },
          { Icon: Users,         label: "Total Applications",   n: applications.length,  color: "text-caa-navy-2",   bg: "bg-caa-navy-2/10",   tab: "apps" },
          { Icon: GraduationCap, label: "Intern Applications",  n: applications.filter((a: Application) => a.cgpa !== undefined).length, color: "text-caa-success", bg: "bg-caa-success/10", tab: "interns" },
          { Icon: Archive,       label: "Expired Listings",     n: jobs.filter(isExpired).length, color: "text-caa-danger", bg: "bg-caa-danger/10", tab: "jobs" },
        ].map((s) => (
          <button key={s.label} onClick={() => navigate({ to: "/admin", search: { tab: s.tab } })} className="admin-card admin-card-hover p-4 text-left">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${s.bg}`}>
              <s.Icon className={`h-4.5 w-4.5 ${s.color}`} />
            </div>
            <p className="text-[11px] text-caa-muted mt-3">{s.label}</p>
            <p className={`font-bold text-3xl mt-1 ${s.color}`}>{s.n}</p>
            {s.label === "Total Applications" && (
              <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                weekDelta > 0 ? "bg-caa-success/12 text-caa-success" : weekDelta < 0 ? "bg-caa-danger/12 text-caa-danger" : "bg-caa-muted/10 text-caa-muted"
              }`}>
                {weekDelta > 0 ? `▲ +${weekDelta}` : weekDelta < 0 ? `▼ ${weekDelta}` : "—"} vs last week
              </span>
            )}
          </button>
        ))}
      </AnimatedSection>

      {/* Recruitment Funnel + Pending Actions */}
      <AnimatedSection delay={80} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Funnel */}
        <div className="admin-card p-4">
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
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
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
          const stalePendingCount = applications.filter((a: Application) => {
            if (a.status !== "Pending") return false;
            const d = parseDate(a.date);
            return d != null && (now - d.getTime()) / 86_400_000 > 7;
          }).length;
          const lowApplicantJobs = jobs.filter((j: Job) => {
            if (isExpired(j)) return false;
            const diff = (new Date(j.closesAt).getTime() - Date.now()) / 86_400_000;
            if (diff <= 0 || diff > 3) return false;
            return applications.filter((a: Application) => a.jobId === j.id).length < 3;
          }).length;
          const items = [
            { count: pendingAppsCount,       label: "application" + (pendingAppsCount !== 1 ? "s" : "") + " awaiting first review", color: "text-caa-navy",   bg: "bg-caa-navy/8",     tab: "apps"      },
            { count: stalePendingCount,      label: "application" + (stalePendingCount !== 1 ? "s" : "") + " pending review for over 7 days", color: "text-amber-700", bg: "bg-amber-50", tab: "apps"      },
            { count: awaitingInterviewCount, label: "shortlisted candidate" + (awaitingInterviewCount !== 1 ? "s" : "") + " to invite for interview", color: "text-purple-700", bg: "bg-purple-50",  tab: "apps"      },
            { count: closingSoonCount,       label: "vacanc" + (closingSoonCount !== 1 ? "ies" : "y") + ` closing within ${csDays} days`, color: "text-caa-danger", bg: "bg-caa-danger/8",  tab: "jobs"      },
            { count: lowApplicantJobs,       label: "vacanc" + (lowApplicantJobs !== 1 ? "ies" : "y") + " closing in ≤3 days with fewer than 3 applicants", color: "text-caa-danger", bg: "bg-caa-danger/8", tab: "jobs" },
          ].filter((i) => i.count > 0);
          return (
            <div className="admin-card p-4">
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
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl ${item.bg} hover:opacity-80 transition-opacity`}>
                      <span className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${item.color} bg-white/60`}>{item.count}</span>
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
        <div className="admin-card p-4">
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

        <div className="admin-card p-4">
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

        <div className="admin-card p-4 md:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy mb-4">Application Trend (last 6 months)</h3>
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

      <PhotoCropModal
        open={photoModalOpen}
        currentPhoto={auth?.photoUrl}
        onClose={() => setPhotoModalOpen(false)}
        onSave={handlePhotoSave}
      />
    </div>
  );
}
