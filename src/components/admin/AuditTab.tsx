import { useState } from "react";
import {
  FileDown, ClipboardList,
} from "lucide-react";
import {
  type AuditEntry,
} from "@/context/AppContext";
import {
  downloadAuditLog,
} from "@/lib/admin-pdf";
import { EmptyState } from "./shared";

export function AuditTab({ audit, actor }: { audit: AuditEntry[]; actor: string }) {
  const [filter, setFilter] = useState("");
  const rows = audit.filter((e) => !filter || `${e.actor} ${e.action} ${e.target ?? ""} ${e.role}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="font-bold text-xl text-caa-body">Audit Log</h1><p className="text-xs text-caa-muted mt-0.5">{audit.length} actions recorded</p></div>
        <button onClick={() => downloadAuditLog(audit, actor)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md"><FileDown className="h-4 w-4" /> Export PDF</button>
      </div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="w-full px-3 py-2 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy" />
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr><th className="text-left p-3">Timestamp</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Role</th><th className="text-left p-3">Action</th><th className="text-left p-3">Target</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="p-3 text-[11px] text-caa-muted whitespace-nowrap">{new Date(e.at).toLocaleString()}</td>
                <td className="p-3 text-xs font-medium">{e.actor}</td>
                <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy font-semibold capitalize">{e.role}</span></td>
                <td className="p-3 text-xs">{e.action}</td>
                <td className="p-3 text-xs text-caa-muted">{e.target ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState
                  icon={<ClipboardList />}
                  title={audit.length === 0 ? "No actions logged yet" : "No entries match your filter"}
                  hint={audit.length === 0 ? "Actions taken in the HR Console (status changes, job edits, exports) will appear here." : "Try a different search term or clear the filter."}
                />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

