import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, AlertCircle, FileDown, RefreshCw, CheckCircle2, XCircle,
  Upload, FileSearch, Send, ThumbsUp, ThumbsDown, Zap, BookmarkPlus, Eye,
} from "lucide-react";
import {
  useApp, type Job, type JobStatus, type Visibility, type QualLevel, type Application, JOB_STATUS_LABELS,
  type JobCriteria, type JobRequirement, type RequirementKind, type RequirementUsage, type ScreeningQuestion,
  type AssessmentType, ASSESSMENT_TYPES, type JobTemplate,
} from "@/context/AppContext";
import {
  SALARY_BANDS, EMPLOYMENT_TYPES, DEPARTMENTS, QUAL_LEVELS, LOCATIONS, REQUIREMENT_KIND_META,
  O_LEVEL_SUBJECTS, A_LEVEL_SUBJECTS, O_LEVEL_GRADES, A_LEVEL_GRADES,
} from "@/lib/uganda-curriculum";
import {
  downloadJobAdvert,
} from "@/lib/admin-pdf";
import { extractPdfText } from "@/lib/pdf-extract";
import { JobDocument } from "@/components/JobDocument";
import { Field, Section, fi } from "./shared";

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const emptyJob: Omit<Job, "id" | "abbr"> = {
  title: "", dept: DEPARTMENTS[0].label, deptKey: DEPARTMENTS[0].key, location: LOCATIONS[0],
  salary: "UGX 2.0M–3.0M", salaryBand: "UG5", type: "Full-time", closes: "", closesAt: "",
  visibility: "external", minAge: 21, requiredExperience: 2, requiredQualification: "Degree", description: "",
  jobRef: "", reportsTo: "", vacancies: 1, aboutRole: "", accountabilities: [], specialSkills: [],
};

const blankCriteriaDraft = (): Omit<JobCriteria, "jobId"> => ({
  minCgpa: undefined,
  requiredKeywords: [],
  notes: "",
  screeningQuestions: [],
  minExperienceYears: undefined,
  requiredQualLevel: undefined,
  disqualifyingUniversities: [],
  assessmentTypes: [],
  requirements: [],
});

const criteriaFromExisting = (e: JobCriteria | undefined): Omit<JobCriteria, "jobId"> => ({
  minCgpa: e?.minCgpa,
  requiredKeywords: e?.requiredKeywords ?? [],
  notes: e?.notes ?? "",
  screeningQuestions: e?.screeningQuestions ?? [],
  minExperienceYears: e?.minExperienceYears,
  requiredQualLevel: e?.requiredQualLevel,
  disqualifyingUniversities: e?.disqualifyingUniversities ?? [],
  assessmentTypes: e?.assessmentTypes ?? [],
  requirements: e?.requirements ?? [],
});

// ─── Structured requirement builder helpers ────────────────────────────────────

function buildRequirementLabel(kind: RequirementKind, opts: { numberValue?: number; textValue?: string; gradeValue?: string }): string {
  const { numberValue, textValue, gradeValue } = opts;
  switch (kind) {
    case "minAge": return `Must be at least ${numberValue ?? "?"} years old`;
    case "maxAge": return `Must be no older than ${numberValue ?? "?"} years old`;
    case "flyingHours": return `Must have at least ${numberValue ?? "?"} flying hours`;
    case "experienceYears": return `Must have at least ${numberValue ?? "?"} years of relevant experience`;
    case "sex": return `Must be ${textValue ?? "?"}`;
    case "qualificationLevel": return `Must hold at least a ${gradeValue ?? "?"}`;
    case "specificDegree": return `Must hold a degree in ${textValue ?? "?"} (or a closely related field)`;
    case "oLevelSubject": return `Must have at least a ${gradeValue ?? "?"} in ${textValue ?? "?"} at O-Level`;
    case "aLevelSubject": return `Must have at least a ${gradeValue ?? "?"} in ${textValue ?? "?"} at A-Level`;
    case "custom": return textValue ?? "";
  }
}

/** Auto-generates the candidate-facing question this requirement should ask,
 *  if any — "criteriaOnly" requirements stay silent/backend-only. */
function buildRequirementQuestion(req: JobRequirement): ScreeningQuestion | null {
  if (req.usage === "criteriaOnly") return null;
  const type: "qualifier" | "disqualifier" = req.usage === "disqualifier" ? "disqualifier" : "qualifier";
  const numericKinds: RequirementKind[] = ["minAge", "maxAge", "flyingHours", "experienceYears"];
  if (numericKinds.includes(req.kind)) {
    const text =
      req.kind === "flyingHours" ? "How many flying hours do you have?" :
      req.kind === "experienceYears" ? "How many years of relevant experience do you have?" :
      "What is your age?";
    return {
      id: req.id, text, type, kind: "number",
      min: (req.kind === "minAge" || req.kind === "flyingHours" || req.kind === "experienceYears") ? req.numberValue : undefined,
      max: req.kind === "maxAge" ? req.numberValue : undefined,
    };
  }
  return { id: req.id, text: `Do you meet this requirement: ${req.label}`, type, kind: "yesno", qualifyingAnswer: "Yes" };
}

function regenerateQuestionsForRequirements(reqs: JobRequirement[]): ScreeningQuestion[] {
  return reqs.map(buildRequirementQuestion).filter((q): q is ScreeningQuestion => q !== null);
}

