import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Search, ArrowRight } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { useApp } from "@/context/AppContext";
import heroImg from "@/assets/hero-office.jpg";
import heroOffices from "@/assets/hero-caa-offices.jpg";
import heroJet from "@/assets/hero-jet.jpg";
import heroPlaneCrane from "@/assets/hero-plane-crane.jpg";
import heroPlaneBlue from "@/assets/hero-plane-blue.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CAA Uganda Recruitment Portal — Careers in Aviation" },
      { name: "description", content: "Apply for open roles at Uganda's Civil Aviation Authority. Browse current vacancies and manage your applications." },
      { property: "og:title", content: "CAA Uganda Recruitment Portal" },
      { property: "og:description", content: "Build your career in aviation excellence." },
    ],
  }),
  component: Home,
});

function Home() {
  const { jobs, canSeeJob } = useApp();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [loc, setLoc] = useState("All");

  const visible = useMemo(() => jobs.filter(canSeeJob), [jobs, canSeeJob]);

  const filtered = useMemo(() => {
    return visible.filter((j) => {
      const matchesQ = !q || (j.title + " " + j.dept + " " + j.location).toLowerCase().includes(q.toLowerCase());
      const matchesDept = dept === "All" || j.dept === dept;
      const matchesLoc = loc === "All" || j.location === loc;
      return matchesQ && matchesDept && matchesLoc;
    });
  }, [visible, q, dept, loc]);

  const isSearching = q !== "" || dept !== "All" || loc !== "All";
  const shown = isSearching ? filtered : filtered.slice(0, 4);

  const handleSearch = () => {
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  };

  const slides = [heroImg, heroPlaneCrane, heroOffices, heroPlaneBlue, heroJet];
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 2000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <>
      {/* Hero */}
      <section className="caa-hero-photo pt-20 pb-36 px-4 sm:px-6 overflow-hidden">
        {slides.map((src, i) => (
          <div
            key={src}
            className={`caa-hero-slide ${i === slide ? "is-active" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
            aria-hidden
          />
        ))}
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/40 text-white/90 text-xs backdrop-blur-sm caa-fade-up">
              <Clock className="h-3.5 w-3.5" /> Applications Open — 2026 Recruitment Cycle
            </span>
            <h1 className="font-extrabold text-white text-4xl md:text-6xl leading-[1.05] mt-6 caa-fade-up caa-delay-1">
              Build Your Career in Aviation Excellence
            </h1>
            <p className="text-white/85 max-w-xl mt-5 text-base md:text-lg caa-fade-up caa-delay-2">
              Join Uganda's national aviation regulator. We're looking for skilled professionals committed to advancing safe, secure and sustainable air transport.
            </p>
            <div className="flex flex-wrap gap-3 mt-8 caa-fade-up caa-delay-3">
              <Link to="/vacancies" className="px-6 py-3 bg-white text-caa-navy font-semibold rounded-md hover:bg-caa-gold-2 transition-colors">
                Browse Vacancies
              </Link>
              <a
                href="#featured"
                className="caa-hero-cta px-6 py-3 border-2 border-white text-white font-semibold rounded-md inline-flex items-center gap-2"
              >
                See Open Roles
                <span className="text-base leading-none">↓</span>
              </a>
            </div>
          </div>
        </div>
        {/* Diagonal divider into surface */}
        <svg className="caa-diag-divider absolute bottom-0 left-0 right-0" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden>
          <polygon points="0,48 1440,0 1440,48" fill="#F6F4EF" />
        </svg>
      </section>

      {/* Floating search bar */}
      <div className="px-4 sm:px-6 -mt-20 relative z-10">
        <div className="mx-auto max-w-5xl bg-white rounded-xl border border-caa-border shadow-[0_10px_40px_-10px_rgba(11,46,95,0.18)] p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for job title, department or keyword…"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy"
              />
            </div>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="px-3 py-2.5 text-sm border border-caa-border rounded-md bg-white">
              <option value="All">All Departments</option>
              <option>Air Traffic Mgmt</option>
              <option>Aviation Safety</option>
              <option>Finance & Admin</option>
              <option>ICT & Systems</option>
              <option>Legal</option>
            </select>
            <select value={loc} onChange={(e) => setLoc(e.target.value)} className="px-3 py-2.5 text-sm border border-caa-border rounded-md bg-white">
              <option value="All">All Locations</option>
              <option>Kampala HQ</option>
              <option>Entebbe Airport</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-caa-gold text-caa-navy text-sm font-semibold rounded-md hover:bg-caa-gold-2 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <section className="px-4 sm:px-6 mt-14">
        <div className="mx-auto max-w-5xl bg-white rounded-xl border border-caa-border py-6 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-caa-border">
          {[
            { n: String(visible.length), l: "Open Positions" },
            { n: String(new Set(visible.map((j) => j.deptKey)).size), l: "Departments Hiring" },
            { n: "380+", l: "Staff Employed" },
            { n: "2,100+", l: "Applications This Year" },
          ].map((s) => (
            <div key={s.l} className="px-6 py-3 text-center">
              <p className="font-bold text-3xl text-caa-navy">{s.n}</p>
              <p className="text-xs text-caa-muted mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Vacancies */}
      <section id="featured" className="px-4 sm:px-6 mt-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-bold text-2xl text-caa-body">
              {isSearching ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} found` : "Featured Vacancies"}
            </h2>
            <Link to="/vacancies" className="text-sm text-caa-navy hover:text-caa-gold inline-flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {shown.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
          {shown.length === 0 && (
            <p className="text-center text-caa-muted py-10">No vacancies match your search.</p>
          )}
        </div>
      </section>
    </>
  );
}
