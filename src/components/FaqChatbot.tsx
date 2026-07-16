import { useState, useRef, useEffect } from "react";
import { X, Send, ChevronDown } from "lucide-react";
import { MarthaAvatar } from "./MarthaAvatar";
import { useApp } from "@/context/AppContext";

// ── FAQ data — keyword arrays must be lowercase ───────────────────────────────
// followUps entries must exactly match another entry's `question` string so the
// chips resolve to that answer when clicked.

type FaqEntry = {
  question: string;
  answer: string;
  keywords: string[];
  followUps?: string[];
};

const FAQS: FaqEntry[] = [
  // ── Authentication & Access ──────────────────────────────────────────────────
  {
    question: "How do I create a new account?",
    answer:
      "Click the 'Register' link on the login page. Provide a valid email address (external candidates should NOT use @caa.co.ug) and a password. Your email will be used for verification and all recruitment communications, so make sure it is correct.",
    keywords: ["register", "create account", "sign up", "new account", "account"],
    followUps: ["How do I apply for a job?", "How can I find available jobs?", "I forgot my password. How can I reset it?"],
  },
  {
    question: "I forgot my password. How can I reset it?",
    answer:
      "Click 'Forgot Password?' on the login page. Enter your registered email address and we will send you a reset link. Check your spam folder if the email does not arrive within a few minutes.",
    keywords: ["forgot", "password", "reset", "lost password", "can't remember"],
    followUps: ["My login is not working. What should I do?", "How do I create a new account?"],
  },
  {
    question: "My login is not working. What should I do?",
    answer:
      "Double-check your email address and password for typos, and make sure Caps Lock is off. External candidates must not use an @caa.co.ug email. Try resetting your password via 'Forgot Password?'. If the problem continues, contact HR support with your registered email.",
    keywords: ["login", "log in", "sign in", "not working", "can't login", "cannot login", "access", "error"],
    followUps: ["I forgot my password. How can I reset it?", "Where are CAA offices located and how do I contact them?"],
  },
  {
    question: "How do I log in as internal CAA staff?",
    answer:
      "Use your official CAA email address (ending in @caa.co.ug) and your password. The portal automatically recognises you as an internal candidate based on your email domain, giving you access to internal-only vacancies.",
    keywords: ["internal", "staff", "caa email", "caa.co.ug", "internal login", "employee login"],
    followUps: ["How can I view internal-only job listings?", "Can I apply for more than one vacancy?"],
  },
  {
    question: "How do I access the HR Console?",
    answer:
      "Navigate to /admin and log in with your HR Console credentials. Access levels differ by role: Recruiters can review applications and set criteria; HR Directors can manage job listings, applications, and reports; Super Admins have full system access. Contact your system administrator if you need credentials.",
    keywords: ["hr console", "admin", "recruiter", "hr director", "super admin", "admin login", "staff login"],
    followUps: ["How do I review applications in the HR Console?", "How do I create a new job vacancy?"],
  },
  // ── Finding Vacancies ────────────────────────────────────────────────────────
  {
    question: "How can I find available jobs?",
    answer:
      "Navigate to the 'Vacancies' section from the main menu. You can browse all public listings or use the search bar and filters (department, location) to narrow down your options.",
    keywords: ["find", "jobs", "vacancies", "available", "listings", "open positions"],
    followUps: ["How do I apply for a job?", "How do I filter job listings?", "How can I view internal-only job listings?"],
  },
  {
    question: "Can I search for jobs by keyword?",
    answer:
      "Yes. Use the search bar on the 'Vacancies' page to search by job title, skills, or any relevant keyword.",
    keywords: ["search", "keyword", "search jobs", "find job", "job title"],
    followUps: ["How do I filter job listings?", "How do I apply for a job?"],
  },
  {
    question: "How do I filter job listings?",
    answer:
      "On the 'Vacancies' page, use the Department and Location filters to refine your search, then click 'Apply Filters'.",
    keywords: ["filter", "department", "location", "refine", "narrow"],
    followUps: ["What departments exist at CAA?", "How do I apply for a job?"],
  },
  {
    question: "What information is on a job details page?",
    answer:
      "Each job page shows a full role description, requirements, department, location, job type (full-time / part-time), and the application closing date, plus an 'Apply Now' button.",
    keywords: ["job details", "job description", "requirements", "closing date", "job type"],
    followUps: ["How do I apply for a job?", "What documents do I need to submit?"],
  },
  {
    question: "How can I view internal-only job listings?",
    answer:
      "Log in with your @caa.co.ug email. The 'Vacancies' page will then display both public and internal-only listings; internal listings are clearly marked.",
    keywords: ["internal jobs", "internal listings", "internal only", "internal vacancies"],
    followUps: ["How do I log in as internal CAA staff?", "Can I apply for more than one vacancy?"],
  },
  // ── Applying ─────────────────────────────────────────────────────────────────
  {
    question: "How do I apply for a job?",
    answer:
      "Go to the job details page of the vacancy you want, click 'Apply Now', and follow the step-by-step form. You must be logged in to submit an application.",
    keywords: ["apply", "how to apply", "apply now", "submit application", "applying", "start application"],
    followUps: ["What documents do I need to submit?", "What is the status of my application?", "Can I apply for more than one vacancy?"],
  },
  {
    question: "What documents do I need to submit?",
    answer:
      "Typically a resume and cover letter. Some roles may also require a profile picture or additional documents. The application form will specify exactly what is needed for each position.",
    keywords: ["documents", "resume", "cv", "cover letter", "upload", "files", "attachments"],
    followUps: ["How do I upload my resume or cover letter?", "How do I add my educational qualifications?"],
  },
  {
    question: "Can I apply for more than one vacancy?",
    answer:
      "Yes. Internal candidates can apply for both internal-only and public listings. External candidates can apply for any publicly advertised role.",
    keywords: ["multiple", "more than one", "several", "two jobs", "both"],
    followUps: ["What is the status of my application?", "Can I withdraw my application?"],
  },
  {
    question: "What is the status of my application?",
    answer:
      "Log in and go to your 'Candidate Dashboard'. Each application shows its current status: Pending, Under Review, Shortlisted, Interview, Offered, Declined, or Withdrawn.",
    keywords: ["application status", "status", "check status", "track", "progress", "where is my application"],
    followUps: ["How will I be notified about my application?", "What happens after I am shortlisted?", "Can I withdraw my application?"],
  },
  {
    question: "Can I withdraw my application?",
    answer:
      "Yes. From your Candidate Dashboard, find the application and click 'Withdraw'. Note that some applications (e.g., those already shortlisted) may not be withdrawable — a tooltip will explain if the button is disabled.",
    keywords: ["withdraw", "cancel", "remove application", "take back"],
    followUps: ["Can I apply for more than one vacancy?", "How can I find available jobs?"],
  },
  // ── Profile & Documents ───────────────────────────────────────────────────────
  {
    question: "How do I update my personal details?",
    answer:
      "Go to the 'Profile' section in your candidate dashboard. You can edit your full name, phone number, address, and LinkedIn profile there.",
    keywords: ["update profile", "personal details", "edit profile", "change name", "phone number", "address"],
    followUps: ["How do I upload my resume or cover letter?", "How do I add referee details?"],
  },
  {
    question: "How do I upload my resume or cover letter?",
    answer:
      "In the 'Profile' section of your dashboard, you will find dedicated upload areas for your resume, cover letter, and profile picture. Make sure your documents are in an accepted format (e.g., PDF) before uploading.",
    keywords: ["upload", "resume", "cv", "cover letter", "profile picture", "photo", "document upload"],
    followUps: ["How do I add my educational qualifications?", "Can I add professional certificates to my profile?"],
  },
  {
    question: "How do I add my educational qualifications?",
    answer:
      "Navigate to the 'Education' sub-section within your Profile. You can add entries for each institution including degree, field of study, and dates, and edit or delete existing entries.",
    keywords: ["education", "degree", "qualification", "university", "institution", "academic"],
    followUps: ["Can I add professional certificates to my profile?", "How do I add referee details?"],
  },
  {
    question: "Can I add professional certificates to my profile?",
    answer:
      "Yes. In the 'Certificates' sub-section of your Profile, add your certifications including the certificate name, issuing organisation, and issue/expiry dates.",
    keywords: ["certificate", "certification", "professional", "license", "licence"],
    followUps: ["How do I add my educational qualifications?", "How do I apply for a job?"],
  },
  {
    question: "How do I add referee details?",
    answer:
      "Use the 'Referees' sub-section in your Profile to add referee contact details including their full name, email, phone number, and their relationship to you.",
    keywords: ["referee", "reference", "referees", "contact referee"],
    followUps: ["How do I update my personal details?", "How do I apply for a job?"],
  },
  // ── Notifications ─────────────────────────────────────────────────────────────
  {
    question: "How will I be notified about my application?",
    answer:
      "You will receive email notifications at every stage — when your application is received, shortlisted, and when an interview or offer is made. You can also check real-time status on your dashboard at any time.",
    keywords: ["notify", "notification", "email notification", "informed", "alert", "update"],
    followUps: ["What is the status of my application?", "What happens after I am shortlisted?"],
  },
  // ── Shortlisting & Interviews ─────────────────────────────────────────────────
  {
    question: "What happens after I am shortlisted?",
    answer:
      "You will receive an email invitation for an oral interview. The email will include the date, time, venue, and documents to bring. Please respond to confirm your attendance.",
    keywords: ["shortlisted", "shortlist", "after shortlisting", "what next", "interview invitation"],
    followUps: ["What is the interview process like?", "How do I receive and respond to a job offer?"],
  },
  {
    question: "What is the interview process like?",
    answer:
      "Interviews are conducted by a panel of HR and technical specialists. Expect competency-based questions, technical questions related to the role, and questions about your experience. Some roles include a written test before the panel interview.",
    keywords: ["interview", "panel", "interview process", "prepare", "questions", "written test"],
    followUps: ["How do I receive and respond to a job offer?", "What happens after I am shortlisted?"],
  },
  // ── Offers ────────────────────────────────────────────────────────────────────
  {
    question: "How do I receive and respond to a job offer?",
    answer:
      "If selected, you will receive an offer via email and your dashboard status will change to 'Offered'. Contact the HR team at hr@caa.go.ug to accept or discuss the offer terms.",
    keywords: ["offer", "job offer", "accepted", "offered", "accept offer", "reject offer"],
    followUps: ["Why work at CAA? What are the benefits?", "Where are CAA offices located and how do I contact them?"],
  },
  // ── HR Console — Applications ─────────────────────────────────────────────────
  {
    question: "How do I review applications in the HR Console?",
    answer:
      "In the HR Console, go to the 'Applications' tab. You will see a table of all applications. Click any application to view the full candidate profile and application history.",
    keywords: ["review applications", "applications tab", "candidate profile", "hr console applications"],
    followUps: ["How do I shortlist a candidate?", "How do I schedule an interview?"],
  },
  {
    question: "How do I shortlist a candidate?",
    answer:
      "Open the application detail view and update the status to 'Shortlisted'. Add any relevant notes. The candidate will automatically receive a notification.",
    keywords: ["shortlist candidate", "shortlisting", "how to shortlist"],
    followUps: ["How do I schedule an interview?", "How do I extend a job offer to a candidate?"],
  },
  {
    question: "How do I schedule an interview?",
    answer:
      "From the detailed application view, select the option to schedule an interview. Specify the interviewer, date, time, and location. The candidate will be notified by email.",
    keywords: ["schedule interview", "interview scheduling", "book interview", "set interview"],
    followUps: ["How do I extend a job offer to a candidate?", "How do I review applications in the HR Console?"],
  },
  {
    question: "How do I extend a job offer to a candidate?",
    answer:
      "When reviewing a candidate's application, select the option to extend an offer. Specify salary, benefits, and offer expiry date. The candidate will be notified to respond.",
    keywords: ["extend offer", "make offer", "offer candidate", "job offer hr"],
    followUps: ["How do I schedule an interview?", "Where can I find recruitment reports and analytics?"],
  },
  // ── HR Console — Jobs ─────────────────────────────────────────────────────────
  {
    question: "How do I create a new job vacancy?",
    answer:
      "In the HR Console, go to the 'Job Listings' tab and click 'Create New Vacancy'. Fill in all job details, requirements, and the application deadline, then save.",
    keywords: ["create vacancy", "new job", "post job", "create job", "add vacancy"],
    followUps: ["How do I publish or close a job vacancy?", "How do I review applications in the HR Console?"],
  },
  {
    question: "How do I publish or close a job vacancy?",
    answer:
      "From the 'Job Listings' tab, select the vacancy and change its status to 'Published' to make it visible to candidates, or 'Closed' to stop accepting applications.",
    keywords: ["publish", "close vacancy", "close job", "job status", "activate job"],
    followUps: ["How do I create a new job vacancy?", "Where can I find recruitment reports and analytics?"],
  },
  // ── HR Console — Reports ──────────────────────────────────────────────────────
  {
    question: "Where can I find recruitment reports and analytics?",
    answer:
      "HR Directors and Super Admins can access the 'Reports & Exports' tab for application statistics, time-to-hire metrics, diversity reports, and CSV/Excel exports. Recruiters can view high-level metrics on their dashboard only.",
    keywords: ["reports", "analytics", "export", "statistics", "csv", "excel", "time to hire"],
    followUps: ["How do I view the audit log?", "How do I manage system settings?"],
  },
  // ── System & Settings ─────────────────────────────────────────────────────────
  {
    question: "How do I manage system settings?",
    answer:
      "Super Admins can access the 'Settings' tab in the HR Console to configure system-wide parameters such as email templates, integration keys, and portal branding.",
    keywords: ["settings", "system settings", "email templates", "branding", "configure"],
    followUps: ["How do I manage user permissions and roles?", "How do I view the audit log?"],
  },
  {
    question: "How do I view the audit log?",
    answer:
      "The 'Audit Log' tab in the HR Console provides a full record of significant system events and user actions. Filter by user, entity type, or date range to track activities.",
    keywords: ["audit", "audit log", "log", "activity", "history", "track actions"],
    followUps: ["How do I manage user permissions and roles?", "Where can I find recruitment reports and analytics?"],
  },
  {
    question: "How do I manage user permissions and roles?",
    answer:
      "The 'Permissions' tab in the HR Console (Super Admin access) allows you to view and update role-based permissions to control what each user type can access across the portal.",
    keywords: ["permissions", "roles", "access control", "user roles", "manage users"],
    followUps: ["How do I manage system settings?", "How do I access the HR Console?"],
  },
  // ── About CAA ─────────────────────────────────────────────────────────────────
  {
    question: "What is the Civil Aviation Authority of Uganda?",
    answer:
      "The Uganda Civil Aviation Authority (UCAA) is the government agency responsible for regulating civil aviation in Uganda, operating under the Ministry of Works and Transport. We oversee aviation safety and security, license aviation personnel and operators, provide air navigation services, and manage Entebbe International Airport along with several upcountry aerodromes.",
    keywords: ["what is caa", "about caa", "ucaa", "civil aviation authority", "who is caa", "about", "caa information"],
    followUps: ["What does CAA do?", "Which airports does CAA manage?", "Why work at CAA? What are the benefits?"],
  },
  {
    question: "What does CAA do?",
    answer:
      "Our core functions include: regulating aviation safety and security; licensing pilots, engineers, and other aviation personnel; certifying air operators and registering aircraft; providing air navigation services; managing airports; regulating the economics of the air transport industry; and advising the government on civil aviation matters.",
    keywords: ["what does caa do", "mandate", "functions", "role of caa", "responsibilities", "caa work"],
    followUps: ["Which airports does CAA manage?", "What are the drone regulations in Uganda?", "What departments exist at CAA?"],
  },
  {
    question: "What are CAA's mission and values?",
    answer:
      "Our mission is to promote a safe, secure, efficient, and environmentally responsible civil aviation industry in Uganda. Our core values include safety, integrity, professionalism, customer focus, and teamwork. These values guide everything we do — including how we recruit.",
    keywords: ["mission", "values", "vision", "core values", "culture"],
    followUps: ["What is the Civil Aviation Authority of Uganda?", "Is CAA an equal opportunity employer?"],
  },
  {
    question: "Which airports does CAA manage?",
    answer:
      "CAA manages Entebbe International Airport — Uganda's main international gateway — as well as upcountry aerodromes including Arua, Gulu, Kasese, Kidepo, Kisoro, Mbarara, Moroto, Pakuba, Soroti, and Tororo.",
    keywords: ["airports", "aerodromes", "entebbe", "which airports", "airfields", "international airport"],
    followUps: ["What does CAA do?", "How do I lodge a complaint about a flight or airline?"],
  },
  {
    question: "What departments exist at CAA?",
    answer:
      "CAA's major directorates include Air Traffic Management; Airports and Aviation Security; Safety, Security and Economic Regulation; Human Resource and Administration; Finance; Legal and Board Affairs; and ICT and Communications. Vacancies on this portal indicate which department each role belongs to.",
    keywords: ["departments", "directorates", "divisions", "units", "sections"],
    followUps: ["How do I filter job listings?", "How can I find available jobs?"],
  },
  // ── Aviation Careers & Licensing ─────────────────────────────────────────────
  {
    question: "How do I become a pilot in Uganda?",
    answer:
      "You train with an approved aviation training organisation — for example the East African Civil Aviation Academy in Soroti — starting with a Private Pilot Licence (PPL) and progressing to a Commercial Pilot Licence (CPL). You must pass medical examinations and licensing exams. All pilot licences in Uganda are issued by CAA's Personnel Licensing office.",
    keywords: ["pilot", "become a pilot", "flying school", "ppl", "cpl", "fly a plane", "aviation school", "flight training"],
    followUps: ["Does CAA offer aviation training or scholarships?", "How do I become an air traffic controller?"],
  },
  {
    question: "How do I become an air traffic controller?",
    answer:
      "Air traffic controllers typically need a science-based degree or diploma, followed by specialised ATC training at an accredited institution. CAA periodically advertises trainee air traffic controller positions on this portal — successful candidates also undergo medical fitness and aptitude assessments.",
    keywords: ["air traffic controller", "atc", "controller", "air traffic"],
    followUps: ["How can I find available jobs?", "Does CAA offer aviation training or scholarships?"],
  },
  {
    question: "What are the drone regulations in Uganda?",
    answer:
      "Operating a drone (Unmanned Aircraft System) in Uganda requires prior authorization from CAA. You must apply for a permit before importing or flying a drone. Key restrictions include: no flying near airports or aerodromes, over crowds, or beyond prescribed altitudes. Contact CAA directly for the application requirements and current guidelines.",
    keywords: ["drone", "drones", "uas", "unmanned", "drone permit", "fly a drone", "quadcopter", "drone license"],
    followUps: ["Where are CAA offices located and how do I contact them?", "What does CAA do?"],
  },
  {
    question: "How do I register an aircraft in Uganda?",
    answer:
      "Aircraft registration is handled by CAA's Airworthiness section. You submit an application with proof of ownership, insurance documentation, and the aircraft undergoes an airworthiness inspection before a certificate of registration is issued. Contact CAA for the full requirements and fees.",
    keywords: ["register aircraft", "aircraft registration", "airworthiness", "register a plane"],
    followUps: ["How do I get an Air Operator Certificate?", "Where are CAA offices located and how do I contact them?"],
  },
  {
    question: "How do I get an Air Operator Certificate?",
    answer:
      "To operate an airline or charter service in Uganda, you need an Air Operator Certificate (AOC) from CAA. Certification follows a five-phase process: pre-application, formal application, document evaluation, demonstration and inspection, and final certification. The Flight Safety directorate guides applicants through each phase.",
    keywords: ["aoc", "air operator", "start an airline", "charter", "operator certificate", "airline license"],
    followUps: ["How do I register an aircraft in Uganda?", "What does CAA do?"],
  },
  // ── Opportunities & Working at CAA ───────────────────────────────────────────
  {
    question: "Does CAA offer internships or industrial training?",
    answer:
      "Yes. CAA periodically offers internship and industrial training placements for students and recent graduates. These opportunities are advertised on this portal under Vacancies when available. Students should apply with an introduction letter from their institution. You can also enquire with HR at hr@caa.go.ug.",
    keywords: ["internship", "intern", "industrial training", "placement", "student", "attachment", "graduate trainee"],
    followUps: ["How can I find available jobs?", "Does CAA offer aviation training or scholarships?"],
  },
  {
    question: "Does CAA offer aviation training or scholarships?",
    answer:
      "The East African Civil Aviation Academy in Soroti trains pilots, aircraft maintenance engineers, and flight dispatchers. CAA also invests in continuous staff development, including internationally recognised aviation courses. Scholarship or sponsored-training opportunities, when available, are announced publicly.",
    keywords: ["scholarship", "training", "academy", "soroti", "study aviation", "aviation course", "sponsorship"],
    followUps: ["How do I become a pilot in Uganda?", "Does CAA offer internships or industrial training?"],
  },
  {
    question: "Why work at CAA? What are the benefits?",
    answer:
      "Working at CAA means contributing to the safety of everyone who flies in Uganda. Staff enjoy competitive remuneration, medical cover, pension benefits, and exceptional professional development — including specialised aviation training with international bodies like ICAO. You will work with dedicated professionals in a mission-driven organisation.",
    keywords: ["benefits", "why work", "perks", "salary and benefits", "staff benefits", "working at caa", "career growth"],
    followUps: ["How can I find available jobs?", "Is CAA an equal opportunity employer?", "What are CAA's mission and values?"],
  },
  {
    question: "Is CAA an equal opportunity employer?",
    answer:
      "Absolutely. CAA is committed to merit-based, transparent recruitment and welcomes applications from all qualified candidates regardless of gender, disability, religion, or ethnicity. Every application submitted through this portal goes through the same fair review process.",
    keywords: ["equal opportunity", "diversity", "disability", "gender", "fair", "discrimination", "inclusive"],
    followUps: ["How do I apply for a job?", "What are CAA's mission and values?"],
  },
  // ── Contact & Public Services ─────────────────────────────────────────────────
  {
    question: "Where are CAA offices located and how do I contact them?",
    answer:
      "CAA's head office is located at Entebbe International Airport, Airport Road, Entebbe — P.O. Box 5536, Kampala. You can call +256-41-4352 000 or email the HR team at hr@caa.go.ug for recruitment matters. Office hours are Monday to Friday, 8:00 AM to 5:00 PM.",
    keywords: ["contact", "location", "address", "phone", "office", "where is caa", "reach", "email caa", "call"],
    followUps: ["Who can I contact for technical support?", "Which airports does CAA manage?"],
  },
  {
    question: "How do I lodge a complaint about a flight or airline?",
    answer:
      "Start by raising the issue with your airline — they are your first point of contact for delays, cancellations, lost baggage, or refunds. If the airline does not resolve it satisfactorily, you can escalate to CAA's consumer affairs team with your booking details, correspondence, and a description of the issue.",
    keywords: ["complaint", "delayed flight", "cancelled", "refund", "airline complaint", "passenger rights", "lost baggage", "lost luggage"],
    followUps: ["Where are CAA offices located and how do I contact them?", "Which airports does CAA manage?"],
  },
  {
    question: "Who can I contact for technical support?",
    answer:
      "For technical issues with this portal, refer to the 'Contact Us' section or reach out to the CAA IT support team directly. For recruitment questions, email hr@caa.go.ug.",
    keywords: ["technical support", "support", "it support", "technical issue", "help desk", "bug", "not loading"],
    followUps: ["My login is not working. What should I do?", "Where are CAA offices located and how do I contact them?"],
  },
  {
    question: "What are the portal's privacy policies?",
    answer:
      "Data privacy details and terms of service are available via the links in the footer of the portal. Your personal information is used only for recruitment purposes and handled in line with applicable data protection laws.",
    keywords: ["privacy", "privacy policy", "terms", "data protection", "gdpr", "personal data", "my data"],
    followUps: ["How do I update my personal details?", "Is CAA an equal opportunity employer?"],
  },
  {
    question: "Who should I contact for HR questions about internal vacancies?",
    answer:
      "For specific HR questions about internal vacancies or career progression within CAA, contact the HR Department directly at hr@caa.go.ug.",
    keywords: ["hr questions", "internal vacancies question", "career progression", "contact hr", "hr department", "talk to hr", "speak to hr", "human resource"],
    followUps: ["How can I view internal-only job listings?", "How do I log in as internal CAA staff?"],
  },
];

