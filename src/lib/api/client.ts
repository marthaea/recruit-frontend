// Central API client — all backend calls go through here.
// See docs/07-frontend-integration.md in the backend repo for full integration guide.

// Production builds always go through this site's own /api/* path (proxied
// to the Render backend by netlify.toml) rather than the cross-origin Render
// URL directly — a cross-site refresh-token cookie only works if the browser
// still allows third-party cookies, which Chrome increasingly does not. This
// intentionally ignores VITE_API_URL in production even if it's set to the
// absolute backend URL; that env var only matters for local dev, where the
// frontend and backend are on different localhost ports without this issue.
const BASE = import.meta.env.PROD
  ? "/api"
  : (import.meta.env.VITE_API_URL as string) ?? "http://localhost:5000/api";

// Access token lives in memory only — never in localStorage, where any XSS
// could read it. Sessions survive page reloads via the httpOnly refresh
// cookie: call restoreSession() on app boot to obtain a fresh access token.
let _token: string | null = null;

export function setToken(t: string | null) {
  _token = t;
}

export function getToken() { return _token; }

// Lets AppContext clear its persisted "logged in" flag when a session turns
// out to be unrecoverable (see the 401 handler below) — without this, a stale
// local-only session (e.g. one that never obtained a real token) re-triggers
// the same failure on every reload, producing a reload loop.
let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) {
  _onSessionExpired = fn;
}

/**
 * Re-establish the session from the httpOnly refresh cookie.
 * Returns true when a fresh access token was obtained.
 */
