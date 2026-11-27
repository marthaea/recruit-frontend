import { useRef, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  Users, Briefcase, Archive, GraduationCap, CheckCircle2, Printer, Camera, ChevronRight,
} from "lucide-react";
import {
  useApp, type Job, type Application,
} from "@/app/providers/AppContext";
import { cv as cvApi } from "@/services/api/client";
import { PhotoCropModal } from "@/features/candidate/components/PhotoCropModal";
import { AnimatedSection } from "./shared";
import { computeAttention, ATTENTION_TARGET, type AttentionFocus } from "./attention";

// Dashboard-only status palette, tuned to the UCAA navy brand so the charts
// read as one family instead of the rainbow STATUS_COLORS used elsewhere.
// Keyed by status name (the old pie picked colours by index, so the same
// status could change colour between loads).
const DASH_STATUS_COLORS: Record<string, string> = {
  Pending: "#C08A2B",
  "Under Review": "#7C9CC6",
  Shortlisted: "#1A4A8A",
  "Shortlisted II": "#2F7F8F",
  Interview: "#0B2E5F",
  "Assessment Scheduled": "#5B79A6",
  "Assessment Complete": "#3D628F",
  Offered: "#1A7A4A",
  Declined: "#C0392B",
};
const statusColor = (s: string) => DASH_STATUS_COLORS[s] ?? "#8C8F96";

const AXIS_TICK = { fontSize: 11, fill: "#5B5F66" };
const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 10, border: "1px solid #E5E1D8", fontSize: 12, boxShadow: "0 8px 24px -12px rgba(11,46,95,.25)" },
  cursor: { fill: "rgba(11,46,95,0.05)" },
};

function PanelHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold text-caa-body">{title}</h3>
      {hint && <p className="text-xs text-caa-muted mt-0.5">{hint}</p>}
    </div>
  );
}

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
  )
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

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

  // Builds a standalone print page. The old version pasted the dashboard's
  // innerHTML into a blank window, but that window has none of the site's
  // CSS, so chart containers sized by Tailwind classes collapsed and only
  // some charts survived. Here each chart's SVG is cloned and given a
  // viewBox (so it scales to the page), and the legends, totals and KPIs are
  // rebuilt from the data as plain HTML.
  const printCharts = () => {
    const el = printRef.current;
    if (!el) return;
    const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const chartSvg = (name: string, maxWidth: number) => {
      const svg = el.querySelector<SVGSVGElement>(`[data-print-chart="${name}"] svg.recharts-surface`);
      if (!svg) return `<p class="empty">No data to chart.</p>`;
      const width = Number(svg.getAttribute("width")) || svg.clientWidth || 600;
      const height = Number(svg.getAttribute("height")) || svg.clientHeight || 200;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
      clone.setAttribute("width", "100%");
      clone.removeAttribute("height");
      clone.removeAttribute("style");
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      return `<div class="chart" style="max-width:${maxWidth}px">${new XMLSerializer().serializeToString(clone)}</div>`;
    };
    const total = applications.length;
    const statusRows = statusData.map((d) =>
      `<tr><td><span class="sw" style="background:${statusColor(d.name)}"></span>${esc(d.name)}</td><td class="n">${d.value}</td><td class="n muted">${total ? Math.round((d.value / total) * 100) : 0}%</td></tr>`).join("");
    const deptRows = deptData.map((d) => `<tr><td>${esc(d.full)}</td><td class="n">${d.apps}</td></tr>`).join("");
    const kpiHtml = kpis.map((k) => `<div class="kpi"><div class="kl">${esc(k.label)}</div><div class="kn">${k.n}</div></div>`).join("");

    const w = window.open("", "_blank");
    if (!w) {
      pushToast({ type: "warning", title: "Pop-up blocked", message: "Allow pop-ups for this site to print the charts." });
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recruitment dashboard — UCAA</title><style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: "DM Sans", Helvetica, Arial, sans-serif; color: #0F1C30; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      header { border-bottom: 3px solid #0B2E5F; padding-bottom: 10px; margin-bottom: 16px; }
      h1 { color: #0B2E5F; font-size: 18px; margin: 0; }
      .sub { color: #5B5F66; font-size: 12px; margin: 4px 0 0; }
      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
      .kpi { border: 1px solid #E5E1D8; border-radius: 8px; padding: 10px 12px; }
      .kl { font-size: 11px; color: #5B5F66; }
      .kn { font-size: 22px; font-weight: 700; margin-top: 2px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .card { border: 1px solid #E5E1D8; border-radius: 8px; padding: 14px; break-inside: avoid; page-break-inside: avoid; }
      .wide { grid-column: 1 / -1; }
      h3 { font-size: 14px; margin: 0 0 2px; }
      .hint { font-size: 11px; color: #5B5F66; margin: 0 0 10px; }
      .chart { margin: 0 auto 8px; }
      .chart svg { display: block; width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      td { padding: 3px 0; border-top: 1px solid #EEEBE4; }
      td.n { text-align: right; font-variant-numeric: tabular-nums; width: 48px; }
      .muted { color: #8C8F96; }
      .sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
      .empty { font-size: 12px; color: #8C8F96; }
      footer { margin-top: 14px; font-size: 10px; color: #8C8F96; }
    </style></head><body>
      <header>
        <h1>Uganda Civil Aviation Authority</h1>
        <p class="sub">Recruitment dashboard, printed ${esc(new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }))}</p>
      </header>
      <section class="kpis">${kpiHtml}</section>
      <section class="grid">
        <div class="card">
          <h3>Applications by status</h3><p class="hint">${total} applications in total</p>
          ${chartSvg("status", 200)}
          <table>${statusRows}</table>
        </div>
        <div class="card">
          <h3>Applications by department</h3><p class="hint">Across all listings, open and closed</p>
          ${chartSvg("department", 520)}
          <table>${deptRows}</table>
        </div>
        <div class="card wide">
          <h3>Applications over the last 6 months</h3>
          ${chartSvg("trend", 1000)}
        </div>
      </section>
      <footer>HR Console, UCAA e-Recruitment Portal</footer>
    </body></html>`);
    w.document.close();
    // Give the new window a moment to lay out before opening the print dialog.
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const today = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  const kpis = [
    { Icon: Briefcase,     label: "Active listings",     n: activeJobs.length,   tab: "jobs",    hint: "Open for applications" },
    { Icon: Users,         label: "Total applications",  n: applications.length, tab: "apps",    hint: null },
    { Icon: GraduationCap, label: "Intern applications", n: applications.filter((a: Application) => a.cgpa !== undefined).length, tab: "interns", hint: "With CGPA on file" },
    { Icon: Archive,       label: "Expired listings",    n: jobs.filter(isExpired).length, tab: "jobs", hint: "Past closing date" },
  ];

  return (
    <div className="space-y-5">
      {/* Header band — the one bold element on the page: greeting and the four
          headline numbers on UCAA navy. Everything below stays quiet. */}
      <section className="caa-hero-bg rounded-[20px] overflow-hidden text-white">
        <div className="relative p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setPhotoModalOpen(true)}
              className="relative group shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Change profile photo"
            >
              {auth?.photoUrl ? (
                <img
                  src={auth.photoUrl}
                  alt="Profile"
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/25 group-hover:ring-white/60 transition"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-white/12 ring-2 ring-white/25 group-hover:ring-white/60 flex items-center justify-center transition">
                  <span className="font-bold text-xl select-none">
                    {auth?.firstName?.[0]}{auth?.lastName?.[0]}
                  </span>
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-caa-navy shadow flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-2xl text-white truncate">Hi {auth?.firstName ?? "there"}</h1>
              <p className="text-xs text-white/65 mt-0.5">{today}</p>
            </div>
          </div>
          <button
            onClick={printCharts}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-white/25 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-colors shrink-0"
          >
            <Printer className="h-4 w-4" /> Print charts
          </button>
        </div>

        <div data-tour="admin-stats" className="relative grid grid-cols-2 lg:grid-cols-4 border-t border-white/12 bg-black/10">
          {kpis.map((s, i) => (
            <button
              key={s.label}
              onClick={() => navigate({ to: "/admin", search: { tab: s.tab } })}
              className={`group text-left px-5 sm:px-6 py-4 hover:bg-white/[0.06] focus:outline-none focus-visible:bg-white/10 transition-colors
                ${i % 2 === 1 ? "border-l border-white/12" : ""} ${i >= 2 ? "border-t lg:border-t-0 border-white/12" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <div className="flex items-center gap-1.5 text-white/70 text-xs">
                <s.Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <p className="font-bold text-[34px] leading-none mt-2 tabular-nums">{s.n}</p>
              <p className="text-[11px] text-white/55 mt-2 flex items-center gap-1">
                {s.hint ?? (
                  <span className={weekDelta > 0 ? "text-emerald-300" : weekDelta < 0 ? "text-rose-300" : ""}>
                    {weekDelta > 0 ? `+${weekDelta}` : weekDelta < 0 ? `${weekDelta}` : "No change"} vs last week
                  </span>
                )}
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recruitment Funnel + Pending Actions */}
      <AnimatedSection delay={80} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Funnel — one navy ramp, darkest at the top of the funnel */}
        <div className="admin-card p-5 lg:col-span-3">
          <PanelHeading title="Recruitment funnel" hint="How far this cycle's applications have progressed" />
          {(() => {
            const stages = [
              { label: "Received",     count: applications.length,                                                        color: "#0B2E5F" },
              { label: "Under review", count: applications.filter((a: Application) => a.status !== "Pending").length,     color: "#1A4A8A" },
              { label: "Shortlisted",  count: applications.filter((a: Application) => a.status === "Shortlisted").length, color: "#3D6AA8" },
              { label: "Interview",    count: applications.filter((a: Application) => a.status === "Interview").length,   color: "#6A8FC2" },
              { label: "Offered",      count: applications.filter((a: Application) => a.status === "Offered").length,     color: "#1A7A4A" },
            ];
            const max = stages[0].count || 1;
            return (
              <div className="space-y-3.5">
                {stages.map((s) => {
                  const pct = Math.round((s.count / max) * 100);
                  return (
                    <button
                      key={s.label}
                      onClick={() => navigate({ to: "/admin", search: { tab: "apps" } })}
                      className="w-full text-left group rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-caa-navy-2/40"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-caa-body group-hover:text-caa-navy transition-colors">{s.label}</span>
                        <span className="text-sm tabular-nums">
                          <span className="font-bold text-caa-body">{s.count}</span>
                          <span className="text-caa-light ml-2 text-xs">{pct}%</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-caa-surface overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(pct, s.count > 0 ? 2 : 0)}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Pending Actions */}
        {(() => {
          const csDays = settings?.closingSoonDays ?? 7;
          const att = computeAttention(jobs, applications, isExpired, csDays);
          const TONE = {
            info:    "bg-caa-navy-2",
            warning: "bg-caa-warning",
            danger:  "bg-caa-danger",
          } as const;
          const items: { count: number; label: string; tone: keyof typeof TONE; focus: AttentionFocus }[] = ([
            { count: att.pending.length, label: "application" + (att.pending.length !== 1 ? "s" : "") + " awaiting first review", tone: "info", focus: "pending" },
            { count: att.stale.length,   label: "application" + (att.stale.length !== 1 ? "s" : "") + " pending review for over 7 days", tone: "warning", focus: "stale" },
            { count: att.invite.length,  label: "shortlisted candidate" + (att.invite.length !== 1 ? "s" : "") + " to invite for interview", tone: "info", focus: "invite" },
            { count: att.closing.length, label: "vacanc" + (att.closing.length !== 1 ? "ies" : "y") + ` closing within ${csDays} days`, tone: "danger", focus: "closing" },
            { count: att.low.length,     label: "vacanc" + (att.low.length !== 1 ? "ies" : "y") + " closing in ≤3 days with fewer than 3 applicants", tone: "danger", focus: "low" },
          ] as const).filter((i) => i.count > 0).map((i) => ({ ...i }));
          return (
            <div className="admin-card p-5 lg:col-span-2">
              <PanelHeading title="Needs your attention" hint={items.length ? `${items.length} item${items.length !== 1 ? "s" : ""} to action` : undefined} />
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-28 text-center">
                  <CheckCircle2 className="h-7 w-7 text-caa-success mb-2" />
                  <p className="text-sm font-semibold text-caa-body">All clear</p>
                  <p className="text-xs text-caa-muted mt-0.5">No pending actions at this time.</p>
                </div>
              ) : (
                <ul className="divide-y divide-caa-border -mx-2">
                  {items.map((item) => (
                    <li key={item.label}>
                      <button
                        onClick={() => navigate({ to: "/admin", search: { ...ATTENTION_TARGET[item.focus], focus: item.focus } })}
                        title="Open it with a guided pointer to what needs action"
                        className="w-full text-left flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-caa-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-caa-navy-2/40 transition-colors group"
                      >
                        <span className={`h-8 w-1 rounded-full shrink-0 ${TONE[item.tone]}`} aria-hidden />
                        <span className="font-bold text-xl text-caa-body tabular-nums w-12 shrink-0">{item.count}</span>
                        <span className="text-sm text-caa-muted leading-snug flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-caa-light group-hover:text-caa-navy shrink-0 transition-colors" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
      </AnimatedSection>

      {/* Charts grid — printable */}
      <AnimatedSection delay={160}>
      <div ref={printRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="admin-card card p-5" data-print-chart="status">
          <PanelHeading title="Applications by status" hint={`${applications.length} applications in total`} />
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            <div className="relative h-[190px] w-[190px] shrink-0 mx-auto sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={1.5} stroke="none">
                    {statusData.map((d) => (
                      <Cell key={d.name} fill={statusColor(d.name)} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-bold text-2xl text-caa-body tabular-nums">{applications.length}</span>
                <span className="text-[11px] text-caa-muted">applications</span>
              </div>
            </div>
            <ul className="flex-1 min-w-[160px] space-y-1.5">
              {statusData.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: statusColor(d.name) }} />
                  <span className="text-caa-body truncate flex-1">{d.name}</span>
                  <span className="tabular-nums font-medium text-caa-body">{d.value}</span>
                  <span className="tabular-nums text-xs text-caa-light w-9 text-right">
                    {applications.length ? Math.round((d.value / applications.length) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="admin-card card p-5" data-print-chart="department">
          <PanelHeading title="Applications by department" hint="Across all listings, open and closed" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptData} margin={{ left: -24, right: 4, top: 4 }}>
              <CartesianGrid vertical={false} stroke="#EEEBE4" />
              <XAxis dataKey="dept" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, { payload }) => [v, payload?.full]} />
              <Bar dataKey="apps" fill="#1A4A8A" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card card p-5 md:col-span-2" data-print-chart="trend">
          <PanelHeading title="Applications over the last 6 months" />
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={trend} margin={{ left: -24, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} stroke="#EEEBE4" />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: "#1A4A8A", strokeOpacity: 0.25 }} />
              <Area type="monotone" dataKey="apps" stroke="#0B2E5F" strokeWidth={2.5} fill="#1A4A8A" fillOpacity={0.1}
                dot={{ r: 3.5, fill: "#fff", stroke: "#0B2E5F", strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </AreaChart>
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
