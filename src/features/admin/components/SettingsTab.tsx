import { useEffect, useState } from "react";
import {
  Settings, RefreshCw, CheckCircle2, Mail, AlertTriangle, CheckCircle,
} from "lucide-react";
import {
  type AdminSettings,
} from "@/app/providers/AppContext";
import { settings as settingsApi, type EmailStatus } from "@/services/api/client";
import { Field, Section, fi } from "./shared";

export function SettingsTab({ settings, updateSettings, logAction }: { settings: AdminSettings; updateSettings: (p: Partial<AdminSettings>) => void; logAction: any }) {
  const [draft, setDraft] = useState<AdminSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const upd = (p: Partial<AdminSettings>) => setDraft((d) => ({ ...d, ...p }));
  const updTpl = (k: keyof AdminSettings["notifTemplates"], v: string) =>
    setDraft((d) => ({ ...d, notifTemplates: { ...d.notifTemplates, [k]: v } }));
  const save = () => { updateSettings(draft); logAction("Updated portal settings"); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  useEffect(() => {
    settingsApi.emailStatus().then((r) => { if (r.success) setEmailStatus(r.data); }).catch(() => {});
  }, []);

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="font-bold text-xl text-caa-body">Settings</h1><p className="text-xs text-caa-muted mt-0.5">Portal-wide configuration.</p></div>

      <div className="caa-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-navy mb-3">Email delivery</p>
        {emailStatus === null ? (
          <p className="text-xs text-caa-muted">Checking…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${emailStatus.enabled ? "bg-caa-success/10 text-caa-success" : "bg-caa-danger/10 text-caa-danger"}`}>
              {emailStatus.enabled ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {emailStatus.enabled ? "Enabled" : "Disabled"}
            </span>
            {emailStatus.enabled ? (
              <>
                <span className="text-xs text-caa-muted"><Mail className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />{emailStatus.pending} pending</span>
                {emailStatus.failing > 0 && <span className="text-xs text-caa-danger font-medium">{emailStatus.failing} retrying after an error</span>}
                <span className="text-xs text-caa-muted">Last sent: {emailStatus.lastSentAt ? new Date(emailStatus.lastSentAt).toLocaleString() : "never"}</span>
              </>
            ) : (
              <span className="text-xs text-caa-muted">No SMTP credentials configured yet — candidates and staff are not receiving any emails. {emailStatus.pending} message{emailStatus.pending === 1 ? "" : "s"} queued, waiting to send once enabled.</span>
            )}
          </div>
        )}
      </div>

      <div className="caa-card p-5 space-y-5">
        <Section title="Organisation">
          <Field label="Organisation name">
            <input className={fi} value={draft.orgName} onChange={(e) => upd({ orgName: e.target.value })} />
          </Field>
          <Field label="Email sender name (shown in notification emails)">
            <input className={fi} value={draft.emailSenderName} onChange={(e) => upd({ emailSenderName: e.target.value })} placeholder="e.g. CAA HR Team" />
          </Field>
        </Section>

        <Section title="Recruitment rules">
          <Field label="Minimum applicant age (org-wide floor)">
            <input type="number" min={16} max={60} className={fi} value={draft.minAgeThreshold} onChange={(e) => upd({ minAgeThreshold: parseInt(e.target.value) || 18 })} />
            <p className="text-[11px] text-caa-muted mt-1">No candidate below this age may apply to any job, even one whose own minimum age is set lower. Individual jobs can still require an older minimum.</p>
          </Field>
          <Field label="Default CGPA threshold (Interns auto-screen)">
            <input type="number" min={0} max={5} step={0.1} className={fi} value={draft.defaultCgpaThreshold} onChange={(e) => upd({ defaultCgpaThreshold: parseFloat(e.target.value) || 0 })} />
            <p className="text-[11px] text-caa-muted mt-1">Used when a job has no minimum CGPA of its own set in Criteria Setup.</p>
          </Field>
          <Field label="Closing-soon alert threshold (days before deadline)">
            <input type="number" min={1} max={30} className={fi} value={draft.closingSoonDays} onChange={(e) => upd({ closingSoonDays: parseInt(e.target.value) || 7 })} />
          </Field>
          <Field label="Max active applications per candidate (0 = unlimited)">
            <input type="number" min={0} max={20} className={fi} value={draft.maxApplicationsPerCandidate} onChange={(e) => upd({ maxApplicationsPerCandidate: parseInt(e.target.value) || 0 })} />
          </Field>
          <div className="flex items-start gap-3 mt-1">
            <input id="extInt" type="checkbox" checked={draft.allowExternalInternalJobs} onChange={(e) => upd({ allowExternalInternalJobs: e.target.checked })} className="mt-0.5" />
            <label htmlFor="extInt" className="text-sm leading-tight">Allow external applicants to see internal-only job listings</label>
          </div>
        </Section>

        <Section title="Session">
          <Field label="Auto-logout after inactivity (minutes)">
            <input type="number" min={1} max={120} className={fi} value={draft.sessionTimeoutMinutes} onChange={(e) => upd({ sessionTimeoutMinutes: parseInt(e.target.value) || 15 })} />
            <p className="text-[11px] text-caa-muted mt-1">Signed-in candidates and staff are signed out automatically after this many minutes with no activity.</p>
          </Field>
        </Section>

        <Section title="Notification templates — application status">
          <p className="text-[11px] text-caa-muted -mt-1 mb-2">Use <code className="bg-caa-surface px-1 rounded">{"{name}"}</code> for candidate name and <code className="bg-caa-surface px-1 rounded">{"{role}"}</code> for job title.</p>
          {(["shortlist", "decline", "interview", "offer"] as const).map((key) => (
            <Field key={key} label={key === "shortlist" ? "Shortlisted" : key === "decline" ? "Declined" : key === "interview" ? "Interview invite" : "Job offer"}>
              <textarea rows={3} className={`${fi} resize-none`} value={draft.notifTemplates[key]} onChange={(e) => updTpl(key, e.target.value)} />
            </Field>
          ))}
        </Section>

        <Section title="Notification templates — scheduling &amp; panels">
          <p className="text-[11px] text-caa-muted -mt-1 mb-2">These are separate from the status templates above — editing "Interview invite" does not change these.</p>
          <Field label="Assessment scheduled">
            <p className="text-[11px] text-caa-muted mb-1">Placeholders: <code className="bg-caa-surface px-1 rounded">{"{name}"}</code> <code className="bg-caa-surface px-1 rounded">{"{role}"}</code> <code className="bg-caa-surface px-1 rounded">{"{type}"}</code> <code className="bg-caa-surface px-1 rounded">{"{when}"}</code> <code className="bg-caa-surface px-1 rounded">{"{venueLine}"}</code></p>
            <textarea rows={4} className={`${fi} resize-none`} value={draft.notifTemplates.assessmentScheduled} onChange={(e) => updTpl("assessmentScheduled", e.target.value)} />
          </Field>
          <Field label="Interview panel invitation (sent to staff)">
            <p className="text-[11px] text-caa-muted mb-1">Placeholders: <code className="bg-caa-surface px-1 rounded">{"{name}"}</code> <code className="bg-caa-surface px-1 rounded">{"{role}"}</code> <code className="bg-caa-surface px-1 rounded">{"{invitedBy}"}</code></p>
            <textarea rows={4} className={`${fi} resize-none`} value={draft.notifTemplates.panelInvite} onChange={(e) => updTpl("panelInvite", e.target.value)} />
          </Field>
        </Section>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md">Save</button>
        <button onClick={() => setDraft({ ...settings })} className="px-4 py-2 border border-caa-border text-sm rounded-md inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Reset</button>
        {saved && <span className="text-sm text-caa-success flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
      </div>
    </div>
  );
}
