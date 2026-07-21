import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Briefcase, CheckCircle2, Eye, Filter, Activity, MessageCircle,
} from "lucide-react";
import {
  type Job, type AnalyticsEvent,
} from "@/context/AppContext";
import { chatbot as chatbotApi, type ChatbotQuery } from "@/lib/api/client";
import { EmptyState } from "./shared";

export function AnalyticsTab({ analyticsEvents }: { analyticsEvents: AnalyticsEvent[] }) {
  // Martha's question log (from the backend; requires canViewAudit)
  const [botQueries, setBotQueries] = useState<ChatbotQuery[] | null>(null);
  useEffect(() => {
    chatbotApi.listQueries({ days: 30, limit: 500 })
      .then((r) => { if (r.success) setBotQueries(r.data); })
      .catch(() => setBotQueries([]));
  }, []);
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

      {/* ── Martha — what visitors ask the chatbot ── */}
      {(() => {
        const all = botQueries ?? [];
        const answered = all.filter((q) => q.outcome === "answered").length;
        const unanswered = all.filter((q) => q.outcome !== "answered");
        const recent = [...all].sort((a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()).slice(0, 15);
        const grouped = Object.values(
          unanswered.reduce((acc: Record<string, { query: string; count: number; outcome: string; matched: string | null }>, q) => {
            const k = q.query.toLowerCase();
            if (!acc[k]) acc[k] = { query: q.query, count: 0, outcome: q.outcome, matched: q.matchedQuestion };
            acc[k].count++;
            if (q.outcome === "fallback") acc[k].outcome = "fallback";
            return acc;
          }, {})
        ).sort((a, b) => b.count - a.count).slice(0, 12);

        const outcomeBadge = (outcome: string) => (
          <span className={`shrink-0 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
            outcome === "answered" ? "bg-caa-success/10 text-caa-success"
            : outcome === "fallback" ? "bg-caa-danger/10 text-caa-danger"
            : "bg-amber-100 text-amber-700"
          }`}>
            {outcome === "answered" ? "Answered" : outcome === "fallback" ? "No answer" : "Unsure"}
          </span>
        );

        return (
          <div className="caa-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-caa-navy" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-caa-navy">Martha — Chatbot Questions (30d)</h3>
            </div>
            <p className="text-[11px] text-caa-muted mb-3">
              Every question typed to Martha is logged here, most recent first — plus which ones need new FAQ content.
            </p>
            {botQueries === null ? (
              <p className="text-xs text-caa-muted">Loading…</p>
            ) : all.length === 0 ? (
              <EmptyState
                icon={<MessageCircle />}
                title="No chatbot questions logged yet"
                hint="Questions visitors type to Martha will appear here, highlighting the ones she couldn't answer."
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-3 text-xs">
                  <span className="text-caa-muted">Asked: <span className="font-bold text-caa-body">{all.length}</span></span>
                  <span className="text-caa-muted">Answered: <span className="font-bold text-caa-success">{answered}</span></span>
                  <span className="text-caa-muted">Needs attention: <span className="font-bold text-caa-danger">{unanswered.length}</span></span>
                </div>

                <p className="text-[11px] font-semibold text-caa-navy mb-2">Recent questions</p>
                <div className="divide-y divide-caa-border mb-4">
                  {recent.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 py-2 text-xs">
                      {outcomeBadge(q.outcome)}
                      <span className="text-caa-body flex-1 min-w-0 truncate" title={q.query}>"{q.query}"</span>
                      {q.matchedQuestion && <span className="text-caa-muted truncate hidden sm:block max-w-[160px]" title={`Matched: ${q.matchedQuestion}`}>→ {q.matchedQuestion}</span>}
                      <span className="text-caa-muted shrink-0 capitalize hidden sm:inline">{q.persona}</span>
                      <span className="text-caa-muted shrink-0 w-16 text-right tabular-nums">{new Date(q.askedAt).toLocaleDateString("en-UG", { day: "2-digit", month: "short" })}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] font-semibold text-caa-navy mb-2">Needs a better answer</p>
                {grouped.length === 0 ? (
                  <p className="text-xs text-caa-success font-medium">Martha answered everything she was asked. 🎉</p>
                ) : (
                  <div className="divide-y divide-caa-border">
                    {grouped.map((g) => (
                      <div key={g.query} className="flex items-center gap-3 py-2 text-xs">
                        {outcomeBadge(g.outcome)}
                        <span className="text-caa-body flex-1 min-w-0 truncate" title={g.query}>"{g.query}"</span>
                        {g.matched && <span className="text-caa-muted truncate hidden sm:block max-w-[180px]" title={`Closest match: ${g.matched}`}>→ {g.matched}</span>}
                        <span className="text-caa-muted shrink-0 font-semibold">×{g.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Interns (CGPA) ───────────────────────────────────────────────────────────

