import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { useApp } from "@/context/AppContext";

export const Route = createFileRoute("/vacancies")({
  head: () => ({
    meta: [
      { title: "Current Vacancies — CAA Uganda" },
      { name: "description", content: "Browse all open roles at the Civil Aviation Authority of Uganda." },
      { property: "og:title", content: "Current Vacancies — CAA Uganda" },
      { property: "og:description", content: "12 positions open across Air Traffic, Safety, Finance, ICT and Legal." },
    ],
  }),
  component: VacanciesPage,
});

const DEPT_TABS = [
  { key: "all",     label: "All Roles" },
  { key: "atm",     label: "Air Traffic Mgmt" },
  { key: "safety",  label: "Aviation Safety" },
  { key: "finance", label: "Finance & Admin" },
  { key: "ict",     label: "ICT & Systems" },
  { key: "legal",   label: "Legal" },
  { key: "ops",     label: "Operations" },
];

function VacanciesPage() {
  const { jobs, canSeeJob, auth, trackEvent } = useApp();
  const [active, setActive] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [active]);
  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(() => trackEvent({ type: "search", query: q.trim() }), 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const visible = useMemo(() => jobs.filter(canSeeJob), [jobs, canSeeJob]);
  const byTab = active === "all" ? visible : visible.filter((j) => j.deptKey === active);
  const filtered = useMemo(() => {
    if (!q) return byTab;
    const lq = q.toLowerCase();
    return byTab.filter((j) => (j.title + " " + j.dept + " " + j.location + " " + j.salaryBand).toLowerCase().includes(lq));
  }, [byTab, q]);
  const tabCount = (key: string) => key === "all" ? visible.length : visible.filter((j) => j.deptKey === key).length;
  const tabs = DEPT_TABS.filter((t) => tabCount(t.key) > 0);

  return (
    <>
      <div className="caa-hero-bg py-10 px-4 sm:px-6">
        <div className="relative mx-auto max-w-6xl">
          <h1 className="font-bold text-white text-3xl md:text-4xl">Current Vacancies</h1>
          <p className="text-white/70 mt-1.5 text-sm">
            {visible.length} positions open · Updated June 2026
            {auth.isLoggedIn && auth.effectiveType === "internal" && (
              <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px]">Internal access</span>
            )}
          </p>
          <div className="mt-5 relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, department or keyword…"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-md bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white"
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`shrink-0 px-4 py-2 text-sm rounded-full border transition-colors ${
                  active === t.key
                    ? "bg-caa-navy text-white border-caa-navy"
                    : "bg-white text-caa-body border-caa-border hover:border-caa-navy"
                }`}
              >
                {t.label} ({tabCount(t.key)})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="caa-card p-5 space-y-3">
                    <div className="flex gap-2"><div className="caa-skeleton h-5 w-20" /><div className="caa-skeleton h-5 w-16" /></div>
                    <div className="caa-skeleton h-5 w-3/4" />
                    <div className="caa-skeleton h-4 w-1/2" />
                    <div className="flex justify-between pt-3 border-t border-caa-border">
                      <div className="caa-skeleton h-4 w-28" />
                      <div className="caa-skeleton h-8 w-24" />
                    </div>
                  </div>
                ))
              : filtered.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
          {!loading && filtered.length === 0 && (
            <p className="text-center text-caa-muted py-10">
              {q ? `No vacancies match "${q}".` : "No vacancies in this category."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}