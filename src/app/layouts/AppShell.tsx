import { ReactNode, useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { CommandPalette } from "@/components/common/CommandPalette";
import { AirplaneLoader } from "@/components/feedback/AirplaneLoader";
import { ToastContainer } from "@/components/feedback/ToastContainer";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";
import { EmailVerifyBanner } from "@/features/auth/components/EmailVerifyBanner";
import { SignInPromptModal } from "@/features/auth/components/SignInPromptModal";
import { FaqChatbot } from "@/features/chatbot/components/FaqChatbot";
import { useApp } from "@/app/providers/AppContext";

// Records one page_view per real navigation on the public careers portal —
// the Site Analytics tab's "Page Views" stat had no real source before this,
// since nothing ever called trackEvent({type:"page_view"}). Admin/dashboard
// routes are excluded: that traffic is staff using the tool, not visitors.
function usePageViewTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { trackEvent } = useApp();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (pathname.startsWith("/admin")) return;
    trackEvent({ type: "page_view" });
  }, [pathname, trackEvent]);
}

export function AppShell({ children }: { children: ReactNode }) {
  usePageViewTracking();
  return (
    <div className="min-h-screen flex flex-col bg-caa-surface">
      <AirplaneLoader />
      <Navbar />
      <EmailVerifyBanner />
      <main className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
      <SignInPromptModal />
      <CommandPalette />
      <FaqChatbot />
    </div>
  );
}
