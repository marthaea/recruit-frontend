import { Link } from "@tanstack/react-router";
import { Phone, Mail, Clock, MapPin, ChevronRight } from "lucide-react";
import heroOffices from "@/assets/hero-caa-offices.jpg";
import heroJet from "@/assets/hero-jet.jpg";
import heroOffice from "@/assets/hero-office.jpg";
import logo from "@/assets/caa-logo.png";

const IMPORTANT_LINKS = [
  { label: "National Planning Authority",       href: "https://www.npa.go.ug" },
  { label: "Uganda Investment Authority",       href: "https://www.ugandainvest.go.ug" },
  { label: "Uganda Revenue Authority",          href: "https://www.ura.go.ug" },
  { label: "EACASSOA",                          href: "https://www.eacassoa.org" },
  { label: "Int'l Civil Aviation Organization", href: "https://www.icao.int" },
  { label: "Uganda E-Immigration System",       href: "https://www.immigration.go.ug" },
  { label: "Uganda Tourism Board",              href: "https://www.utb.go.ug" },
];

const BOTTOM_LINKS = [
  { label: "Disclaimer",       href: "https://www.caa.co.ug/disclaimer/" },
  { label: "Website Policies", href: "https://www.caa.co.ug/privacy-policy/" },
  { label: "AIS",              href: "https://www.caa.co.ug/ais/" },
  { label: "ASL",              href: "https://www.caa.co.ug/aviation-safety-library/" },
  { label: "ASCRS",            href: "https://www.caa.co.ug/ascrs/" },
  { label: "Webmail",          href: "https://mail.caa.co.ug" },
];

const PHOTOS = [
  heroOffices,
  heroJet,
  heroOffice,
  "/Uganda-Airlines-150x150.jpg",
  "/background-image-scaled-e1718653628764-150x150.jpg",
  heroJet,
];

function SvgX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}
function SvgFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M24 12.073C24 5.406 18.627 0 12 0S0 5.406 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}
function SvgLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}
function SvgYouTube() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

const SOCIAL_FOLLOW = [
  { Icon: SvgX,        href: "https://twitter.com/ugandacaa",    label: "X (Twitter)" },
  { Icon: SvgFacebook, href: "https://www.facebook.com/ugandacaa", label: "Facebook" },
  { Icon: SvgLinkedIn, href: "https://www.linkedin.com/company/uganda-civil-aviation-authority", label: "LinkedIn" },
  { Icon: SvgYouTube,  href: "https://www.youtube.com/@ugandacaa", label: "YouTube" },
];

export function Footer() {
  return (
    <footer>
      {/* ── Main footer body ───────────────────────────────── */}
      <div className="bg-caa-navy">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Col 1 — UCAA Head Office */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <img src={logo} alt="Uganda Civil Aviation Authority" className="h-12 w-auto bg-white rounded p-1" />
                <h3 className="text-white font-bold text-sm uppercase tracking-widest leading-snug">
                  UCAA<br />Head Office
                </h3>
              </div>
              <ul className="space-y-3.5 text-white/75 text-[13px]">
                <li className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                  +256 312 352 000
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                  aviation@caa.co.ug
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                  Mon – Fri: 8.00 am – 5.00 pm
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-white/50 shrink-0" />
                  <span>Airport Road-Entebbe.<br />P.O.Box 5536, Kampala, Uganda</span>
                </li>
              </ul>

              {/* Portal quick links */}
              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="text-white/50 text-[11px] uppercase tracking-widest mb-3">Portal</p>
                <div className="flex flex-col gap-2">
                  <Link to="/vacancies" className="text-white/75 text-[13px] hover:text-white transition-colors">Current Vacancies</Link>
                  <Link to="/register"  className="text-white/75 text-[13px] hover:text-white transition-colors">Create Account</Link>
                  <Link to="/login"     className="text-white/75 text-[13px] hover:text-white transition-colors">Sign In</Link>
                  <Link to="/dashboard" className="text-white/75 text-[13px] hover:text-white transition-colors">My Dashboard</Link>
                </div>
              </div>
            </div>

            {/* Col 2 — Important Links */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
                Important Links
              </h3>
              <ul className="space-y-2.5">
                {IMPORTANT_LINKS.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white/75 text-[13px] hover:text-white transition-colors group"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 shrink-0 transition-colors" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Follow Us */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
                Follow Uganda CAA
              </h3>
              {/* Social card styled like the official site's Twitter widget */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={logo}
                    alt="Uganda CAA"
                    className="h-10 w-10 rounded-full bg-white object-contain p-1"
                  />
                  <div>
                    <p className="text-white text-sm font-semibold leading-none">Uganda CAA</p>
                    <p className="text-white/50 text-[11px] mt-0.5">@UgandaCAA</p>
                  </div>
                </div>
                <p className="text-white/70 text-[12px] leading-relaxed mb-4">
                  Official account of the Uganda Civil Aviation Authority — the national regulator of civil aviation in Uganda.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_FOLLOW.map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors text-[11px] font-medium"
                    >
                      <Icon />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 4 — Activity Photos */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
                UCAA Activity Photos
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {PHOTOS.map((src, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-sm">
                    <img
                      src={src}
                      alt={`CAA activity ${i + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-white/40 text-[11px] leading-relaxed max-w-3xl">
              This portal is provided solely for receiving employment applications for advertised vacancies at the Uganda Civil Aviation Authority.
              Submission does not constitute an offer of employment. CAA Uganda is an equal-opportunity employer and charges no fees at any stage of recruitment.
              Information is handled per the Data Protection and Privacy Act.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────── */}
      <div className="bg-[#071d3e]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CAA Uganda" className="h-7 w-auto bg-white/10 rounded p-0.5 opacity-80" />
            <p className="text-white/60 text-[11px]">
              Copyright © Uganda Civil Aviation Authority. All rights reserved.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-0 gap-y-1">
            {BOTTOM_LINKS.map((l, i) => (
              <span key={l.label} className="flex items-center">
                {i > 0 && <span className="text-white/30 text-[11px] mx-1.5">//</span>}
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-[11px] hover:text-white transition-colors"
                >
                  {l.label}
                </a>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
