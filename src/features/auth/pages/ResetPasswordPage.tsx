import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Lock, Eye, EyeOff } from "lucide-react";
import { auth as authApi } from "@/services/api/client";

export function ResetPasswordPage() {
  const { token } = useSearch({ from: "/reset-password" });
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"form" | "working" | "success" | "error">(token ? "form" : "error");
  const [message, setMessage] = useState("This link is missing its reset code. Please use the link from your email.");

  const pw = useMemo(() => ({
    length: password.length >= 8,
    number: /\d/.test(password),
    match: password.length > 0 && password === confirm,
  }), [password, confirm]);
  const canSubmit = pw.length && pw.number && pw.match && !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setState("working");
    try {
      await authApi.resetPassword(token, password);
      setState("success");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "This reset link is invalid or has expired. Please request a new one.");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="caa-card p-10 max-w-md w-full text-center">
        {(state === "form" || state === "working") && (
          <>
            <div className="mx-auto h-14 w-14 rounded-full bg-caa-navy/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-caa-navy" />
            </div>
            <h1 className="font-bold text-xl text-caa-body mt-5">Set a new password</h1>
            <p className="text-sm text-caa-muted mt-2 mb-6">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-caa-body mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-caa-light hover:text-caa-body" aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-caa-body mb-1.5">Confirm new password</label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-caa-border rounded-md focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <ul className="grid grid-cols-1 gap-y-1 text-[12px]">
                <li className={pw.length ? "text-caa-success" : "text-caa-muted"}>≥ 8 characters</li>
                <li className={pw.number ? "text-caa-success" : "text-caa-muted"}>1 number</li>
                <li className={pw.match ? "text-caa-success" : "text-caa-muted"}>Passwords match</li>
              </ul>
              <button type="submit" disabled={!canSubmit || state === "working"} className="w-full py-2.5 bg-caa-navy text-white font-semibold rounded-md hover:bg-caa-navy-2 transition-colors disabled:opacity-50">
                {state === "working" ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
        {state === "success" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-caa-success flex items-center justify-center caa-check-anim">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-bold text-xl text-caa-body mt-5">Password updated</h1>
            <p className="text-sm text-caa-muted mt-2">You can now sign in with your new password. You've been signed out of any other active sessions.</p>
            <button onClick={() => navigate({ to: "/login" })} className="inline-block mt-6 px-6 py-2.5 bg-caa-navy text-white text-sm font-semibold rounded-md hover:bg-caa-navy-2 transition-colors">
              Sign in
            </button>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="h-12 w-12 text-caa-danger mx-auto" />
            <h1 className="font-bold text-xl text-caa-body mt-5">Reset link invalid</h1>
            <p className="text-sm text-caa-muted mt-2">{message}</p>
            <Link to="/login" className="inline-block mt-6 px-6 py-2.5 border border-caa-border text-caa-body text-sm font-semibold rounded-md hover:bg-caa-surface transition-colors">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
