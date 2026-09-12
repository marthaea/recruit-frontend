import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import {
  auth as authApi, jobs as jobsApi, applications as appsApi,
  notifications as notifApi, settings as settingsApi,
  cv as cvApi, criteria as criteriaApi, departments as departmentsApi, permissions as permissionsApi,
  jobTemplates as jobTemplatesApi, analyticsApi,
  setToken, restoreSession, setSessionExpiredHandler,
  type UserResponse, type Department, type AssessmentKind,
} from "@/services/api/client";

// ─── Base types ───────────────────────────────────────────────────────────────

export type Visibility = "external" | "internal";
export type QualLevel = "O-Level" | "A-Level" | "Certificate" | "Diploma" | "Degree" | "Postgraduate" | "Masters" | "PhD";
export type ApplicationStatus =
  | "Pending" | "Under Review" | "Shortlisted" | "Shortlisted II" | "Interview"
  | "Assessment Scheduled" | "Assessment Complete"
  | "Offered" | "Declined";
// Shortlisted II sits between Shortlisted and Interview — it's the CV-scoring
// stage (see candidate_scores / CandidateScoringPanel), not a second round of
// assessment. It used to sit after Assessment Complete; repositioned here to
// match how it's actually used.
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Pending", "Under Review", "Shortlisted", "Shortlisted II", "Interview",
  "Assessment Scheduled", "Assessment Complete",
  "Offered", "Declined",
];
export type AdminRole = "super" | "hr" | "recruiter" | "auditor" | "hr_officer" | "it_admin" | "dhra" | "hod";
export const ADMIN_ROLES: AdminRole[] = ["super", "hr", "recruiter", "auditor", "hr_officer", "it_admin", "dhra", "hod"];
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super: "Super Admin", hr: "HR Manager", recruiter: "Recruiter",
  auditor: "Auditor", hr_officer: "HR Officer", it_admin: "IT Admin",
  dhra: "DHRA (Director HR & Administration)", hod: "Head of Department",
};
export type AuditEntry = { id: number; at: string; actor: string; role: string; action: string; target?: string };
export type JobTemplate = { id: number; name: string; departmentId?: number | null; sourceJobId?: number | null; content: Record<string, unknown>; createdAt?: string };
export type AdminSettings = {
  minAgeThreshold: number;
  allowExternalInternalJobs: boolean;
  orgName: string;
  sessionTimeoutMinutes: number;
  emailSenderName: string;
  closingSoonDays: number;
  maxApplicationsPerCandidate: number;
  notifTemplates: {
    shortlist: string; decline: string; interview: string; offer: string;
    assessmentScheduled: string; panelInvite: string;
  };
  defaultCgpaThreshold: number;
};

// ─── New feature types ────────────────────────────────────────────────────────

export type Notification = {
  id: number;
  recipientEmail: string;
  title: string;
  message: string;
  read: boolean;
  at: string;
  type: "shortlisted" | "declined" | "interview" | "offered" | "info";
};

export type AnalyticsEvent = {
  type: "page_view" | "job_view" | "apply_click" | "save_job" | "search";
  jobId?: number;
  jobTitle?: string;
  query?: string;
  ts: number;
};

export type SentEmail = {
  id: number;
  to: string;
  candidateName: string;
  subject: string;
  body: string;
  sentAt: string;
  trigger: string;
  jobTitle: string;
};

export type ScreeningQuestion = {
  id: string;
  text: string;
  type: "qualifier" | "disqualifier";
  /** How the candidate answers this question on the application form. Legacy questions
   *  (created before this field existed) have no `kind` and fall back to fuzzy CV-text matching. */
  kind?: "yesno" | "number";
  /** kind: "yesno" — the answer ("Yes" | "No") that keeps the candidate eligible. */
  qualifyingAnswer?: "Yes" | "No";
  /** kind: "number" — inclusive range the candidate's numeric answer must fall within to stay eligible. */
  min?: number;
  max?: number;
};

// ─── Structured requirement builder ───────────────────────────────────────────
// HR picks a requirement kind + value, marks it essential or desirable, and —
// for essential items — whether it becomes a candidate-facing qualifier/
// disqualifier question or stays a silent, backend-only criterion. Replaces
// free-text requirements as the primary way essential/desirable lists on a
// job are built (the older free-text fields below remain as a fallback).
export type RequirementKind =
  | "minAge" | "maxAge" | "flyingHours" | "experienceYears" | "sex"
  | "qualificationLevel" | "specificDegree" | "oLevelSubject" | "aLevelSubject" | "custom";
export type RequirementUsage = "qualifier" | "disqualifier" | "criteriaOnly";
export type JobRequirement = {
  id: string;
  kind: RequirementKind;
  /** Human-readable sentence, auto-generated from kind+value but editable. */
  label: string;
  numberValue?: number;
  textValue?: string;
  gradeValue?: string;
  /** Ignored (treated as "criteriaOnly") for desirable (mandatory: false) items — a
   *  desirable item is never a hard disqualifier. */
  usage: RequirementUsage;
  /** true = essential requirement; false = desirable (bonus, non-mandatory). */
  mandatory: boolean;
  /** Links this requirement to its auto-generated ScreeningQuestion (same id), if any. */
  questionId?: string;
};

export type JobCriteria = {
  jobId: number;
  minCgpa?: number;
  requiredKeywords: string[];
  notes?: string;
  screeningQuestions?: ScreeningQuestion[];
  minExperienceYears?: number;
  requiredQualLevel?: QualLevel;
  disqualifyingUniversities?: string[];
  // Assessment 1 is compulsory for every job; Assessment 2 is optional and
  // only asked of candidates when the officer creating the job enables it.
  // Stored under the same `assessmentTypes` wire field the backend already
  // persists opaquely (was an unordered, unused set of legacy labels before).
  assessmentTypes?: { assessment1: AssessmentKind; assessment2?: AssessmentKind };
  requirements?: JobRequirement[];
};

