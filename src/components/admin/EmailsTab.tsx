import { useState } from "react";
import {
  Mail, ExternalLink,
} from "lucide-react";
import {
  type SentEmail,
} from "@/context/AppContext";

export function EmailsTab({ sentEmails, clearEmailLog }: { sentEmails: SentEmail[]; clearEmailLog: () => void }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [triggerFilter, setTriggerFilter] = useState("all");

  const triggers = Array.from(new Set(sentEmails.map((e) => e.trigger)));
  const displayed = sentEmails.filter((e) => {
    const matchSearch = !search || `${e.candidateName} ${e.to} ${e.subject} ${e.jobTitle}`.toLowerCase().includes(search.toLowerCase());
    const matchTrigger = triggerFilter === "all" || e.trigger === triggerFilter;
    return matchSearch && matchTrigger;
  });

  const TRIGGER_COLORS: Record<string, string> = {
    "Shortlisted":     "bg-caa-success/10 text-caa-success",
    "Interview":       "bg-purple-100 text-purple-700",
    "Offered":         "bg-teal-100 text-teal-700",
    "Declined":        "bg-caa-danger/10 text-caa-danger",
    "Batch Screening": "bg-caa-navy/10 text-caa-navy",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-xl text-caa-body">Email Log</h1>
          <p className="text-xs text-caa-muted mt-0.5">{sentEmails.length} email{sentEmails.length !== 1 ? "s" : ""} sent via the portal</p>
        </div>
        <div className="flex gap-2">
          {sentEmails.length > 0 && (
            <button
              onClick={() => { if (confirm("Clear all sent email records? This cannot be undone.")) clearEmailLog(); }}
              className="px-3 py-1.5 text-xs border border-caa-danger/30 text-caa-danger rounded-md hover:bg-caa-danger/5"
            >
              Clear log
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, subject…"
          className="px-3 py-1.5 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy w-64"
        />
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...triggers].map((t) => (
            <button key={t} onClick={() => setTriggerFilter(t)}
              className={`px-2.5 py-1 text-[11px] rounded-full font-semibold border transition-colors ${triggerFilter === t ? "bg-caa-navy text-white border-caa-navy" : "border-caa-border text-caa-muted hover:border-caa-navy"}`}>
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {sentEmails.length === 0 ? (
        <div className="caa-card p-10 text-center">
          <Mail className="h-10 w-10 text-caa-muted/40 mx-auto mb-3" />
          <p className="font-semibold text-caa-body">No emails sent yet</p>
          <p className="text-xs text-caa-muted mt-1">Emails are logged here when you update application statuses or run auto-screening.</p>
        </div>
      ) : (
        <div className="caa-card overflow-hidden divide-y divide-caa-border">
          {displayed.map((e) => (
            <div key={e.id} className="hover:bg-caa-surface/50">
              <button
                className="w-full text-left px-4 py-3 flex items-start gap-3"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <Mail className="h-4 w-4 text-caa-navy shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-caa-body truncate">{e.candidateName}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TRIGGER_COLORS[e.trigger] ?? "bg-caa-surface text-caa-muted"}`}>{e.trigger}</span>
                  </div>
                  <p className="text-xs text-caa-muted truncate mt-0.5">{e.subject}</p>
                  <p className="text-[11px] text-caa-muted/70 mt-0.5">{e.to} · {new Date(e.sentAt).toLocaleString()}</p>
                </div>
                <span className="text-[10px] text-caa-muted shrink-0">{expanded === e.id ? "▲" : "▼"}</span>
              </button>

              {expanded === e.id && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-caa-border bg-caa-surface p-3">
                    <p className="text-[11px] font-semibold text-caa-body mb-0.5">To: <span className="text-caa-navy">{e.to}</span></p>
                    <p className="text-[11px] font-semibold text-caa-body mb-2">Subject: {e.subject}</p>
                    <pre className="text-[11px] text-caa-muted whitespace-pre-wrap leading-relaxed border-t border-caa-border pt-2">{e.body}</pre>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${e.to}?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open in Email Client
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
          {displayed.length === 0 && (
            <div className="p-6 text-center text-xs text-caa-muted">No emails match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

