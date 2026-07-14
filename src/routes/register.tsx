import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, CheckCircle2, AlertCircle, Mail, Lock, Eye, EyeOff, Building2, User } from "lucide-react";
import { useApp, isCAAEmail, CAA_STAFF, type AccountType } from "@/context/AppContext";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Candidate Profile — CAA Uganda Recruitment" },
      { name: "description", content: "Build your CAA Uganda candidate profile — personal details, education, certifications and references." },
    ],
  }),
  component: RegisterPage,
});

type PwChecks = { length: boolean; upper: boolean; number: boolean; symbol: boolean; match: boolean };

function RegisterPage() {
  const { signIn, pushToast } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useState({
    accountType: "external" as AccountType,
    email: "", password: "", confirm: "",
    employeeNumber: "",
    agree: false,
  });
  const [show, setShow] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const pw: PwChecks = useMemo(() => ({
    length: f.password.length >= 8,
    upper: /[A-Z]/.test(f.password),
    number: /\d/.test(f.password),
    symbol: /[^A-Za-z0-9]/.test(f.password),
    match: f.password.length > 0 && f.password === f.confirm,
  }), [f.password, f.confirm]);

  const isInternal = f.accountType === "internal";
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
  const caaEmailOk = !isInternal || isCAAEmail(f.email);
  const staffOk = !isInternal || (f.employeeNumber.trim() in CAA_STAFF);
  const pwAllOk = pw.length && pw.upper && pw.number && pw.symbol && pw.match;
  const canSubmit = emailValid && caaEmailOk && staffOk && pwAllOk && f.agree;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return pushToast({ type: "warning", title: "Enter a valid email" });
    if (isInternal && !caaEmailOk) return pushToast({ type: "warning", title: "Internal staff must use a @caa.co.ug email" });
    if (isInternal && !staffOk) return pushToast({ type: "warning", title: "Employee number not found", message: "Try CAA-1001, CAA-1002, or CAA-1003 for the demo." });
    if (!pwAllOk) return pushToast({ type: "warning", title: "Password does not meet requirements" });
    if (!f.agree) return pushToast({ type: "warning", title: "Please accept the Terms" });

    const seed = isInternal ? CAA_STAFF[f.employeeNumber.trim()] : { firstName: "Candidate", lastName: "" };
    signIn(seed.firstName, seed.lastName, f.email, { accountType: f.accountType, employeeNumber: f.employeeNumber.trim() });
    pushToast({ type: "success", title: "Account created", message: "You can now browse vacancies and apply." });
    navigate({ to: "/vacancies" });
  };

  const input = "w-full pl-10 pr-3 py-2 text-sm border border-caa-border rounded-md bg-white focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20";
  const label = "block text-sm font-medium text-caa-body mb-1";

  return (
    <div className="px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-caa-navy font-semibold">Create Account</p>
            <h1 className="font-bold text-2xl text-caa-body mt-1">Join the CAA portal</h1>
          </div>
          <Link to="/login" className="text-sm text-caa-navy hover:underline">Sign in</Link>
        </div>

        <form onSubmit={handleSubmit} className="caa-card p-6 space-y-4">
          <div>
            <label className={label}>I am applying as</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { v: "external", icon: User, t: "General public", d: "Anyone can apply" },
                { v: "internal", icon: Building2, t: "Internal CAA staff", d: "Verified via employee #" },
              ].map((o) => (
                <button
                  type="button"
                  key={o.v}
                  onClick={() => set("accountType", o.v as AccountType)}
                  className={`text-left p-3 rounded-md border text-xs ${f.accountType === o.v ? "border-caa-navy bg-caa-surface" : "border-caa-border hover:border-caa-navy/50"}`}
                >
                  <o.icon className="h-4 w-4 text-caa-navy mb-1" />
                  <p className="font-semibold text-caa-body">{o.t}</p>
                  <p className="text-caa-muted mt-0.5">{o.d}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
              <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={input} placeholder={isInternal ? "you@caa.co.ug" : "you@example.com"} />
            </div>
            {isInternal && f.email && !caaEmailOk && (
              <p className="text-[11px] text-caa-danger mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Internal staff must use a @caa.co.ug email.</p>
            )}
          </div>

          {isInternal && (
            <div>
              <label className={label}>CAA employee number</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
                <input value={f.employeeNumber} onChange={(e) => set("employeeNumber", e.target.value.toUpperCase())} className={input} placeholder="e.g. CAA-1001" />
              </div>
              <p className="text-[11px] text-caa-muted mt-1">Demo numbers: CAA-1001, CAA-1002, CAA-1003.</p>
            </div>
          )}

          <div>
            <label className={label}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
              <input type={show ? "text" : "password"} value={f.password} onChange={(e) => set("password", e.target.value)} className={input + " pr-9"} placeholder="••••••••" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-caa-light">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={label}>Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-caa-light" />
              <input type={show ? "text" : "password"} value={f.confirm} onChange={(e) => set("confirm", e.target.value)} className={input} />
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-y-1 gap-x-3 text-[12px]">
            {[
              { ok: pw.length, l: "≥ 8 characters" },
              { ok: pw.upper, l: "1 uppercase letter" },
              { ok: pw.number, l: "1 number" },
              { ok: pw.symbol, l: "1 symbol" },
              { ok: pw.match, l: "Passwords match" },
            ].map((r) => (
              <li key={r.l} className={`flex items-center gap-1.5 ${r.ok ? "text-caa-success" : "text-caa-muted"}`}>
                {r.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{r.l}
              </li>
            ))}
          </ul>

          <label className="flex items-start gap-2 text-xs text-caa-muted">
            <input type="checkbox" className="mt-0.5" checked={f.agree} onChange={(e) => set("agree", e.target.checked)} />
            I confirm the information provided is accurate and agree to CAA Uganda's <a href="https://caa.go.ug/" target="_blank" rel="noopener noreferrer" className="text-caa-navy underline">Terms & Privacy Policy</a>.
          </label>

          <button type="submit" disabled={!canSubmit} className="w-full py-2.5 bg-caa-navy text-white font-semibold rounded-md hover:bg-caa-navy-2 transition-colors disabled:opacity-50">
            Create account
          </button>
          <p className="text-[11px] text-caa-muted text-center">You'll build your CV the first time you apply for a role.</p>
        </form>
      </div>
    </div>
  );
}