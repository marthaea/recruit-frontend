import type { Job, JobRequirement } from "@/context/AppContext";
import logo from "@/assets/caa-logo.png";

// Shared, candidate-accurate rendering of a job's official advert document —
// used both on the public /job page and inside the HOD Review / DHRA Approve
// admin screens, so what a reviewer sees is exactly what a candidate will see
// (previously those screens showed no preview of the job content at all).

function deriveDetail(job: Job, requirements: JobRequirement[]) {
  // "criteriaOnly" requirements are silent by design — filtered out before
  // this function is ever called (both the public API and the admin criteria
  // list are pre-filtered), but filter again defensively here too.
  const visible = requirements.filter((r) => r.usage !== "criteriaOnly");
  const essential = visible.filter((r) => r.mandatory).map((r) => r.label);
  const desirable = visible.filter((r) => !r.mandatory).map((r) => r.label);

  const year = job.closesAt ? new Date(job.closesAt).getFullYear() : new Date().getFullYear();
  return {
    jobRef: job.jobRef?.trim() || `UCAA/ADV/${job.visibility === "internal" ? "INT" : "EXT"}/${String(job.id).padStart(2, "0")}/${year}`,
    reportsTo: job.reportsTo?.trim() || "Relevant Director",
    vacancies: job.vacancies ?? 1,
    about: job.aboutRole?.trim() || job.description?.trim() ||
      "This is an exciting opportunity to join Uganda's national aviation regulator. Full details will be provided to shortlisted candidates.",
    accountabilities: job.accountabilities?.length ? job.accountabilities : [
      { area: "1. Core Duties", activities: [
        "Carry out the duties of the post as assigned by the supervisor",
        "Uphold UCAA values of safety, integrity and service excellence",
      ] },
    ],
    requirements: essential.length ? essential : [
      `A minimum of a ${job.requiredQualification} from a recognised institution`,
      ...(job.requiredExperience > 0 ? [`At least ${job.requiredExperience} year(s) of relevant experience`] : []),
      `Must be at least ${job.minAge} years old`,
    ],
    desirable: desirable.length ? desirable.join(" ") : "",
    specialSkills: job.specialSkills?.length ? job.specialSkills : [
      "Must possess good interpersonal and communication skills",
      "Must be a team player with a strong work ethic",
    ],
  };
}