// ── Martha's personality ──────────────────────────────────────────────────────

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Starter/suggestion topics tailored to who is signed in.
// Every string must exactly match a FAQS question.
type Persona = "guest" | "external" | "internal" | "recruiter" | "hr" | "super";

const ROLE_TOPICS: Record<Persona, string[]> = {
  guest: [
    "How do I create a new account?",
    "How do I apply for a job?",
    "What does CAA do?",
    "What are the drone regulations in Uganda?",
  ],
  external: [
    "How do I apply for a job?",
    "What is the status of my application?",
    "What documents do I need to submit?",
    "Why work at CAA? What are the benefits?",
  ],
  internal: [
    "How can I view internal-only job listings?",
    "Can I apply for more than one vacancy?",
    "Who should I contact for HR questions about internal vacancies?",
    "What is the status of my application?",
  ],
  recruiter: [
    "How do I review applications in the HR Console?",
    "How do I shortlist a candidate?",
    "How do I schedule an interview?",
    "What is the interview process like?",
  ],
  hr: [
    "How do I create a new job vacancy?",
    "How do I publish or close a job vacancy?",
    "Where can I find recruitment reports and analytics?",
    "How do I extend a job offer to a candidate?",
  ],
  super: [
    "How do I manage user permissions and roles?",
    "How do I manage system settings?",
    "How do I view the audit log?",
    "Where can I find recruitment reports and analytics?",
  ],
};