export async function restoreSession(): Promise<boolean> {
  // Clean up tokens persisted by older versions of the app
  if (typeof localStorage !== "undefined") localStorage.removeItem("caa_token");
  return tryRefresh();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isMultipart = false
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include", // sends caa_refresh cookie automatically
    body: isMultipart
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  // Auto-refresh on 401 (expired access token)
  if (res.status === 401 && path !== "/auth/refresh-token" && path !== "/auth/login") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${_token}`;
      const retry = await fetch(`${BASE}${path}`, {
        method,
        headers,
        credentials: "include",
        body: isMultipart
          ? (body as FormData)
          : body !== undefined
          ? JSON.stringify(body)
          : undefined,
      });
      if (!retry.ok) throw await apiError(retry);
      return retry.json();
    }
    setToken(null);
    _onSessionExpired?.();
    // Guard against a reload loop: if we're already on /login (or this fires
    // again before the redirect below finishes), don't re-navigate — a
    // same-URL href assignment still forces a fresh full-page reload.
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.data?.token) {
      setToken(json.data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiError(res: Response): Promise<Error> {
  try {
    const json = await res.json();
    return new Error(json.error ?? `HTTP ${res.status}`);
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}

const get  = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const put  = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
const del  = <T>(path: string) => request<T>("DELETE", path);
const upload = <T>(path: string, form: FormData) => request<T>("POST", path, form, true);

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** For endpoints that return a raw file (e.g. CSV) instead of the usual JSON
 *  envelope — everything else in this client assumes JSON, so this bypasses
 *  request() entirely rather than teaching it a second response shape. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  let res = await fetch(`${BASE}${path}`, { method: "GET", headers, credentials: "include" });
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) { setToken(null); _onSessionExpired?.(); throw new Error("Session expired"); }
    headers["Authorization"] = `Bearer ${_token}`;
    res = await fetch(`${BASE}${path}`, { method: "GET", headers, credentials: "include" });
  }
  if (!res.ok) throw await apiError(res);
  triggerBlobDownload(await res.blob(), filename);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data: {
    email: string; password: string;
    firstName: string; lastName: string;
    accountType: string; employeeNumber?: string
  }) => post<ApiResponse<UserResponse>>("/auth/register", data),

  login: (email: string, password: string) =>
    post<ApiResponse<UserResponse>>("/auth/login", { email, password }),

  me: () => get<ApiResponse<UserResponse>>("/auth/me"),

  verifyEmail: (token: string) =>
    get<ApiResponse<{ message: string; email: string }>>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: () =>
    post<ApiResponse<{ message: string }>>("/auth/resend-verification"),

  updateProfile: (data: { firstName?: string; lastName?: string; email?: string }) =>
    put<ApiResponse<UserResponse>>("/auth/profile", data),

  logout: () => post<ApiResponse<{ message: string }>>("/auth/logout"),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobs = {
  list: () => get<ListResponse<Job>>("/jobs"),
  get: (id: number) => get<ApiResponse<Job>>(`/jobs/${id}`),
  create: (data: Partial<Job>) => post<ApiResponse<Job>>("/jobs", data),
  update: (id: number, data: Partial<Job>) => put<ApiResponse<Job>>(`/jobs/${id}`, data),
  delete: (id: number) => del<ApiResponse<{ message: string }>>(`/jobs/${id}`),
  // Job-approval workflow
  submitForReview: (id: number) => put<ApiResponse<Job>>(`/jobs/${id}/submit-for-review`, {}),
  review: (id: number, approve: boolean, reason?: string) => put<ApiResponse<Job>>(`/jobs/${id}/review`, { approve, reason }),
  approve: (id: number, approve: boolean, reason?: string) => put<ApiResponse<Job>>(`/jobs/${id}/approve`, { approve, reason }),
  publishDirect: (id: number) => put<ApiResponse<Job>>(`/jobs/${id}/publish`, {}),
};

// ── Applications ──────────────────────────────────────────────────────────────
export const applications = {
  list: (params?: { jobId?: number; status?: string; fromDate?: string; toDate?: string; email?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        ).toString()
      : "";
    return get<ListResponse<Application>>(`/applications${qs}`);
  },

  submit: (data: {
    jobId: number; completion?: number;
    cgpa?: number; university?: string;
    screeningAnswers?: Record<string, string>
  }) => post<ApiResponse<Application>>("/applications", data),

  updateStatus: (id: number, status: string, notifyEmail?: string, notifyMessage?: string) =>
    put<ApiResponse<Application>>(`/applications/${id}/status`, { status, notifyEmail, notifyMessage }),

  bulkStatus: (updates: { id: number; status: string }[]) =>
    put<ApiResponse<{ updated: number }>>("/applications/bulk-status", { updates }),

  withdraw: (id: number) =>
    del<ApiResponse<{ message: string }>>(`/applications/${id}`),

  setDeployment: (id: number, data: { deploymentStation?: string; deploymentDate?: string }) =>
    put<ApiResponse<Application>>(`/applications/${id}/deployment`, data),

  // Server-side CSV export — pulls directly from the database (up to 5000
  // rows) rather than whatever page of `applications` happens to be loaded
  // into the frontend context (capped at 500 by the list endpoint's default),
  // so large result sets no longer export silently truncated.
  exportCsv: (params?: { jobId?: number; status?: string; fromDate?: string; toDate?: string }, filename = `applications-${Date.now()}.csv`) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        ).toString()
      : "";
    return downloadFile(`/applications/export${qs}`, filename);
  },
};

// ── CV ────────────────────────────────────────────────────────────────────────
export const cv = {
  get: () => get<ApiResponse<CvProfile>>("/cv"),
  save: (data: Partial<CvProfile>) => put<ApiResponse<CvProfile>>("/cv", data),
  upload: (file: File, type: "photo" | "document") => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return upload<ApiResponse<UploadResult>>("/cv/upload", form);
  },
  getByEmail: (email: string) =>
    get<ApiResponse<CvProfile | null>>(`/cv/by-email/${encodeURIComponent(email)}`),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settings = {
  get: () => get<ApiResponse<PortalSettings>>("/settings"),
  update: (data: Partial<PortalSettings>) => put<ApiResponse<PortalSettings>>("/settings", data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = {
  list: () => get<ListResponse<Notification>>("/notifications"),
  markRead: (id: number) => put<ApiResponse<{ id: number; isRead: boolean }>>(`/notifications/${id}/read`),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const audit = {
  list: (params?: { actor?: string; action?: string; from?: string; to?: string; limit?: number }) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        ).toString()
      : "";
    return get<ListResponse<AuditEntry>>(`/audit${qs}`);
  },
};

// ── Emails ────────────────────────────────────────────────────────────────────
export const emails = {
  list: () => get<ListResponse<SentEmail>>("/emails"),
  send: (data: { to: string; candidateName: string; subject: string; body: string; trigger: string; jobTitle: string }) =>
    post<ApiResponse<SentEmail>>("/emails", data),
  sendBulk: (emailList: Array<{ to: string; candidateName: string; subject: string; body: string; trigger: string; jobTitle: string }>) =>
    post<ApiResponse<{ inserted: number }>>("/emails/bulk", { emails: emailList }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  track: (type: string, jobId?: number, jobTitle?: string, query?: string) =>
    post<{ success: boolean }>("/analytics/event", { type, jobId, jobTitle, query }).catch(() => null),

  summary: (days = 30) =>
    get<ApiResponse<AnalyticsSummary>>(`/analytics?days=${days}`),
};

// ── Chatbot (Martha) ──────────────────────────────────────────────────────────
export const chatbot = {
  /** Fire-and-forget: never blocks or breaks the chat on failure. */
  logQuery: (data: { query: string; matchedQuestion?: string; outcome: "answered" | "suggested" | "fallback"; persona?: string }) =>
    post<ApiResponse<{ logged: boolean }>>("/chatbot/queries", data).catch(() => null),

  listQueries: (params?: { outcome?: "answered" | "suggested" | "fallback"; days?: number; limit?: number }) => {
    const qs = params
      ? "?" + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        ).toString()
      : "";
    return get<ListResponse<ChatbotQuery>>(`/chatbot/queries${qs}`);
  },
};

export interface ChatbotQuery {
  id: number;
  query: string;
  matchedQuestion: string | null;
  outcome: "answered" | "suggested" | "fallback";
  persona: string;
  askedAt: string;
}

// ── Criteria ──────────────────────────────────────────────────────────────────
export interface PublicJobCriteria {
  requirements: { id: string; kind: string; label: string; mandatory: boolean; usage: string }[];
  screeningQuestions: unknown[];
}

export const criteria = {
  get: (jobId: number) => get<ApiResponse<JobCriteria>>(`/criteria/${jobId}`),
  save: (jobId: number, data: Partial<JobCriteria>) =>
    put<ApiResponse<JobCriteria>>(`/criteria/${jobId}`, data),
  /** Public, candidate-safe subset — no auth required. */
  getPublic: (jobId: number) => get<ApiResponse<PublicJobCriteria>>(`/criteria/${jobId}/public`),
};

// ── Candidate panel scoring ─────────────────────────────────────────────────
export interface CandidateScoreEntry {
  id: number; applicationId: number; scorerUserId: number; scorerName: string; scorerEmail: string;
  score: number; comment: string | null; updatedAt: string;
}
export interface CandidateScoreSummary {
  applicationId: number; candidateName: string; candidateEmail: string; status: string;
  scores: CandidateScoreEntry[]; average: number | null;
}

export const candidateScores = {
  summary: (params: { jobId: number; status?: string }) =>
    get<ListResponse<CandidateScoreSummary>>(`/candidate-scores?${new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString()}`),
  save: (applicationId: number, data: { score: number; comment?: string }) =>
    put<ApiResponse<CandidateScoreEntry>>(`/candidate-scores/${applicationId}`, data),
};

// ── Departments ───────────────────────────────────────────────────────────────
export interface Department {
  id: number;
  name: string;
  code: string;
  headUserId: number | null;
}

export const departments = {
  list: () => get<ListResponse<Department>>("/departments"),
  create: (data: { name: string; code: string }) => post<ApiResponse<Department>>("/departments", data),
  assignHead: (id: number, headUserId: number | null) => put<ApiResponse<Department>>(`/departments/${id}`, { headUserId }),
};

// ── Job templates ────────────────────────────────────────────────────────────
export interface JobTemplate {
  id: number;
  name: string;
  departmentId: number | null;
  sourceJobId: number | null;
  content: Record<string, unknown>;
  createdAt?: string;
}

export const jobTemplates = {
  list: () => get<ListResponse<JobTemplate>>("/job-templates"),
  create: (data: { name: string; departmentId?: number | null; sourceJobId?: number | null; content: Record<string, unknown> }) =>
    post<ApiResponse<JobTemplate>>("/job-templates", data),
  delete: (id: number) => del<ApiResponse<{ message: string }>>(`/job-templates/${id}`),
};

// ── Admin users (Administration section) ───────────────────────────────────────
export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  adminRole: string;
  isActive: boolean;
}

export const adminUsers = {
  list: () => get<ListResponse<AdminUser>>("/users/admin"),
  create: (data: { email: string; password: string; firstName: string; lastName: string; adminRole: string }) =>
    post<ApiResponse<AdminUser>>("/users/admin", data),
};

// ── Assessments ───────────────────────────────────────────────────────────────
export type AssessmentKind = "written" | "psychometric" | "interview" | "practical";
export interface Assessment {
  id: number;
  applicationId: number;
  type: AssessmentKind;
  scheduledAt: string | null;
  venue: string | null;
  score: number | null;
  passed: boolean | null;
  notes: string | null;
}

export const assessments = {
  list: (applicationId: number) => get<ListResponse<Assessment>>(`/assessments/${applicationId}`),
  listAll: () => get<ListResponse<Assessment & { candidateName: string; jobTitle: string; dept: string }>>("/assessments"),
  schedule: (applicationId: number, type: AssessmentKind, data: { scheduledAt: string; venue?: string }) =>
    put<ApiResponse<Assessment>>(`/assessments/${applicationId}/${type}`, data),
  record: (applicationId: number, type: AssessmentKind, data: { score?: number; passed: boolean; notes?: string }) =>
    put<ApiResponse<Assessment>>(`/assessments/${applicationId}/${type}`, data),
};

// ── Permissions ───────────────────────────────────────────────────────────────
export const permissions = {
  list: () => get<ListResponse<PermissionOverride>>("/permissions"),
  save: (data: PermissionOverride) => put<ApiResponse<PermissionOverride>>("/permissions", data),
  roleDefaults: () => get<ApiResponse<{ roles: string[]; defaults: Record<string, Partial<PermissionOverride>> }>>("/permissions/roles/defaults"),
};

// ── Staff ─────────────────────────────────────────────────────────────────────
export const staff = {
  list: () => get<ListResponse<StaffMember>>("/staff"),
  create: (data: {
    employeeNumber: string; firstName: string; lastName: string;
    dept?: string; position?: string; email?: string; joined?: string; status?: string;
  }) => post<ApiResponse<StaffMember>>("/staff", data),
};

// ── Response type helpers ─────────────────────────────────────────────────────
export interface ApiResponse<T> { success: boolean; data: T }
export interface ListResponse<T> { success: boolean; data: T[]; total: number }

// ── Domain types ──────────────────────────────────────────────────────────────
export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  accountType: "external" | "internal" | "admin";
  effectiveType: string;
  adminRole: "super" | "hr" | "recruiter" | null;
  employeeNumber: string | null;
  emailVerified?: boolean;
  token: string;
}

export interface Job {
  id: number; abbr: string; title: string; dept: string; deptKey: string;
  location: string; salary: string; salaryBand: string; type: string;
  closes: string; closesAt: string; visibility: string; minAge: number;
  requiredExperience: number; requiredQualification: string; description: string; featured: boolean;
}

export interface Application {
  id: number; jobId: number; abbr: string; title: string; dept: string;
  date: string; status: string; completion: number; candidateName: string;
  candidateEmail: string; cgpa: number | null; university: string | null;
}

export interface CvProfile {
  personal: Record<string, string>;
  highestLevel: string | null;
  qualifications: unknown[];
  skills: string[];
  experience: unknown[];
  referees: unknown[];
  nextOfKin: Record<string, string>;
  photoFile: string | null;
}

export interface PortalSettings {
  minAgeThreshold: number;
  allowExternalInternalJobs: boolean;
  orgName: string;
  sessionTimeoutMinutes: number;
  emailSenderName: string;
  closingSoonDays: number;
  maxApplicationsPerCandidate: number;
  notifTemplates: { shortlist: string; decline: string; interview: string; offer: string };
}

export interface Notification {
  id: number; recipientEmail: string; title: string; message: string;
  read: boolean; type: string; at: string;
}

export interface AuditEntry {
  id: number; at: string; actor: string; role: string; action: string; target?: string;
}

export interface SentEmail {
  id: number; to: string; candidateName: string; subject: string;
  body: string; sentAt: string; trigger: string; jobTitle: string;
}

export interface AnalyticsSummary {
  events: unknown[]; summary: Record<string, number>;
  topJobs: unknown[]; topSearches: unknown[];
  dailyCounts: { date: string; count: number }[];
}

export interface JobCriteria {
  jobId: number; minCgpa?: number; requiredKeywords: string[];
  notes?: string; screeningQuestions?: unknown[]; minExperienceYears?: number;
  requiredQualLevel?: string; disqualifyingUniversities?: string[];
}

export interface PermissionOverride {
  email: string; role: string;
  canViewApplications: boolean; canShortlist: boolean; canScreenInterns: boolean;
  canSendNotifications: boolean; canManageJobs: boolean; canManageCriteria: boolean;
  canViewStaff: boolean; canExport: boolean; canViewAudit: boolean;
  canManageSettings: boolean; canGrantPermissions: boolean;
  canReviewJob: boolean; canApproveJob: boolean; canManageDepartments: boolean;
  canManageAdmins: boolean; canAssignRights: boolean;
}

export interface StaffMember {
  id: number; empNo: string; firstName: string; lastName: string;
  dept: string | null; position: string | null; email: string | null;
  joined: string | null; status: string;
}

export interface UploadResult {
  url: string; publicId: string; format: string; bytes: number;
}