export type PermissionOverride = {
  email: string;
  role: AdminRole;
  canViewAudit: boolean;
  canManageJobs: boolean;
  canExport: boolean;
  canViewStaff: boolean;
  canManageSettings: boolean;
  canGrantPermissions: boolean;
  canManageCriteria: boolean;
  canShortlist: boolean;
  canViewApplications: boolean;
  canScreenInterns: boolean;
  canSendNotifications: boolean;
  canReviewJob: boolean;
  canApproveJob: boolean;
  canManageDepartments: boolean;
  canManageAdmins: boolean;
  canAssignRights: boolean;
  canScheduleAssessment: boolean;
  canRecordAssessment: boolean;
};

// ─── RBAC ─────────────────────────────────────────────────────────────────────
// This starts as a hardcoded fallback (so the console isn't blank for the
// instant between an admin logging in and the fetch below completing), then
// gets overwritten with the real thing from GET /api/permissions/roles/defaults
// — the backend is the single source of truth, this is no longer an
// independently-maintained copy. See setRoleDefaults() / apiSignIn.
export let ROLE_DEFAULTS: Record<AdminRole, Partial<PermissionOverride>> = {
  super: {
    canViewAudit: true, canManageJobs: true, canExport: true, canViewStaff: true,
    canManageSettings: true, canGrantPermissions: true, canManageCriteria: true,
    canShortlist: true, canViewApplications: true,
    canScreenInterns: true, canSendNotifications: true,
    canReviewJob: true, canApproveJob: true, canManageDepartments: true,
    canManageAdmins: true, canAssignRights: true,
    canScheduleAssessment: true, canRecordAssessment: true,
  },
  hr: {
    canViewAudit: false, canManageJobs: true, canExport: true, canViewStaff: true,
    canManageSettings: false, canGrantPermissions: false, canManageCriteria: true,
    canShortlist: true, canViewApplications: true,
    canScreenInterns: true, canSendNotifications: true,
    canScheduleAssessment: true,
  },
  recruiter: {
    canViewAudit: false, canManageJobs: false, canExport: false, canViewStaff: false,
    canManageSettings: false, canGrantPermissions: false, canManageCriteria: true,
    canShortlist: true, canViewApplications: true,
    canScreenInterns: false, canSendNotifications: false,
  },
  auditor: { canExport: true, canViewAudit: true },
  hr_officer: {
    canViewApplications: true, canShortlist: true, canManageJobs: true,
    canManageCriteria: true, canSendNotifications: true,
    canScheduleAssessment: true,
  },
  it_admin: { canAssignRights: true },
  dhra: {
    canViewApplications: true, canShortlist: true, canApproveJob: true,
    canExport: true, canViewAudit: true,
    canScheduleAssessment: true, canRecordAssessment: true,
  },
  hod: { canViewApplications: true, canShortlist: true, canReviewJob: true, canRecordAssessment: true },
};

/** Overwrites the role-defaults table with the real one from the backend. */
export function setRoleDefaults(defaults: Record<AdminRole, Partial<PermissionOverride>>) {
  ROLE_DEFAULTS = defaults;
}

export function canAccess(role: AdminRole | undefined, perm: keyof PermissionOverride, overrides?: PermissionOverride[]): boolean {
  if (!role) return false;
  const override = overrides?.find((o) => o.role === role);
  if (override && perm in override) return !!override[perm];
  const def = ROLE_DEFAULTS[role] ?? {};
  return !!((def as any)[perm]);
}

// ─── Job / Application ────────────────────────────────────────────────────────

export type JobStatus = "draft" | "pending_review" | "pending_approval" | "published" | "declined";
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft", pending_review: "Pending Review", pending_approval: "Pending Approval",
  published: "Published", declined: "Declined",
};

export type Job = {
  id: number; abbr: string; title: string; dept: string; deptKey: string;
  location: string; salary: string; salaryBand: string;
  /** Labelled "Employment Category" in the UI. */
  type: "Full-time" | "Contract" | "Fixed Term Contract";
  closes: string; closesAt: string;
  /** Labelled "Sourcing Type" in the UI. */
  visibility: Visibility;
  minAge: number; requiredExperience: number; requiredQualification: QualLevel;
  description?: string; featured?: boolean;
  status?: JobStatus; departmentId?: number | null; declineReason?: string | null;
  /** e.g. "UCAA/ADV/EXT/01/2026" */
  jobRef?: string;
  reportsTo?: string;
  vacancies?: number;
  /** "Job Purpose" — candidate-facing role summary, separate from the internal `description`. */
  aboutRole?: string;
  accountabilities?: { area: string; activities: string[] }[];
  specialSkills?: string[];
};

export type Application = {
  id: number; abbr: string; title: string; dept: string; date: string;
  status: ApplicationStatus; completion: number;
  jobId?: number; candidateEmail?: string; candidateName?: string;
  cgpa?: number; university?: string;
  /** Candidate's answers to the job's screening questions, keyed by ScreeningQuestion.id. */
  screeningAnswers?: Record<string, string>;
  deploymentStation?: string | null;
  deploymentDate?: string | null;
};

const NON_WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  "Shortlisted", "Interview", "Assessment Scheduled", "Assessment Complete",
  "Shortlisted II", "Offered",
];
export function canWithdraw(status: ApplicationStatus): boolean {
  return !NON_WITHDRAWABLE_STATUSES.includes(status);
}

