import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck, Eye, EyeOff,
} from "lucide-react";

// ─── Login ────────────────────────────────────────────────────────────────────

export function AdminLogin({ onLogin }: { onLogin: (email: string, pw: string) => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-108px)]">
      {/* LEFT — hero image with overlay */}
      <div
        className="hidden md:flex w-[45%] shrink-0 relative flex-col justify-between p-12 text-white overflow-hidden"
        style={{ backgroundImage: "url('/aviation-hero.jfif')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-caa-navy/72" />
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/60">Uganda CAA</p>
            <p className="text-sm font-bold text-white">HR Console</p>
          </div>
        </div>
        {/* Welcome text */}
        <div className="relative z-10">
          <h1 className="text-5xl font-bold leading-tight">
            Welcome,<br />Administrator
          </h1>
          <p className="mt-4 text-white/65 text-sm max-w-xs leading-relaxed">
            UCAA e-Recruitment Portal — restricted access for authorised HR staff only.
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-3.5 w-3.5 text-white/60" />
            Secured by role-based access control
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <ShieldCheck className="h-5 w-5 text-caa-navy" />
            <span className="font-bold text-caa-body">HR Console</span>
          </div>

          <h2 className="text-2xl font-bold text-caa-body">Sign in</h2>
          <p className="text-sm text-caa-muted mt-1 mb-7">Uganda Civil Aviation Authority · Staff only</p>

          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pw); }} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 text-sm border border-caa-border rounded-lg focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20 bg-gray-50"
              />
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 text-sm border border-caa-border rounded-lg focus:outline-none focus:border-caa-navy focus:ring-1 focus:ring-caa-navy/20 bg-gray-50 pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-caa-light hover:text-caa-body">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-right">
              <span className="text-xs text-caa-navy font-medium cursor-default">Forgot password?</span>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-caa-navy text-white font-semibold rounded-lg hover:bg-caa-navy-2 transition-colors text-sm tracking-wide"
            >
              Sign In
            </button>
          </form>

          <Link to="/login" className="block text-center text-xs text-caa-muted hover:text-caa-navy mt-6 transition-colors">
            ← Back to candidate sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Scroll-in animation wrapper ─────────────────────────────────────────────

