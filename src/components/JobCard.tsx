import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Calendar, Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { useApp, type Job } from "@/context/AppContext";
import { closingLabel, isClosingSoon } from "@/lib/deadline";

const SAVED_KEY = "caa_saved_jobs_v1";
function readSaved(): number[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function writeSaved(ids: number[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}
export function JobCard({ job }: { job: Job }) {
  const { pushToast, settings } = useApp();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(readSaved().includes(job.id)); }, [job.id]);

  const closingSoon = isClosingSoon(job.closesAt, settings.closingSoonDays);
  const countdown = closingLabel(job.closesAt);

  const toggleSaved = () => {
    const cur = readSaved();
    const next = cur.includes(job.id) ? cur.filter((i) => i !== job.id) : [...cur, job.id];
    writeSaved(next);
    setSaved(next.includes(job.id));
    pushToast({ type: "info", title: next.includes(job.id) ? "Saved for later" : "Removed from saved", message: job.title });
  };

  const handleApply = () => {
    navigate({ to: "/job", search: { jobId: job.id } });
  };

  return (
    <div
      onClick={handleApply}
      className={`caa-card caa-card-hover caa-lift p-5 flex flex-col gap-3 cursor-pointer ${job.featured ? "border-l-[3px] border-l-caa-navy" : ""}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-full bg-caa-surface text-caa-navy text-[11px] font-medium">{job.dept}</span>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${job.type === "Contract" ? "bg-caa-warning/10 text-caa-warning" : "bg-caa-success/10 text-caa-success"}`}>
          {job.type}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy text-[10px] font-semibold">{job.salaryBand}</span>
        {job.visibility === "internal" && (
          <span className="px-2 py-0.5 rounded-full bg-caa-navy-2 text-white text-[10px] font-semibold">Internal only</span>
        )}
        {closingSoon && (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" /> Closing soon
          </span>
        )}
      </div>
      <h3 className="font-bold text-lg text-caa-body leading-snug">{job.title}</h3>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-caa-muted">
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-caa-light" />{job.location}</span>
      </div>
      <div className="text-[11px] text-caa-muted flex flex-wrap gap-x-3 gap-y-1">
        <span>Min age <span className="text-caa-body font-medium">{job.minAge}</span></span>
        <span>Experience <span className="text-caa-body font-medium">{job.requiredExperience}y</span></span>
        <span>Qualification <span className="text-caa-body font-medium">{job.requiredQualification}</span></span>
      </div>
      <div className="flex items-center justify-between pt-3 mt-auto border-t border-caa-border">
        <span className="text-xs text-caa-muted flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> Closes <span className="text-caa-danger font-medium">{job.closes}</span>
          {countdown && (
            <span className={`font-semibold ${closingSoon ? "text-amber-700" : "text-caa-muted"}`}>· {countdown}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSaved(); }}
            aria-label={saved ? "Remove from saved" : "Save for later"}
            className="p-2 rounded-md border border-caa-border text-caa-navy hover:border-caa-navy hover:bg-caa-surface"
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md hover:bg-caa-navy-2 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}