import { useState } from "react";
import {
  AlertCircle,
} from "lucide-react";
import {
  HR_USERS, type PermissionOverride, type AdminRole,
} from "@/context/AppContext";
import { Field, fi } from "./shared";

// ─── Permissions ──────────────────────────────────────────────────────────────

const PERM_FIELDS: { key: keyof PermissionOverride; label: string }[] = [
  { key: "canViewApplications",  label: "View Applications & CVs" },
  { key: "canShortlist",         label: "Shortlist / Decline Candidates" },
  { key: "canScreenInterns",     label: "Screen Intern Applications (CGPA auto-screen)" },
  { key: "canSendNotifications", label: "Send Candidate Notifications" },
  { key: "canManageJobs",        label: "Manage Job Listings" },
  { key: "canManageCriteria",    label: "Set Screening Criteria" },
  { key: "canViewStaff",         label: "View Internal Staff" },
  { key: "canExport",            label: "Export Reports (PDF)" },
  { key: "canViewAudit",         label: "View Audit Log" },
  { key: "canManageSettings",    label: "Manage Portal Settings" },
  { key: "canGrantPermissions",  label: "Grant Permissions (super only)" },
];

const ROLE_DEFAULTS_PERMS: Record<AdminRole, Partial<PermissionOverride>> = {
  super:     { canViewApplications: true,  canShortlist: true,  canScreenInterns: true,  canSendNotifications: true,  canManageJobs: true,  canManageCriteria: true,  canViewStaff: true,  canExport: true,  canViewAudit: true,  canManageSettings: true,  canGrantPermissions: true  },
  hr:        { canViewApplications: true,  canShortlist: true,  canScreenInterns: true,  canSendNotifications: true,  canManageJobs: true,  canManageCriteria: true,  canViewStaff: true,  canExport: true,  canViewAudit: false, canManageSettings: false, canGrantPermissions: false },
  recruiter: { canViewApplications: true,  canShortlist: true,  canScreenInterns: false, canSendNotifications: false, canManageJobs: false, canManageCriteria: true,  canViewStaff: false, canExport: false, canViewAudit: false, canManageSettings: false, canGrantPermissions: false },
};


export function PermissionsTab({ overrides, save, logAction }: { overrides: PermissionOverride[]; save: (p: PermissionOverride) => void; logAction: any }) {
  const adminUsers = Object.entries(HR_USERS).map(([email, u]) => ({ email, ...u }));
  const [selectedEmail, setSelectedEmail] = useState(adminUsers[0]?.email ?? "");
  const selected = adminUsers.find((u) => u.email === selectedEmail);
  const existing = overrides.find((o) => o.email === selectedEmail);
  const defaults = ROLE_DEFAULTS_PERMS[selected?.role ?? "hr"];
  const [draft, setDraft] = useState<Partial<PermissionOverride>>(existing ?? defaults ?? {});

  const handleUserChange = (email: string) => {
    setSelectedEmail(email);
    const u = adminUsers.find((x) => x.email === email);
    const ex = overrides.find((o) => o.email === email);
    setDraft(ex ?? ROLE_DEFAULTS_PERMS[u?.role ?? "hr"] ?? {});
  };

  const savePerms = () => {
    if (!selected) return;
    save({ email: selectedEmail, role: selected.role, ...draft } as PermissionOverride);
    logAction("Updated permissions", `${selected.firstName} ${selected.lastName} (${selected.role})`);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div><h1 className="font-bold text-xl text-caa-body">Permissions</h1><p className="text-xs text-caa-muted mt-0.5">Override default role permissions for individual HR users.</p></div>
      <Field label="Select HR user">
        <select className={fi} value={selectedEmail} onChange={(e) => handleUserChange(e.target.value)}>
          {adminUsers.map((u) => <option key={u.email} value={u.email}>{u.firstName} {u.lastName} ({u.role}) — {u.email}</option>)}
        </select>
      </Field>
      <div className="caa-card p-4 space-y-2">
        {PERM_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5 border-b border-caa-border last:border-0">
            <label className="text-sm text-caa-body">{label}</label>
            <input type="checkbox" checked={!!(draft as any)[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={savePerms} className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md">Save permissions</button>
        <button onClick={() => setDraft(ROLE_DEFAULTS_PERMS[selected?.role ?? "hr"] ?? {})} className="px-4 py-2 border border-caa-border text-sm rounded-md">Reset to defaults</button>
      </div>
      <p className="text-[11px] text-caa-muted flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Permissions take effect on next sign-in.</p>
    </div>
  );
}

// ─── Email Log Tab ────────────────────────────────────────────────────────────

