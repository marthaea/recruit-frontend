// Martha — the CAA virtual assistant's face.
// Original SVG artwork (no external image assets, no licensing concerns).
// Transparent background. Animations:
//  - always: gentle breathing sway, blinking, occasional brow raise
//  - talking: mouth opens/closes (use while the typing indicator shows)
//  - waving: a hand waves hello (use briefly when the chat opens)

type Props = {
  size?: number;
  className?: string;
  talking?: boolean;
  waving?: boolean;
};

export function MarthaAvatar({ size = 40, className = "", talking = false, waving = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Martha, UCAA virtual assistant"
    >
      <style>{`
        .martha-breathe {
          animation: marthaBreathe 3.6s ease-in-out infinite;
        }
        @keyframes marthaBreathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(0.7px); }
        }
        .martha-eyes {
          transform-origin: 32px 30px;
          animation: marthaBlink 4.6s ease-in-out infinite;
        }
        @keyframes marthaBlink {
          0%, 91%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.08); }
          97% { transform: scaleY(1); }
        }
        .martha-brows {
          animation: marthaBrows 7.5s ease-in-out infinite;
        }
        @keyframes marthaBrows {
          0%, 78%, 88%, 100% { transform: translateY(0); }
          82% { transform: translateY(-1.1px); }
        }
        .martha-mouth-talk {
          transform-origin: 32px 38.5px;
          animation: marthaTalk 0.4s ease-in-out infinite alternate;
        }
        @keyframes marthaTalk {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        .martha-wave {
          transform-origin: 49px 59px;
          animation: marthaWave 1.4s ease-in-out infinite;
        }
        @keyframes marthaWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(16deg); }
          50% { transform: rotate(-4deg); }
          75% { transform: rotate(14deg); }
        }
      `}</style>

      <g className="martha-breathe">
        {/* Neck */}
        <rect x="27.5" y="37" width="9" height="12" rx="3.5" fill="#7E4C2E" />

        {/* Waving arm (rendered behind the blazer shoulder) */}
        {waving && (
          <g className="martha-wave">
            <path d="M49 59 L56 45" stroke="#0B2E5F" strokeWidth="6.5" strokeLinecap="round" />
            <circle cx="57" cy="42.5" r="4" fill="#96603C" />
            <circle cx="55" cy="39.5" r="1.5" fill="#96603C" />
            <circle cx="57.5" cy="38.7" r="1.5" fill="#96603C" />
            <circle cx="59.7" cy="39.8" r="1.4" fill="#96603C" />
          </g>
        )}

        {/* Blazer (navy suit) */}
        <path
          d="M6 64 C7.5 53 15 47.5 22.5 45.5 L32 52.5 L41.5 45.5 C49 47.5 56.5 53 58 64 Z"
          fill="#0B2E5F"
        />
        {/* Blouse showing through the blazer V */}
        <path d="M26.5 64 L32 49.5 L37.5 64 Z" fill="#F6F4EF" />
        {/* Lapel edges */}
        <path d="M32 49.5 L26.5 64" stroke="#1A4A8A" strokeWidth="1.4" fill="none" />
        <path d="M32 49.5 L37.5 64" stroke="#1A4A8A" strokeWidth="1.4" fill="none" />
        {/* Small gold lapel pin */}
        <circle cx="24" cy="53.5" r="1.4" fill="#D9A441" />

        {/* Ears + gold earrings */}
        <ellipse cx="19.5" cy="31" rx="2.4" ry="3.2" fill="#96603C" />
        <ellipse cx="44.5" cy="31" rx="2.4" ry="3.2" fill="#96603C" />
        <circle cx="19.5" cy="36" r="1.8" fill="#D9A441" />
        <circle cx="44.5" cy="36" r="1.8" fill="#D9A441" />

        {/* Hair — short natural crop (drawn behind the face) */}
        <ellipse cx="32" cy="20.5" rx="15.5" ry="11.5" fill="#191411" />
        <circle cx="20" cy="16.5" r="3.4" fill="#191411" />
        <circle cx="26" cy="12.5" r="3.6" fill="#191411" />
        <circle cx="32" cy="11.5" r="3.8" fill="#191411" />
        <circle cx="38" cy="12.5" r="3.6" fill="#191411" />
        <circle cx="44" cy="16.5" r="3.4" fill="#191411" />
        <ellipse cx="18.8" cy="26.5" rx="3.2" ry="6" fill="#191411" />
        <ellipse cx="45.2" cy="26.5" rx="3.2" ry="6" fill="#191411" />

        {/* Face */}
        <ellipse cx="32" cy="30" rx="12.5" ry="14" fill="#96603C" />

        {/* Front hairline */}
        <path
          d="M19.8 27 C20.5 17 26 13.5 32 13.5 C38 13.5 43.5 17 44.2 27
             C42.5 20.5 39.5 19 36.5 19.3 C33.5 19.6 30.5 19.6 27.5 19.3
             C24.5 19 21.5 20.5 19.8 27 Z"
          fill="#191411"
        />

        {/* Brows (raise occasionally) */}
        <g className="martha-brows">
          <path d="M23.5 25.8 Q26.3 24.2 29 25.4" stroke="#241A14" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M35 25.4 Q37.7 24.2 40.5 25.8" stroke="#241A14" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>

        {/* Eyes (blink together) */}
        <g className="martha-eyes">
          <ellipse cx="26.3" cy="29.5" rx="1.7" ry="2.3" fill="#221712" />
          <ellipse cx="37.7" cy="29.5" rx="1.7" ry="2.3" fill="#221712" />
          <circle cx="26.9" cy="28.7" r="0.55" fill="#FFFFFF" />
          <circle cx="38.3" cy="28.7" r="0.55" fill="#FFFFFF" />
        </g>

        {/* Nose */}
        <path
          d="M32 30 C31.5 32.2 31 33.4 30.4 34.2 Q31.3 35 32.4 34.7"
          stroke="#7A4626"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Mouth — talks while Martha is "typing", otherwise a warm smile */}
        {talking ? (
          <ellipse className="martha-mouth-talk" cx="32" cy="38.5" rx="3.1" ry="2" fill="#5B2620" />
        ) : (
          <path d="M27.2 38 Q32 41.8 36.8 38 Q32 39.8 27.2 38 Z" fill="#6E3226" />
        )}

        {/* Soft cheek highlights */}
        <ellipse cx="24.5" cy="33.5" rx="2" ry="1.2" fill="#A9714D" opacity="0.5" />
        <ellipse cx="39.5" cy="33.5" rx="2" ry="1.2" fill="#A9714D" opacity="0.5" />
      </g>
    </svg>
  );
}
