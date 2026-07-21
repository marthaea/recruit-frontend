import { useState, useEffect } from "react";
import {
  Plus, UserPlus, Building2,
} from "lucide-react";
import {
  useApp, ADMIN_ROLES, ADMIN_ROLE_LABELS, type AdminRole,
} from "@/context/AppContext";
import { adminUsers as adminUsersApi, departments as departmentsApi, type AdminUser } from "@/lib/api/client";
import { Field, Section, fi } from "./shared";

export function AdministrationTab({ logAction }: { logAction: any }) {
  const { pushToast, departments, loadDepartments, addDepartment } = useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const loadUsers = () => {
    adminUsersApi.list().then((r) => { if (r.success) setUsers(r.data); }).catch(() => {}).finally(() => setLoadingUsers(false));
  };
  useEffect(() => { loadUsers(); loadDepartments(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── New admin account ─────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("hr_officer");
  const [creatingUser, setCreatingUser] = useState(false);

  const createAdmin = async () => {
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      pushToast({ type: "warning", title: "Missing details", message: "All fields are required." });
      return;
    }
    if (password.length < 8) {
      pushToast({ type: "warning", title: "Password too short", message: "Password must be at least 8 characters." });
      return;
    }
    setCreatingUser(true);
    try {
      await adminUsersApi.create({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(), adminRole });
      logAction("Created admin account", `${firstName.trim()} ${lastName.trim()} (${email.trim()}, ${adminRole})`);
      pushToast({ type: "success", title: "Admin account created" });
      setEmail(""); setPassword(""); setFirstName(""); setLastName(""); setAdminRole("hr_officer");
      loadUsers();
    } catch (err) {
      pushToast({ type: "warning", title: "Could not create account", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setCreatingUser(false);
    }
  };

  // ── New department ────────────────────────────────────────────────────────
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [addingDept, setAddingDept] = useState(false);

  const submitDepartment = async () => {
    if (!deptName.trim() || !deptCode.trim()) {
      pushToast({ type: "warning", title: "Missing details", message: "Department name and code are required." });
      return;
    }
    setAddingDept(true);
    try {
      await addDepartment({ name: deptName.trim(), code: deptCode.trim().toUpperCase() });
      logAction("Added department", `${deptName.trim()} (${deptCode.trim().toUpperCase()})`);
      pushToast({ type: "success", title: "Department added" });
      setDeptName(""); setDeptCode("");
    } catch (err) {
      pushToast({ type: "warning", title: "Could not add department", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setAddingDept(false);
    }
  };

  const assignHead = async (deptId: number, headUserId: string) => {
    try {
      await departmentsApi.assignHead(deptId, headUserId ? Number(headUserId) : null);
      logAction("Assigned department head", `department #${deptId}`);
      pushToast({ type: "success", title: "Head of Department updated" });
      loadDepartments();
    } catch (err) {
      pushToast({ type: "warning", title: "Could not assign HOD", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const hods = users.filter((u) => u.adminRole === "hod");

  return (
    <div className="space-y-5 max-w-3xl">
      <div><h1 className="font-bold text-xl text-caa-body">Administration</h1><p className="text-xs text-caa-muted mt-0.5">Manage admin accounts, roles, and departments.</p></div>

      <div className="caa-card p-5 space-y-5">
        <Section title="Admin accounts">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-xs text-caa-muted">
                <tr><th className="text-left p-1.5">Name</th><th className="text-left p-1.5">Email</th><th className="text-left p-1.5">Role</th></tr>
              </thead>
              <tbody className="divide-y divide-caa-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-1.5 font-medium text-caa-body">{u.firstName} {u.lastName}</td>
                    <td className="p-1.5 text-caa-muted">{u.email}</td>
                    <td className="p-1.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-caa-navy/10 text-caa-navy">{ADMIN_ROLE_LABELS[u.adminRole as AdminRole] ?? u.adminRole}</span></td>
                  </tr>
                ))}
                {!loadingUsers && users.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-xs text-caa-muted">No admin accounts yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy mt-4 mb-2">New admin account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name"><input className={fi} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
            <Field label="Last name"><input className={fi} value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
            <Field label="Email"><input type="email" className={fi} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@caa.go.ug" /></Field>
            <Field label="Initial password"><input type="password" className={fi} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></Field>
            <Field label="Role">
              <select className={fi} value={adminRole} onChange={(e) => setAdminRole(e.target.value as AdminRole)}>
                {ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
          </div>
          <button onClick={createAdmin} disabled={creatingUser} className="mt-3 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60 inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> {creatingUser ? "Creating…" : "Create account"}
          </button>
        </Section>

        <Section title="Departments">
          <p className="text-[11px] text-caa-muted -mt-1 mb-2">Departments appear in the department dropdown when creating a job listing. Assigning a Head of Department routes that department's jobs to them for review.</p>
          <div className="overflow-x-auto -mx-1 mb-3">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-xs text-caa-muted">
                <tr><th className="text-left p-1.5">Department</th><th className="text-left p-1.5">Code</th><th className="text-left p-1.5">Head of Department</th></tr>
              </thead>
              <tbody className="divide-y divide-caa-border">
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td className="p-1.5 font-medium text-caa-body">{d.name}</td>
                    <td className="p-1.5 text-caa-muted font-mono text-xs">{d.code}</td>
                    <td className="p-1.5">
                      <select className={fi} value={d.headUserId ?? ""} onChange={(e) => assignHead(d.id, e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {hods.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-xs text-caa-muted">No departments added yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {hods.length === 0 && (
            <p className="text-[11px] text-caa-warning mb-3 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> No accounts with the Head of Department role exist yet — create one above before assigning a department head.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
            <input className={fi} value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Department name (e.g. Air Traffic Mgmt)" />
            <input className={fi} value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="Code (e.g. ATM)" />
            <button onClick={submitDepartment} disabled={addingDept} className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-60 inline-flex items-center justify-center gap-1">
              <Plus className="h-3.5 w-3.5" /> {addingDept ? "Adding…" : "Add"}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
