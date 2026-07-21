import { useState } from "react";
import {
  Trash2, CheckCircle2, XCircle,
} from "lucide-react";
import {
  type Job, type QualLevel, type JobCriteria, type ScreeningQuestion, type AssessmentType, ASSESSMENT_TYPES,
} from "@/context/AppContext";
import { QUAL_LEVELS } from "@/lib/uganda-curriculum";
import { Field, Section, fi } from "./shared";

export function CriteriaTab({ jobs, criteria, saveCriteria, logAction }: { jobs: Job[]; criteria: JobCriteria[]; saveCriteria: (c: JobCriteria) => void; logAction: any }) {
  const [selectedJobId, setSelectedJobId] = useState<number>(jobs[0]?.id ?? 0);
  const existing = criteria.find((c) => c.jobId === selectedJobId);
  const [copyFromId, setCopyFromId] = useState<number>(jobs[1]?.id ?? jobs[0]?.id ?? 0);
  const [uni, setUni] = useState("");

  const blankDraft = (): Omit<JobCriteria, "jobId"> => ({
    minCgpa: undefined,
    requiredKeywords: [],
    notes: "",
    screeningQuestions: [],
    minExperienceYears: undefined,
    requiredQualLevel: undefined,
    disqualifyingUniversities: [],
    assessmentTypes: [],
  });

  const fromExisting = (e: JobCriteria | undefined): Omit<JobCriteria, "jobId"> => ({
    minCgpa: e?.minCgpa,
    requiredKeywords: e?.requiredKeywords ?? [],
    notes: e?.notes ?? "",
    screeningQuestions: e?.screeningQuestions ?? [],
    minExperienceYears: e?.minExperienceYears,
    requiredQualLevel: e?.requiredQualLevel,
    disqualifyingUniversities: e?.disqualifyingUniversities ?? [],
    assessmentTypes: e?.assessmentTypes ?? [],
  });

  const toggleAssessmentType = (t: AssessmentType) =>
    setDraft((d) => ({
      ...d,
      assessmentTypes: (d.assessmentTypes ?? []).includes(t)
        ? (d.assessmentTypes ?? []).filter((x) => x !== t)
        : [...(d.assessmentTypes ?? []), t],
    }));

  const [draft, setDraft] = useState<Omit<JobCriteria, "jobId">>(fromExisting(existing));
  const [kw, setKw] = useState("");
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"qualifier" | "disqualifier">("qualifier");
  const [qKind, setQKind] = useState<"yesno" | "number">("yesno");
  const [qAnswer, setQAnswer] = useState<"Yes" | "No">("Yes");
  const [qMin, setQMin] = useState("");
  const [qMax, setQMax] = useState("");
  const [saved, setSaved] = useState(false);

  const handleJobChange = (id: number) => {
    setSelectedJobId(id);
    setDraft(fromExisting(criteria.find((c) => c.jobId === id)));
  };

  const addKw = () => { if (kw.trim()) { setDraft((d) => ({ ...d, requiredKeywords: [...d.requiredKeywords, kw.trim()] })); setKw(""); } };
  const removeKw = (k: string) => setDraft((d) => ({ ...d, requiredKeywords: d.requiredKeywords.filter((x) => x !== k) }));
  const addUni = () => { if (uni.trim()) { setDraft((d) => ({ ...d, disqualifyingUniversities: [...(d.disqualifyingUniversities ?? []), uni.trim()] })); setUni(""); } };
  const removeUni = (u: string) => setDraft((d) => ({ ...d, disqualifyingUniversities: (d.disqualifyingUniversities ?? []).filter((x) => x !== u) }));
  const copyFrom = () => {
    const src = criteria.find((c) => c.jobId === copyFromId);
    if (src) { setDraft(fromExisting(src)); setSaved(false); }
  };

  const addQuestion = () => {
    if (!qText.trim()) return;
    if (qKind === "number" && qMin === "" && qMax === "") return;
    const q: ScreeningQuestion = {
      id: Date.now().toString(), text: qText.trim(), type: qType, kind: qKind,
      ...(qKind === "yesno" ? { qualifyingAnswer: qAnswer } : {}),
      ...(qKind === "number" ? { min: qMin !== "" ? Number(qMin) : undefined, max: qMax !== "" ? Number(qMax) : undefined } : {}),
    };
    setDraft((d) => ({ ...d, screeningQuestions: [...(d.screeningQuestions ?? []), q] }));
    setQText(""); setQMin(""); setQMax("");
  };
  const removeQuestion = (id: string) => setDraft((d) => ({ ...d, screeningQuestions: (d.screeningQuestions ?? []).filter((q) => q.id !== id) }));

  const describeQuestion = (q: ScreeningQuestion) => {
    if (q.kind === "number") {
      const range = q.min !== undefined && q.max !== undefined ? `${q.min}–${q.max}`
        : q.min !== undefined ? `≥ ${q.min}` : q.max !== undefined ? `≤ ${q.max}` : "any";
      return `Numeric answer must be ${range} to stay eligible.`;
    }
    return `Candidate must answer "${q.qualifyingAnswer ?? "Yes"}" to stay eligible.`;
  };

  const save = () => {
    saveCriteria({ jobId: selectedJobId, ...draft });
    logAction("Updated criteria", jobs.find((j) => j.id === selectedJobId)?.title);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const qualifiers = (draft.screeningQuestions ?? []).filter((q) => q.type === "qualifier");
  const disqualifiers = (draft.screeningQuestions ?? []).filter((q) => q.type === "disqualifier");

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="font-bold text-xl text-caa-body">Criteria Setup</h1>
        <p className="text-xs text-caa-muted mt-0.5">Set automatic screening rules. The system uses these to shortlist applicants — candidates never see this configuration.</p>
      </div>

      <Field label="Select position">
        <select className={fi} value={selectedJobId} onChange={(e) => handleJobChange(Number(e.target.value))}>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </Field>

      {/* Copy from another job */}
      <div className="flex items-center gap-2 flex-wrap bg-caa-surface border border-caa-border rounded-lg px-3 py-2.5">
        <span className="text-[11px] text-caa-muted shrink-0">Copy criteria from:</span>
        <select className={`${fi} flex-1 min-w-0`} value={copyFromId} onChange={(e) => setCopyFromId(Number(e.target.value))}>
          {jobs.filter((j) => j.id !== selectedJobId).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <button onClick={copyFrom} className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md">Copy</button>
      </div>

      <div className="caa-card p-4 space-y-5">

        {/* Basic filters */}
        <Section title="Basic filters">
          <Field label="Minimum CGPA (internship / graduate roles — leave blank if N/A)">
            <input type="number" min={0} max={5} step={0.1} className={fi} value={draft.minCgpa ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minCgpa: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="e.g. 3.5" />
          </Field>
          <Field label="Minimum experience required (years — leave blank to use job's default)">
            <input type="number" min={0} max={30} className={fi} value={draft.minExperienceYears ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minExperienceYears: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="e.g. 3" />
          </Field>
          <Field label="Required qualification level override (leave blank to use job's default)">
            <select className={fi} value={draft.requiredQualLevel ?? ""} onChange={(e) => setDraft((d) => ({ ...d, requiredQualLevel: (e.target.value as QualLevel) || undefined }))}>
              <option value="">— Use job's requirement —</option>
              {QUAL_LEVELS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </Field>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Assessment type</label>
            <div className="flex flex-wrap gap-3">
              {ASSESSMENT_TYPES.map((t) => (
                <label key={t} className="inline-flex items-center gap-1.5 text-xs text-caa-body cursor-pointer">
                  <input type="checkbox" checked={(draft.assessmentTypes ?? []).includes(t)} onChange={() => toggleAssessmentType(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Required keywords (CV must contain all of these)</label>
            <div className="flex gap-2 mb-2">
              <input className={`${fi} flex-1`} value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKw())} placeholder="Add keyword…" />
              <button onClick={addKw} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {draft.requiredKeywords.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy">
                  {k} <button onClick={() => removeKw(k)} className="text-caa-navy/60 hover:text-caa-danger">×</button>
                </span>
              ))}
              {draft.requiredKeywords.length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-caa-body mb-1">Disqualifying universities (applicants from these institutions are auto-excluded)</label>
            <div className="flex gap-2 mb-2">
              <input className={`${fi} flex-1`} value={uni} onChange={(e) => setUni(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUni())} placeholder="Institution name…" />
              <button onClick={addUni} className="px-3 py-1.5 bg-caa-danger text-white text-xs rounded-md">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(draft.disqualifyingUniversities ?? []).map((u) => (
                <span key={u} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-danger/10 text-caa-danger">
                  {u} <button onClick={() => removeUni(u)} className="text-caa-danger/60 hover:text-caa-danger">×</button>
                </span>
              ))}
              {(draft.disqualifyingUniversities ?? []).length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
            </div>
          </div>
        </Section>

        {/* Qualifier / Disqualifier questions */}
        <Section title="Qualifier & Disqualifier questions">
          <div className="rounded-lg border border-caa-border bg-caa-surface/60 p-3 mb-3 text-[11px] text-caa-muted leading-relaxed">
            These questions are shown to the candidate on the application form and checked precisely against their answer.
            A candidate who fails one is <strong>automatically declined on submission</strong> — they still see the normal "application submitted" confirmation.<br />
            <span className="font-semibold text-caa-navy">Qualifier</span> / <span className="font-semibold text-caa-danger">Disqualifier</span> only changes which list it's grouped under below; both are enforced the same way.
          </div>

          {/* Add new question */}
          <div className="space-y-2 mb-4 rounded-lg border border-caa-border p-3">
            <input className={fi} value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Question text, e.g. Do you have a bachelor's degree? / How old are you?" />
            <div className="flex flex-wrap gap-2 items-center">
              <select className={`${fi} w-40`} value={qType} onChange={(e) => setQType(e.target.value as "qualifier" | "disqualifier")}>
                <option value="qualifier">Qualifier ✓</option>
                <option value="disqualifier">Disqualifier ✗</option>
              </select>
              <select className={`${fi} w-36`} value={qKind} onChange={(e) => setQKind(e.target.value as "yesno" | "number")}>
                <option value="yesno">Yes / No</option>
                <option value="number">Number (range)</option>
              </select>
              {qKind === "yesno" ? (
                <label className="flex items-center gap-1.5 text-xs text-caa-body">
                  Required answer:
                  <select className={`${fi} w-24`} value={qAnswer} onChange={(e) => setQAnswer(e.target.value as "Yes" | "No")}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-caa-body">
                  Acceptable range:
                  <input type="number" className={`${fi} w-20`} value={qMin} onChange={(e) => setQMin(e.target.value)} placeholder="Min" />
                  –
                  <input type="number" className={`${fi} w-20`} value={qMax} onChange={(e) => setQMax(e.target.value)} placeholder="Max" />
                </label>
              )}
              <button onClick={addQuestion} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md shrink-0 ml-auto">Add question</button>
            </div>
          </div>

          {/* Qualifier list */}
          {qualifiers.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-caa-navy mb-1.5">Must pass (qualifiers)</p>
              <div className="space-y-1.5">
                {qualifiers.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-caa-success/5 border border-caa-success/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-caa-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-caa-body">{q.text}</p>
                      <p className="text-[10px] text-caa-muted">{describeQuestion(q)}</p>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="text-caa-danger shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disqualifier list */}
          {disqualifiers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-caa-danger mb-1.5">Auto-exclude if found (disqualifiers)</p>
              <div className="space-y-1.5">
                {disqualifiers.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-caa-danger/5 border border-caa-danger/20">
                    <XCircle className="h-3.5 w-3.5 text-caa-danger shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-caa-body">{q.text}</p>
                      <p className="text-[10px] text-caa-muted">{describeQuestion(q)}</p>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="text-caa-danger shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {qualifiers.length === 0 && disqualifiers.length === 0 && (
            <p className="text-[11px] text-caa-muted">No screening questions set. Add them above.</p>
          )}
        </Section>

        <Section title="Notes for recruiters">
          <textarea rows={2} className={fi} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Optional guidance for the recruiter reviewing the shortlist…" />
        </Section>

        <div className="flex items-center gap-3">
          <button onClick={save} className="px-4 py-2 bg-caa-navy text-white text-sm font-semibold rounded-md">Save criteria</button>
          <button onClick={() => setDraft(blankDraft())} className="px-4 py-2 border border-caa-border text-sm rounded-md">Clear</button>
          {saved && <span className="text-sm text-caa-success flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

