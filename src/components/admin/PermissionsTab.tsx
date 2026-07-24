import { useState, useEffect } from "react";
import {
  AlertCircle,
} from "lucide-react";
import {
  useApp, ADMIN_ROLE_LABELS, type PermissionOverride, type AdminRole,
} from "@/context/AppContext";
import { adminUsers as adminUsersApi, type AdminUser } from "@/lib/api/client";
import { Field, fi } from "./shared";

// ─── Permissions ──────────────────────────────────────────────────────────────

const PERM_FIELDS: { key: keyof PermissionOverride; label: string }[] = [
  { key: "canViewApplications",  label: "View Applications & CVs" },
  { key: "canShortlist",         label: "Shortlist / Decline Candidates" },
  { key: "canScreenInterns",     label: "Screen Intern Applications (CGPA auto-screen)" },
  { key: "canSendNotifications", label: "Send Candidate Notifications" },
  { key: "canManageJobs",        label: "Manage Job Listings (create/edit)" },
  { key: "canReviewJob",         label: "Review Job Listings (Head of Department)" },
  { key: "canApproveJob",        label: "Approve & Publish Job Listings (DHRA)" },
  { key: "canManageCriteria",    label: "Set Screening Criteria" },
  { key: "canScheduleAssessment", label: "Schedule Candidate Assessments" },
  { key: "canRecordAssessment",  label: "Record Assessment Results" },
  { key: "canViewStaff",         label: "View Internal Staff" },
  { key: "canExport",            label: "Export Reports (PDF)" },
  { key: "canViewAudit",         label: "View Audit Log" },
  { key: "canManageSettings",    label: "Manage Portal Settings" },
  { key: "canManageDepartments", label: "Manage Departments & Heads" },
  { key: "canManageAdmins",      label: "Create Admin Accounts (super only)" },
  { key: "canAssignRights",      label: "Assign Rights (IT Admin, super)" },
  { key: "canGrantPermissions",  label: "Grant Permissions (super only)" },
];

export function PermissionsTab({ overrides, save, logAction, roleDefaults }: { overrides: PermissionOverride[]; save: (p: PermissionOverride) => void; logAction: any; roleDefaults: Record<AdminRole, Partial<PermissionOverride>> }) {
  const { pushToast } = useApp();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");

  useEffect(() => {
    adminUsersApi.list().then((r) => {
      if (r.success) {
        setUsers(r.data);
        if (r.data.length > 0) setSelectedEmail(r.data[0].email);
      }
    }).catch((err) => {
      setUsers([]);
      pushToast({ type: "warning", title: "Could not load admin users", message: err instanceof Error ? err.message : "Please try again." });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = users?.find((u) => u.email === selectedEmail);
  const existing = overrides.find((o) => o.email === selectedEmail);
  const defaults = roleDefaults[(selected?.adminRole ?? "hr") as AdminRole] ?? {};
  const [draft, setDraft] = useState<Partial<PermissionOverride>>(existing ?? defaults);

  const handleUserChange = (email: string) => {
    setSelectedEmail(email);
    const u = users?.find((x) => x.email === email);
    const ex = overrides.find((o) => o.email === email);
    setDraft(ex ?? roleDefaults[(u?.adminRole ?? "hr") as AdminRole] ?? {});
  };

  const savePerms = () => {
    if (!selected) return;
    save({ email: selectedEmail, role: selected.adminRole as AdminRole, ...draft } as PermissionOverride);
    logAction("Updated permissions", `${selected.firstName} ${selected.lastName} (${selected.adminRole})`);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div><h1 className="font-bold text-xl text-caa-body">Assign Rights</h1><p className="text-xs text-caa-muted mt-0.5">Override default role permissions for individual admin users.</p></div>
      {users === null ? (
        <p className="text-sm text-caa-muted">Loading admin users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-caa-muted">No admin users found. Create one under Manage Admins first.</p>
      ) : (
        <>
          <Field label="Select admin user">
            <select className={fi} value={selectedEmail} onChange={(e) => handleUserChange(e.target.value)}>
              {users.map((u) => <option key={u.email} value={u.email}>{u.firstName} {u.lastName} ({ADMIN_ROLE_LABELS[u.adminRole as AdminRole] ?? u.adminRole}) — {u.email}</option>)}
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
            <button onClick={() => setDraft(roleDefaults[(selected?.adminRole ?? "hr") as AdminRole] ?? {})} className="px-4 py-2 border border-caa-border text-sm rounded-md">Reset to defaults</button>
          </div>
        </>
      )}
      <p className="text-[11px] text-caa-muted flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Permissions take effect on next sign-in.</p>
    </div>
  );
}

// ─── Email Log Tab ────────────────────────────────────────────────────────────