const WELCOMES = [
  (name: string) => `${timeGreeting()}${name ? `, ${name}` : ""}! I'm Martha, your CAA virtual assistant. I can help with job applications, aviation careers, drone permits, and anything else about the Civil Aviation Authority. What can I do for you today?`,
  (name: string) => `${timeGreeting()}${name ? `, ${name}` : ""}! Martha here — your guide to everything CAA Uganda. Ask me about vacancies, the recruitment process, our airports, or aviation in general. How can I help?`,
  (name: string) => `Hello${name ? ` ${name}` : ""}, and welcome! My name is Martha and I work with the CAA Uganda team. Whether it's finding a job, checking your application, or a question about aviation in Uganda — I'm happy to help.`,
];

const FALLBACKS = [
  "Hmm, that one is outside what I know at the moment. For detailed help, please contact the HR team at hr@caa.go.ug or call +256-41-4352 000. Meanwhile, here are some things I can definitely help with:",
  "I'm sorry, I don't have a good answer for that yet. You can reach a human colleague at hr@caa.go.ug or +256-41-4352 000. Perhaps one of these topics is helpful?",
  "That's a great question, but it's beyond my current knowledge. The team at hr@caa.go.ug or +256-41-4352 000 can help you directly. In the meantime, I can tell you about:",
];

