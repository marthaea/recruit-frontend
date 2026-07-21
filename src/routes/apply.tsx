import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, AlertCircle, Pencil, Upload } from "lucide-react";
import { useApp, EMPTY_CV, screeningAnswerPasses, type CvProfile, type CvQualification, type QualLevel, type ScreeningQuestion } from "@/context/AppContext";
import { SuccessModal } from "@/components/SuccessModal";
import { O_LEVEL_SUBJECTS, A_LEVEL_SUBJECTS, O_LEVEL_GRADES, A_LEVEL_GRADES, QUAL_LEVELS, UGANDAN_UNIVERSITIES, COMMON_COURSES } from "@/lib/uganda-curriculum";
import { extractPdfText } from "@/lib/pdf-extract";
import { computeCvCompletion } from "@/lib/cv-completion";
import { isValidEmail, isValidPhone, isFullName } from "@/lib/validators";

export const Route = createFileRoute("/apply")({
  validateSearch: z.object({ jobId: z.coerce.number().optional() }),
  head: () => ({ meta: [{ title: "Apply — CAA Uganda" }] }),
  component: ApplyPage,
});

function input(cls = "") { return "w-full px-2.5 py-1.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy bg-white " + cls; }
const label = "block text-xs font-medium text-caa-body mb-1";

