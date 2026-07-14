import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import logo from "@/assets/caa-logo.png";

function SvgX() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}
function SvgFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M24 12.073C24 5.406 18.627 0 12 0S0 5.406 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}
function SvgLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}
function SvgInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
  );
}
function SvgYouTube() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

const SOCIAL = [
  { Icon: SvgX,         href: "https://twitter.com/ugandacaa",                                   label: "X (Twitter)" },
  { Icon: SvgFacebook,  href: "https://www.facebook.com/ugandacaa",                              label: "Facebook" },
  { Icon: SvgLinkedIn,  href: "https://www.linkedin.com/company/uganda-civil-aviation-authority", label: "LinkedIn" },
  { Icon: SvgInstagram, href: "https://www.instagram.com/ugandacaa",                             label: "Instagram" },
  { Icon: SvgYouTube,   href: "https://www.youtube.com/@ugandacaa",                              label: "YouTube" },
];

export function Navbar() {
  const { auth, signOut } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: "/",          label: "Home" },
    { to: "/vacancies", label: "Vacancies" },
    ...(auth.isLoggedIn ? [{ to: "/dashboard", label: "My Dashboard" }] : []),
    ...(auth.isLoggedIn && auth.accountType === "admin" ? [{ to: "/admin", label: "HR Console" }] : []),
  ];

  const handleSignOut = () => {
    signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="relative bg-[#111111] overflow-hidden h-9">
        {/* Blue left section with diagonal right edge */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 bg-[#1565C0]"
          style={{ right: "48%", clipPath: "polygon(0 0, 100% 0, calc(100% - 28px) 100%, 0 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 h-9 flex items-center justify-between z-10">
          <span className="text-white text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
            Uganda Civil Aviation Authority
          </span>
          <div className="flex items-center gap-3">
            {SOCIAL.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-white/70 hover:text-white transition-colors"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main nav ────────────────────────────────────────── */}
      <div className="bg-white border-b border-caa-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img
              src={logo}
              alt="Uganda Civil Aviation Authority"
              className="h-14 w-auto transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="leading-tight hidden sm:block border-l border-caa-border pl-3">
              <span className="block font-bold text-caa-navy text-[13px] uppercase tracking-wide">Recruitment Portal</span>
              <span className="block text-[10px] text-caa-muted tracking-widest uppercase">e-Careers · Uganda</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-0">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="relative px-4 py-6 text-[12px] font-semibold uppercase tracking-[0.1em] text-caa-body/70 hover:text-caa-navy transition-colors"
                activeProps={{ className: "relative px-4 py-6 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#1565C0] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1565C0]" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              aria-label="Open search"
              className="h-8 w-8 rounded-full border border-caa-border flex items-center justify-center text-caa-muted hover:border-caa-navy hover:text-caa-navy transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            {auth.isLoggedIn ? (
              <div className="flex items-center gap-2 ml-1">
                <span className="h-8 w-8 rounded-full bg-caa-navy text-white flex items-center justify-center text-xs font-bold">
                  {auth.firstName.charAt(0)}{auth.lastName.charAt(0)}
                </span>
                <span className="text-xs font-medium text-caa-body max-w-[100px] truncate">{auth.firstName}</span>
                <button
                  onClick={handleSignOut}
                  className="text-[11px] font-semibold uppercase tracking-wider text-caa-navy border border-caa-navy/40 px-2.5 py-1 rounded hover:bg-caa-navy hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link
                  to="/login"
                  className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 border border-caa-border text-caa-body rounded hover:border-caa-navy hover:text-caa-navy transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 bg-caa-navy text-white rounded hover:bg-caa-navy-2 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-caa-navy p-1"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden bg-white border-t border-caa-border px-4 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-caa-body/80 py-2.5 border-b border-caa-border/50"
                activeProps={{ className: "block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#1565C0] py-2.5 border-b border-caa-border/50" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {auth.isLoggedIn ? (
                <button
                  onClick={handleSignOut}
                  className="text-left text-[11px] font-semibold uppercase tracking-wider text-caa-navy"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-2 border border-caa-border text-caa-body rounded"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="block text-center text-[11px] font-semibold uppercase tracking-wider px-4 py-2 bg-caa-navy text-white rounded"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
