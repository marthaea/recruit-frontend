import { useState } from "react";
import {
  Plus, Trash2, Pencil, AlertCircle, FileDown, RefreshCw, CheckCircle2, Upload, FileSearch,
} from "lucide-react";
import {
  useApp, type Job, type Visibility, type QualLevel, type Application,
} from "@/context/AppContext";
import { SALARY_BANDS, EMPLOYMENT_TYPES, DEPARTMENTS, QUAL_LEVELS } from "@/lib/uganda-curriculum";
import {
  downloadJobAdvert,
} from "@/lib/admin-pdf";
import { extractPdfText } from "@/lib/pdf-extract";
import { Field, fi } from "./shared";

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const emptyJob: Omit<Job, "id" | "abbr"> = {
  title: "", dept: DEPARTMENTS[0].label, deptKey: DEPARTMENTS[0].key, location: "Kampala HQ",
  salary: "UGX 2.0M–3.0M", salaryBand: "UG5", type: "Full-time", closes: "", closesAt: "",
  visibility: "external", minAge: 21, requiredExperience: 2, requiredQualification: "Degree", description: "",
};


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

  // Location
  const knownLocations = ["Entebbe", "Kampala", "Gulu", "Jinja", "Mbarara", "Fort Portal", "Arua"];
  for (const loc of knownLocations) {
    if (text.includes(loc)) { result.location = loc; break; }
  }

  // Employment type
  if (/\bcontract\b/i.test(text)) result.type = "Contract";
  else if (/full[\s-]?time/i.test(text)) result.type = "Full-time";

  // Visibility
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

  // Required qualification
  for (const q of ["PhD", "Masters", "Degree", "Diploma", "Certificate", "A-Level", "O-Level"] as const) {
    if (new RegExp(`\\b${q}\\b`, "i").test(text)) { result.requiredQualification = q; break; }
  }

  // Description — everything after "about the role" or "job summary" heading
  const descMatch = text.match(/(?:about\s+the\s+role|job\s+summary|overview|background)[:\s]*\n?([\s\S]{40,800})/i);
  if (descMatch) result.description = descMatch[1].replace(/\s+/g, " ").trim();

  return result;
}