const FALLBACK_TOPICS = [
  ["How do I apply for a job?", "What does CAA do?", "Where are CAA offices located and how do I contact them?"],
  ["What is the status of my application?", "Which airports does CAA manage?", "Does CAA offer internships or industrial training?"],
  ["How can I find available jobs?", "What are the drone regulations in Uganda?", "Why work at CAA? What are the benefits?"],
];

type SmallTalkRule = {
  test: RegExp;
  replies: string[];
  followUps?: string[];
  /** Use the signed-in persona's starter topics as follow-ups. */
  starters?: boolean;
};

const SMALL_TALK: SmallTalkRule[] = [
  {
    test: /\b(who are you|what are you|your name|about you|who is martha)\b/,
    replies: [
      "I'm Martha! I'm the virtual assistant for the Civil Aviation Authority of Uganda. I help candidates, staff, and the public with questions about careers, our airports, licensing, and anything CAA. I'm not a human, but I do my best to be just as helpful.",
      "My name is Martha — CAA Uganda's virtual assistant. Think of me as your first point of contact: I can guide you through job applications, aviation questions, and how to reach the right people at CAA.",
    ],
    starters: true,
  },
  {
    test: /\bare you (a |an )?(human|real|robot|bot|ai|person)\b/,
    replies: [
      "I'm a virtual assistant — so a friendly bot, not a human. But I've been trained on everything CAA, so ask away! And if you need a real person, I can point you to the right contact.",
      "Not human, I'm afraid — I'm CAA's virtual assistant. But I'm here around the clock, which my human colleagues can't say! What can I help you with?",
    ],
    followUps: ["Where are CAA offices located and how do I contact them?", "How do I apply for a job?"],
  },
  {
    test: /\bhow are you\b/,
    replies: [
      "I'm doing wonderfully, thank you for asking! Always happy when someone stops by. How can I help you today?",
      "Very well, thank you! It's a good day to talk aviation. What's on your mind?",
    ],
    starters: true,
  },
  {
    test: /\b(thank you|thanks|thankyou|appreciate|asante|webale)\b/,
    replies: [
      "You're most welcome! Is there anything else I can help you with?",
      "My pleasure! Don't hesitate to ask if anything else comes up.",
      "Happy to help! I'll be right here if you need anything else.",
    ],
  },
  {
    test: /\b(bye|goodbye|see you|good night|farewell)\b/,
    replies: [
      "Goodbye, and thank you for stopping by! Wishing you clear skies ahead.",
      "Take care! Come back any time — I'm always here if you have questions.",
      "Bye for now! Best of luck, and safe travels.",
    ],
  },
  {
    test: /\b(joke|make me laugh|something funny)\b/,
    replies: [
      "Why did the aeroplane get sent to its room? Bad altitude! Okay, I'll stick to my day job — what can I help you with?",
      "What do you call a flying police officer? A heli-copper! Alright, aviation humour isn't my strong suit — but CAA questions definitely are. Try me!",
    ],
    starters: true,
  },
  {
    test: /^(hi|hello|hey|hallo|howdy|greetings|good (morning|afternoon|evening))\b|\b(hi|hello),? martha\b/,
    replies: [
      `${timeGreeting()}! Lovely to hear from you. What can I help you with today?`,
      "Hello there! I'm Martha, always happy to help. What would you like to know?",
      "Hi! Great to see you. Ask me anything about CAA — jobs, airports, licensing, you name it.",
    ],
    starters: true,
  },
  {
    test: /\b(help|what can you do|options|menu)\b/,
    replies: [
      "Of course! I can help you with: applying for jobs and tracking applications, your candidate profile and documents, aviation careers (pilots, air traffic controllers), drone permits and licensing, CAA's airports and services, and how to contact the right team. What interests you?",
    ],
    starters: true,
  },
];

