import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { auth as authApi } from "@/lib/api/client";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({ meta: [{ title: "Verify Email — CAA Uganda" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const { markEmailVerified } = useApp();
  const [state, setState] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This link is missing its verification code. Please use the link from your email.");
      return;
    }
    authApi.verifyEmail(token)
      .then((r) => {
        if (r.success) {
          setState("success");
          setMessage(r.data.email);
          markEmailVerified();
        } else {
          setState("error");
          setMessage("Verification failed. The link may have expired or already been used.");
        }
      })
      .catch((e: Error) => {
        setState("error");
        setMessage(e.message || "Verification failed. The link may have expired or already been used.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="caa-card p-10 max-w-md w-full text-center">
        {state === "working" && (
          <>
            <RefreshCw className="h-10 w-10 text-caa-navy mx-auto animate-spin" />
            <h1 className="font-bold text-xl text-caa-body mt-5">Verifying your email…</h1>
            <p className="text-sm text-caa-muted mt-2">One moment please.</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-caa-success flex items-center justify-center caa-check-anim">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-bold text-xl text-caa-body mt-5">Email verified!</h1>
            <p className="text-sm text-caa-muted mt-2">
              {message ? <><span className="font-medium text-caa-body">{message}</span> is confirmed. </> : null}
              You will now receive all recruitment updates by email.
            </p>
            <Link to="/dashboard" className="inline-block mt-6 px-6 py-2.5 bg-caa-navy text-white text-sm font-semibold rounded-md hover:bg-caa-navy-2 transition-colors">
              Go to my dashboard
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="h-12 w-12 text-caa-danger mx-auto" />
            <h1 className="font-bold text-xl text-caa-body mt-5">Verification failed</h1>
            <p className="text-sm text-caa-muted mt-2">{message}</p>
            <p className="text-xs text-caa-muted mt-4">
              You can request a new link from your dashboard, or contact{" "}
              <a href="mailto:hr@caa.go.ug" className="text-caa-navy underline">hr@caa.go.ug</a> for help.
            </p>
            <Link to="/dashboard" className="inline-block mt-6 px-6 py-2.5 border border-caa-border text-caa-body text-sm font-semibold rounded-md hover:bg-caa-surface transition-colors">
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
