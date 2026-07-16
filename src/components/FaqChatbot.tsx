import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronDown } from "lucide-react";

// ── FAQ data — keyword arrays must be lowercase ───────────────────────────────

type FaqEntry = {
  question: string;
  answer: string;
  keywords: string[];
};

const FAQS: FaqEntry[] = [
  // ── Authentication & Access ──────────────────────────────────────────────────
  {
    question: "How do I create a new account?",
    answer:
      "Click the ‘Register’ link on the login page. Provide a valid email address (external candidates should NOT use @caa.co.ug) and a password. Your email will be used for verification and all recruitment communications, so make sure it is correct.",
    keywords: ["register", "create account", "sign up", "new account", "account"],
  },
  {
    question: "I forgot my password. How can I reset it?",
    answer:
      "Click ‘Forgot Password?’ on the login page. Enter your registered email address and we will send you a reset link. Check your spam folder if the email does not arrive within a few minutes.",
    keywords: ["forgot", "password", "reset", "lost password", "can’t remember"],
  },
  {
    question: "My login is not working. What should I do?",
    answer:
      "Double-check your email address and password for typos, and make sure Caps Lock is off. External candidates must not use an @caa.co.ug email. Try resetting your password via ‘Forgot Password?’. If the problem continues, contact HR support with your registered email.",
    keywords: ["login", "log in", "sign in", "not working", "can’t login", "cannot login", "access", "error"],
  },
  {
    question: "How do I log in as internal CAA staff?",
    answer:
      "Use your official CAA email address (ending in @caa.co.ug) and your password. The portal automatically recognises you as an internal candidate based on your email domain, giving you access to internal-only vacancies.",
    keywords: ["internal", "staff", "caa email", "caa.co.ug", "internal login", "employee login"],
  },
  {
    question: "How do I access the HR Console?",
    answer:
      "Navigate to /admin and log in with your HR Console credentials. Access levels differ by role: Recruiters can review applications and set criteria; HR Directors can manage job listings, applications, and reports; Super Admins have full system access. Contact your system administrator if you need credentials.",
    keywords: ["hr console", "admin", "recruiter", "hr director", "super admin", "admin login", "staff login"],
  },
  // ── Finding Vacancies ────────────────────────────────────────────────────────
  {
    question: "How can I find available jobs?",
    answer:
      "Navigate to the ‘Vacancies’ section from the main menu. You can browse all public listings or use the search bar and filters (department, location) to narrow down your options.",
    keywords: ["find", "jobs", "vacancies", "available", "listings", "open positions"],
  },
  {
    question: "Can I search for jobs by keyword?",
    answer:
      "Yes. Use the search bar on the ‘Vacancies’ page to search by job title, skills, or any relevant keyword.",
    keywords: ["search", "keyword", "search jobs", "find job", "job title"],
  },
  {
    question: "How do I filter job listings?",
    answer:
      "On the ‘Vacancies’ page, use the Department and Location filters to refine your search, then click ‘Apply Filters’.",
    keywords: ["filter", "department", "location", "refine", "narrow"],
  },
  {
    question: "What information is on a job details page?",
    answer:
      "Each job page shows a full role description, requirements, department, location, job type (full-time / part-time), and the application closing date, plus an ‘Apply Now’ button.",
    keywords: ["job details", "job description", "requirements", "closing date", "job type"],
  },
  {
    question: "How can I view internal-only job listings?",
    answer:
      "Log in with your @caa.co.ug email. The ‘Vacancies’ page will then display both public and internal-only listings; internal listings are clearly marked.",
    keywords: ["internal jobs", "internal listings", "internal only", "internal vacancies"],
  },
  // ── Applying ─────────────────────────────────────────────────────────────────
  {
    question: "How do I apply for a job?",
    answer:
      "Go to the job details page of the vacancy you want, click ‘Apply Now’, and follow the step-by-step form. You must be logged in to submit an application.",
    keywords: ["apply", "how to apply", "apply now", "submit application", "applying", "start application"],
  },
  {
    question: "What documents do I need to submit?",
    answer:
      "Typically a resume and cover letter. Some roles may also require a profile picture or additional documents. The application form will specify exactly what is needed for each position.",
    keywords: ["documents", "resume", "cv", "cover letter", "upload", "files", "attachments"],
  },
  {
    question: "Can I apply for more than one vacancy?",
    answer:
      "Yes. Internal candidates can apply for both internal-only and public listings. External candidates can apply for any publicly advertised role.",
    keywords: ["multiple", "more than one", "several", "two jobs", "both"],
  },
  {
    question: "What is the status of my application?",
    answer:
      "Log in and go to your ‘Candidate Dashboard’. Each application shows its current status: Pending, Under Review, Shortlisted, Interview, Offered, Declined, or Withdrawn.",
    keywords: ["application status", "status", "check status", "track", "progress", "where is my application"],
  },
  {
    question: "Can I withdraw my application?",
    answer:
      "Yes. From your Candidate Dashboard, find the application and click ‘Withdraw’. Note that some applications (e.g., those already shortlisted) may not be withdrawable — a tooltip will explain if the button is disabled.",
    keywords: ["withdraw", "cancel", "remove application", "take back"],
  },
  // ── Profile & Documents ───────────────────────────────────────────────────────
  {
    question: "How do I update my personal details?",
    answer:
      "Go to the ‘Profile’ section in your candidate dashboard. You can edit your full name, phone number, address, and LinkedIn profile there.",
    keywords: ["update profile", "personal details", "edit profile", "change name", "phone number", "address"],
  },
  {
    question: "How do I upload my resume or cover letter?",
    answer:
      "In the ‘Profile’ section of your dashboard, you will find dedicated upload areas for your resume, cover letter, and profile picture. Make sure your documents are in an accepted format (e.g., PDF) before uploading.",
    keywords: ["upload", "resume", "cv", "cover letter", "profile picture", "photo", "document upload"],
  },
  {
    question: "How do I add my educational qualifications?",
    answer:
      "Navigate to the ‘Education’ sub-section within your Profile. You can add entries for each institution including degree, field of study, and dates, and edit or delete existing entries.",
    keywords: ["education", "degree", "qualification", "university", "institution", "academic"],
  },
  {
    question: "Can I add professional certificates to my profile?",
    answer:
      "Yes. In the ‘Certificates’ sub-section of your Profile, add your certifications including the certificate name, issuing organisation, and issue/expiry dates.",
    keywords: ["certificate", "certification", "professional", "license", "licence"],
  },
  {
    question: "How do I add referee details?",
    answer:
      "Use the ‘Referees’ sub-section in your Profile to add referee contact details including their full name, email, phone number, and their relationship to you.",
    keywords: ["referee", "reference", "referees", "contact referee"],
  },
  // ── Notifications ─────────────────────────────────────────────────────────────
  {
    question: "How will I be notified about my application?",
    answer:
      "You will receive email notifications at every stage — when your application is received, shortlisted, and when an interview or offer is made. You can also check real-time status on your dashboard at any time.",
    keywords: ["notify", "notification", "email notification", "informed", "alert", "update"],
  },
  // ── Shortlisting & Interviews ─────────────────────────────────────────────────
  {
    question: "What happens after I am shortlisted?",
    answer:
      "You will receive an email invitation for an oral interview. The email will include the date, time, venue, and documents to bring. Please respond to confirm your attendance.",
    keywords: ["shortlisted", "shortlist", "after shortlisting", "what next", "interview invitation"],
  },
  {
    question: "What is the interview process like?",
    answer:
      "Interviews are conducted by a panel of HR and technical specialists. Expect competency-based questions, technical questions related to the role, and questions about your experience. Some roles include a written test before the panel interview.",
    keywords: ["interview", "panel", "interview process", "prepare", "questions", "written test"],
  },
  // ── Offers ────────────────────────────────────────────────────────────────────
  {
    question: "How do I receive and respond to a job offer?",
    answer:
      "If selected, you will receive an offer via email and your dashboard status will change to ‘Offered’. Contact the HR team at hr@caa.go.ug to accept or discuss the offer terms.",
    keywords: ["offer", "job offer", "accepted", "offered", "accept offer", "reject offer"],
  },
  // ── HR Console — Applications ─────────────────────────────────────────────────
  {
    question: "How do I review applications in the HR Console?",
    answer:
      "In the HR Console, go to the ‘Applications’ tab. You will see a table of all applications. Click any application to view the full candidate profile and application history.",
    keywords: ["review applications", "applications tab", "candidate profile", "hr console applications"],
  },
  {
    question: "How do I shortlist a candidate?",
    answer:
      "Open the application detail view and update the status to ‘Shortlisted’. Add any relevant notes. The candidate will automatically receive a notification.",
    keywords: ["shortlist candidate", "shortlisting", "how to shortlist"],
  },
  {
    question: "How do I schedule an interview?",
    answer:
      "From the detailed application view, select the option to schedule an interview. Specify the interviewer, date, time, and location. The candidate will be notified by email.",
    keywords: ["schedule interview", "interview scheduling", "book interview", "set interview"],
  },
  {
    question: "How do I extend a job offer to a candidate?",
    answer:
      "When reviewing a candidate’s application, select the option to extend an offer. Specify salary, benefits, and offer expiry date. The candidate will be notified to respond.",
    keywords: ["extend offer", "make offer", "offer candidate", "job offer hr"],
  },
  // ── HR Console — Jobs ─────────────────────────────────────────────────────────
  {
    question: "How do I create a new job vacancy?",
    answer:
      "In the HR Console, go to the ‘Job Listings’ tab and click ‘Create New Vacancy’. Fill in all job details, requirements, and the application deadline, then save.",
    keywords: ["create vacancy", "new job", "post job", "create job", "add vacancy"],
  },
  {
    question: "How do I publish or close a job vacancy?",
    answer:
      "From the ‘Job Listings’ tab, select the vacancy and change its status to ‘Published’ to make it visible to candidates, or ‘Closed’ to stop accepting applications.",
    keywords: ["publish", "close vacancy", "close job", "job status", "activate job"],
  },
  // ── HR Console — Reports ──────────────────────────────────────────────────────
  {
    question: "Where can I find recruitment reports and analytics?",
    answer:
      "HR Directors and Super Admins can access the ‘Reports & Exports’ tab for application statistics, time-to-hire metrics, diversity reports, and CSV/Excel exports. Recruiters can view high-level metrics on their dashboard only.",
    keywords: ["reports", "analytics", "export", "statistics", "csv", "excel", "time to hire"],
  },
  // ── System & Settings ─────────────────────────────────────────────────────────
  {
    question: "How do I manage system settings?",
    answer:
      "Super Admins can access the ‘Settings’ tab in the HR Console to configure system-wide parameters such as email templates, integration keys, and portal branding.",
    keywords: ["settings", "system settings", "email templates", "branding", "configure"],
  },
  {
    question: "How do I view the audit log?",
    answer:
      "The ‘Audit Log’ tab in the HR Console provides a full record of significant system events and user actions. Filter by user, entity type, or date range to track activities.",
    keywords: ["audit", "audit log", "log", "activity", "history", "track actions"],
  },
  {
    question: "How do I manage user permissions and roles?",
    answer:
      "The ‘Permissions’ tab in the HR Console (Super Admin access) allows you to view and update role-based permissions to control what each user type can access across the portal.",
    keywords: ["permissions", "roles", "access control", "user roles", "manage users"],
  },
  // ── General ───────────────────────────────────────────────────────────────────
  {
    question: "Who can I contact for technical support?",
    answer:
      "For technical issues, refer to the ‘Contact Us’ section on the portal or reach out to the CAA IT support team directly.",
    keywords: ["technical support", "support", "it support", "technical issue", "help", "bug"],
  },
  {
    question: "Where can I find information about CAA?",
    answer:
      "General information about the Civil Aviation Authority of Uganda — its mission and values — is available on the main CAA website and in the ‘About Us’ section of this portal.",
    keywords: ["about", "about caa", "caa information", "who is caa", "mission", "values"],
  },
  {
    question: "What are the portal’s privacy policies?",
    answer:
      "Data privacy details and terms of service are available via the links in the footer of the portal. Please review those documents for comprehensive information on how your data is handled.",
    keywords: ["privacy", "privacy policy", "terms", "data", "gdpr", "personal data"],
  },
  {
    question: "Who should I contact for HR questions about internal vacancies?",
    answer:
      "For specific HR questions about internal vacancies or career progression within CAA, contact the HR Department directly at hr@caa.go.ug.",
    keywords: ["hr questions", "internal vacancies", "career progression", "contact hr", "hr department"],
  },
];

