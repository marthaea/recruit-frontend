import { useState, useEffect } from "react";
import {
  FileDown, CheckCircle2, Plus, X,
} from "lucide-react";
import {
  downloadStaffReport,
} from "@/lib/admin-pdf";
import { staff as staffApi, type StaffMember } from "@/lib/api/client";
import { DEPT_LIST, POSITIONS, Field, fi } from "./shared";

type Draft = {
  empNo: string; firstName: string; lastName: string;
  dept: string; position: string; email: string; joined: string; status: string;
};

const emptyDraft = (): Draft => ({
  empNo: "", firstName: "", lastName: "",
  dept: DEPT_LIST[0], position: POSITIONS[0],
  email: "", joined: new Date().toISOString().slice(0, 10), status: "Active",
});

export function StaffTab({ actor, logAction, pushToast }: any) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    staffApi.list()
      .then((r) => { if (r.success) setStaffList(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = staffList.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.empNo} ${s.dept ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const upd = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const submitStaff = async () => {
    if (!draft.empNo.trim() || !draft.firstName.trim() || !draft.lastName.trim()) {
      pushToast?.({ type: "warning", title: "Missing details", message: "Employee number, first name, and last name are required." });
      return;
    }
    setSaving(true);
    try {
      const res = await staffApi.create({
        employeeNumber: draft.empNo.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        dept: draft.dept,
        position: draft.position,
        email: draft.email.trim() || undefined,
        joined: draft.joined || undefined,
        status: draft.status,
      });
      if (res.success) {
        setStaffList((prev) => [res.data, ...prev]);
        logAction?.("Added staff record", `${draft.firstName} ${draft.lastName} (${draft.empNo})`);
        pushToast?.({ type: "success", title: "Staff added", message: `${draft.firstName} ${draft.lastName} was added to the register.` });
        setDraft(emptyDraft());
        setShowForm(false);
      }
    } catch (e) {
      pushToast?.({ type: "warning", title: "Could not add staff", message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const forExport = staffList.map((s) => ({
    empNo: s.empNo, firstName: s.firstName, lastName: s.lastName,
    dept: s.dept ?? "", position: s.position ?? "", email: s.email ?? "",
    joined: s.joined ?? "", status: s.status,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="font-bold text-xl text-caa-body">Internal Staff</h1><p className="text-xs text-caa-muted mt-0.5">{staffList.length} verified CAA staff</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-caa-navy text-caa-navy rounded-md hover:bg-caa-navy/5">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Cancel" : "Add Staff"}
          </button>
          <button onClick={() => { downloadStaffReport(forExport, actor); logAction?.("Exported staff register"); }} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md"><FileDown className="h-4 w-4" /> Export PDF</button>
        </div>
      </div>

      {showForm && (
        <div className="caa-card p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy">New staff record</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Employee number *">
              <input className={fi} value={draft.empNo} onChange={(e) => upd({ empNo: e.target.value })} placeholder="CAA-1016" />
            </Field>
            <Field label="First name *">
              <input className={fi} value={draft.firstName} onChange={(e) => upd({ firstName: e.target.value })} />
            </Field>
            <Field label="Last name *">
              <input className={fi} value={draft.lastName} onChange={(e) => upd({ lastName: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={fi} value={draft.email} onChange={(e) => upd({ email: e.target.value })} placeholder="name@caa.go.ug" />
            </Field>
            <Field label="Department">
              <select className={fi} value={draft.dept} onChange={(e) => upd({ dept: e.target.value })}>
                {DEPT_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Position">
              <select className={fi} value={draft.position} onChange={(e) => upd({ position: e.target.value })}>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Joined date">
              <input type="date" className={fi} value={draft.joined} onChange={(e) => upd({ joined: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className={fi} value={draft.status} onChange={(e) => upd({ status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setDraft(emptyDraft()); }} className="px-3 py-1.5 text-xs border border-caa-border rounded-md">Cancel</button>
            <button onClick={submitStaff} disabled={saving} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60">
              {saving ? "Adding…" : "Add Staff"}
            </button>
          </div>
        </div>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full px-3 py-2 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy" />
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr><th className="text-left p-3">Emp No.</th><th className="text-left p-3">Name</th><th className="text-left p-3">Department</th><th className="text-left p-3">Position</th><th className="text-left p-3">Email</th><th className="text-left p-3">Joined</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {filtered.map((s) => (
              <tr key={s.id ?? s.empNo}>
                <td className="p-3 text-[11px] font-mono text-caa-muted">{s.empNo}</td>
                <td className="p-3 font-medium text-caa-body">{s.firstName} {s.lastName}</td>
                <td className="p-3 text-xs text-caa-muted">{s.dept ?? "—"}</td>
                <td className="p-3 text-xs">{s.position ?? "—"}</td>
                <td className="p-3 text-xs text-caa-muted">{s.email ?? "—"}</td>
                <td className="p-3 text-xs">{s.joined ?? "—"}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    s.status === "Active" ? "bg-caa-success/10 text-caa-success" : "bg-caa-muted/15 text-caa-muted"
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />{s.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-xs text-caa-muted">No staff match your search.</td></tr>}
            {loading && <tr><td colSpan={7} className="p-6 text-center text-xs text-caa-muted">Loading staff…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
