import { useState } from "react";
import {
  Settings, RefreshCw, CheckCircle2,
} from "lucide-react";
import {
  type Job, type AdminSettings, type PermissionOverride, type AdminRole,
} from "@/context/AppContext";
import { Field, Section, fi } from "./shared";

export function SettingsTab({ settings, updateSettings, logAction }: { settings: AdminSettings; updateSettings: (p: Partial<AdminSettings>) => void; logAction: any }) {
  const [draft, setDraft] = useState<AdminSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const upd = (p: Partial<AdminSettings>) => setDraft((d) => ({ ...d, ...p }));
  const updTpl = (k: keyof AdminSettings["notifTemplates"], v: string) =>
    setDraft((d) => ({ ...d, notifTemplates: { ...d.notifTemplates, [k]: v } }));
  const save = () => { updateSettings(draft); logAction("Updated portal settings"); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="font-bold text-xl text-caa-body">Settings</h1><p className="text-xs text-caa-muted mt-0.5">Portal-wide configuration.</p></div>

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
          <Field label="Minimum applicant age">
            <input type="number" min={16} max={60} className={fi} value={draft.minAgeThreshold} onChange={(e) => upd({ minAgeThreshold: parseInt(e.target.value) || 18 })} />
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
          </Field>
        </Section>

        <Section title="Notification message templates">
          <p className="text-[11px] text-caa-muted -mt-1 mb-2">Use <code className="bg-caa-surface px-1 rounded">{"{name}"}</code> for candidate name and <code className="bg-caa-surface px-1 rounded">{"{role}"}</code> for job title.</p>
          {(["shortlist", "decline", "interview", "offer"] as const).map((key) => (
            <Field key={key} label={key === "shortlist" ? "Shortlisted" : key === "decline" ? "Declined" : key === "interview" ? "Interview invite" : "Job offer"}>
              <textarea rows={3} className={`${fi} resize-none`} value={draft.notifTemplates[key]} onChange={(e) => updTpl(key, e.target.value)} />
            </Field>
          ))}
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
