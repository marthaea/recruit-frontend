import { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

export type TourStep = {
  /** CSS selector for the real element to spotlight. If it can't be found
   *  (e.g. a card that only renders once data loads), the step still shows
   *  as a centered card with no spotlight rather than being skipped silently. */
  target: string;
  title: string;
  body: string;
  /** Runs once when the tour reaches this step, before it measures `target` —
   *  lets a step switch tabs/views first (e.g. `() => go("jobs")`) so a
   *  target that only exists elsewhere in the app is on-screen by the time
   *  it's spotlighted. */
  onEnter?: () => void;
};

export type TourDef = {
  /** localStorage key suffix — combine with the signed-in user's email so
   *  each account gets its own "have I seen this" state. */
  key: string;
  welcomeTitle: string;
  welcomeBody: string;
  steps: TourStep[];
};

function storageKey(def: TourDef, userKey: string) {
  return `caa_onboarding_v1_${def.key}_${userKey}`;
}

/** True once this user has finished or explicitly skipped this tour. */
function hasSeenTour(def: TourDef, userKey: string): boolean {
  try {
    return localStorage.getItem(storageKey(def, userKey)) === "1";
  } catch {
    return true; // storage unavailable — don't nag every reload
  }
}

function markTourSeen(def: TourDef, userKey: string) {
  try { localStorage.setItem(storageKey(def, userKey), "1"); } catch {}
}

/**
 * Drives the whole onboarding lifecycle for one page: shows the "want a
 * tour?" prompt on a user's first real visit, then the spotlight walkthrough
 * if they accept. Call `restart()` from a "Take the tour" button to replay
 * it on demand — dismissing never destroys the ability to look again.
 */
export function useOnboardingTour(def: TourDef, userKey: string | null) {
  const [stage, setStage] = useState<"idle" | "prompt" | "touring">("idle");

  useEffect(() => {
    if (!userKey) return;
    if (!hasSeenTour(def, userKey)) setStage("prompt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

  const accept = () => setStage("touring");
  const dismiss = () => {
    if (userKey) markTourSeen(def, userKey);
    setStage("idle");
  };
  const restart = () => setStage("prompt");

  return { stage, accept, dismiss, restart };
}

export function OnboardingPrompt({ def, onAccept, onSkip }: { def: TourDef; onAccept: () => void; onSkip: () => void }) {
  const ref = useModalA11y<HTMLDivElement>(onSkip);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={def.welcomeTitle}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="h-11 w-11 rounded-full bg-caa-gold/15 text-caa-gold flex items-center justify-center mb-4">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="font-bold text-lg text-caa-body">{def.welcomeTitle}</h2>
        <p className="text-sm text-caa-muted mt-2 leading-relaxed">{def.welcomeBody}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onSkip} className="flex-1 py-2.5 border border-caa-border text-caa-body rounded-lg text-sm hover:bg-caa-surface">
            Skip for now
          </button>
          <button onClick={onAccept} className="flex-1 py-2.5 bg-caa-navy text-white rounded-lg text-sm font-semibold hover:bg-caa-navy-2">
            Take the tour
          </button>
        </div>
      </div>
    </div>
  );
}

function tooltipStyle(rect: DOMRect | null): React.CSSProperties {
  if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  const cardWidth = 320;
  const margin = 14;
  const vw = window.innerWidth, vh = window.innerHeight;
  // Prefer below the target; flip above if there isn't room.
  const spaceBelow = vh - rect.bottom;
  const top = spaceBelow > 180 ? rect.bottom + margin : Math.max(margin, rect.top - margin - 180);
  let left = rect.left + rect.width / 2 - cardWidth / 2;
  left = Math.min(Math.max(left, margin), vw - cardWidth - margin);
  return { top, left, width: cardWidth };
}

export function OnboardingSpotlight({ steps, onFinish, onSkip }: { steps: TourStep[]; onFinish: () => void; onSkip: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useModalA11y<HTMLDivElement>(onSkip);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const measure = useRef(() => {
    const el = step ? document.querySelector(step.target) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  });
  measure.current = () => {
    const el = step ? document.querySelector(step.target) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  };
  const cleanupInner = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    step?.onEnter?.();
    // A step that switches tabs/views needs a beat for that state change to
    // render before its target exists in the DOM — harmless for ordinary
    // same-page steps too, which just get a near-instant first timer.
    const t1 = setTimeout(() => {
      const el = step ? document.querySelector(step.target) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      const t2 = setTimeout(() => measure.current(), el ? 320 : 0);
      cleanupInner.current = () => clearTimeout(t2);
    }, step?.onEnter ? 80 : 0);
    return () => { clearTimeout(t1); cleanupInner.current?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onUpdate = () => measure.current();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, []);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[100]" aria-hidden="false">
      {/* Dimmed backdrop, punched through around the spotlighted element via a huge box-shadow rather than clip-path, so it works for any element shape. */}
      <div className="absolute inset-0" onClick={onSkip} style={{ background: rect ? "transparent" : "rgba(0,0,0,0.55)" }} />
      {rect && (
        <div
          className="absolute rounded-lg pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            outline: "2px solid #D9A441",
            outlineOffset: "2px",
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${step.title} — tour step ${index + 1} of ${steps.length}`}
        className="absolute bg-white rounded-xl shadow-2xl p-4"
        style={tooltipStyle(rect)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold text-caa-navy uppercase tracking-wide">Step {index + 1} of {steps.length}</p>
          <button onClick={onSkip} aria-label="Close tour" className="text-caa-muted hover:text-caa-body -mt-1 -mr-1 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-bold text-sm text-caa-body mt-1.5">{step.title}</h3>
        <p className="text-xs text-caa-muted mt-1.5 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <button onClick={onSkip} className="text-[11px] text-caa-muted hover:text-caa-body">Skip tour</button>
          <div className="flex gap-2">
            {index > 0 && (
              <button onClick={() => setIndex((i) => i - 1)} className="px-3 py-1.5 text-xs font-medium border border-caa-border rounded-md text-caa-body hover:bg-caa-surface">
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
              className="px-3 py-1.5 text-xs font-semibold bg-caa-navy text-white rounded-md hover:bg-caa-navy-2"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Drop-in wrapper: prompt → spotlight → done, wired to the persistence hook above. */
export function OnboardingTour({ def, userKey }: { def: TourDef; userKey: string | null }) {
  const { stage, accept, dismiss } = useOnboardingTour(def, userKey);
  if (stage === "prompt") {
    return <OnboardingPrompt def={def} onAccept={accept} onSkip={dismiss} />;
  }
  if (stage === "touring") {
    return <OnboardingSpotlight steps={def.steps} onFinish={dismiss} onSkip={dismiss} />;
  }
  return null;
}