function parseJobFromText(text: string): Partial<Omit<Job, "id" | "abbr">> {
  const result: Partial<Omit<Job, "id" | "abbr">> = {};
  const lines = text.split(/\n|\r|\s{4,}/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Title — first line >10 chars that isn't an org/header line
  const titleLine = lines.find(
    (l) => l.length > 10 && l.length < 120 &&
      !/uganda civil aviation|civil aviation authority|ucaa|caa uganda|job advert|vacancy/i.test(l),
  );
  if (titleLine) result.title = titleLine.replace(/^(position|post|role|job title)\s*[:\-]\s*/i, "").trim();

  // Department
  for (const d of DEPARTMENTS) {
    if (text.toLowerCase().includes(d.label.toLowerCase())) {
      result.dept = d.label;
      result.deptKey = d.key;
      break;
    }
  }

  // Salary band (UG1–UG7)
  const bandMatch = text.match(/\bUG([1-7])\b/);
  if (bandMatch) result.salaryBand = `UG${bandMatch[1]}`;

  // Salary range (UGX amounts)
  const salaryMatch = text.match(/UGX\s*([\d,.]+M?)\s*[–\-]\s*([\d,.]+M?)/i);
  if (salaryMatch) result.salary = `UGX ${salaryMatch[1]}–${salaryMatch[2]}`;

  // Location — match against the known CAA site list first, fall back to a
  // short-alias scan so "Entebbe" still resolves to the full site name.
  for (const loc of LOCATIONS) {
    if (text.toLowerCase().includes(loc.toLowerCase())) { result.location = loc; break; }
  }
  if (!result.location) {
    const aliases = ["Entebbe", "Kampala", "Gulu", "Jinja", "Mbarara", "Fort Portal", "Arua", "Soroti", "Kidepo"];
    for (const alias of aliases) {
      if (text.includes(alias)) {
        const match = LOCATIONS.find((l) => l.toLowerCase().includes(alias.toLowerCase()));
        if (match) { result.location = match; break; }
      }
    }
  }

  // Employment type
  if (/fixed[\s-]?term/i.test(text)) result.type = "Fixed Term Contract";
  else if (/\bcontract\b/i.test(text)) result.type = "Contract";
  else if (/full[\s-]?time/i.test(text)) result.type = "Full-time";

  // Visibility / sourcing type
  if (/internal\s+(only|vacancy|candidates)/i.test(text)) result.visibility = "internal";
  else if (/external|open\s+to\s+(all|public)/i.test(text)) result.visibility = "external";

  // Deadline — prefer ISO date, else DD/MM/YYYY
  const isoDate = text.match(/\b(202\d)-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/)?.[0];
  if (isoDate) {
    result.closesAt = isoDate;
  } else {
    const dmyMatch = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](202\d)\b/);
    if (dmyMatch) result.closesAt = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  // Min age
  const ageMatch = text.match(/minimum\s+age\s*[:\-]?\s*(\d{2})/i) || text.match(/aged?\s+(\d{2})\s+years/i);
  if (ageMatch) result.minAge = parseInt(ageMatch[1]);

  // Required experience
  const expMatch = text.match(/(\d+)\s*\+?\s*years?\s*(of\s*)?(relevant\s*)?experience/i);
  if (expMatch) result.requiredExperience = parseInt(expMatch[1]);

  // Required qualification — scan from the LOWEST level up and take the first
  // one actually stated as required. Previously this checked PhD first, so a
  // document reading "Bachelor's degree required; Master's an added advantage"
  // was misread as requiring a PhD/Masters just because that word appeared
  // somewhere in the text, regardless of context.
  const ADVANTAGE_NEARBY = /(an?\s+)?(added\s+)?advantage|desirable|preferred|is a plus|added benefit/i;
  for (const q of ["O-Level", "A-Level", "Certificate", "Diploma", "Degree", "Masters", "PhD"] as const) {
    const m = text.match(new RegExp(`\\b${q}\\b([^.\\n]{0,40})`, "i"));
    if (m && !ADVANTAGE_NEARBY.test(m[1] || "")) { result.requiredQualification = q; break; }
  }

  // Description — everything after "job purpose" / "about the role" / "job summary" heading
  const descMatch = text.match(/(?:job\s+purpose|about\s+the\s+role|job\s+summary|overview|background)[:\s]*\n?([\s\S]{40,800})/i);
  if (descMatch) {
    result.description = descMatch[1].replace(/\s+/g, " ").trim();
    // Reuse the same block as the candidate-facing "about the role" summary —
    // best effort; HR reviews and can edit before submitting.
    result.aboutRole = result.description;
  }

  // Accountabilities — best-effort: capture bullet lines under a "Key
  // Accountabilities" / "Duties and Responsibilities" heading, if present.
  const accMatch = text.match(/(?:key\s+accountabilities|duties\s+and\s+responsibilities|key\s+duties|main\s+responsibilities)[:\s]*\n?([\s\S]{20,1500}?)(?:\n\s*\n|requirements|qualifications|person\s+specification|$)/i);
  if (accMatch) {
    const activities = accMatch[1]
      .split(/\n|(?=•|-\s|\d+\.)/)
      .map((l) => l.replace(/^[•\-\d.\s]+/, "").trim())
      .filter((l) => l.length > 5 && l.length < 300);
    if (activities.length > 0) result.accountabilities = [{ area: "Key Responsibilities", activities }];
  }

  // Reports to
  const reportsToMatch = text.match(/reports?\s+to\s*[:\-]?\s*([A-Z][A-Za-z &,'-]{3,60})/);
  if (reportsToMatch) result.reportsTo = reportsToMatch[1].trim();

  // Job reference number
  const refMatch = text.match(/\b((?:UCAA|CAA)\/[A-Z]+\/[A-Z]+\/\d+\/\d{4})\b/i) || text.match(/ref(?:erence)?\s*(?:no\.?|number)?\s*[:\-]\s*([A-Z0-9\/-]{4,40})/i);
  if (refMatch) result.jobRef = refMatch[1].trim();

  // Vacancies
  const vacMatch = text.match(/(\d+)\s*vacanc(?:y|ies)/i) || text.match(/number\s+of\s+positions?\s*[:\-]?\s*(\d+)/i);
  if (vacMatch) result.vacancies = parseInt(vacMatch[1]);

  return result;
}

const STATUS_STYLES: Record<JobStatus, string> = {
  draft: "bg-caa-muted/15 text-caa-muted",
  pending_review: "bg-amber-100 text-amber-700",
  pending_approval: "bg-purple-100 text-purple-700",
  published: "bg-caa-success/10 text-caa-success",
  declined: "bg-caa-danger/10 text-caa-danger",
};

export function JobsTab({ jobs, applications, isExpired, addJob, updateJob, deleteJob, onViewApps, viewMode = "create" }: any) {
  type EditingJob = Omit<Job, "id" | "abbr"> & { id?: number };
  const [editing, setEditing] = useState<null | EditingJob>(null);
  const [inputMode, setInputMode] = useState<"manual" | "pdf">("manual");
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [decliningId, setDecliningId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const {
    auth, pushToast, departments, loadDepartments, submitJobForReview, reviewJob, approveJob, publishJobDirect,
    criteria, saveCriteria, jobTemplates, loadJobTemplates, saveJobTemplate,
  } = useApp();
  const actor = `${auth.firstName} ${auth.lastName}`;
  const isSuper = auth.adminRole === "super";

  // ── Criteria (merged into this page — no more separate Criteria Setup tab) ──
  const [criteriaDraft, setCriteriaDraft] = useState<Omit<JobCriteria, "jobId">>(blankCriteriaDraft());
  const [kw, setKw] = useState("");
  const [uni, setUni] = useState("");
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"qualifier" | "disqualifier">("qualifier");
  const [qKind, setQKind] = useState<"yesno" | "number">("yesno");
  const [qAnswer, setQAnswer] = useState<"Yes" | "No">("Yes");
  const [qMin, setQMin] = useState("");
  const [qMax, setQMax] = useState("");

  // ── Structured requirement builder ──
  const [reqKind, setReqKind] = useState<RequirementKind>("minAge");
  const [reqNumberValue, setReqNumberValue] = useState("");
  const [reqTextValue, setReqTextValue] = useState("");
  const [reqGradeValue, setReqGradeValue] = useState("");
  const [reqMandatory, setReqMandatory] = useState(true);
  const [reqUsage, setReqUsage] = useState<RequirementUsage>("qualifier");

  // ── Templates ──
  const [templateId, setTemplateId] = useState<number | "">("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => { loadDepartments(); loadJobTemplates(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer the real, admin-managed department list; fall back to the static
  // one while it's loading so the form isn't blocked on first paint.
  const deptOptions = departments.length > 0
    ? departments.map((d) => ({ key: d.code, label: d.name, id: d.id }))
    : DEPARTMENTS.map((d) => ({ ...d, id: undefined as number | undefined }));

  // "Review" and "Approve & Publish" are read-only pipeline views scoped to
  // the jobs actually awaiting that stage — everything else (create/edit/
  // delete) stays on the default "create" view.
  const visibleJobs = viewMode === "review" ? jobs.filter((j: Job) => j.status === "pending_review")
    : viewMode === "approve" ? jobs.filter((j: Job) => j.status === "pending_approval")
    : jobs;

  const open = (j?: Job) => {
    setEditing(j ? { ...j } : { ...emptyJob });
    setCriteriaDraft(criteriaFromExisting(j ? criteria.find((c) => c.jobId === j.id) : undefined));
    setInputMode("manual");
    setPdfFileName(null);
    setSaveError(null);
    setShowReview(false);
    setTemplateId("");
  };

  const save = async (thenSubmitForReview: boolean) => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setSaveError("Job title is required.");
      setInputMode("manual");
      return;
    }
    if (!editing.closesAt) {
      setSaveError("Application deadline is required.");
      setInputMode("manual");
      return;
    }
    setSaveError(null);
    const closes = new Date(editing.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const payload = { ...editing, closes };
    setSaving(true);
    try {
      const saved = editing.id ? await updateJob(editing.id, payload) : await addJob(payload);
      const jobId = editing.id ?? (saved as Job)?.id;
      if (jobId) {
        saveCriteria({ jobId, ...criteriaDraft });
        if (thenSubmitForReview) await submitJobForReview(jobId);
      }
      setEditing(null);
      pushToast({
        type: "success",
        title: thenSubmitForReview ? "Submitted for department review" : (editing.id ? "Listing updated" : "Listing created (draft)"),
        message: editing.title,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const del = async (j: Job) => {
    try {
      await deleteJob(j.id);
      pushToast({ type: "success", title: "Listing deleted", message: j.title });
    } catch (err) {
      pushToast({ type: "warning", title: "Could not delete listing", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const submitForReview = async (j: Job) => {
    try {
      await submitJobForReview(j.id);
      pushToast({ type: "success", title: "Submitted for department review", message: j.title });
    } catch (err) {
      pushToast({ type: "warning", title: "Could not submit for review", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const doReview = async (j: Job, approve: boolean) => {
    try {
      await reviewJob(j.id, approve, approve ? undefined : declineReason);
      pushToast({ type: "success", title: approve ? "Approved — sent for final approval" : "Sent back to draft", message: j.title });
      setDecliningId(null); setDeclineReason("");
    } catch (err) {
      pushToast({ type: "warning", title: "Could not record review", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const doApprove = async (j: Job, approve: boolean) => {
    try {
      await approveJob(j.id, approve, approve ? undefined : declineReason);
      pushToast({ type: "success", title: approve ? "Approved and published" : "Sent back to draft", message: j.title });
      setDecliningId(null); setDeclineReason("");
    } catch (err) {
      pushToast({ type: "warning", title: "Could not record approval", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const doPublishDirect = async (j: Job) => {
    try {
      await publishJobDirect(j.id);
      pushToast({ type: "success", title: "Published directly", message: j.title });
    } catch (err) {
      pushToast({ type: "warning", title: "Could not publish", message: err instanceof Error ? err.message : "Please try again." });
    }
  };

  const handlePdfUpload = async (file: File) => {
    setPdfParsing(true);
    setPdfFileName(file.name);
    setSaveError(null);
    try {
      const text = await extractPdfText(file);
      const parsed = parseJobFromText(text);
      setEditing((prev) => ({ ...(prev ?? emptyJob), ...parsed }));
      pushToast({ type: "success", title: "PDF imported", message: "Fields pre-filled — review and complete any missing details." });
    } catch {
      pushToast({ type: "warning", title: "Could not read PDF", message: "Please fill in the details manually." });
    } finally {
      setPdfParsing(false);
      setInputMode("manual"); // always switch to form after upload attempt
    }
  };

  // ── Templates ──
  const applyTemplate = (t: JobTemplate) => {
    const c = t.content as Record<string, any>;
    setEditing((prev) => ({
      ...(prev ?? emptyJob),
      aboutRole: c.aboutRole ?? prev?.aboutRole ?? "",
      accountabilities: c.accountabilities ?? prev?.accountabilities ?? [],
      specialSkills: c.specialSkills ?? prev?.specialSkills ?? [],
      reportsTo: c.reportsTo ?? prev?.reportsTo ?? "",
      requiredQualification: c.requiredQualification ?? prev?.requiredQualification ?? "Degree",
      minAge: c.minAge ?? prev?.minAge ?? 21,
      requiredExperience: c.requiredExperience ?? prev?.requiredExperience ?? 0,
      description: c.description ?? prev?.description ?? "",
    }));
    setCriteriaDraft((d) => {
      const requirements: JobRequirement[] = c.requirements ?? d.requirements ?? [];
      const manualQuestions = (d.screeningQuestions ?? []).filter((q) => !(d.requirements ?? []).some((r) => r.questionId === q.id));
      return {
        ...d,
        requirements,
        requiredKeywords: c.requiredKeywords ?? d.requiredKeywords,
        disqualifyingUniversities: c.disqualifyingUniversities ?? d.disqualifyingUniversities,
        assessmentTypes: c.assessmentTypes ?? d.assessmentTypes,
        screeningQuestions: [...manualQuestions, ...regenerateQuestionsForRequirements(requirements)],
      };
    });
    pushToast({ type: "success", title: "Template loaded", message: `"${t.name}" — review and edit as needed.` });
  };

  const doSaveAsTemplate = async () => {
    if (!editing || !newTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      await saveJobTemplate({
        name: newTemplateName.trim(),
        departmentId: editing.departmentId ?? null,
        sourceJobId: editing.id ?? null,
        content: {
          aboutRole: editing.aboutRole, accountabilities: editing.accountabilities, specialSkills: editing.specialSkills,
          reportsTo: editing.reportsTo, requiredQualification: editing.requiredQualification, minAge: editing.minAge,
          requiredExperience: editing.requiredExperience, description: editing.description,
          requirements: criteriaDraft.requirements, requiredKeywords: criteriaDraft.requiredKeywords,
          disqualifyingUniversities: criteriaDraft.disqualifyingUniversities, assessmentTypes: criteriaDraft.assessmentTypes,
        },
      });
      pushToast({ type: "success", title: "Template saved", message: newTemplateName.trim() });
      setNewTemplateName("");
    } catch (err) {
      pushToast({ type: "warning", title: "Could not save template", message: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Structured requirement builder ──
  const reqMeta = REQUIREMENT_KIND_META[reqKind];
  const resetReqInputs = () => { setReqNumberValue(""); setReqTextValue(""); setReqGradeValue(""); };
  const addRequirement = () => {
    const effectiveUsage: RequirementUsage = !reqMandatory && reqUsage === "disqualifier" ? "qualifier" : reqUsage;
    const numberValue = reqMeta.valueType === "number" ? (reqNumberValue !== "" ? Number(reqNumberValue) : undefined) : undefined;
    if (reqMeta.valueType === "number" && numberValue === undefined) return;
    if ((reqMeta.valueType === "text" || reqMeta.valueType === "subjectGrade") && !reqTextValue.trim()) return;
    if (reqMeta.valueType === "grade" && !reqGradeValue) return;
    if (reqMeta.valueType === "subjectGrade" && !reqGradeValue) return;

    const id = `req-${Date.now()}`;
    const label = buildRequirementLabel(reqKind, { numberValue, textValue: reqTextValue.trim(), gradeValue: reqGradeValue });
    const req: JobRequirement = { id, kind: reqKind, label, numberValue, textValue: reqTextValue.trim() || undefined, gradeValue: reqGradeValue || undefined, usage: effectiveUsage, mandatory: reqMandatory };
    const question = buildRequirementQuestion(req);
    if (question) req.questionId = question.id;

    setCriteriaDraft((d) => ({
      ...d,
      requirements: [...(d.requirements ?? []), req],
      screeningQuestions: question ? [...(d.screeningQuestions ?? []), question] : (d.screeningQuestions ?? []),
    }));
    resetReqInputs();
  };
  const removeRequirement = (id: string) => {
    setCriteriaDraft((d) => {
      const req = (d.requirements ?? []).find((r) => r.id === id);
      return {
        ...d,
        requirements: (d.requirements ?? []).filter((r) => r.id !== id),
        screeningQuestions: req?.questionId ? (d.screeningQuestions ?? []).filter((q) => q.id !== req.questionId) : (d.screeningQuestions ?? []),
      };
    });
  };

  // ── Manual criteria fallback (merged from the old Criteria Setup tab) ──
  const addKw = () => { if (kw.trim()) { setCriteriaDraft((d) => ({ ...d, requiredKeywords: [...d.requiredKeywords, kw.trim()] })); setKw(""); } };
  const removeKw = (k: string) => setCriteriaDraft((d) => ({ ...d, requiredKeywords: d.requiredKeywords.filter((x) => x !== k) }));
  const addUni = () => { if (uni.trim()) { setCriteriaDraft((d) => ({ ...d, disqualifyingUniversities: [...(d.disqualifyingUniversities ?? []), uni.trim()] })); setUni(""); } };
  const removeUni = (u: string) => setCriteriaDraft((d) => ({ ...d, disqualifyingUniversities: (d.disqualifyingUniversities ?? []).filter((x) => x !== u) }));
  const toggleAssessmentType = (t: AssessmentType) =>
    setCriteriaDraft((d) => ({
      ...d,
      assessmentTypes: (d.assessmentTypes ?? []).includes(t) ? (d.assessmentTypes ?? []).filter((x) => x !== t) : [...(d.assessmentTypes ?? []), t],
    }));
  const addQuestion = () => {
    if (!qText.trim()) return;
    if (qKind === "number" && qMin === "" && qMax === "") return;
    const q: ScreeningQuestion = {
      id: `custom-${Date.now()}`, text: qText.trim(), type: qType, kind: qKind,
      ...(qKind === "yesno" ? { qualifyingAnswer: qAnswer } : {}),
      ...(qKind === "number" ? { min: qMin !== "" ? Number(qMin) : undefined, max: qMax !== "" ? Number(qMax) : undefined } : {}),
    };
    setCriteriaDraft((d) => ({ ...d, screeningQuestions: [...(d.screeningQuestions ?? []), q] }));
    setQText(""); setQMin(""); setQMax("");
  };
  const removeQuestion = (id: string) => setCriteriaDraft((d) => ({ ...d, screeningQuestions: (d.screeningQuestions ?? []).filter((q) => q.id !== id) }));

  const describeQuestion = (q: ScreeningQuestion) => {
    if (q.kind === "number") {
      const range = q.min !== undefined && q.max !== undefined ? `${q.min}–${q.max}`
        : q.min !== undefined ? `≥ ${q.min}` : q.max !== undefined ? `≤ ${q.max}` : "any";
      return `Numeric answer must be ${range} to stay eligible.`;
    }
    return `Candidate must answer "${q.qualifyingAnswer ?? "Yes"}" to stay eligible.`;
  };

  const essentialReqs = (criteriaDraft.requirements ?? []).filter((r) => r.mandatory);
  const desirableReqs = (criteriaDraft.requirements ?? []).filter((r) => !r.mandatory);
  const manualQuestions = (criteriaDraft.screeningQuestions ?? []).filter((q) => !(criteriaDraft.requirements ?? []).some((r) => r.questionId === q.id));

  const heading = viewMode === "review" ? "Review Job Listings" : viewMode === "approve" ? "Approve & Publish" : "Job Listings";
  const emptyHint = viewMode === "review" ? "No job listings are currently awaiting your department review."
    : viewMode === "approve" ? "No job listings are currently awaiting final approval."
    : "No job listings yet.";

  if (editing) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl text-caa-body">{editing.id ? "Edit listing" : "New job listing"}</h1>
          <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-caa-border rounded-md">Back to list</button>
        </div>

        {/* Template picker */}
        {!editing.id && (
          <div className="caa-card p-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-caa-body shrink-0">Start from a template:</span>
            <select className={`${fi} flex-1 min-w-[160px]`} value={templateId} onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— Blank —</option>
              {jobTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button
              disabled={templateId === ""}
              onClick={() => { const t = jobTemplates.find((x) => x.id === templateId); if (t) applyTemplate(t); }}
              className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md disabled:opacity-50"
            >
              Load template
            </button>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-caa-surface rounded-lg border border-caa-border w-fit">
          <button
            onClick={() => setInputMode("manual")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 ${inputMode === "manual" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-body"}`}
          >
            <Pencil className="h-3.5 w-3.5" /> Fill in details
          </button>
          <button
            onClick={() => setInputMode("pdf")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 ${inputMode === "pdf" ? "bg-caa-navy text-white" : "text-caa-muted hover:text-caa-body"}`}
          >
            <Upload className="h-3.5 w-3.5" /> Import from PDF
          </button>
        </div>

        {inputMode === "pdf" ? (
          /* ── PDF upload panel ── */
          <div className="caa-card p-4 space-y-3">
            <p className="text-xs text-caa-muted">Upload an existing job advert PDF. We'll extract the details and pre-fill the form below for you to review.</p>
            <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${pdfParsing ? "border-caa-navy/40 bg-caa-navy/5" : "border-caa-border hover:border-caa-navy/50 hover:bg-caa-navy/3"}`}>
              {pdfParsing ? (
                <>
                  <RefreshCw className="h-8 w-8 text-caa-navy animate-spin" />
                  <p className="text-sm font-medium text-caa-navy">Reading PDF…</p>
                </>
              ) : (
                <>
                  <FileSearch className="h-10 w-10 text-caa-muted" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-caa-body">Click to upload a job advert PDF</p>
                    <p className="text-[11px] text-caa-muted mt-0.5">{pdfFileName ?? "PDF files only · max 10 MB"}</p>
                  </div>
                </>
              )}
              <input
                type="file"
                accept=".pdf"
                className="sr-only"
                disabled={pdfParsing}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }}
              />
            </label>
            {pdfFileName && !pdfParsing && (
              <p className="text-[11px] text-caa-success flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Parsed <strong>{pdfFileName}</strong> — switch to "Fill in details" to review the extracted fields.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Basic fields */}
            <Section title="Basic details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Title"><input className={fi} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Senior Air Traffic Controller" /></Field>
                <Field label="Job reference no."><input className={fi} value={editing.jobRef ?? ""} onChange={(e) => setEditing({ ...editing, jobRef: e.target.value })} placeholder="e.g. UCAA/ADV/EXT/01/2026" /></Field>
                <Field label="Department"><select className={fi} value={editing.deptKey} onChange={(e) => { const d = deptOptions.find((x) => x.key === e.target.value)!; setEditing({ ...editing, deptKey: d.key, dept: d.label, departmentId: d.id ?? editing.departmentId }); }}>{deptOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Field>
                <Field label="Location"><select className={fi} value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></Field>
                <Field label="Reports to"><input className={fi} value={editing.reportsTo ?? ""} onChange={(e) => setEditing({ ...editing, reportsTo: e.target.value })} placeholder="e.g. Director, Air Traffic Management" /></Field>
                <Field label="Number of vacancies"><input type="number" min={1} className={fi} value={editing.vacancies ?? 1} onChange={(e) => setEditing({ ...editing, vacancies: parseInt(e.target.value) || 1 })} /></Field>
                <Field label="Employment Category"><select className={fi} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as any })}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Sourcing Type"><select className={fi} value={editing.visibility} onChange={(e) => setEditing({ ...editing, visibility: e.target.value as Visibility })}><option value="external">External — open to public</option><option value="internal">Internal — CAA staff only</option></select></Field>
                <Field label="Salary range (admins only — not shown to candidates)"><input className={fi} value={editing.salary} onChange={(e) => setEditing({ ...editing, salary: e.target.value })} placeholder="e.g. UGX 3.2M–5.8M" /></Field>
                <Field label="Salary Scale"><select className={fi} value={editing.salaryBand} onChange={(e) => setEditing({ ...editing, salaryBand: e.target.value })}>{SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
                <Field label="Deadline"><input type="date" className={fi} value={editing.closesAt} onChange={(e) => setEditing({ ...editing, closesAt: e.target.value })} /></Field>
                <Field label="Min age"><input type="number" className={fi} value={editing.minAge} onChange={(e) => setEditing({ ...editing, minAge: parseInt(e.target.value) || 18 })} /></Field>
                <Field label="Experience (yrs)"><input type="number" className={fi} value={editing.requiredExperience} onChange={(e) => setEditing({ ...editing, requiredExperience: parseInt(e.target.value) || 0 })} /></Field>
                <Field label="Qualification"><select className={fi} value={editing.requiredQualification} onChange={(e) => setEditing({ ...editing, requiredQualification: e.target.value as QualLevel })}>{QUAL_LEVELS.map((q) => <option key={q}>{q}</option>)}</select></Field>
              </div>
              <Field label="Job Purpose (shown to candidates)">
                <textarea rows={3} className={fi} value={editing.aboutRole ?? ""} onChange={(e) => setEditing({ ...editing, aboutRole: e.target.value })} placeholder="A brief summary of why this role exists and what it's responsible for…" />
              </Field>
              <Field label="Internal description / notes (admin only)">
                <textarea rows={3} className={fi} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Optional internal notes about the role…" />
              </Field>
            </Section>

            {/* Accountabilities */}
            <Section title="Key accountabilities (shown to candidates)">
              <AccountabilitiesEditor
                value={editing.accountabilities ?? []}
                onChange={(accountabilities) => setEditing({ ...editing, accountabilities })}
              />
            </Section>

            {/* Special skills */}
            <Section title="Special skills (shown to candidates)">
              <TagEditor
                values={editing.specialSkills ?? []}
                onChange={(specialSkills) => setEditing({ ...editing, specialSkills })}
                placeholder="Add a special skill…"
              />
            </Section>

            {/* Structured requirement builder */}
            <Section title="Requirements">
              <p className="text-[11px] text-caa-muted -mt-1 mb-1">
                Build essential and desirable requirements. Essential items can become a candidate-facing <span className="font-semibold text-caa-navy">qualifier</span> or <span className="font-semibold text-caa-danger">disqualifier</span> question, or stay silent (criteria-only, for internal screening only).
              </p>
              <div className="rounded-lg border border-caa-border p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <select className={`${fi} w-56`} value={reqKind} onChange={(e) => { setReqKind(e.target.value as RequirementKind); resetReqInputs(); }}>
                    {Object.entries(REQUIREMENT_KIND_META).map(([k, meta]) => <option key={k} value={k}>{meta.label}</option>)}
                  </select>
                  <RequirementValueInput
                    kind={reqKind}
                    numberValue={reqNumberValue} setNumberValue={setReqNumberValue}
                    textValue={reqTextValue} setTextValue={setReqTextValue}
                    gradeValue={reqGradeValue} setGradeValue={setReqGradeValue}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-caa-body">
                    <input type="checkbox" checked={reqMandatory} onChange={(e) => setReqMandatory(e.target.checked)} /> Essential (uncheck for desirable/bonus)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-caa-body">
                    Usage:
                    <select className={`${fi} w-40`} value={reqUsage} onChange={(e) => setReqUsage(e.target.value as RequirementUsage)}>
                      <option value="qualifier">Qualifier question ✓</option>
                      {reqMandatory && <option value="disqualifier">Disqualifier question ✗</option>}
                      <option value="criteriaOnly">Criteria-only (silent)</option>
                    </select>
                  </label>
                  <button onClick={addRequirement} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md shrink-0 ml-auto">Add requirement</button>
                </div>
                {(reqMeta.valueType !== "none") && (
                  <p className="text-[11px] text-caa-muted italic">
                    Preview: "{buildRequirementLabel(reqKind, { numberValue: reqNumberValue !== "" ? Number(reqNumberValue) : undefined, textValue: reqTextValue, gradeValue: reqGradeValue })}"
                  </p>
                )}
              </div>

              {essentialReqs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-caa-navy mb-1.5">Essential requirements</p>
                  <div className="space-y-1.5">
                    {essentialReqs.map((r) => <RequirementRow key={r.id} r={r} onRemove={() => removeRequirement(r.id)} />)}
                  </div>
                </div>
              )}
              {desirableReqs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-caa-muted mb-1.5">Desirable (bonus, non-mandatory)</p>
                  <div className="space-y-1.5">
                    {desirableReqs.map((r) => <RequirementRow key={r.id} r={r} onRemove={() => removeRequirement(r.id)} />)}
                  </div>
                </div>
              )}
              {essentialReqs.length === 0 && desirableReqs.length === 0 && (
                <p className="text-[11px] text-caa-muted">No structured requirements added yet.</p>
              )}
            </Section>

            {/* Manual criteria fallback — anything the structured builder above doesn't cover */}
            <Section title="Additional screening criteria (fallback / manual)">
              <Field label="Minimum CGPA (internship / graduate roles — leave blank if N/A)">
                <input type="number" min={0} max={5} step={0.1} className={fi} value={criteriaDraft.minCgpa ?? ""} onChange={(e) => setCriteriaDraft((d) => ({ ...d, minCgpa: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="e.g. 3.5" />
              </Field>
              <Field label="Minimum experience override (years — leave blank to use the job's own value above)">
                <input type="number" min={0} max={30} className={fi} value={criteriaDraft.minExperienceYears ?? ""} onChange={(e) => setCriteriaDraft((d) => ({ ...d, minExperienceYears: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="e.g. 3" />
              </Field>
              <Field label="Required qualification override (leave blank to use the job's own value above)">
                <select className={fi} value={criteriaDraft.requiredQualLevel ?? ""} onChange={(e) => setCriteriaDraft((d) => ({ ...d, requiredQualLevel: (e.target.value as QualLevel) || undefined }))}>
                  <option value="">— Use job's requirement —</option>
                  {QUAL_LEVELS.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </Field>
              <div>
                <label className="block text-xs font-medium text-caa-body mb-1">Assessment type</label>
                <div className="flex flex-wrap gap-3">
                  {ASSESSMENT_TYPES.map((t) => (
                    <label key={t} className="inline-flex items-center gap-1.5 text-xs text-caa-body cursor-pointer">
                      <input type="checkbox" checked={(criteriaDraft.assessmentTypes ?? []).includes(t)} onChange={() => toggleAssessmentType(t)} />
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
                  {criteriaDraft.requiredKeywords.map((k) => (
                    <span key={k} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy">
                      {k} <button onClick={() => removeKw(k)} className="text-caa-navy/60 hover:text-caa-danger">×</button>
                    </span>
                  ))}
                  {criteriaDraft.requiredKeywords.length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-caa-body mb-1">Disqualifying universities (applicants from these institutions are auto-excluded)</label>
                <div className="flex gap-2 mb-2">
                  <input className={`${fi} flex-1`} value={uni} onChange={(e) => setUni(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUni())} placeholder="Institution name…" />
                  <button onClick={addUni} className="px-3 py-1.5 bg-caa-danger text-white text-xs rounded-md">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(criteriaDraft.disqualifyingUniversities ?? []).map((u) => (
                    <span key={u} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-danger/10 text-caa-danger">
                      {u} <button onClick={() => removeUni(u)} className="text-caa-danger/60 hover:text-caa-danger">×</button>
                    </span>
                  ))}
                  {(criteriaDraft.disqualifyingUniversities ?? []).length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
                </div>
              </div>

              {/* Custom qualifier/disqualifier questions */}
              <div>
                <label className="block text-xs font-medium text-caa-body mb-1">Custom qualifier / disqualifier questions</label>
                <div className="space-y-2 mb-3 rounded-lg border border-caa-border p-3">
                  <input className={fi} value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Question text, e.g. Do you have a valid driving permit?" />
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
                <div className="space-y-1.5">
                  {manualQuestions.map((q) => (
                    <div key={q.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border ${q.type === "qualifier" ? "bg-caa-success/5 border-caa-success/20" : "bg-caa-danger/5 border-caa-danger/20"}`}>
                      {q.type === "qualifier" ? <CheckCircle2 className="h-3.5 w-3.5 text-caa-success shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-caa-danger shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-caa-body">{q.text}</p>
                        <p className="text-[10px] text-caa-muted">{describeQuestion(q)}</p>
                      </div>
                      <button onClick={() => removeQuestion(q.id)} className="text-caa-danger shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {manualQuestions.length === 0 && <p className="text-[11px] text-caa-muted">No custom questions added.</p>}
                </div>
              </div>

              <Field label="Notes for recruiters">
                <textarea rows={2} className={fi} value={criteriaDraft.notes ?? ""} onChange={(e) => setCriteriaDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Optional guidance for the recruiter reviewing the shortlist…" />
              </Field>
            </Section>

            {/* Save as template */}
            <div className="caa-card p-3 flex flex-wrap items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-caa-muted shrink-0" />
              <input className={`${fi} flex-1 min-w-[160px]`} value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Save this draft as a template named…" />
              <button onClick={doSaveAsTemplate} disabled={!newTemplateName.trim() || savingTemplate} className="px-3 py-1.5 text-xs font-semibold border border-caa-border rounded-md disabled:opacity-50">
                {savingTemplate ? "Saving…" : "Save as template"}
              </button>
            </div>

            {/* Review step */}
            <div className="caa-card p-4">
              <button onClick={() => setShowReview((s) => !s)} className="flex items-center gap-1.5 text-sm font-semibold text-caa-navy">
                <Eye className="h-4 w-4" /> {showReview ? "Hide" : "Show"} review — exactly what a candidate will see
              </button>
              {showReview && (
                <div className="mt-3 border-t border-caa-border pt-3">
                  {(!editing.closesAt || !editing.title) ? (
                    <p className="text-xs text-caa-muted">Fill in at least a title and deadline to preview the advert.</p>
                  ) : (
                    <JobDocument
                      job={{ ...editing, id: editing.id ?? 0, abbr: "", closes: new Date(editing.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } as Job}
                      requirements={criteriaDraft.requirements ?? []}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {saveError && (
          <p className="text-xs text-caa-danger flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {saveError}
          </p>
        )}

        <div className="flex flex-wrap justify-between items-center gap-2 pb-6">
          <div>
            {editing.title && editing.closesAt && (
              <button
                type="button"
                onClick={() => {
                  const closes = new Date(editing.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  downloadJobAdvert({ ...editing, id: editing.id ?? 0, abbr: "", closes } as Job, actor, criteriaDraft.requirements ?? []);
                }}
                className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"
              >
                <FileDown className="h-3.5 w-3.5" /> Preview as PDF
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-caa-border rounded-md">Cancel</button>
            <button onClick={() => save(false)} disabled={pdfParsing || saving} className="px-3 py-1.5 text-sm border border-caa-navy text-caa-navy rounded-md disabled:opacity-50">
              {saving ? "Saving…" : "Save as draft"}
            </button>
            <button onClick={() => save(true)} disabled={pdfParsing || saving} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md disabled:opacity-50 inline-flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save & submit for review"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-caa-body">{heading}</h1>
        {viewMode === "create" && (
          <button onClick={() => open()} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1">
            <Plus className="h-4 w-4" /> New listing
          </button>
        )}
      </div>
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Sourcing Type</th>
              <th className="text-left p-3">Scale</th>
              <th className="text-left p-3">Closes</th>
              <th className="text-left p-3">Status</th>
              {viewMode === "create" && <th className="text-left p-3">Applicants</th>}
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {visibleJobs.map((j: Job) => {
              const status: JobStatus = j.status ?? "published";
              return (
              <tr key={j.id}>
                <td className="p-3">
                  <p className="font-medium text-caa-body">{j.title}</p>
                  <p className="text-[11px] text-caa-muted">{j.dept}</p>
                  {status === "declined" && j.declineReason && (
                    <p className="text-[11px] text-caa-danger mt-0.5">Declined: {j.declineReason}</p>
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${j.visibility === "internal" ? "bg-caa-navy-2/15 text-caa-navy-2" : "bg-caa-success/10 text-caa-success"}`}>
                    {j.visibility}
                  </span>
                </td>
                <td className="p-3 text-xs">{j.salaryBand}</td>
                <td className="p-3 text-xs">{j.closes}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[status]}`}>{JOB_STATUS_LABELS[status]}</span>
                  {status === "published" && isExpired(j) && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-caa-danger/10 text-caa-danger text-[10px]">Expired</span>
                  )}
                </td>
                {viewMode === "create" && (
                  <td className="p-3">
                    <button onClick={() => onViewApps(j.id)} className="text-xs font-semibold text-caa-navy hover:underline">
                      {(applications ?? []).filter((a: Application) => a.jobId === j.id).length}
                    </button>
                  </td>
                )}
                <td className="p-3 text-right">
                  <div className="flex justify-end items-center gap-2 flex-wrap">
                    {viewMode === "create" && (
                      <>
                        <button onClick={() => onViewApps(j.id)} className="text-xs text-caa-navy hover:underline">Apps</button>
                        <button onClick={() => open(j)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</button>
                        <button onClick={() => downloadJobAdvert(j, actor, criteria.find((c) => c.jobId === j.id)?.requirements ?? [])} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><FileDown className="h-3 w-3" />PDF</button>
                        <button onClick={() => del(j)} className="text-xs text-caa-danger hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Del</button>
                        {(status === "draft" || status === "declined") && (
                          <button onClick={() => submitForReview(j)} className="text-xs text-white bg-caa-navy px-2 py-1 rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1"><Send className="h-3 w-3" />Submit for Review</button>
                        )}
                      </>
                    )}
                    {(viewMode === "review" || viewMode === "approve") && (
                      <button onClick={() => setPreviewId(previewId === j.id ? null : j.id)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><Eye className="h-3 w-3" />{previewId === j.id ? "Hide preview" : "Preview as candidate"}</button>
                    )}
                    {viewMode === "review" && (
                      <>
                        <button onClick={() => doReview(j, true)} className="text-xs text-white bg-caa-success px-2 py-1 rounded-md hover:opacity-90 inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />Approve</button>
                        <button onClick={() => setDecliningId(decliningId === j.id ? null : j.id)} className="text-xs text-white bg-caa-danger px-2 py-1 rounded-md hover:opacity-90 inline-flex items-center gap-1"><ThumbsDown className="h-3 w-3" />Decline</button>
                      </>
                    )}
                    {viewMode === "approve" && (
                      <>
                        <button onClick={() => doApprove(j, true)} className="text-xs text-white bg-caa-success px-2 py-1 rounded-md hover:opacity-90 inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />Approve &amp; Publish</button>
                        <button onClick={() => setDecliningId(decliningId === j.id ? null : j.id)} className="text-xs text-white bg-caa-danger px-2 py-1 rounded-md hover:opacity-90 inline-flex items-center gap-1"><ThumbsDown className="h-3 w-3" />Decline</button>
                      </>
                    )}
                    {isSuper && status !== "published" && viewMode === "create" && (
                      <button onClick={() => doPublishDirect(j)} className="text-xs text-white bg-purple-600 px-2 py-1 rounded-md hover:opacity-90 inline-flex items-center gap-1"><Zap className="h-3 w-3" />Publish now</button>
                    )}
                  </div>
                  {decliningId === j.id && (
                    <div className="mt-2 flex items-center gap-2 justify-end">
                      <input
                        autoFocus
                        className="text-xs px-2 py-1 border border-caa-border rounded-md w-56"
                        placeholder="Reason for declining…"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                      />
                      <button
                        onClick={() => (viewMode === "review" ? doReview(j, false) : doApprove(j, false))}
                        disabled={!declineReason.trim()}
                        className="text-xs px-2 py-1 bg-caa-danger text-white rounded-md disabled:opacity-50"
                      >
                        Confirm decline
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
            {previewId != null && visibleJobs.some((j: Job) => j.id === previewId) && (
              <tr>
                <td colSpan={viewMode === "create" ? 7 : 6} className="p-4 bg-caa-surface">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-caa-muted mb-2">Exactly what a candidate will see</p>
                  <div className="max-w-3xl mx-auto">
                    <JobDocument
                      job={visibleJobs.find((j: Job) => j.id === previewId)!}
                      requirements={criteria.find((c) => c.jobId === previewId)?.requirements ?? []}
                    />
                  </div>
                </td>
              </tr>
            )}
            {visibleJobs.length === 0 && (
              <tr><td colSpan={viewMode === "create" ? 7 : 6} className="p-6 text-center text-xs text-caa-muted">{emptyHint}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Small building blocks for the job-creation page ───────────────────────────

function RequirementRow({ r, onRemove }: { r: JobRequirement; onRemove: () => void }) {
  const badge = r.usage === "disqualifier" ? { icon: <XCircle className="h-3.5 w-3.5 text-caa-danger shrink-0" />, cls: "bg-caa-danger/5 border-caa-danger/20", text: "Disqualifier" }
    : r.usage === "qualifier" ? { icon: <CheckCircle2 className="h-3.5 w-3.5 text-caa-success shrink-0" />, cls: "bg-caa-success/5 border-caa-success/20", text: "Qualifier" }
    : { icon: <CheckCircle2 className="h-3.5 w-3.5 text-caa-muted shrink-0" />, cls: "bg-caa-surface border-caa-border", text: "Criteria-only" };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${badge.cls}`}>
      {badge.icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-caa-body">{r.label}</p>
        <p className="text-[10px] text-caa-muted">{badge.text} · {REQUIREMENT_KIND_META[r.kind]?.label ?? r.kind}</p>
      </div>
      <button onClick={onRemove} className="text-caa-danger shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function RequirementValueInput({ kind, numberValue, setNumberValue, textValue, setTextValue, gradeValue, setGradeValue }: {
  kind: RequirementKind;
  numberValue: string; setNumberValue: (v: string) => void;
  textValue: string; setTextValue: (v: string) => void;
  gradeValue: string; setGradeValue: (v: string) => void;
}) {
  const meta = REQUIREMENT_KIND_META[kind];
  if (meta.valueType === "number") {
    return <input type="number" className={`${fi} w-32`} value={numberValue} onChange={(e) => setNumberValue(e.target.value)} placeholder={meta.unit ?? "value"} />;
  }
  if (kind === "sex") {
    return (
      <select className={`${fi} w-32`} value={textValue} onChange={(e) => setTextValue(e.target.value)}>
        <option value="">— Select —</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
    );
  }
  if (kind === "qualificationLevel") {
    return (
      <select className={`${fi} w-40`} value={gradeValue} onChange={(e) => setGradeValue(e.target.value)}>
        <option value="">— Select level —</option>
        {QUAL_LEVELS.map((q) => <option key={q} value={q}>{q}</option>)}
      </select>
    );
  }
  if (kind === "oLevelSubject" || kind === "aLevelSubject") {
    const subjects = kind === "oLevelSubject" ? O_LEVEL_SUBJECTS : A_LEVEL_SUBJECTS;
    const grades = kind === "oLevelSubject" ? O_LEVEL_GRADES : A_LEVEL_GRADES;
    return (
      <>
        <select className={`${fi} w-48`} value={textValue} onChange={(e) => setTextValue(e.target.value)}>
          <option value="">— Select subject —</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={`${fi} w-24`} value={gradeValue} onChange={(e) => setGradeValue(e.target.value)}>
          <option value="">Grade</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </>
    );
  }
  // specificDegree / custom — free text
  return <input className={`${fi} flex-1 min-w-[160px]`} value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={kind === "specificDegree" ? "e.g. Aeronautical Engineering" : "Describe the requirement…"} />;
}

function AccountabilitiesEditor({ value, onChange }: { value: { area: string; activities: string[] }[]; onChange: (v: { area: string; activities: string[] }[]) => void }) {
  const [area, setArea] = useState("");
  const [activity, setActivity] = useState("");
  const [targetIdx, setTargetIdx] = useState(0);

  const addArea = () => {
    if (!area.trim()) return;
    onChange([...value, { area: area.trim(), activities: [] }]);
    setArea("");
    setTargetIdx(value.length);
  };
  const removeArea = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const addActivity = () => {
    if (!activity.trim() || !value[targetIdx]) return;
    const next = value.map((a, idx) => idx === targetIdx ? { ...a, activities: [...a.activities, activity.trim()] } : a);
    onChange(next);
    setActivity("");
  };
  const removeActivity = (areaIdx: number, actIdx: number) => {
    onChange(value.map((a, idx) => idx === areaIdx ? { ...a, activities: a.activities.filter((_, ai) => ai !== actIdx) } : a));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className={`${fi} flex-1`} value={area} onChange={(e) => setArea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea())} placeholder="Add accountability area, e.g. Technical Delivery…" />
        <button onClick={addArea} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md shrink-0">Add area</button>
      </div>
      {value.length === 0 && <p className="text-[11px] text-caa-muted">No accountability areas added.</p>}
      {value.map((a, i) => (
        <div key={i} className="rounded-lg border border-caa-border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-caa-body">{a.area}</p>
            <button onClick={() => removeArea(i)} className="text-caa-danger"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <ul className="space-y-1 mb-2">
            {a.activities.map((act, ai) => (
              <li key={ai} className="flex items-center gap-2 text-xs text-caa-body">
                <span className="flex-1">• {act}</span>
                <button onClick={() => removeActivity(i, ai)} className="text-caa-danger/60 hover:text-caa-danger">×</button>
              </li>
            ))}
            {a.activities.length === 0 && <p className="text-[11px] text-caa-muted">No activities yet.</p>}
          </ul>
          {targetIdx === i && (
            <div className="flex gap-2">
              <input className={`${fi} flex-1`} value={activity} onChange={(e) => setActivity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addActivity())} placeholder="Add an activity under this area…" />
              <button onClick={addActivity} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md shrink-0">Add</button>
            </div>
          )}
          {targetIdx !== i && (
            <button onClick={() => setTargetIdx(i)} className="text-[11px] text-caa-navy hover:underline">+ Add activity here</button>
          )}
        </div>
      ))}
    </div>
  );
}

function TagEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = () => { if (text.trim()) { onChange([...values, text.trim()]); setText(""); } };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className={`${fi} flex-1`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder={placeholder} />
        <button onClick={add} className="px-3 py-1.5 bg-caa-navy text-white text-xs rounded-md">Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-caa-navy/10 text-caa-navy">
            {v} <button onClick={() => remove(v)} className="text-caa-navy/60 hover:text-caa-danger">×</button>
          </span>
        ))}
        {values.length === 0 && <span className="text-[11px] text-caa-muted">None added</span>}
      </div>
    </div>
  );
}