function ApplyPage() {
  const { auth, sessionRestoring, openSignInPrompt, jobs, applications, cv, hasCv, saveCv, addApplication, updateApplicationStatus, criteria, pushToast } = useApp();
  const hasExistingApplication = applications.some((a) => a.candidateEmail === auth.email);
  const { jobId } = Route.useSearch();
  const navigate = useNavigate();
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];

  // Wait for a stored session to be confirmed before deciding the visitor is
  // signed out — otherwise a reload briefly flashes the sign-in prompt at an
  // already-logged-in candidate (same race as admin.tsx / dashboard.tsx).
  useEffect(() => {
    if (sessionRestoring) return;
    if (!auth.isLoggedIn) openSignInPrompt();
  }, [auth.isLoggedIn, sessionRestoring, openSignInPrompt]);

  const screeningQs = useMemo(
    () => criteria.find((c) => c.jobId === job.id)?.screeningQuestions ?? [],
    [criteria, job.id]
  );
  const hasScreening = screeningQs.length > 0;
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});

  // If CV already built, start at Review for "edit before resubmit"
  const TOTAL_STEPS = hasScreening ? 9 : 8;
  const [step, setStep] = useState(hasCv ? TOTAL_STEPS - 1 : 0);
  const [data, setData] = useState<CvProfile>(() => {
    if (hasCv) return cv;
    return { ...EMPTY_CV, personal: { ...EMPTY_CV.personal, firstName: auth.firstName, lastName: auth.lastName, email: auth.email } };
  });
  const [submitted, setSubmitted] = useState<string | null>(null);

  const ageOk = useMemo(() => {
    if (!data.personal.dob) return null;
    const age = Math.floor((Date.now() - new Date(data.personal.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    return age >= job.minAge;
  }, [data.personal.dob, job.minAge]);

  /* ---------- step definitions (Eligibility step only exists when the job has screening questions) ---------- */
  const personalStep = () => renderPersonalStep();
  const nextOfKinStep = () => renderNextOfKinStep();
  const photoStep = () => renderPhotoStep();
  const eligibilityStep = () => (
    <EligibilityStep questions={screeningQs} answers={screeningAnswers} onChange={(id: string, v: string) => setScreeningAnswers((s) => ({ ...s, [id]: v }))} />
  );

  const stepDefs = useMemo(() => [
    { label: "Personal", render: personalStep },
    ...(hasScreening ? [{ label: "Eligibility", render: eligibilityStep }] : []),
    { label: "Qualifications", render: () => <QualificationsStep data={data} setData={setData} /> },
    { label: "Skills", render: () => <SkillsStep data={data} setData={setData} /> },
    { label: "Experience", render: () => <ExperienceStep data={data} setData={setData} /> },
    { label: "Referees", render: () => <RefereesStep data={data} setData={setData} /> },
    { label: "Next of Kin", render: nextOfKinStep },
    { label: "Passport Photo", render: photoStep },
    { label: "Review", render: () => renderReviewStep() },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data, screeningAnswers, hasScreening, screeningQs, ageOk]);

  const STEPS = stepDefs.map((d) => d.label);
  const reviewStepIndex = stepDefs.findIndex((d) => d.label === "Review");

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* ---------- required-field validation ----------
     Pass a step index to get only that step's issues (used to gate
     "Continue" so a candidate can't advance past incomplete/invalid fields);
     call with no argument for the full list (used on the Review step and at
     final submit). */
  const getMissingFields = (forStep?: number): { label: string; step: number }[] => {
    const missing: { label: string; step: number }[] = [];
    const stepIndex = (l: string) => stepDefs.findIndex((d) => d.label === l);
    const add = (fieldLabel: string, step: number) => {
      if (forStep === undefined || forStep === step) missing.push({ label: fieldLabel, step });
    };

    const p = data.personal;
    const personalStep = stepIndex("Personal");
    if (!p.firstName.trim()) add("First name", personalStep);
    if (!p.lastName.trim()) add("Surname", personalStep);
    if (!p.phone.trim()) add("Phone", personalStep);
    else if (!isValidPhone(p.phone)) add("Valid phone number (digits, optionally with a country code like +256)", personalStep);
    if (!p.email.trim()) add("Email", personalStep);
    else if (!isValidEmail(p.email)) add("Valid email address", personalStep);
    if (!p.dob) add("Date of birth", personalStep);
    if (!p.gender) add("Gender", personalStep);
    if (!p.nationality.trim()) add("Nationality", personalStep);
    if (!p.address.trim()) add("Address", personalStep);

    if (hasScreening) {
      const eligibilityStep = stepIndex("Eligibility");
      const unanswered = screeningQs.some((q) => !screeningAnswers[q.id]);
      if (unanswered) add("Eligibility questions", eligibilityStep);
    }

    const qualificationsStep = stepIndex("Qualifications");
    if (!data.highestLevel) add("Highest level of education", qualificationsStep);
    if (data.qualifications.length === 0) add("At least one qualification", qualificationsStep);

    const refereesStep = stepIndex("Referees");
    const validReferees = data.referees.filter((r) => r.name.trim() && r.phone.trim() && r.email.trim());
    if (validReferees.length < 2) add("Two complete referees (name, phone, email)", refereesStep);
    if (data.referees.some((r) => r.name.trim() && !isFullName(r.name))) add("Referee full name (first and last, not just one name)", refereesStep);
    if (data.referees.some((r) => r.email.trim() && !isValidEmail(r.email))) add("Valid referee email address", refereesStep);
    if (data.referees.some((r) => r.phone.trim() && !isValidPhone(r.phone))) add("Valid referee phone number", refereesStep);

    const nextOfKinStep = stepIndex("Next of Kin");
    if (!data.nextOfKin.name.trim()) add("Next of kin name", nextOfKinStep);
    else if (!isFullName(data.nextOfKin.name)) add("Next of kin full name (first and last, not just one name)", nextOfKinStep);
    if (!data.nextOfKin.relationship) add("Next of kin relationship", nextOfKinStep);
    if (!data.nextOfKin.phone.trim()) add("Next of kin phone", nextOfKinStep);
    else if (!isValidPhone(data.nextOfKin.phone)) add("Valid next of kin phone number", nextOfKinStep);

    const photoStep = stepIndex("Passport Photo");
    if (!data.photoFile) add("Passport photo", photoStep);

    return missing;
  };

  const submit = () => {
    if (ageOk === false) { pushToast({ type: "warning", title: `Minimum age for this role is ${job.minAge}` }); return; }
    const missing = getMissingFields();
    if (missing.length > 0) {
      pushToast({ type: "warning", title: "Application incomplete", message: `Please complete: ${missing.map((m) => m.label).join(", ")}` });
      setStep(reviewStepIndex);
      return;
    }
    saveCv(data);
    const ref = "REF-2026-" + String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const newApp = addApplication({
      abbr: job.abbr, title: job.title, dept: job.dept, jobId: job.id,
      completion: computeCvCompletion(data, auth.photoUrl),
      candidateEmail: auth.email, candidateName: `${data.personal.firstName} ${data.personal.lastName}`.trim(),
      screeningAnswers: hasScreening ? screeningAnswers : undefined,
    });
    // Eligibility is enforced silently — the candidate always sees the normal success state,
    // matching how a real applicant tracking system avoids tipping off auto-rejected candidates.
    if (hasScreening) {
      const eligible = screeningQs.every((q) => screeningAnswerPasses(q, screeningAnswers[q.id]));
      if (!eligible) updateApplicationStatus(newApp.id, "Declined");
    }
    setSubmitted(ref);
    pushToast({ type: "success", title: "Application submitted", message: "Your CV is saved and will pre-fill next time." });
  };

  // Save CV changes without submitting a new application — for a candidate
  // who's just updating their profile (e.g. before applying elsewhere).
  const saveOnly = () => {
    saveCv(data);
    pushToast({ type: "success", title: "CV saved", message: "Your changes have been saved to your profile." });
  };

  /* ---------- per-step pieces ---------- */
  const setPersonal = (p: Partial<CvProfile["personal"]>) => setData({ ...data, personal: { ...data.personal, ...p } });

  const renderStep = () => stepDefs[step]?.render() ?? null;

  const renderPersonalStep = () => (
        <div className="space-y-4">
          {/* CV Quick-fill banner */}
          <div className="rounded-lg border border-caa-navy/20 bg-caa-navy/5 p-3 flex items-start gap-3">
            <Upload className="h-4 w-4 text-caa-navy mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-caa-navy">Quick-fill from existing CV</p>
              <p className="text-[11px] text-caa-muted mt-0.5">Upload a plain-text or PDF CV and we'll try to auto-fill the fields below.</p>
            </div>
            <label className="shrink-0 cursor-pointer px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 transition-colors">
              Upload CV
              <input type="file" accept=".txt,.pdf,.doc,.docx" className="sr-only" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Reset input so the same file can be re-uploaded
                (e.target as HTMLInputElement).value = "";
                try {
                  let text: string;
                  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                    text = await extractPdfText(file);
                  } else {
                    text = await new Promise<string>((res, rej) => {
                      const r = new FileReader();
                      r.onload = (ev) => res((ev.target?.result as string) ?? "");
                      r.onerror = rej;
                      r.readAsText(file);
                    });
                  }

                  const filled: Partial<typeof data.personal> = {};

                  // Email
                  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.\w{2,6}/);
                  if (emailMatch) filled.email = emailMatch[0];

                  // Phone — Uganda formats: +256XXXXXXXXX, 07XXXXXXXX, 075XXXXXXX
                  const phoneMatch =
                    text.match(/\+256[\s\-]?[0-9]{2,3}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,4}/) ||
                    text.match(/0[7][0-9][\s\-]?[0-9]{3}[\s\-]?[0-9]{4}/) ||
                    text.match(/(\+256|0)[0-9\s\-]{8,12}/);
                  if (phoneMatch) filled.phone = phoneMatch[0].replace(/[\s\-]/g, "");

                  // NIN
                  const ninMatch = text.match(/[A-Z]{2}\d{7}[A-Z]/);
                  if (ninMatch) filled.nin = ninMatch[0];

                  // Date of birth — DD/MM/YYYY or YYYY-MM-DD
                  const dobDMY = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]((?:19|20)\d{2})\b/);
                  const dobISO = text.match(/\b((?:19|20)\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/);
                  if (dobISO) {
                    filled.dob = dobISO[0];
                  } else if (dobDMY) {
                    filled.dob = `${dobDMY[3]}-${dobDMY[2].padStart(2, "0")}-${dobDMY[1].padStart(2, "0")}`;
                  }

                  // Name — labelled fields first, then first prominent two-word line
                  const firstNameLabelled = text.match(/(?:First\s*Name|Given\s*Name|Forename)[:\s]+([A-Za-z]{2,20})/i)?.[1];
                  const lastNameLabelled  = text.match(/(?:Last\s*Name|Surname|Family\s*Name)[:\s]+([A-Za-z]{2,20})/i)?.[1];
                  if (firstNameLabelled) filled.firstName = firstNameLabelled;
                  if (lastNameLabelled)  filled.lastName  = lastNameLabelled;

                  // Fallback: first line that looks like "FirstName LastName"
                  if (!firstNameLabelled && !lastNameLabelled) {
                    const nameLine = text
                      .split(/\n/)
                      .map((l) => l.trim())
                      .find((l) => /^[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2}$/.test(l));
                    if (nameLine) {
                      const parts = nameLine.split(/\s+/);
                      filled.firstName = parts[0];
                      filled.lastName  = parts[parts.length - 1];
                    }
                  }

                  // Nationality
                  const natMatch = text.match(/(?:Nationality|Citizenship|Citizen)[:\s]+([A-Za-z]{3,20})/i);
                  if (natMatch) filled.nationality = natMatch[1];

                  // Address
                  const addrMatch = text.match(/(?:Address|Residence|Location)[:\s]+(.{10,80})/i);
                  if (addrMatch) filled.address = addrMatch[1].trim();

                  // Gender
                  const genderMatch = text.match(/\b(Male|Female)\b/i);
                  if (genderMatch) filled.gender = genderMatch[1].charAt(0).toUpperCase() + genderMatch[1].slice(1).toLowerCase();

                  const count = Object.keys(filled).length;
                  if (count > 0) {
                    setPersonal(filled as any);
                    pushToast({ type: "success", title: "CV auto-filled", message: `${count} field${count > 1 ? "s" : ""} filled from your CV. Review and adjust as needed.` });
                  } else {
                    pushToast({ type: "info", title: "No fields extracted", message: "The CV format wasn't recognised. Please fill the form manually." });
                  }
                } catch {
                  pushToast({ type: "warning", title: "CV parse failed", message: "Could not read the file. Please fill the form manually." });
                }
              }} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["First name", "firstName"], ["Surname", "lastName"], ["Other name", "otherName"],
              ["Phone", "phone"], ["Email", "email"], ["National ID (NIN)", "nin"],
              ["Nationality", "nationality"],
            ].map(([l, k]) => (
              <div key={k}>
                <label className={label}>{l}</label>
                <input className={input()} value={(data.personal as any)[k] ?? ""} onChange={(e) => setPersonal({ [k]: e.target.value } as any)} />
              </div>
            ))}
            <div>
              <label className={label}>Date of birth</label>
              <input type="date" className={input()} value={data.personal.dob} onChange={(e) => setPersonal({ dob: e.target.value })} />
              {ageOk === false && <p className="text-[11px] text-caa-danger mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Min age for this role is {job.minAge}.</p>}
            </div>
            <div>
              <label className={label}>Gender</label>
              <select className={input()} value={data.personal.gender} onChange={(e) => setPersonal({ gender: e.target.value })}>
                <option value="">Select…</option><option>Male</option><option>Female</option><option>Prefer not to say</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Address</label>
              <input className={input()} value={data.personal.address} onChange={(e) => setPersonal({ address: e.target.value })} />
            </div>
          </div>
        </div>
  );

  const renderNextOfKinStep = () => (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={label}>Full name</label><input className={input()} value={data.nextOfKin.name} onChange={(e) => setData({ ...data, nextOfKin: { ...data.nextOfKin, name: e.target.value } })} /></div>
          <div><label className={label}>Relationship</label>
            <select className={input()} value={data.nextOfKin.relationship} onChange={(e) => setData({ ...data, nextOfKin: { ...data.nextOfKin, relationship: e.target.value } })}>
              <option value="">Select…</option>{["Spouse","Parent","Sibling","Child","Guardian","Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div><label className={label}>Phone</label><input className={input()} value={data.nextOfKin.phone} onChange={(e) => setData({ ...data, nextOfKin: { ...data.nextOfKin, phone: e.target.value } })} /></div>
        </div>
  );

  const renderPhotoStep = () => (
        <div>
          <label className={label}>Passport-size photo (image only, ≤ 2MB)</label>
          <div className="border-2 border-dashed border-caa-border rounded-md p-6 text-center bg-caa-surface">
            <Upload className="h-6 w-6 text-caa-muted mx-auto" />
            <input type="file" accept="image/*" className="mt-3 text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                if (f.size > 2 * 1024 * 1024) { pushToast({ type: "warning", title: "Photo too large (max 2MB)" }); return; }
                if (!f.type.startsWith("image/")) { pushToast({ type: "warning", title: "Image files only" }); return; }
                setData({ ...data, photoFile: f.name });
              }} />
            {data.photoFile && <p className="mt-2 text-xs text-caa-success flex items-center justify-center gap-1"><Check className="h-3 w-3" />{data.photoFile}</p>}
          </div>
        </div>
  );

  const renderReviewStep = () => {
    const missing = getMissingFields();
    return (
      <div className="space-y-3">
        {missing.length > 0 && (
          <div className="rounded-lg border border-caa-warning/40 bg-caa-warning/10 p-3">
            <p className="text-xs font-semibold text-caa-warning flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> {missing.length} item{missing.length !== 1 ? "s" : ""} required before you can submit</p>
            <ul className="mt-1.5 space-y-1">
              {missing.map((m) => (
                <li key={m.label} className="text-[11px] text-caa-body flex items-center justify-between gap-2">
                  <span>· {m.label}</span>
                  <button onClick={() => setStep(m.step)} className="text-caa-navy hover:underline shrink-0">Go to step</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ReviewStep data={data} job={job} onJump={setStep} screeningQs={screeningQs} screeningAnswers={screeningAnswers} hasScreening={hasScreening} />
      </div>
    );
  };

  return (
    <>
      <div className="caa-hero-bg py-8 px-4 sm:px-6">
        <div className="relative mx-auto max-w-5xl">
          <Link to="/dashboard" className="text-white/65 hover:text-white text-xs inline-flex items-center gap-1.5 mb-3">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <p className="text-white/65 text-xs">Applying for</p>
          <h1 className="font-bold text-white text-2xl md:text-3xl mt-1">{job.title}</h1>
          <p className="text-white/70 text-xs mt-1">{job.dept} · {job.location} · {job.salaryBand} · Closes {job.closes}</p>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border ${i === step ? "bg-white text-caa-navy border-white" : i < step ? "bg-white/15 text-white/80 border-white/20" : "text-white/60 border-white/20"}`}>
                {i + 1}. {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-6 pb-12">
        <div className="mx-auto max-w-5xl">
          {hasCv && step !== STEPS.length - 1 && (
            <div className="caa-card p-3 mb-3 text-xs text-caa-muted flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-caa-navy" />
              Editing your saved CV — changes will replace your previous version on submit.
            </div>
          )}

          <div className="caa-card p-5">
            <h2 className="font-bold text-lg text-caa-body mb-4">{STEPS[step]}</h2>
            {renderStep()}
          </div>

          <div className="flex justify-between mt-5">
            <button onClick={back} disabled={step === 0} className="px-3 py-2 text-sm border border-caa-border rounded-md text-caa-body hover:bg-white disabled:opacity-40 inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              {hasCv && (
                <button onClick={saveOnly} className="px-4 py-2 text-sm border border-caa-navy text-caa-navy font-semibold rounded-md hover:bg-caa-navy/5">
                  Save
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => {
                    const stepMissing = getMissingFields(step);
                    if (stepMissing.length > 0) {
                      pushToast({ type: "warning", title: "Please complete this step", message: stepMissing.map((m) => m.label).join(", ") });
                      return;
                    }
                    next();
                  }}
                  className="px-4 py-2 text-sm bg-caa-navy text-white font-semibold rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} className="px-5 py-2 text-sm bg-caa-navy text-white font-semibold rounded-md hover:bg-caa-navy-2">
                  {hasExistingApplication ? "Save and Reapply" : "Save and Apply"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {submitted && (
        <SuccessModal refNumber={submitted} jobTitle={job.title} onClose={() => { setSubmitted(null); navigate({ to: "/dashboard" }); }} />
      )}
    </>
  );
}

/* ---------- Combobox: dropdown + manual "Other" fallback ---------- */
function Combobox({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const isOther = value !== "" && !options.includes(value);
  const [mode, setMode] = useState<"select" | "manual">(isOther ? "manual" : "select");
  const [selectVal, setSelectVal] = useState(isOther ? "" : value);

  const handleSelect = (v: string) => {
    if (v === "__other__") { setMode("manual"); onChange(""); }
    else { setSelectVal(v); onChange(v); }
  };
  const handleManual = (v: string) => onChange(v);
  const backToSelect = () => { setMode("select"); setSelectVal(""); onChange(""); };

  if (mode === "manual") {
    return (
      <div className="flex gap-1.5">
        <input autoFocus className={input("flex-1")} value={value} onChange={(e) => handleManual(e.target.value)} placeholder="Type here…" />
        <button type="button" onClick={backToSelect} className="shrink-0 px-2 py-1 text-[11px] border border-caa-border rounded-md text-caa-muted hover:text-caa-navy">↩ List</button>
      </div>
    );
  }
  return (
    <select className={input()} value={selectVal} onChange={(e) => handleSelect(e.target.value)}>
      <option value="">{placeholder ?? "Select…"}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__other__">Other (type manually)…</option>
    </select>
  );
}

/* ---------- Qualifications ---------- */
function QualificationsStep({ data, setData }: { data: CvProfile; setData: (d: CvProfile) => void }) {
  const add = (level: QualLevel) => {
    const q: CvQualification = { level, course: "", institution: "", year: "" };
    if (level === "O-Level" || level === "A-Level") { q.school = ""; q.indexNumber = ""; q.subjects = []; q.aggregate = ""; }
    setData({ ...data, qualifications: [...data.qualifications, q] });
  };
  const update = (i: number, patch: Partial<CvQualification>) => {
    setData({ ...data, qualifications: data.qualifications.map((q, idx) => idx === i ? { ...q, ...patch } : q) });
  };
  const remove = (i: number) => setData({ ...data, qualifications: data.qualifications.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className={label}>Highest level of education</label>
          <select className={input()} value={data.highestLevel} onChange={(e) => setData({ ...data, highestLevel: e.target.value as QualLevel })}>
            <option value="">Select…</option>
            {QUAL_LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUAL_LEVELS.map((l) => (
            <button key={l} onClick={() => add(l)} className="px-2 py-1 text-[11px] border border-caa-border rounded-md hover:border-caa-navy text-caa-navy inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> {l}
            </button>
          ))}
        </div>
      </div>

      {data.qualifications.length === 0 && <p className="text-xs text-caa-muted">Add at least one qualification using the buttons above.</p>}

      <div className="flex gap-4 overflow-x-auto pb-2">
      {data.qualifications.map((q, i) => {
        const isSecondary = q.level === "O-Level" || q.level === "A-Level";
        const subjectList = q.level === "O-Level" ? O_LEVEL_SUBJECTS : A_LEVEL_SUBJECTS;
        const grades = q.level === "O-Level" ? O_LEVEL_GRADES : A_LEVEL_GRADES;
        return (
          <div key={i} className="shrink-0 w-[440px] border border-caa-border rounded-md p-3 space-y-3 bg-caa-surface/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-caa-body">{q.level}</p>
              <button onClick={() => remove(i)} className="text-caa-danger text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>

            {!isSecondary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={label}>Course / programme</label>
                  <Combobox options={COMMON_COURSES} value={q.course} onChange={(v) => update(i, { course: v })} placeholder="Select course…" />
                </div>
                <div className="col-span-2">
                  <label className={label}>Institution / University</label>
                  <Combobox options={UGANDAN_UNIVERSITIES} value={q.institution} onChange={(v) => update(i, { institution: v })} placeholder="Select university…" />
                </div>
                <div><label className={label}>Year of award</label><input type="month" className={input()} value={q.year} onChange={(e) => update(i, { year: e.target.value })} /></div>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <FileField label="Proof of award" value={q.awardFile} onChange={(name) => update(i, { awardFile: name })} />
                  <FileField label="Full official transcript" value={q.transcriptFile} onChange={(name) => update(i, { transcriptFile: name })} />
                </div>
              </div>
            )}

            {isSecondary && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className={label}>School</label><input className={input()} value={q.school ?? ""} onChange={(e) => update(i, { school: e.target.value })} /></div>
                  <div><label className={label}>Index number</label><input className={input()} value={q.indexNumber ?? ""} onChange={(e) => update(i, { indexNumber: e.target.value })} /></div>
                  <div><label className={label}>Year</label><input type="month" className={input()} value={q.year} onChange={(e) => update(i, { year: e.target.value })} /></div>
                  <div><label className={label}>Aggregate</label><input className={input()} value={q.aggregate ?? ""} onChange={(e) => update(i, { aggregate: e.target.value })} placeholder="e.g. 12" /></div>
                  <FileField label="Result slip" value={q.awardFile} onChange={(name) => update(i, { awardFile: name })} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={label}>Subjects & grades</label>
                    <button onClick={() => update(i, { subjects: [...(q.subjects ?? []), { subject: "", grade: "" }] })} className="text-[11px] text-caa-navy inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add subject</button>
                  </div>
                  <div className="space-y-1.5">
                    {(q.subjects ?? []).map((s, si) => {
                      const isOtherSubject = s.subject !== "" && !subjectList.includes(s.subject);
                      return (
                        <div key={si} className="grid grid-cols-[1fr_120px_auto] gap-2">
                          <SubjectCombobox
                            options={subjectList}
                            value={s.subject}
                            isOther={isOtherSubject}
                            onChange={(v) => update(i, { subjects: (q.subjects ?? []).map((x, xi) => xi === si ? { ...x, subject: v } : x) })}
                          />
                          <select className={input()} value={s.grade} onChange={(e) => update(i, { subjects: (q.subjects ?? []).map((x, xi) => xi === si ? { ...x, grade: e.target.value } : x) })}>
                            <option value="">Grade…</option>{grades.map((g) => <option key={g}>{g}</option>)}
                          </select>
                          <button onClick={() => update(i, { subjects: (q.subjects ?? []).filter((_, xi) => xi !== si) })} className="text-caa-danger px-1"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

function SubjectCombobox({ options, value, isOther, onChange }: { options: string[]; value: string; isOther: boolean; onChange: (v: string) => void }) {
  const [manual, setManual] = useState(isOther);
  if (manual) {
    return (
      <div className="flex gap-1">
        <input autoFocus className={input("flex-1")} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Subject name…" />
        <button type="button" onClick={() => { setManual(false); onChange(""); }} className="shrink-0 px-1.5 text-[10px] border border-caa-border rounded text-caa-muted hover:text-caa-navy">↩</button>
      </div>
    );
  }
  return (
    <select className={input()} value={value} onChange={(e) => { if (e.target.value === "__other__") { setManual(true); onChange(""); } else onChange(e.target.value); }}>
      <option value="">Subject…</option>
      {options.map((s) => <option key={s} value={s}>{s}</option>)}
      <option value="__other__">Other (type manually)…</option>
    </select>
  );
}

function FileField({ label: lbl, value, onChange }: { label: string; value?: string; onChange: (name: string) => void }) {
  return (
    <div>
      <label className={label}>{lbl}</label>
      <label className="flex items-center gap-2 px-2 py-1.5 border border-dashed border-caa-border rounded-md text-xs text-caa-muted cursor-pointer hover:border-caa-navy">
        <Upload className="h-3.5 w-3.5" />
        <span className="truncate">{value || "Choose file…"}</span>
        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f.name); }} />
      </label>
    </div>
  );
}

/* ---------- Skills ---------- */
function SkillsStep({ data, setData }: { data: CvProfile; setData: (d: CvProfile) => void }) {
  const [text, setText] = useState("");
  const add = () => { const t = text.trim(); if (!t) return; setData({ ...data, skills: [...data.skills, t] }); setText(""); };
  return (
    <div className="space-y-3">
      <p className="text-xs text-caa-muted">Add certifications or professional skills, e.g. "Certified in Python", "ICAO English Level 4".</p>
      <div className="flex gap-2">
        <input className={input()} value={text} placeholder="Add a skill or certification" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button onClick={add} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.skills.map((s, i) => (
          <span key={i} className="px-2.5 py-1 bg-caa-surface border border-caa-border rounded-full text-xs flex items-center gap-1">
            {s}<button onClick={() => setData({ ...data, skills: data.skills.filter((_, idx) => idx !== i) })} className="text-caa-danger"><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
        {data.skills.length === 0 && <p className="text-xs text-caa-muted">No skills added yet.</p>}
      </div>
    </div>
  );
}

/* ---------- Experience ---------- */
function ExperienceStep({ data, setData }: { data: CvProfile; setData: (d: CvProfile) => void }) {
  const add = () => setData({ ...data, experience: [...data.experience, { title: "", organisation: "", start: "", end: "", description: "" }] });
  const upd = (i: number, p: Partial<CvProfile["experience"][number]>) => setData({ ...data, experience: data.experience.map((x, idx) => idx === i ? { ...x, ...p } : x) });
  const rm = (i: number) => setData({ ...data, experience: data.experience.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      {data.experience.map((x, i) => (
        <div key={i} className="border border-caa-border rounded-md p-3 bg-caa-surface/40">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2"><label className={label}>Job title</label><input className={input()} value={x.title} onChange={(e) => upd(i, { title: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={label}>Organisation</label><input className={input()} value={x.organisation} onChange={(e) => upd(i, { organisation: e.target.value })} /></div>
            <div><label className={label}>Start date</label><input type="month" className={input()} value={x.start} onChange={(e) => upd(i, { start: e.target.value })} /></div>
            <div><label className={label}>End date</label><input type="month" className={input()} value={x.end} onChange={(e) => upd(i, { end: e.target.value })} /></div>
            <FileField label="Proof of experience" value={x.proofFile} onChange={(name) => upd(i, { proofFile: name })} />
            <div className="sm:col-span-4"><label className={label}>Brief description</label><textarea rows={2} className={input()} value={x.description} onChange={(e) => upd(i, { description: e.target.value })} /></div>
          </div>
          <button onClick={() => rm(i)} className="text-caa-danger text-xs mt-2 inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
        </div>
      ))}
      <button onClick={add} className="px-3 py-1.5 text-sm border border-dashed border-caa-border rounded-md text-caa-navy hover:border-caa-navy inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add experience</button>
    </div>
  );
}

/* ---------- Referees ---------- */
function RefereesStep({ data, setData }: { data: CvProfile; setData: (d: CvProfile) => void }) {
  const upd = (i: number, p: Partial<CvProfile["referees"][number]>) => setData({ ...data, referees: data.referees.map((x, idx) => idx === i ? { ...x, ...p } : x) });
  return (
    <div className="space-y-3">
      <p className="text-xs text-caa-muted">At least two referees required. They are contacted only if you are shortlisted.</p>
      {data.referees.map((r, i) => (
        <div key={i} className="border border-caa-border rounded-md p-3 bg-caa-surface/40">
          <p className="text-xs font-semibold text-caa-body mb-2">Referee {i + 1}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Full name</label><input className={input()} value={r.name} onChange={(e) => upd(i, { name: e.target.value })} /></div>
            <div><label className={label}>Title</label><input className={input()} value={r.title} onChange={(e) => upd(i, { title: e.target.value })} /></div>
            <div><label className={label}>Organisation</label><input className={input()} value={r.organisation} onChange={(e) => upd(i, { organisation: e.target.value })} /></div>
            <div><label className={label}>Phone</label><input className={input()} value={r.phone} onChange={(e) => upd(i, { phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={label}>Email</label><input type="email" className={input()} value={r.email} onChange={(e) => upd(i, { email: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <button onClick={() => setData({ ...data, referees: [...data.referees, { name: "", title: "", organisation: "", phone: "", email: "" }] })} className="px-3 py-1.5 text-sm border border-dashed border-caa-border rounded-md text-caa-navy hover:border-caa-navy inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add referee</button>
    </div>
  );
}

/* ---------- Review ---------- */
/* ---------- Eligibility / screening questions ---------- */
function EligibilityStep({ questions, answers, onChange }: { questions: ScreeningQuestion[]; answers: Record<string, string>; onChange: (id: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-caa-muted">This role has a few eligibility questions. Answer accurately — your answers are checked against the role's requirements.</p>
      {questions.map((q) => (
        <div key={q.id} className="border border-caa-border rounded-md p-3 bg-caa-surface/40">
          <label className={label}>{q.text}</label>
          {q.kind === "number" ? (
            <input
              type="number"
              className={input("max-w-xs")}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder="Enter a number…"
            />
          ) : (
            <select className={input("max-w-xs")} value={answers[q.id] ?? ""} onChange={(e) => onChange(q.id, e.target.value)}>
              <option value="">Select…</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          )}
        </div>
      ))}
      {questions.length === 0 && <p className="text-xs text-caa-muted">No eligibility questions for this role.</p>}
    </div>
  );
}

function ReviewStep({ data, job, onJump, screeningQs = [], screeningAnswers = {}, hasScreening = false }: {
  data: CvProfile; job: any; onJump: (s: number) => void;
  screeningQs?: ScreeningQuestion[]; screeningAnswers?: Record<string, string>; hasScreening?: boolean;
}) {
  const offset = hasScreening ? 1 : 0;
  const sections: { title: string; step: number; render: () => React.ReactNode }[] = [
    { title: "Personal", step: 0, render: () => <p className="text-sm">{data.personal.firstName} {data.personal.lastName} · {data.personal.email} · {data.personal.phone || "—"} · DOB {data.personal.dob || "—"}</p> },
    ...(hasScreening ? [{ title: "Eligibility", step: 1, render: () => (
      <ul className="text-sm space-y-1">
        {screeningQs.map((q) => <li key={q.id}>· {q.text} — <span className="font-medium">{screeningAnswers[q.id] || "—"}</span></li>)}
      </ul>
    ) }] : []),
    { title: "Qualifications", step: 1 + offset, render: () => (
      <ul className="text-sm space-y-1">
        <li className="text-xs text-caa-muted">Highest: {data.highestLevel || "—"}</li>
        {data.qualifications.map((q, i) => <li key={i}>· {q.level} — {q.course || q.school || "—"} ({q.year || "—"})</li>)}
        {data.qualifications.length === 0 && <li className="text-caa-muted">No qualifications added.</li>}
      </ul>
    )},
    { title: "Skills", step: 2 + offset, render: () => <p className="text-sm">{data.skills.join(" · ") || <span className="text-caa-muted">None</span>}</p> },
    { title: "Experience", step: 3 + offset, render: () => (
      <ul className="text-sm space-y-1">
        {data.experience.map((x, i) => <li key={i}>· {x.title} @ {x.organisation} ({x.start} → {x.end || "present"})</li>)}
        {data.experience.length === 0 && <li className="text-caa-muted">No experience added.</li>}
      </ul>
    )},
    { title: "Referees", step: 4 + offset, render: () => <p className="text-sm">{data.referees.filter((r) => r.name).length} provided</p> },
    { title: "Next of Kin", step: 5 + offset, render: () => <p className="text-sm">{data.nextOfKin.name || "—"} ({data.nextOfKin.relationship || "—"})</p> },
    { title: "Passport Photo", step: 6 + offset, render: () => <p className="text-sm">{data.photoFile || <span className="text-caa-muted">Not uploaded</span>}</p> },
  ];
  return (
    <div className="space-y-3">
      <div className="caa-card p-3 border-l-[3px] border-l-caa-navy text-xs">
        Applying for <span className="font-semibold text-caa-body">{job.title}</span> · {job.salaryBand} · Min age {job.minAge} · {job.requiredExperience} yrs exp · {job.requiredQualification}.
      </div>
      {sections.map((s) => (
        <div key={s.title} className="border border-caa-border rounded-md p-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-caa-body mb-1">{s.title}</p>
            {s.render()}
          </div>
          <button onClick={() => onJump(s.step)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</button>
        </div>
      ))}
    </div>
  );
}