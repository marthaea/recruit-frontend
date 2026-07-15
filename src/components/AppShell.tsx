import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ToastContainer } from "./ToastContainer";
import { SignInPromptModal } from "./SignInPromptModal";
import { CommandPalette } from "./CommandPalette";
import { FaqChatbot } from "./FaqChatbot";
import { AirplaneLoader } from "./AirplaneLoader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-caa-surface">
      <AirplaneLoader />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
      <SignInPromptModal />
      <CommandPalette />
      <FaqChatbot />
    </div>
  );
}