export function JobDocument({ job, requirements = [] }: { job: Job; requirements?: JobRequirement[] }) {
  const detail = deriveDetail(job, requirements);
  const padVacancies = String(detail.vacancies).padStart(2, "0");

  return (
    <div className="bg-white border border-gray-300 shadow-md print:shadow-none">

      {/* Document header */}
      <div className="bg-caa-navy px-8 py-5 flex items-center gap-5">
        <img src={logo} alt="UCAA" className="h-16 w-auto bg-white rounded p-1 shrink-0" />
        <div>
          <p className="text-white font-extrabold text-xl uppercase tracking-wide leading-snug">
            Uganda Civil Aviation Authority
          </p>
          <p className="text-white/70 text-sm mt-1">
            Headquarters: Entebbe International Airport &nbsp;|&nbsp; P.O. Box 5536, Kampala
          </p>
          <p className="text-white/70 text-sm">
            Tel: +256 312 352 000 &nbsp;|&nbsp; Email: aviation@caa.go.ug &nbsp;|&nbsp; www.caa.go.ug
          </p>
        </div>
      </div>

      {/* Gold accent line */}
      <div className="h-1 bg-caa-gold" />

      {/* Advertisement type */}
      <div className="px-8 py-5 border-b border-gray-300 text-center">
        <h2 className="font-bold text-lg uppercase underline tracking-wide">
          {job.visibility === "internal" ? "Internal Job Advertisement" : "External Job Advertisement"}
        </h2>
        <p className="text-sm mt-2 max-w-2xl mx-auto text-gray-700 leading-relaxed">
          Applications are invited from suitably qualified{" "}
          {job.visibility === "internal"
            ? "employees of Uganda Civil Aviation Authority"
            : "Ugandan citizens and residents"}{" "}
          to fill the following vacant position in the{" "}
          <strong>{job.dept}</strong> Directorate, as detailed below.
        </p>
      </div>

      {/* Reference table — salary is shown as its Scale code only, never the range */}
      <div className="px-8 pt-6 pb-4">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {[
              { label: "JOB REF", value: detail.jobRef },
              { label: "POSITION", value: job.title, bold: true },
              { label: "REPORTS TO", value: detail.reportsTo },
              { label: "SALARY SCALE", value: job.salaryBand },
              { label: "VACANCIES", value: padVacancies },
            ].map(({ label, value, bold }) => (
              <tr key={label}>
                <td className="border border-gray-400 px-4 py-2.5 font-bold bg-gray-50 w-40 align-top text-[13px]">{label}</td>
                <td className={`border border-gray-400 px-4 py-2.5 text-[13px] ${bold ? "font-bold" : ""}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Job purpose */}
      <div className="px-8 pb-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">JOB PURPOSE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-3 text-[13px] leading-relaxed text-gray-800">{detail.about}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Principal accountabilities */}
      <div className="px-8 pb-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase w-[38%]">Principal Accountabilities</th>
              <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">Specific Activities</th>
            </tr>
          </thead>
          <tbody>
            {detail.accountabilities.map((acc, i) => (
              <tr key={i}>
                <td className="border border-gray-400 px-4 py-3 font-semibold text-[13px] align-top">{acc.area}</td>
                <td className="border border-gray-400 px-4 py-3 text-[13px]">
                  <ul className="space-y-1.5">
                    {acc.activities.map((act, j) => (
                      <li key={j} className="flex gap-2 leading-snug">
                        <span className="text-gray-400 shrink-0 mt-0.5">›</span>
                        {act}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Person specifications */}
      <div className="px-8 pb-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th colSpan={2} className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">Person Specifications</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-3 font-semibold text-[13px] align-top w-[38%]">Essential Requirements</td>
              <td className="border border-gray-400 px-4 py-3 text-[13px]">
                <ol className="space-y-1.5 list-decimal list-inside">
                  {detail.requirements.map((r, i) => (
                    <li key={i} className="leading-snug">{r}</li>
                  ))}
                </ol>
              </td>
            </tr>
            {detail.desirable && (
              <tr>
                <td className="border border-gray-400 px-4 py-3 font-semibold text-[13px] align-top">Desirable requirements</td>
                <td className="border border-gray-400 px-4 py-3 text-[13px] leading-relaxed">{detail.desirable}</td>
              </tr>
            )}
            {detail.specialSkills.length > 0 && (
              <tr>
                <td colSpan={2} className="border border-gray-400 px-4 py-3 text-[13px]">
                  <p className="font-bold uppercase mb-2">Special Skills and Attributes</p>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    {detail.specialSkills.map((s, i) => (
                      <li key={i} className="leading-snug">{s}</li>
                    ))}
                  </ol>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* How to apply */}
      <div className="px-8 pb-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">How to Apply</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-4 text-[13px]">
                <ol className="space-y-2 list-decimal list-inside">
                  <li className="leading-relaxed">
                    If you meet the minimum requirements, please submit an updated CV{" "}
                    <strong>(3 pages maximum)</strong> with a <strong>cover letter</strong> and relevant{" "}
                    <strong>academic documents</strong> as <strong>ONE PDF</strong> file to HR Department by <strong>e-mail</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Submit the complete application to the recruitment email:{" "}
                    <strong>recruitment@caa.go.ug</strong>
                  </li>
                  <li className="leading-relaxed">
                    Please note that falsification of information is an offence in UCAA. You are advised to only apply for jobs where you meet the minimum requirements as indicated in the job description.
                  </li>
                  <li className="leading-relaxed">Physical/hard copy applications will not be accepted.</li>
                </ol>
                <p className="mt-4 mb-1">For any inquiries or assistance, please contact: —</p>
                <p className="font-bold">Mr. Frank Wagunyanya — PHRO @ TEL: 0772 405 330</p>
                <p className="font-bold">Syned Aryeija — PSA @ TEL: 0751 351 771</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Closing notice */}
      <div className="px-8 pb-8 text-[13px] text-gray-800 space-y-2">
        <p>
          Applications are to be received not later than{" "}
          <strong>5:00pm, {job.closes}.</strong>
        </p>
        <p>
          It is the duty of the applicant to ensure that his/her application is received by the indicated date. Late applications will not be entertained under any circumstances.
        </p>
        <p className="font-bold italic mt-3">
          We pledge to conduct a transparent recruitment process!
        </p>
        <div className="mt-3">
          <p className="font-bold">The Director Human Resource &amp; Administration,</p>
          <p className="font-bold">Uganda Civil Aviation Authority (Head Office)</p>
          <p className="font-bold">P.O Box 5536 — Kampala, Uganda</p>
        </div>
      </div>

    </div>
  );
}
