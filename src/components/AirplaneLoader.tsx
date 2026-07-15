import { useApp } from "@/context/AppContext";

export function AirplaneLoader() {
  const { isLoading } = useApp();
  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(180deg, #0b2e5f 0%, #1565C0 60%, #5b9bd5 100%)" }}
      aria-label="Loading"
    >
      {/* Stars */}
      {[...Array(12)].map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width:  i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            top:  `${5 + (i * 7) % 40}%`,
            left: `${(i * 17 + 5) % 90}%`,
            animation: `twinkle ${1.2 + (i % 4) * 0.4}s ${(i * 0.3) % 1.5}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { top: "35%", w: 180, delay: 0,    dur: 8  },
          { top: "55%", w: 120, delay: -3,   dur: 10 },
          { top: "70%", w: 220, delay: -5.5, dur: 12 },
          { top: "25%", w:  90, delay: -2,   dur: 9  },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute opacity-20"
            style={{
              top: c.top,
              width: c.w,
              animation: `cloudDrift ${c.dur}s ${c.delay}s linear infinite`,
            }}
          >
            <svg viewBox="0 0 180 60" fill="white">
              <ellipse cx="90" cy="40" rx="80" ry="22" />
              <ellipse cx="65" cy="30" rx="45" ry="28" />
              <ellipse cx="115" cy="28" rx="40" ry="24" />
            </svg>
          </div>
        ))}
      </div>

      {/* Airplane */}
      <div style={{ animation: "planeBob 1.8s ease-in-out infinite" }}>
        <svg viewBox="0 0 80 60" width="110" height="82" fill="none">
          {/* Fuselage */}
          <path d="M8 30 Q28 18 62 28 Q70 30 74 32 Q70 34 62 36 Q28 44 8 32 Z" fill="white" />
          {/* Cockpit tint */}
          <path d="M54 29 Q62 28 66 30 Q62 32 54 31 Z" fill="#1565C0" opacity="0.45" />
          {/* Wings */}
          <path d="M28 30 L14 14 L36 26 Z" fill="#d6e4ff" />
          <path d="M28 32 L14 48 L36 36 Z" fill="#c0d4f8" />
          {/* Tail */}
          <path d="M12 30 L6 20 L16 28 Z" fill="#d6e4ff" />
          <path d="M12 32 L6 42 L16 34 Z" fill="#c0d4f8" />
          {/* Engines */}
          <ellipse cx="24" cy="23" rx="7" ry="2.5" fill="#ccdaf5" />
          <ellipse cx="24" cy="39" rx="7" ry="2.5" fill="#b4c8e8" />
          {/* Windows */}
          <circle cx="43" cy="30" r="1.8" fill="#1565C0" opacity="0.3" />
          <circle cx="49" cy="30" r="1.8" fill="#1565C0" opacity="0.3" />
          <circle cx="55" cy="30" r="1.8" fill="#1565C0" opacity="0.3" />
        </svg>
      </div>

      {/* Contrail below the plane */}
      <div
        className="mt-[-16px]"
        style={{ animation: "contrailFade 1.8s ease-in-out infinite" }}
      >
        <div
          className="h-1 rounded-full mx-auto opacity-40"
          style={{ width: 90, background: "linear-gradient(90deg, transparent, white)" }}
        />
      </div>

      <p className="mt-6 text-white/80 text-sm font-medium tracking-widest uppercase select-none">
        Loading&hellip;
      </p>

      <style>{`
        @keyframes planeBob {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%       { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes cloudDrift {
          from { transform: translateX(110vw); }
          to   { transform: translateX(-320px); }
        }
        @keyframes contrailFade {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.6;  }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.9;  }
        }
      `}</style>
    </div>
  );
}
