import { Link } from "@tanstack/react-router";
import { X, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useModalA11y } from "@/hooks/useModalA11y";

export function SignInPromptModal() {
  const { signInPromptOpen, closeSignInPrompt } = useApp();
  if (!signInPromptOpen) return null;
  return <SignInPromptDialog onClose={closeSignInPrompt} />;
}

function SignInPromptDialog({ onClose }: { onClose: () => void }) {
  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-[90] bg-caa-navy/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-prompt-title"
        className="bg-white rounded-xl max-w-md w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-caa-light hover:text-caa-body">
          <X className="h-5 w-5" />
        </button>
        <div className="h-12 w-12 rounded-full bg-caa-navy/10 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-caa-navy" />
        </div>
        <h3 id="signin-prompt-title" className="font-bold text-xl text-caa-body">Sign in required</h3>
        <p className="text-sm text-caa-muted mt-2">You need to sign in to apply for this position.</p>
        <div className="flex gap-3 mt-6">
          <Link to="/login" onClick={onClose} className="flex-1 py-2.5 text-center bg-caa-navy text-white font-medium rounded-md hover:bg-caa-navy-2 transition-colors">
            Sign In
          </Link>
          <Link to="/register" onClick={onClose} className="flex-1 py-2.5 text-center border border-caa-border text-caa-body rounded-md hover:bg-caa-surface transition-colors">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
