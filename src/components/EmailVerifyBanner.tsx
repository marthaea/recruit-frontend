import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { auth as authApi } from "@/lib/api/client";

/**
 * Slim banner shown to signed-in candidates whose email is not yet verified.
 * Legacy accounts (emailVerified undefined) and admins are not nagged.
 */
export function EmailVerifyBanner() {
  const { auth, pushToast } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  const show =
    auth.isLoggedIn &&
    auth.accountType !== "admin" &&
    auth.emailVerified === false &&
    !dismissed;

  if (!show) return null;

  const resend = async () => {
    setSending(true);
    try {
      const r = await authApi.resendVerification();
      pushToast({ type: "info", title: "Verification email", message: r.data.message });
    } catch (e) {
      pushToast({ type: "warning", title: "Could not send", message: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-sm">
      <MailWarning className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-amber-800 flex-1 min-w-0">
        Please verify your email address (<span className="font-medium">{auth.email}</span>) so we can reach you about your applications.
      </p>
      <button
        onClick={resend}
        disabled={sending}
        className="shrink-0 text-xs font-semibold text-amber-800 border border-amber-300 rounded-md px-3 py-1 hover:bg-amber-100 disabled:opacity-60"
      >
        {sending ? "Sending…" : "Resend link"}
      </button>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-amber-500 hover:text-amber-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
