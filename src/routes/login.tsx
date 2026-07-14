import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck, Bell, FileText, ArrowLeft, Eye, EyeOff, Mail, Lock, CheckCircle2,
} from "lucide-react";
import { useApp, isCAAEmail, ADMIN_DEMO, CANDIDATE_DEMO } from "@/context/AppContext";
import logo from "@/assets/caa-logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — CAA Uganda Recruitment" },
      { name: "description", content: "Sign in to your CAA Uganda Recruitment Portal candidate account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, pushToast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      pushToast({ type: "warning", title: "Missing details", message: "Enter your email and password to continue." });
      return;
    }
    // Admin shortcut
    if (email.trim().toLowerCase() === ADMIN_DEMO.email && password === ADMIN_DEMO.password) {
      signIn("System", "Administrator", email, { accountType: "admin" });
      pushToast({ type: "success", title: "Admin signed in", message: "Welcome to the CAA admin console." });
      navigate({ to: "/admin", search: { tab: "dashboard" } });
      return;
    }
    // Demo candidate shortcut — signs in as the seeded candidate with existing applications on file.
    if (email.trim().toLowerCase() === CANDIDATE_DEMO.email) {
      signIn(CANDIDATE_DEMO.firstName, CANDIDATE_DEMO.lastName, email, { accountType: "external" });
      pushToast({ type: "success", title: `Welcome back, ${CANDIDATE_DEMO.firstName} ${CANDIDATE_DEMO.lastName}` });
      navigate({ to: "/dashboard" });
      return;
    }
    // Heuristic: a CAA email = internal; anything else = external (downgraded if user claims internal elsewhere).
    const accountType = isCAAEmail(email) ? "internal" : "external";
    signIn("John", "Mugisha", email, { accountType });
    if (!isCAAEmail(email)) {
      pushToast({ type: "info", title: "Signed in as external candidate", message: "Internal job listings are not visible without a CAA email." });
    } else {
      pushToast({ type: "success", title: "Welcome back, John Mugisha" });
    }
    navigate({ to: "/vacancies" });
  };

  return (
    <div className="px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-[1.05fr_1fr] rounded-3xl overflow-hidden border border-caa-border bg-white shadow-[0_30px_80px_-40px_rgba(11,46,95,0.30)] min-h-[640px]">
        {/* LEFT — branded panel */}
        <div
          className="p-10 md:p-12 text-white relative overflow-hidden"
          style={{ backgroundImage: "url('/aviation-hero.jfif')", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          {/* Blue overlay */}
          <div className="absolute inset-0 bg-caa-navy/75" />

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                <img src={logo} alt="CAA Uganda" className="h-10 w-auto" />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] tracking-[0.18em] uppercase text-white/70">Uganda CAA</p>
                <p className="font-bold text-white">e-Recruitment Portal</p>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="font-bold text-4xl leading-tight">Welcome back.</h2>
              <p className="text-white/75 text-sm mt-3 max-w-md">
                Pick up where you left off — track shortlisting status, manage your documents and respond to interview invitations.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { Icon: ShieldCheck, title: "Secure candidate workspace", desc: "Your documents and personal details are encrypted at rest." },
                { Icon: Bell,        title: "Instant status updates",     desc: "Email alerts the moment your application moves stage." },
                { Icon: FileText,    title: "Reuse a single profile",     desc: "Apply to any vacancy without re-uploading documents." },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <span className="h-10 w-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <p className="font-medium text-white text-sm">{title}</p>
                    <p className="text-xs text-white/65 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-10 flex items-center gap-2 text-xs text-white/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-white/70" />
              CAA Uganda is an equal-opportunity employer · No recruitment fees, ever.
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <Link to="/" className="text-sm text-caa-muted hover:text-caa-navy inline-flex items-center gap-1.5 mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <h2 className="font-bold text-2xl text-caa-body">Sign in to your account</h2>
          <p className="text-sm text-caa-muted mt-1.5">Use the email you registered with.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-caa-body mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-caa-body mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-caa-light hover:text-caa-body"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-caa-muted">
                <input type="checkbox" className="rounded border-caa-border" /> Keep me signed in
              </label>
              <button type="button" onClick={() => setForgotMsg(true)} className="text-caa-navy hover:underline font-medium">
                Forgot password?
              </button>
            </div>
            {forgotMsg && (
              <p className="text-xs text-caa-success bg-caa-success/10 border border-caa-success/20 rounded-md px-3 py-2">
                A password reset link would be sent to {email || "your registered email"}.
              </p>
            )}

            <button type="submit" className="w-full py-3 bg-caa-navy text-white font-semibold rounded-md hover:bg-caa-navy-2 transition-colors">
              Sign In
            </button>

            <p className="text-[11px] text-caa-muted text-center mt-1">
              Protected by industry-standard encryption · CAA Uganda never asks for your password by phone or email.
            </p>

            <p className="text-[11px] text-caa-muted text-center bg-caa-surface border border-caa-border rounded-md px-3 py-2">
              Demo candidate account: <span className="font-medium text-caa-navy">{CANDIDATE_DEMO.email}</span> (any password)
            </p>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs text-caa-light">
            <span className="flex-1 h-px bg-caa-border" /> NEW HERE? <span className="flex-1 h-px bg-caa-border" />
          </div>

          <Link
            to="/register"
            className="block w-full py-3 text-center text-sm border border-caa-border text-caa-body rounded-md hover:border-caa-navy hover:text-caa-navy transition-colors font-medium"
          >
            Create a candidate profile
          </Link>
        </div>
      </div>
    </div>
  );
}