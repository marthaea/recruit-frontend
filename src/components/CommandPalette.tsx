import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ArrowRight, Briefcase, LayoutDashboard, UserPlus, LogIn, Home } from "lucide-react";
import { useApp } from "@/context/AppContext";

type Item = { label: string; hint: string; icon: React.ReactNode; run: () => void };

export function CommandPalette() {
  const { jobs, auth } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const items: Item[] = useMemo(() => {
    const nav: Item[] = [
      { label: "Home", hint: "Go to homepage", icon: <Home className="h-4 w-4" />, run: () => navigate({ to: "/" }) },
      { label: "Browse Vacancies", hint: "All open roles", icon: <Briefcase className="h-4 w-4" />, run: () => navigate({ to: "/vacancies" }) },
      ...(auth.isLoggedIn
        ? [{ label: "My Dashboard", hint: "Track applications", icon: <LayoutDashboard className="h-4 w-4" />, run: () => navigate({ to: "/dashboard" }) }]
        : [
            { label: "Sign In", hint: "Access your account", icon: <LogIn className="h-4 w-4" />, run: () => navigate({ to: "/login" }) },
            { label: "Register", hint: "Create a new account", icon: <UserPlus className="h-4 w-4" />, run: () => navigate({ to: "/register" }) },
          ]),
    ];
    const jobItems: Item[] = jobs.map((j) => ({
      label: j.title,
      hint: `${j.dept} · ${j.location}`,
      icon: <Briefcase className="h-4 w-4" />,
      run: () => navigate({ to: "/apply", search: { jobId: j.id } }),
    }));
    const all = [...nav, ...jobItems];
    if (!q.trim()) return all.slice(0, 8);
    const needle = q.toLowerCase();
    return all.filter((i) => (i.label + " " + i.hint).toLowerCase().includes(needle)).slice(0, 10);
  }, [q, jobs, auth.isLoggedIn, navigate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] caa-fade-in" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-caa-navy/40 backdrop-blur-sm" />
      <div
        className="relative mx-auto mt-[12vh] max-w-xl bg-white rounded-xl border border-caa-border shadow-2xl overflow-hidden caa-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-caa-border">
          <Search className="h-4 w-4 text-caa-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vacancies, pages…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-caa-light"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-caa-border text-caa-muted">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-auto py-2">
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-caa-muted">No matches</li>}
          {items.map((it, i) => (
            <li key={i}>
              <button
                onClick={() => { it.run(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-caa-surface group"
              >
                <span className="text-caa-navy">{it.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-caa-body truncate">{it.label}</span>
                  <span className="block text-xs text-caa-muted truncate">{it.hint}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-caa-light opacity-0 group-hover:opacity-100" />
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 py-2 border-t border-caa-border text-[11px] text-caa-muted flex items-center justify-between">
          <span>Quick navigation</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}