// ── Answer resolution ─────────────────────────────────────────────────────────

type BotReply = { text: string; followUps?: string[] };

function resolve(query: string, starterTopics: string[]): BotReply {
  const q = query.toLowerCase().trim();

  // Small talk first — keeps Martha feeling human
  for (const rule of SMALL_TALK) {
    if (rule.test.test(q)) {
      return { text: pick(rule.replies), followUps: rule.starters ? starterTopics : rule.followUps };
    }
  }

  // Exact question match (from follow-up chips)
  const exact = FAQS.find((f) => f.question.toLowerCase() === q);
  if (exact) return { text: exact.answer, followUps: exact.followUps };

  // Keyword scoring
  let bestScore = 0;
  let best: FaqEntry | null = null;
  for (const faq of FAQS) {
    const score = faq.keywords.reduce((s, kw) => s + (q.includes(kw) ? kw.length : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }
  if (best) return { text: best.answer, followUps: best.followUps };

  return { text: pick(FALLBACKS), followUps: pick(FALLBACK_TOPICS) };
}

// ── Component ─────────────────────────────────────────────────────────────────

type Message = { from: "bot" | "user"; text: string; followUps?: string[] };

function personaOf(auth: ReturnType<typeof useApp>["auth"]): Persona {
  if (!auth.isLoggedIn) return "guest";
  if (auth.accountType === "admin") return (auth.adminRole ?? "hr") as Persona;
  if ((auth.effectiveType ?? auth.accountType) === "internal") return "internal";
  return "external";
}

export function FaqChatbot() {
  const { auth } = useApp();
  const persona = personaOf(auth);
  const topics = ROLE_TOPICS[persona];
  const firstName = auth.isLoggedIn ? auth.firstName : "";

  const [open, setOpen] = useState(false);
  const [waving, setWaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    { from: "bot", text: pick(WELCOMES)(firstName), followUps: topics },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const conversationStarted = useRef(false);

  // If the user signs in/out (or their role changes) before chatting,
  // refresh the greeting and suggestions to match who they are.
  useEffect(() => {
    if (!conversationStarted.current) {
      setMessages([{ from: "bot", text: pick(WELCOMES)(firstName), followUps: ROLE_TOPICS[persona] }]);
    }
  }, [persona, firstName]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const openChat = () => {
    setOpen(true);
    setWaving(true);
    setTimeout(() => setWaving(false), 3200);
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    conversationStarted.current = true;
    setInput("");
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setTyping(true);
    // Slightly randomised delay so Martha feels less mechanical
    const delay = 500 + Math.random() * 600;
    setTimeout(() => {
      const reply = resolve(trimmed, topics);
      setTyping(false);
      setMessages((prev) => [...prev, { from: "bot", text: reply.text, followUps: reply.followUps }]);
    }, delay);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send(input);
  };

  const lastIndex = messages.length - 1;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-40px)] bg-white rounded-2xl shadow-2xl border border-caa-border flex flex-col overflow-hidden"
          style={{ height: "480px" }}>
          {/* Header */}
          <div className="bg-caa-navy px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-full bg-white/15 flex items-end justify-center shrink-0 overflow-hidden">
                <MarthaAvatar size={38} waving={waving} talking={typing} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">Martha</p>
                <p className="text-white/60 text-[11px] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                  CAA Virtual Assistant
                </p>
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
              <div key={i} className="space-y-2">
                <div className={`flex items-end gap-1.5 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  {m.from === "bot" && (
                    <div className="h-7 w-7 rounded-full bg-caa-navy/10 border border-caa-border shrink-0 overflow-hidden flex items-end justify-center">
                      <MarthaAvatar size={25} />
                    </div>
                  )}
                  <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    m.from === "user"
                      ? "bg-caa-navy text-white rounded-br-sm"
                      : "bg-white text-caa-body border border-caa-border rounded-bl-sm shadow-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
                {/* Follow-up suggestions under Martha's latest reply */}
                {m.from === "bot" && m.followUps && i === lastIndex && !typing && (
                  <div className="flex flex-wrap gap-1.5 pl-[34px]">
                    {m.followUps.map((s) => (
                      <button key={s} onClick={() => send(s)}
                        className="text-[11px] bg-white border border-caa-border text-caa-navy px-2.5 py-1 rounded-full hover:bg-caa-navy hover:text-white transition-colors font-medium text-left">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex items-end gap-1.5 justify-start">
                <div className="h-7 w-7 rounded-full bg-caa-navy/10 border border-caa-border shrink-0 overflow-hidden flex items-end justify-center">
                  <MarthaAvatar size={25} talking />
                </div>
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

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-caa-border bg-white flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Martha anything…"
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
        onClick={() => (open ? setOpen(false) : openChat())}
        aria-label={open ? "Close assistant" : "Chat with Martha, the CAA assistant"}
        className="h-14 w-14 rounded-full bg-caa-navy text-white shadow-xl hover:bg-caa-navy-2 hover:scale-105 transition-all relative"
      >
        {open ? (
          <div className="h-full w-full flex items-center justify-center">
            <ChevronDown className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="h-full w-full rounded-full overflow-hidden flex items-end justify-center">
              <MarthaAvatar size={52} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" style={{ animationDuration: "2.5s" }} />
              <span className="absolute inset-0 rounded-full bg-emerald-400 border-2 border-white" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