export function JobsTab({ jobs, isExpired, addJob, updateJob, deleteJob, onViewApps }: any) {
  type EditingJob = Omit<Job, "id" | "abbr"> & { id?: number };
  const [editing, setEditing] = useState<null | EditingJob>(null);
  const [inputMode, setInputMode] = useState<"manual" | "pdf">("manual");
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { auth, pushToast } = useApp();
  const actor = `${auth.firstName} ${auth.lastName}`;

  const open = (j?: Job) => {
    setEditing(j ? { ...j } : { ...emptyJob });
    setInputMode("manual");
    setPdfFileName(null);
    setSaveError(null);
  };

  const save = () => {
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
    if (editing.id) updateJob(editing.id, payload); else addJob(payload);
    setEditing(null);
    pushToast({ type: "success", title: editing.id ? "Listing updated" : "Listing created", message: editing.title });
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-caa-body">Job Listings</h1>
        <button onClick={() => open()} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md hover:bg-caa-navy-2 inline-flex items-center gap-1">
          <Plus className="h-4 w-4" /> New listing
        </button>
      </div>
      <div className="caa-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-caa-surface text-xs text-caa-muted">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Visibility</th>
              <th className="text-left p-3">Band</th>
              <th className="text-left p-3">Closes</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-caa-border">
            {jobs.map((j: Job) => (
              <tr key={j.id}>
                <td className="p-3">
                  <p className="font-medium text-caa-body">{j.title}</p>
                  <p className="text-[11px] text-caa-muted">{j.dept}</p>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${j.visibility === "internal" ? "bg-caa-navy-2/15 text-caa-navy-2" : "bg-caa-success/10 text-caa-success"}`}>
                    {j.visibility}
                  </span>
                </td>
                <td className="p-3 text-xs">{j.salaryBand}</td>
                <td className="p-3 text-xs">{j.closes}</td>
                <td className="p-3">
                  {isExpired(j)
                    ? <span className="px-2 py-0.5 rounded-full bg-caa-danger/10 text-caa-danger text-[10px]">Expired</span>
                    : <span className="px-2 py-0.5 rounded-full bg-caa-success/10 text-caa-success text-[10px]">Active</span>}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => onViewApps(j.id)} className="text-xs text-caa-navy hover:underline">Apps</button>
                  <button onClick={() => open(j)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</button>
                  <button onClick={() => downloadJobAdvert(j, actor)} className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"><FileDown className="h-3 w-3" />PDF</button>
                  <button onClick={() => deleteJob(j.id)} className="text-xs text-caa-danger hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="caa-card p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">{editing.id ? "Edit listing" : "New job listing"}</h3>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-caa-surface rounded-lg border border-caa-border w-fit">
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
              <div className="space-y-3">
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
              /* ── Manual form ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Title"><input className={fi} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Senior Air Traffic Controller" /></Field>
                <Field label="Department"><select className={fi} value={editing.deptKey} onChange={(e) => { const d = DEPARTMENTS.find((x) => x.key === e.target.value)!; setEditing({ ...editing, deptKey: d.key, dept: d.label }); }}>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Field>
                <Field label="Location"><input className={fi} value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></Field>
                <Field label="Type"><select className={fi} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as any })}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Salary range"><input className={fi} value={editing.salary} onChange={(e) => setEditing({ ...editing, salary: e.target.value })} placeholder="e.g. UGX 3.2M–5.8M" /></Field>
                <Field label="Band"><select className={fi} value={editing.salaryBand} onChange={(e) => setEditing({ ...editing, salaryBand: e.target.value })}>{SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
                <Field label="Visibility"><select className={fi} value={editing.visibility} onChange={(e) => setEditing({ ...editing, visibility: e.target.value as Visibility })}><option value="external">External — open to public</option><option value="internal">Internal — CAA staff only</option></select></Field>
                <Field label="Deadline"><input type="date" className={fi} value={editing.closesAt} onChange={(e) => setEditing({ ...editing, closesAt: e.target.value })} /></Field>
                <Field label="Min age"><input type="number" className={fi} value={editing.minAge} onChange={(e) => setEditing({ ...editing, minAge: parseInt(e.target.value) || 18 })} /></Field>
                <Field label="Experience (yrs)"><input type="number" className={fi} value={editing.requiredExperience} onChange={(e) => setEditing({ ...editing, requiredExperience: parseInt(e.target.value) || 0 })} /></Field>
                <Field label="Qualification"><select className={fi} value={editing.requiredQualification} onChange={(e) => setEditing({ ...editing, requiredQualification: e.target.value as QualLevel })}>{QUAL_LEVELS.map((q) => <option key={q}>{q}</option>)}</select></Field>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea rows={4} className={fi} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Describe the role, responsibilities and what the candidate can expect…" />
                  </Field>
                </div>
              </div>
            )}

            {saveError && (
              <p className="mt-3 text-xs text-caa-danger flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {saveError}
              </p>
            )}

            <div className="flex justify-between items-center mt-4">
              <div>
                {editing.title && editing.closesAt && (
                  <button
                    type="button"
                    onClick={() => {
                      const closes = new Date(editing.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      downloadJobAdvert({ ...editing, id: editing.id ?? 0, abbr: "", closes } as Job, actor);
                    }}
                    className="text-xs text-caa-navy hover:underline inline-flex items-center gap-1"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Preview as PDF
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-caa-border rounded-md">Cancel</button>
                <button onClick={save} disabled={pdfParsing} className="px-3 py-1.5 text-sm bg-caa-navy text-white rounded-md disabled:opacity-50">
                  {editing.id ? "Save changes" : "Create listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Email helpers ────────────────────────────────────────────────────────────
