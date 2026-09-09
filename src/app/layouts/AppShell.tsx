import { ReactNode } from "react";
import { CommandPalette } from "@/components/common/CommandPalette";
import { AirplaneLoader } from "@/components/feedback/AirplaneLoader";
import { ToastContainer } from "@/components/feedback/ToastContainer";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";
import { EmailVerifyBanner } from "@/features/auth/components/EmailVerifyBanner";
import { SignInPromptModal } from "@/features/auth/components/SignInPromptModal";
import { FaqChatbot } from "@/features/chatbot/components/FaqChatbot";

export function AppShell({ children }: { children: ReactNode }) {
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
