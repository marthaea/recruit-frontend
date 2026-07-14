import { Check } from "lucide-react";

const STEPS = ["Profile", "Documents", "Statement", "Review", "Submit"];

export function Stepper({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 mt-6 overflow-x-auto">
      {STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                done ? "bg-white/15 text-white/60 border border-white/20" :
                current ? "bg-caa-gold text-caa-navy" :
                "border border-white/30 text-white/50"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs sm:text-sm ${current ? "text-white font-medium" : "text-white/50"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-white/20" />}
          </div>
        );
      })}
    </div>
  );
}