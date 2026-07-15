import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronDown } from "lucide-react";

// ── FAQ data — keyword arrays must be lowercase ───────────────────────────────

type FaqEntry = {
  question: string;
  answer: string;
  keywords: string[];
};

const FAQS: FaqEntry[] = [
  {
    question: "How do I apply for a job?",
    answer:
      “Create a free candidate account by clicking \”Register\” at the top of the page. Once logged in, browse open vacancies, click on a role that interests you, then click \”Apply Now.\” You’ll be guided step-by-step through the online application form.”,
    keywords: [“apply”, “application”, “how to apply”, “submit”, “applying”, “start”, “begin”],
  },
  {
    question: "What documents do I need to apply?",
    answer:
      "You will need: a valid National ID or passport, academic transcripts and certificates, a professional CV (PDF), and reference letters if applicable. Upload these when completing your candidate profile before or during your first application.",
    keywords: ["documents", "document", "upload", "files", "cv", "certificate", "transcript", "id", "passport", "requirements", "needed"],
  },
  {
    question: "Is there an application fee?",
    answer:
      "No. The CAA Uganda e-Recruitment Portal is completely free. We will NEVER ask you to pay any fee at any stage of the recruitment process. If anyone asks you for money, please report it immediately to hr@caa.go.ug.",
    keywords: ["fee", "cost", "pay", "payment", "charge", "money", "free"],
  },
  {
    question: "How long does the recruitment process take?",
    answer:
      "Timelines vary by role, but typically: shortlisting takes 2–4 weeks after the closing date, interviews are scheduled 1–2 weeks after shortlisting, and offer letters are sent within 2 weeks of a successful interview. You can track your exact status on your dashboard at any time.",
    keywords: ["long", "time", "duration", "process", "how long", "timeline", "weeks", "wait", "waiting"],
  },
  {
    question: "How do I check my application status?",
    answer:
      "Log in to your candidate account and go to "My Dashboard." Each application shows its current status: Pending, Under Review, Shortlisted, Interview, Offered, or Declined. You will also receive email notifications whenever your status changes.",
    keywords: ["status", "check", "track", "progress", "update", "where", "dashboard", "application status"],
  },
  {
    question: "I forgot my password. What do I do?",
    answer:
      "On the Sign In page, click "Forgot password?" and enter your registered email address. A password reset link will be sent to your inbox. If you don't receive it within a few minutes, check your spam folder or contact us at hr@caa.go.ug.",
    keywords: ["password", "forgot", "reset", "login", "sign in", "access", "locked out"],
  },
  {
    question: "Can I apply for more than one vacancy?",
    answer:
      "Yes. You can apply for up to 5 open positions at the same time. Your candidate profile (CV, qualifications, referees) is shared across all applications, so you only need to fill it in once.",
    keywords: ["multiple", "more than one", "two", "several", "many vacancies", "can i apply", "limit", "applications"],
  },
  {
    question: "What are the minimum qualifications?",
    answer:
      "Requirements vary by role — check the specific job posting for its minimum qualification, experience level, and age requirements. Most positions at CAA Uganda require at least a relevant Bachelor's degree or Diploma, plus some professional experience. Detailed requirements are listed in each job advert.",
    keywords: ["qualification", "qualifications", "minimum", "degree", "diploma", "education", "experience", "age", "requirements", "eligible", "eligibility"],
  },
  {
    question: "Can internal CAA staff apply for advertised roles?",
    answer:
      "Yes. Internal CAA staff members can apply using the "Internal CAA Staff" account type when registering. You will need your CAA employee number for verification. Some roles are exclusively open to internal applicants — these are labelled "Internal" in the vacancies list.",
    keywords: ["internal", "staff", "employee", "already working", "caa staff", "internal staff"],
  },
  {
    question: "How will I be notified about my application?",
    answer:
      "You receive email notifications at every stage — when your application is received, when it is shortlisted, and when an interview or offer is made. You can also check real-time status updates by logging in to your dashboard at any time.",
    keywords: ["notify", "notification", "email", "informed", "alert", "contact", "called"],
  },
  {
    question: "What happens after I'm shortlisted?",
    answer:
      "If you are shortlisted, you will receive an email invitation for an oral interview at CAA Uganda headquarters in Entebbe. The email will include the interview date, time, venue, and any documents to bring. Please respond to confirm your attendance.",
    keywords: ["shortlisted", "shortlist", "interview", "invited", "oral", "what next", "after shortlisting"],
  },
  {
    question: "What is the interview process like?",
    answer:
      "Interviews at CAA Uganda are conducted by a panel comprising HR and technical specialists. You may be asked competency-based questions, technical questions related to the role, and questions about your experience. Some roles may include a written test before the panel interview.",
    keywords: ["interview", "panel", "questions", "prepare", "preparation", "test", "written"],
  },
  {
    question: "How do I update my profile or CV?",
    answer:
      "Log in to your dashboard and click on your name or the edit icon to update your personal information. To update your CV or qualifications, go to any active application and edit the corresponding section. Your updated profile will apply to all future applications.",
    keywords: ["update", "edit", "change", "profile", "cv", "personal information", "details"],
  },
  {
    question: "Is CAA Uganda an equal-opportunity employer?",
    answer:
      "Yes. The Civil Aviation Authority of Uganda is an equal-opportunity employer. We welcome applications from all qualified candidates regardless of gender, ethnicity, disability, or religion. Persons with disabilities are especially encouraged to apply.",
    keywords: ["equal", "opportunity", "disability", "gender", "fair", "discrimination", "diversity"],
  },
  {
    question: "How do I contact HR directly?",
    answer:
      "You can reach the CAA Uganda HR Department at hr@caa.go.ug or call +256-41-4352 000. Our offices are located at the Uganda Civil Aviation Authority, Entebbe, Uganda (P.O. Box 5536, Kampala). Office hours are Monday–Friday, 8:00 AM – 5:00 PM.",
    keywords: ["contact", "phone", "email hr", "reach", "call", "address", "location", "office", "hr department"],
  },
  {
    question: "Why can't I log in?",
    answer:
      "Check that: (1) you're using the email address you registered with, (2) your password is correct (use "Forgot password?" if unsure), and (3) your Caps Lock key is off. If you still cannot log in, clear your browser cache or try a different browser, then contact hr@caa.go.ug for assistance.",
    keywords: ["can't log in", "cannot login", "login problem", "sign in problem", "error", "access denied"],
  },
];

const WELCOME_MSG = "Hello! I'm the CAA Uganda recruitment assistant. Ask me anything about applying for a job, the recruitment process, or how to use this portal.";
const SUGGESTIONS = [
  "How do I apply?",
  "What documents do I need?",
  "Is there a fee?",
  "Check application status",
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
