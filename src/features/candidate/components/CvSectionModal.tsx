import { useEffect, useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { useApp, EMPTY_CV, type CvProfile } from "@/app/providers/AppContext";
import { useModalA11y } from "@/hooks/useModalA11y";
import { QualificationsStep, SkillsStep, ExperienceStep, RefereesStep } from "@/features/applications/pages/ApplyPage";
import { cv as cvApi } from "@/services/api/client";

export type CvSection = "personal" | "contact" | "qualifications" | "experience" | "skills" | "referees";

const SECTION_TITLES: Record<CvSection, string> = {
  personal: "Personal information",
  contact: "Contact details",
  qualifications: "Education history",
  experience: "Work experience",
  skills: "Skills",
  referees: "Referee contacts",
};

const fi = "w-full px-2.5 py-1.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy bg-white";
const lbl = "block text-xs font-medium text-caa-body mb-1";

interface Props {
  section: CvSection | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Lets a candidate fill in one Profile Completion section at a time from the
 * dashboard, without going through the full multi-step Apply flow — clicking
 * an incomplete (or complete) checklist item opens straight to that section.
 * Reuses the same Qualifications/Experience/Skills/Referees step components
 * ApplyPage already built, so there's exactly one place each of those forms
 * is implemented.
 */
export function CvSectionModal({ section, onClose, onSaved }: Props) {
  const { auth, saveCv, pushToast } = useApp();
  const [data, setData] = useState<CvProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>(onClose, section !== null);

  // Context `cv` is only ever populated from localStorage, never fetched from
  // the server on login — it can be empty/stale even when the candidate has
  // a complete profile saved from a different session. Fetch the real thing
  // fresh every time a section is opened, same source the checklist itself
  // (DashboardPage's own cvApi.get()) already trusts.
  useEffect(() => {
    if (!section) { setData(null); return; }
    let cancelled = false;
    cvApi.get().then((r) => {
      if (cancelled) return;
      const fetched = r.success && r.data ? (r.data as unknown as CvProfile) : null;
      // firstName/lastName/email live on the user account, not in the CV's
      // own personal_data — backfill them from auth whenever the fetched
      // record leaves them blank, so Save never wipes them out.
      setData(fetched && fetched.personal ? {
        ...fetched,
        personal: {
          ...fetched.personal,
          firstName: fetched.personal.firstName || auth.firstName,
          lastName: fetched.personal.lastName || auth.lastName,
          email: fetched.personal.email || auth.email,
        },
      } : {
        ...EMPTY_CV, personal: { ...EMPTY_CV.personal, firstName: auth.firstName, lastName: auth.lastName, email: auth.email },
      });
    }).catch(() => {
      if (!cancelled) setData({ ...EMPTY_CV, personal: { ...EMPTY_CV.personal, firstName: auth.firstName, lastName: auth.lastName, email: auth.email } });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  if (!section) return null;

  const setPersonal = (patch: Partial<CvProfile["personal"]>) =>
    setData((d) => d && ({ ...d, personal: { ...d.personal, ...patch } }));

  const save = () => {
    if (!data) return;
    setSaving(true);
    saveCv(data);
    setSaving(false);
    pushToast({ type: "success", title: `${SECTION_TITLES[section]} saved`, message: "This will now autofill into any job you apply for." });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label={SECTION_TITLES[section]} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-caa-border sticky top-0 bg-white">
          <h2 className="font-bold text-lg text-caa-body">{SECTION_TITLES[section]}</h2>
          <button onClick={onClose} aria-label="Close" className="text-caa-muted hover:text-caa-body p-1 rounded-full hover:bg-caa-surface transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!data ? (
            <p className="text-sm text-caa-muted py-8 text-center">Loading your profile…</p>
          ) : (
            <>
              {(section === "personal" || section === "contact") && (
                <div className="space-y-4">
                  {section === "contact" && (
                    <div className="rounded-lg border border-caa-navy/20 bg-caa-navy/5 p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-caa-navy mt-0.5 shrink-0" />
                      <p className="text-[11px] text-caa-muted">Phone and address are how UCAA HR reaches you if you're shortlisted — the rest of your personal details are here too.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      ["First name", "firstName"], ["Surname", "lastName"], ["Other name", "otherName"],
                      ["National ID (NIN)", "nin"], ["Nationality", "nationality"],
                    ] as const).map(([l, k]) => (
                      <div key={k}>
                        <label className={lbl}>{l}</label>
                        <input className={fi} value={data.personal[k] ?? ""} onChange={(e) => setPersonal({ [k]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <label className={lbl}>Date of birth</label>
                      <input type="date" className={fi} value={data.personal.dob} onChange={(e) => setPersonal({ dob: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl}>Gender</label>
                      <select className={fi} value={data.personal.gender} onChange={(e) => setPersonal({ gender: e.target.value })}>
                        <option value="">Select…</option><option>Male</option><option>Female</option><option>Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Phone</label>
                      <input className={fi} value={data.personal.phone} onChange={(e) => setPersonal({ phone: e.target.value })} placeholder="e.g. 0772 345 678" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={lbl}>Address</label>
                      <input className={fi} value={data.personal.address} onChange={(e) => setPersonal({ address: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
              {section === "qualifications" && <QualificationsStep data={data} setData={setData as (d: CvProfile) => void} />}
              {section === "experience" && <ExperienceStep data={data} setData={setData as (d: CvProfile) => void} />}
              {section === "skills" && <SkillsStep data={data} setData={setData as (d: CvProfile) => void} />}
              {section === "referees" && <RefereesStep data={data} setData={setData as (d: CvProfile) => void} />}
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-caa-border sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 border border-caa-border text-caa-body rounded-lg text-sm hover:bg-caa-surface">
            Cancel
          </button>
          <button onClick={save} disabled={saving || !data} className="flex-1 py-2.5 bg-caa-navy text-white rounded-lg text-sm font-semibold hover:bg-caa-navy-2 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