// Same list as NON_WITHDRAWABLE_STATUSES today, but kept as its own named
// export — editing and withdrawing are different concerns that only happen
// to share a threshold right now. Mirrors EDIT_LOCKED_STATUSES in the
// backend's ApplicationService.java.
const EDIT_LOCKED_STATUSES: ApplicationStatus[] = [
  "Shortlisted", "Shortlisted II", "Interview", "Assessment Scheduled",
  "Assessment Complete", "Offered",
];
export function canEditApplication(status: ApplicationStatus): boolean {
  return !EDIT_LOCKED_STATUSES.includes(status);
}

/** Evaluate one screening-question answer precisely. Pass = stays eligible. Legacy
 *  text-only questions (no `kind`) have no structured answer to check — they're scored
 *  from the CV via fuzzy keyword matching instead, so they always pass here. */
export function screeningAnswerPasses(q: ScreeningQuestion, answer: string | undefined): boolean {
  if (q.kind === "yesno") return !!answer && answer === (q.qualifyingAnswer ?? "Yes");
  if (q.kind === "number") {
    const n = answer !== undefined && answer !== "" ? Number(answer) : NaN;
    if (Number.isNaN(n)) return false;
    if (q.min !== undefined && n < q.min) return false;
    if (q.max !== undefined && n > q.max) return false;
    return true;
  }
  return true;
}

export type ToastType = "success" | "info" | "warning";
export type Toast = { id: number; type: ToastType; title: string; message?: string };

export type AccountType = "external" | "internal" | "admin";
type Auth = {
  isLoggedIn: boolean; firstName: string; lastName: string; email: string;
  accountType: AccountType; employeeNumber?: string;
  effectiveType?: AccountType; adminRole?: AdminRole;
  photoUrl?: string;
  /** undefined = unknown (legacy account); false = pending verification */
  emailVerified?: boolean;
};

// ─── CV ───────────────────────────────────────────────────────────────────────

export type CvQualification = {
  level: QualLevel; course: string; institution: string; year: string;
  awardFile?: string; transcriptFile?: string;
  school?: string; indexNumber?: string;
  subjects?: { subject: string; grade: string }[];
  aggregate?: string;
};
export type CvExperience = {
  title: string; organisation: string; start: string; end: string; description: string; proofFile?: string;
};
export type CvReferee = { name: string; title: string; organisation: string; phone: string; email: string };
export type CvProfile = {
  personal: {
    firstName: string; lastName: string; otherName?: string;
    dob: string; gender: string; nationality: string; nin: string;
    phone: string; email: string; address: string;
  };
  highestLevel: QualLevel | "";
  qualifications: CvQualification[];
  skills: string[];
  experience: CvExperience[];
  referees: CvReferee[];
  nextOfKin: { name: string; relationship: string; phone: string };
  photoFile?: string;
};

export const EMPTY_CV: CvProfile = {
  personal: { firstName: "", lastName: "", otherName: "", dob: "", gender: "", nationality: "Ugandan", nin: "", phone: "", email: "", address: "" },
  highestLevel: "",
  qualifications: [],
  skills: [],
  experience: [],
  referees: [{ name: "", title: "", organisation: "", phone: "", email: "" }, { name: "", title: "", organisation: "", phone: "", email: "" }],
  nextOfKin: { name: "", relationship: "", phone: "" },
};

// ─── Context shape ────────────────────────────────────────────────────────────

type Ctx = {
  auth: Auth;
  isLoading: boolean;
  /** True while a stored session is being revalidated against the backend on mount. */
  sessionRestoring: boolean;
  /** Async sign-in that calls the real API. Resolves with the signed-in user so callers can branch on accountType (see admin.tsx). */
  apiSignIn: (email: string, password: string) => Promise<UserResponse>;
  /** Async register that calls the real API. Use this in register.tsx. */
  apiRegister: (data: { email: string; password: string; firstName: string; lastName: string; accountType: AccountType; employeeNumber?: string }) => Promise<void>;
  /** Sync shim kept for demo/admin shortcuts — prefer apiSignIn for real auth. */
  signIn: (firstName: string, lastName?: string, email?: string, opts?: { accountType?: AccountType; employeeNumber?: string; adminRole?: AdminRole }) => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<Auth, "firstName" | "lastName" | "email">>) => void;
  updatePhotoUrl: (url: string) => void;
  markEmailVerified: () => void;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  jobs: Job[];
  addJob: (j: Omit<Job, "id" | "abbr">) => Promise<Job>;
  updateJob: (id: number, patch: Partial<Job>) => Promise<void>;
  deleteJob: (id: number) => Promise<void>;
  submitJobForReview: (id: number) => Promise<void>;
  reviewJob: (id: number, approve: boolean, reason?: string) => Promise<void>;
  approveJob: (id: number, approve: boolean, reason?: string) => Promise<void>;
  publishJobDirect: (id: number) => Promise<void>;
  canSeeJob: (j: Job) => boolean;
  isExpired: (j: Job) => boolean;
  applications: Application[];
  withdrawApplication: (id: number) => void;
  addApplication: (a: Omit<Application, "id" | "date" | "status">) => Application;
  updateApplicationStatus: (appId: number, status: ApplicationStatus, notifyEmail?: string, notifyMessage?: string) => void;
  /** Apply many status changes in one state update + one localStorage write — use this instead
   *  of calling updateApplicationStatus in a loop (batch screening, bulk interview approval). */
  bulkUpdateApplicationStatus: (updates: { id: number; status: ApplicationStatus }[]) => void;
  signInPromptOpen: boolean;
  openSignInPrompt: () => void;
  closeSignInPrompt: () => void;
  cv: CvProfile;
  saveCv: (cv: CvProfile) => void;
  hasCv: boolean;
  cvStore: Record<string, CvProfile>;
  /** Fetches and caches any of these candidates' CVs not already in cvStore
   *  (admin-only backend route). cvStore was previously only ever populated
   *  from 2 hardcoded demo profiles plus whatever CV the current browser's
   *  own session happened to save — meaning a real admin viewing a real
   *  candidate's application almost never actually saw their CV data, and
   *  auto-screening silently fell back to its fake demo-simulation path
   *  instead of evaluating the real CV. */
  loadCvsForEmails: (emails: string[]) => void;
  audit: AuditEntry[];
  settings: AdminSettings;
  updateSettings: (p: Partial<AdminSettings>) => void;
  logAction: (action: string, target?: string) => void;
  notifications: Notification[];
  sendNotification: (recipientEmail: string, title: string, message: string, type: Notification["type"]) => void;
  markNotificationRead: (id: number) => void;
  criteria: JobCriteria[];
  saveCriteria: (c: JobCriteria) => void;
  departments: Department[];
  loadDepartments: () => void;
  addDepartment: (data: { name: string; code: string }) => Promise<void>;
  jobTemplates: JobTemplate[];
  loadJobTemplates: () => void;
  saveJobTemplate: (data: { name: string; departmentId?: number | null; sourceJobId?: number | null; content: Record<string, unknown> }) => Promise<JobTemplate>;
  deleteJobTemplate: (id: number) => Promise<void>;
  permissionOverrides: PermissionOverride[];
  savePermissionOverride: (p: PermissionOverride) => void;
  sentEmails: SentEmail[];
  logEmail: (e: Omit<SentEmail, "id" | "sentAt">) => void;
  /** Log many emails in one state update + one localStorage write — use instead of logEmail in a loop. */
  bulkLogEmails: (emails: Omit<SentEmail, "id" | "sentAt">[]) => void;
  clearEmailLog: () => void;
  /** Records a real visitor-activity event to the backend (Site Analytics tab reads it back). Fire-and-forget. */
  trackEvent: (e: Omit<AnalyticsEvent, "ts">) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function isCAAEmail(email: string) { return /@caa\.go\.ug$/i.test(email.trim()); }

