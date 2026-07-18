import { useState } from "react";
import {
  FileDown, CheckCircle2,
} from "lucide-react";
import {
  downloadStaffReport,
} from "@/lib/admin-pdf";
import { STAFF_DATA } from "./shared";

export function StaffTab({ actor, logAction }: any) {
  const [search, setSearch] = useState("");
  const filtered = STAFF_DATA.filter((s) => `${s.firstName} ${s.lastName} ${s.empNo} ${s.dept}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="font-bold text-xl text-caa-body">Internal Staff</h1><p className="text-xs text-caa-muted mt-0.5">{STAFF_DATA.length} verified CAA staff</p></div>
        <button onClick={() => { downloadStaffReport(STAFF_DATA, actor); logAction("Exported staff register"); }} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md"><FileDown className="h-4 w-4" /> Export PDF</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full px-3 py-2 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy" />
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr><th className="text-left p-3">Emp No.</th><th className="text-left p-3">Name</th><th className="text-left p-3">Department</th><th className="text-left p-3">Position</th><th className="text-left p-3">Email</th><th className="text-left p-3">Joined</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {filtered.map((s) => (
              <tr key={s.empNo}>
                <td className="p-3 text-[11px] font-mono text-caa-muted">{s.empNo}</td>
                <td className="p-3 font-medium text-caa-body">{s.firstName} {s.lastName}</td>
                <td className="p-3 text-xs text-caa-muted">{s.dept}</td>
                <td className="p-3 text-xs">{s.position}</td>
                <td className="p-3 text-xs text-caa-muted">{s.email}</td>
                <td className="p-3 text-xs">{s.joined}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-caa-success/10 text-caa-success"><CheckCircle2 className="h-3 w-3" />{s.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-xs text-caa-muted">No staff match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