const WELCOME_MSG = "Hello! I'm the CAA Uganda recruitment assistant. Ask me anything about applying for a job, the recruitment process, or how to use this portal.";
const SUGGESTIONS = [
  "How do I apply?",
  "Check application status",
  "Internal staff login",
  "Contact HR",
];
const FALLBACK = "I'm not sure about that specific question. For detailed help, please contact the HR team at hr@caa.go.ug or call +256-41-4352 000.";

type Message = { from: "bot" | "user"; text: string };

function findAnswer(query: string): string {
  const q = query.toLowerCase();
  let bestScore = 0;
  let bestAnswer = FALLBACK;
  for (const faq of FAQS) {
    const score = faq.keywords.reduce((s, kw) => s + (q.includes(kw) ? kw.length : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = faq.answer;
    }
  }
  return bestAnswer;
}

export function FaqChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: WELCOME_MSG }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setTyping(true);
    setTimeout(() => {
      const answer = findAnswer(trimmed);
      setTyping(false);
      setMessages((prev) => [...prev, { from: "bot", text: answer }]);
    }, 600);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-40px)] bg-white rounded-2xl shadow-2xl border border-caa-border flex flex-col overflow-hidden"
          style={{ height: "460px" }}>
          {/* Header */}
          <div className="bg-caa-navy px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">CAA Assistant</p>
                <p className="text-white/60 text-[11px]">Recruitment FAQ</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"
              className="text-white/60 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                  m.from === "user"
                    ? "bg-caa-navy text-white rounded-br-sm"
                    : "bg-white text-caa-body border border-caa-border rounded-bl-sm shadow-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-caa-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-caa-navy/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-caa-navy/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-caa-navy/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions — only show at start */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 border-t border-caa-border bg-white flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-[11px] bg-caa-surface border border-caa-border text-caa-navy px-2.5 py-1 rounded-full hover:bg-caa-navy hover:text-white transition-colors font-medium">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-caa-border bg-white flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question…"
              className="flex-1 text-sm border border-caa-border rounded-full px-4 py-1.5 focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20"
            />
            <button onClick={() => send(input)} aria-label="Send"
              className="h-8 w-8 rounded-full bg-caa-navy flex items-center justify-center text-white hover:bg-caa-navy-2 transition-colors shrink-0 disabled:opacity-40"
              disabled={!input.trim()}>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open recruitment assistant"}
        className="h-14 w-14 rounded-full bg-caa-navy text-white shadow-xl hover:bg-caa-navy-2 transition-all flex items-center justify-center relative"
      >
        {open ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-caa-gold text-caa-navy text-[9px] font-bold flex items-center justify-center">
              ?
            </span>
          </>
        )}
      </button>
    </div>
  );
}