/** UI placeholder until GET /api/settings — portal copy lives in PostgreSQL (backend seed). */
const EMPTY_ADMIN_SETTINGS: AdminSettings = {
  orgName: "",
  minAgeThreshold: 21,
  allowExternalInternalJobs: false,
  sessionTimeoutMinutes: 30,
  emailSenderName: "",
  closingSoonDays: 7,
  maxApplicationsPerCandidate: 5,
  defaultCgpaThreshold: 3.8,
  notifTemplates: {
    shortlist: "",
    decline: "",
    interview: "",
    offer: "",
    assessmentScheduled: "",
    panelInvite: "",
  },
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY    = "caa_auth_v1";
const CV_KEY         = "caa_cv_v1";
const AUDIT_KEY      = "caa_audit_v1";
const NOTIF_KEY      = "caa_notif_v1";
const CRITERIA_KEY   = "caa_criteria_v1";
const PERMS_KEY      = "caa_perms_v1";
const EMAILS_KEY     = "caa_emails_v1";

/** Removed with frontend demo seed — drop stale copies so API data is not masked. */
const LEGACY_DEMO_STORAGE_KEYS = [
  "caa_jobs_v1",
  "caa_apps_v1",
  "caa_settings_v1",
  "caa_cv_store_v1",
] as const;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
  const [isLoading, setIsLoading] = useState(false);
  // True only while a stored session is being revalidated against the backend
  // (see the mount effect below). Consumers that fetch real data on mount for
  // a logged-in-looking user — the HR Console in particular — must wait for
  // this to clear before rendering, or they'll fire an authenticated request
  // with no token yet and get bounced out by the 401 handler in client.ts.
  const [sessionRestoring, setSessionRestoring] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const jobsMutatedAtRef = useRef(0);
  const [applications, setApplications] = useState<Application[]>([]);
  const [cv, setCv] = useState<CvProfile>(EMPTY_CV);
  const [hasCv, setHasCv] = useState(false);
  const [cvStore, setCvStore] = useState<Record<string, CvProfile>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_ADMIN_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [criteria, setCriteria] = useState<JobCriteria[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<PermissionOverride[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  useEffect(() => {
    try {
      for (const key of LEGACY_DEMO_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Auth;
        if (stored.isLoggedIn) {
          setAuth(stored);
          setSessionRestoring(true);
          restoreSession().then((ok) => {
            if (!ok) {
              setAuth({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
              try { localStorage.removeItem(STORAGE_KEY); } catch {}
            }
            setSessionRestoring(false);
          });
        } else {
          setAuth(stored);
        }
      }
      const rc = localStorage.getItem(CV_KEY);
      if (rc) { setCv(JSON.parse(rc)); setHasCv(true); }
      const rau = localStorage.getItem(AUDIT_KEY);
      if (rau) setAudit(JSON.parse(rau));
      const rn = localStorage.getItem(NOTIF_KEY);
      if (rn) setNotifications(JSON.parse(rn));
      const rcr = localStorage.getItem(CRITERIA_KEY);
      if (rcr) setCriteria(JSON.parse(rcr));
      const rp = localStorage.getItem(PERMS_KEY);
      if (rp) setPermissionOverrides(JSON.parse(rp));
      const rem = localStorage.getItem(EMAILS_KEY);
      if (rem) setSentEmails(JSON.parse(rem));
    } catch {}

    fetchJobsList();
    settingsApi.get().then(r => { if (r.success) setSettings(prev => ({ ...prev, ...(r.data as unknown as AdminSettings) })); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionRestoring || !auth.isLoggedIn) return;
    if (auth.accountType === "admin") {
      fetchJobsList();
      notifApi.list().then(r => { if (r.success) persistNotifs(r.data as unknown as Notification[]); }).catch(() => {});
      permissionsApi.roleDefaults().then(r => { if (r.success) setRoleDefaults(r.data.defaults as Record<AdminRole, Partial<PermissionOverride>>); }).catch(() => {});
      permissionsApi.list().then(r => {
        if (r.success) {
          const data = r.data as unknown as PermissionOverride[];
          setPermissionOverrides(data);
          try { localStorage.setItem(PERMS_KEY, JSON.stringify(data)); } catch {}
        }
      }).catch(() => {});
    }
    appsApi.list().then(r => { if (r.success) persistApps(r.data as unknown as Application[]); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionRestoring, auth.isLoggedIn, auth.accountType]);

  // A local-only session (e.g. the demo admin shortcut, which sets isLoggedIn
  // without ever obtaining a real backend token) looks "logged in" here but
  // has nothing to authenticate with. The first real API call it makes gets
  // rejected, and without clearing this persisted flag too, the next reload
  // just repeats the same failure — see setSessionExpiredHandler in client.ts.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      persist({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
    });
  }, []);

  const persist = (a: Auth) => {
    setAuth(a);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch {}
  };
  const persistJobs = (next: Job[]) => { jobsMutatedAtRef.current = Date.now(); setJobs(next); };
  const persistApps = (next: Application[]) => { setApplications(next); };
  const persistNotifs = (next: Notification[]) => { setNotifications(next); try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {} };

  // Multiple call sites independently re-fetch the full jobs list in the
  // background (mount, login, register, session restore) with no ordering
  // guarantee. Two stale-response guards:
  //  - jobsMutatedAtRef: a fetch never overwrites a *local mutation* (e.g. a
  //    job just created/submitted) made after the fetch was requested.
  //  - jobsFetchAppliedAtRef: an older fetch never overwrites a newer one.
  //    This matters on admin page reloads: the anonymous mount-time fetch
  //    (published jobs only) can resolve AFTER the authenticated post-restore
  //    fetch and would otherwise wipe the pipeline jobs right back out of the
  //    Review/Approve tabs. A fetch result deliberately does NOT bump
  //    jobsMutatedAtRef — refreshing from the server is not a mutation.
  const jobsFetchAppliedAtRef = useRef(0);
  const fetchJobsList = () => {
    const requestedAt = Date.now();
    return jobsApi.list().then((r) => {
      if (r.success && jobsMutatedAtRef.current <= requestedAt && jobsFetchAppliedAtRef.current <= requestedAt) {
        jobsFetchAppliedAtRef.current = requestedAt;
        setJobs(r.data as unknown as Job[]);
      }
    }).catch(() => {});
  };

  const signIn = (firstName: string, lastName = "", email = "", opts?: { accountType?: AccountType; employeeNumber?: string; adminRole?: AdminRole }) => {
    const accountType = opts?.accountType ?? "external";
    const effectiveType: AccountType = accountType === "internal" && !isCAAEmail(email) ? "external" : accountType;
    persist({ isLoggedIn: true, firstName, lastName, email, accountType, employeeNumber: opts?.employeeNumber, effectiveType, adminRole: opts?.adminRole });
  };

  // ── Real API auth ─────────────────────────────────────────────────────────
  const apiSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const u = res.data;
      setToken(u.token);
      persist({
        isLoggedIn: true,
        firstName: u.firstName, lastName: u.lastName, email: u.email,
        accountType: u.accountType as AccountType,
        effectiveType: (u.effectiveType ?? u.accountType) as AccountType,
        adminRole: u.adminRole ?? undefined,
        employeeNumber: u.employeeNumber ?? undefined,
        emailVerified: u.emailVerified,
      });
      // Load real data in the background
      Promise.all([
        fetchJobsList(),
        appsApi.list().then(r => { if (r.success) persistApps(r.data as unknown as Application[]); }).catch(() => {}),
        settingsApi.get().then(r => { if (r.success) setSettings(prev => ({ ...prev, ...(r.data as unknown as AdminSettings) })); }).catch(() => {}),
        notifApi.list().then(r => { if (r.success) persistNotifs(r.data as unknown as Notification[]); }).catch(() => {}),
        // Role-defaults are fetched for every login (harmless, small payload)
        // so the frontend never has to hardcode its own copy of them.
        permissionsApi.roleDefaults().then(r => { if (r.success) setRoleDefaults(r.data.defaults as Record<AdminRole, Partial<PermissionOverride>>); }).catch(() => {}),
        permissionsApi.list().then(r => {
          if (r.success) {
            const data = r.data as unknown as PermissionOverride[];
            setPermissionOverrides(data);
            try { localStorage.setItem(PERMS_KEY, JSON.stringify(data)); } catch {}
          }
        }).catch(() => {}),
        cvApi.get().then(r => {
          if (r.success && r.data.photoFile) {
            const photoUrl = r.data.photoFile;
            setAuth(prev => {
              const next = { ...prev, photoUrl };
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
              return next;
            });
          }
        }).catch(() => {}),
      ]);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const apiRegister = async (data: { email: string; password: string; firstName: string; lastName: string; accountType: AccountType; employeeNumber?: string }) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      const u = res.data;
      setToken(u.token);
      persist({
        isLoggedIn: true,
        firstName: u.firstName, lastName: u.lastName, email: u.email,
        accountType: u.accountType as AccountType,
        effectiveType: (u.effectiveType ?? u.accountType) as AccountType,
        emailVerified: u.emailVerified,
      });
      Promise.all([
        fetchJobsList(),
        appsApi.list().then(r => { if (r.success) persistApps(r.data as unknown as Application[]); }).catch(() => {}),
        notifApi.list().then(r => { if (r.success) persistNotifs(r.data as unknown as Notification[]); }).catch(() => {}),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    authApi.logout().catch(() => {});
    setToken(null);
    persist({ isLoggedIn: false, firstName: "", lastName: "", email: "", accountType: "external" });
  };

  const updateProfile = (patch: Partial<Pick<Auth, "firstName" | "lastName" | "email">>) => {
    persist({ ...auth, ...patch });
    // Previously local-only — the backend row never changed, so a reload
    // silently reverted the edit. Persist for real, keep the optimistic
    // local update either way.
    authApi.updateProfile(patch).catch((err) => {
      pushToast({ type: "warning", title: "Profile not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const markEmailVerified = () => {
    persist({ ...auth, emailVerified: true });
  };

  const updatePhotoUrl = (url: string) => {
    setAuth(prev => {
      const next = { ...prev, photoUrl: url };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const withdrawApplication = (id: number) => {
    const app = applications.find((a) => a.id === id);
    if (app && !canWithdraw(app.status)) return;
    persistApps(applications.filter((a) => a.id !== id));
    // Persist the withdrawal to the database as well
    appsApi.withdraw(id).catch(() => {});
  };

  const addApplication: Ctx["addApplication"] = (a) => {
    const email = a.candidateEmail?.toLowerCase();
    // Editing an existing application (candidate re-opened Apply for a job
    // they already applied to) previously always went through the "create
    // new" path below — the backend's duplicate() check then silently
    // rejected it (any status blocked resubmission), and the swallowed
    // .catch(() => {}) let a false "success" toast through while nothing
    // actually changed. Now: find the existing row and update it in place,
    // matching the real update-vs-create branch the backend takes.
    const existing = email ? applications.find((x) => x.candidateEmail?.toLowerCase() === email && x.jobId === a.jobId) : undefined;

    if (existing) {
      if (!canEditApplication(existing.status)) {
        pushToast({ type: "warning", title: "This application can no longer be edited", message: `It has already progressed to ${existing.status}. Contact HR if you need to make a change.` });
        return existing;
      }
      const updated: Application = { ...existing, ...a, id: existing.id, date: existing.date, status: existing.status };
      persistApps(applications.map((x) => (x.id === existing.id ? updated : x)));
      if (a.jobId != null) {
        appsApi.submit({
          jobId: a.jobId,
          completion: a.completion,
          cgpa: (a as unknown as Record<string, unknown>).cgpa as number | undefined,
          university: (a as unknown as Record<string, unknown>).university as string | undefined,
          screeningAnswers: a.screeningAnswers as Record<string, string> | undefined,
        }).then((res) => {
          if (res.success && res.data) {
            setApplications((prev) => {
              const next = prev.map((x) => (x.id === existing.id ? { ...x, status: res.data.status as ApplicationStatus } : x));
              return next;
            });
          } else {
            pushToast({ type: "warning", title: "Changes not saved to server", message: "Please check your connection and try again." });
          }
        }).catch((err) => {
          pushToast({ type: "warning", title: "Changes not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
        });
      }
      return updated;
    }

    const cap = settings.maxApplicationsPerCandidate;
    if (cap > 0 && email) {
      const active = applications.filter(
        (x) => x.candidateEmail?.toLowerCase() === email && x.status !== "Declined"
      ).length;
      if (active >= cap) {
        pushToast({ type: "warning", title: "Application limit reached", message: `You may not have more than ${cap} active application${cap !== 1 ? "s" : ""} at one time.` });
      }
    }
    const tempId = Date.now();
    const newApp: Application = {
      ...a,
      id: tempId,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Pending",
    };
    persistApps([newApp, ...applications]);

    // Persist to database; on success replace the temp ID with the server-assigned one.
    // The backend derives job details and candidate identity from the job record and
    // the auth token, so only the application-specific fields are sent.
    if (a.jobId != null) {
      appsApi.submit({
        jobId: a.jobId,
        completion: a.completion,
        cgpa: (a as unknown as Record<string, unknown>).cgpa as number | undefined,
        university: (a as unknown as Record<string, unknown>).university as string | undefined,
        screeningAnswers: a.screeningAnswers as Record<string, string> | undefined,
      }).then((res) => {
        if (res.success && res.data?.id && res.data.id !== tempId) {
          setApplications((prev) => {
            const next = prev.map((x) => x.id === tempId ? { ...x, id: res.data.id } : x);
            return next;
          });
        }
      }).catch(() => {});
    }

    return newApp;
  };

  const updateApplicationStatus: Ctx["updateApplicationStatus"] = (appId, status, notifyEmail, notifyMessage) => {
    // Functional update — this is called in tight loops (batch screening, bulk interview
    // approval) where React batches the state updates. Reading the `applications` closure
    // directly would make every call in the loop overwrite the previous one, leaving only
    // the last candidate in the batch actually updated.
    setApplications((prev) => {
      const next = prev.map((a) => a.id === appId ? { ...a, status } : a);
      return next;
    });
    // Persist to database so changes are visible to the candidate on next load
    appsApi.updateStatus(appId, status, notifyEmail, notifyMessage).catch((err) => {
      pushToast({ type: "warning", title: "Status change not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
    if (notifyEmail && notifyMessage) {
      const type: Notification["type"] =
        status === "Shortlisted" ? "shortlisted" :
        status === "Declined"    ? "declined" :
        status === "Interview"   ? "interview" :
        status === "Offered"     ? "offered" : "info";
      sendNotification(notifyEmail, `Application update — ${status}`, notifyMessage, type);
    }
  };

  const bulkUpdateApplicationStatus: Ctx["bulkUpdateApplicationStatus"] = (updates) => {
    if (updates.length === 0) return;
    const byId = new Map(updates.map((u) => [u.id, u.status]));
    setApplications((prev) => {
      const next = prev.map((a) => byId.has(a.id) ? { ...a, status: byId.get(a.id)! } : a);
      return next;
    });
    // Persist all status changes to database in one call
    appsApi.bulkStatus(updates.map((u) => ({ id: u.id, status: u.status }))).catch((err) => {
      pushToast({ type: "warning", title: "Status changes not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  // These previously only ever touched local state/localStorage and never
  // called the backend — meaning no job created through the admin UI had
  // ever actually reached the `jobs` table. Fixed to call the real API and
  // reconcile local state from its response (real id, real status).
  //
  // Each uses the functional setJobs(prev => ...) form rather than reading
  // `jobs` from the closure directly — a job is typically created and then
  // immediately submitted for review (addJob then reconcileJob, seconds
  // apart), and closure-captured `jobs` can be stale by the time the second
  // call runs, silently discarding the first update.
  const addJob: Ctx["addJob"] = async (j) => {
    const res = await jobsApi.create(j);
    const created = res.data as unknown as Job;
    jobsMutatedAtRef.current = Date.now();
    setJobs((prev) => [created, ...prev]);
    return created;
  };
  const updateJob: Ctx["updateJob"] = async (id, patch) => {
    const res = await jobsApi.update(id, patch);
    const updated = res.data as unknown as Job;
    jobsMutatedAtRef.current = Date.now();
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
  };
  const deleteJob: Ctx["deleteJob"] = async (id) => {
    await jobsApi.delete(id);
    jobsMutatedAtRef.current = Date.now();
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  // Job-approval workflow transitions — each reconciles local state from the
  // backend's response so the status badge/action buttons update immediately.
  const reconcileJob = (updated: Job) => {
    jobsMutatedAtRef.current = Date.now();
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  };
  const submitJobForReview: Ctx["submitJobForReview"] = async (id) => {
    const res = await jobsApi.submitForReview(id);
    reconcileJob(res.data as unknown as Job);
  };
  const reviewJob: Ctx["reviewJob"] = async (id, approve, reason) => {
    const res = await jobsApi.review(id, approve, reason);
    reconcileJob(res.data as unknown as Job);
  };
  const approveJob: Ctx["approveJob"] = async (id, approve, reason) => {
    const res = await jobsApi.approve(id, approve, reason);
    reconcileJob(res.data as unknown as Job);
  };
  const publishJobDirect: Ctx["publishJobDirect"] = async (id) => {
    const res = await jobsApi.publishDirect(id);
    reconcileJob(res.data as unknown as Job);
  };

  const isExpired: Ctx["isExpired"] = (j) => new Date(j.closesAt).getTime() < Date.now();
  const canSeeJob: Ctx["canSeeJob"] = (j) => {
    // Candidate-facing surfaces only ever show published jobs. Signed-in
    // admins receive the whole approval pipeline from GET /jobs (for the
    // Review/Approve tabs), and without this check those draft/pending jobs
    // leaked onto the public Vacancies page while an admin was logged in.
    if ((j.status ?? "published") !== "published") return false;
    if (isExpired(j)) return false;
    if (j.visibility === "external") return true;
    return auth.isLoggedIn && auth.effectiveType === "internal";
  };

  const saveCv: Ctx["saveCv"] = (next) => {
    setCv(next); setHasCv(true);
    try { localStorage.setItem(CV_KEY, JSON.stringify(next)); } catch {}
    if (auth.email) {
      const key = auth.email.toLowerCase();
      const nextStore = { ...cvStore, [key]: next };
      setCvStore(nextStore);
    }
    // Previously local-only (localStorage/context only) — the backend CV row
    // never changed, which is why profile completion (computed server-side
    // from GET /api/cv) never reflected what a candidate actually filled in.
    cvApi.save(next).catch((err) => {
      pushToast({ type: "warning", title: "CV not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const cvFetchInFlightRef = useRef<Set<string>>(new Set());
  const CV_FETCH_BATCH_SIZE = 8;
  const CV_FETCH_MAX_PER_CALL = 100;
  const loadCvsForEmails: Ctx["loadCvsForEmails"] = (emails) => {
    const toFetch = Array.from(new Set(emails.map((e) => e.toLowerCase())))
      .filter((e) => e && !(e in cvStore) && !cvFetchInFlightRef.current.has(e))
      // Defensive cap — a caller scoped to a single job's applicant pool
      // should never hit this, but nothing here should be able to fire an
      // unbounded burst of simultaneous requests against the browser's
      // connection pool.
      .slice(0, CV_FETCH_MAX_PER_CALL);
    if (toFetch.length === 0) return;
    toFetch.forEach((e) => cvFetchInFlightRef.current.add(e));

    (async () => {
      for (let i = 0; i < toFetch.length; i += CV_FETCH_BATCH_SIZE) {
        const batch = toFetch.slice(i, i + CV_FETCH_BATCH_SIZE);
        const results = await Promise.all(batch.map((email) =>
          cvApi.getByEmail(email).then((r) => ({ email, cv: r.success ? r.data : null })).catch(() => ({ email, cv: null }))
        ));
        setCvStore((prev) => {
          const next = { ...prev };
          for (const { email, cv } of results) { if (cv) next[email] = cv as unknown as CvProfile; }
          return next;
        });
        batch.forEach((e) => cvFetchInFlightRef.current.delete(e));
      }
    })();
  };

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const logAction = (action: string, target?: string) => {
    const entry: AuditEntry = {
      id: Date.now(),
      at: new Date().toISOString(),
      actor: auth.isLoggedIn ? `${auth.firstName} ${auth.lastName}` : "System",
      role: auth.adminRole ?? "hr",
      action, target,
    };
    const next = [entry, ...audit].slice(0, 200);
    setAudit(next);
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(next)); } catch {}
  };

  const updateSettings = (p: Partial<AdminSettings>) => {
    const next = { ...settings, ...p };
    setSettings(next);
    settingsApi.update(next).then((r) => {
      if (r.success) {
        setSettings(r.data as unknown as AdminSettings);
      } else {
        pushToast({ type: "warning", title: "Settings not saved to server", message: "Please check your connection and try again." });
      }
    }).catch((err) => {
      pushToast({ type: "warning", title: "Settings not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const sendNotification: Ctx["sendNotification"] = (recipientEmail, title, message, type) => {
    const notif: Notification = {
      id: Date.now() + Math.random(),
      recipientEmail: recipientEmail.toLowerCase(),
      title, message, read: false,
      at: new Date().toISOString(),
      type,
    };
    setNotifications((prev) => {
      const next = [notif, ...prev];
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const markNotificationRead = (id: number) => {
    persistNotifs(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const saveCriteria: Ctx["saveCriteria"] = (c) => {
    const next = [...criteria.filter((x) => x.jobId !== c.jobId), c];
    setCriteria(next);
    try { localStorage.setItem(CRITERIA_KEY, JSON.stringify(next)); } catch {}
    // Previously local-only — the backend criteria row never changed, so the
    // server-side auto-screening on submit (which reads from the `criteria`
    // table) never actually saw what was configured here.
    const { jobId, ...data } = c;
    criteriaApi.save(jobId, data).catch((err) => {
      pushToast({ type: "warning", title: "Criteria not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  // Departments are admin-only server data — fetched on demand by whichever
  // admin screen needs them (Job Listings' dept dropdown, Settings' manager)
  // rather than on every login, since most logins (candidates) can't read it.
  const loadDepartments: Ctx["loadDepartments"] = () => {
    departmentsApi.list().then((r) => { if (r.success) setDepartments(r.data); }).catch(() => {});
  };

  const addDepartment: Ctx["addDepartment"] = async (data) => {
    const res = await departmentsApi.create(data);
    setDepartments((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Job templates — fetched on demand by the job-creation page's template
  // picker, same pattern as loadDepartments.
  const loadJobTemplates: Ctx["loadJobTemplates"] = () => {
    jobTemplatesApi.list().then((r) => { if (r.success) setJobTemplates(r.data as unknown as JobTemplate[]); }).catch(() => {});
  };

  const saveJobTemplate: Ctx["saveJobTemplate"] = async (data) => {
    const res = await jobTemplatesApi.create(data);
    const created = res.data as unknown as JobTemplate;
    setJobTemplates((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  };

  const deleteJobTemplate: Ctx["deleteJobTemplate"] = async (id) => {
    await jobTemplatesApi.delete(id);
    setJobTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const savePermissionOverride: Ctx["savePermissionOverride"] = (p) => {
    const next = [...permissionOverrides.filter((x) => x.email !== p.email), p];
    setPermissionOverrides(next);
    try { localStorage.setItem(PERMS_KEY, JSON.stringify(next)); } catch {}
    // Previously local-only — the backend permission_overrides row never
    // changed, so overrides granted here never actually affected what the
    // backend's requirePerm() middleware allowed that user to do.
    permissionsApi.save(p).catch((err) => {
      pushToast({ type: "warning", title: "Permissions not saved to server", message: err instanceof Error ? err.message : "Please check your connection and try again." });
    });
  };

  const logEmail: Ctx["logEmail"] = (e) => {
    const entry: SentEmail = { ...e, id: Date.now(), sentAt: new Date().toISOString() };
    setSentEmails((prev) => {
      const next = [entry, ...prev];
      try { localStorage.setItem(EMAILS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const bulkLogEmails: Ctx["bulkLogEmails"] = (emails) => {
    if (emails.length === 0) return;
    const base = Date.now();
    const entries: SentEmail[] = emails.map((e, i) => ({ ...e, id: base + i, sentAt: new Date().toISOString() }));
    setSentEmails((prev) => {
      const next = [...entries.reverse(), ...prev];
      try { localStorage.setItem(EMAILS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearEmailLog: Ctx["clearEmailLog"] = () => {
    setSentEmails([]);
    try { localStorage.removeItem(EMAILS_KEY); } catch {}
  };

  const trackEvent: Ctx["trackEvent"] = (e) => {
    analyticsApi.track(e.type, e.jobId, e.jobTitle, e.query);
  };

  // Settings → "Auto-logout after inactivity" was previously saved and
  // displayed but never enforced anywhere. Track real user activity and sign
  // out once the configured number of minutes passes with none.
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!auth.isLoggedIn) return;
    const limitMs = Math.max(1, settings.sessionTimeoutMinutes) * 60_000;

    const onTimeout = () => {
      signOut();
      pushToast({ type: "info", title: "Signed out", message: `You were signed out after ${settings.sessionTimeoutMinutes} minutes of inactivity.` });
    };
    const reset = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(onTimeout, limitMs);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    activityEvents.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, reset));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoggedIn, settings.sessionTimeoutMinutes]);

  return (
    <AppCtx.Provider
      value={{
        auth, isLoading, sessionRestoring, apiSignIn, apiRegister, signIn, signOut, updateProfile, updatePhotoUrl, markEmailVerified,
        toasts, pushToast, dismissToast,
        jobs, addJob, updateJob, deleteJob, submitJobForReview, reviewJob, approveJob, publishJobDirect, canSeeJob, isExpired,
        applications, withdrawApplication, addApplication, updateApplicationStatus, bulkUpdateApplicationStatus,
        signInPromptOpen,
        openSignInPrompt: () => setSignInPromptOpen(true),
        closeSignInPrompt: () => setSignInPromptOpen(false),
        cv, saveCv, hasCv, cvStore, loadCvsForEmails,
        audit, settings, updateSettings, logAction,
        notifications, sendNotification, markNotificationRead,
        criteria, saveCriteria,
        departments, loadDepartments, addDepartment,
        jobTemplates, loadJobTemplates, saveJobTemplate, deleteJobTemplate,
        permissionOverrides, savePermissionOverride,
        sentEmails, logEmail, bulkLogEmails, clearEmailLog,
        trackEvent,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
