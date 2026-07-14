import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export function SuccessModal({ refNumber, jobTitle, onClose }: { refNumber: string; jobTitle: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] bg-caa-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] p-10 text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-caa-success flex items-center justify-center caa-check-anim">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>
        <h2 className="font-bold text-2xl text-caa-body mt-6">Application Submitted!</h2>
        <p className="text-sm text-caa-muted mt-2">
          Your application for <span className="text-caa-body font-medium">{jobTitle}</span> has been received by CAA Uganda. We'll notify you by email of next steps.
        </p>
        <div className="mt-5 inline-block bg-caa-surface border border-caa-border rounded-md px-4 py-2">
          <span className="text-xs text-caa-muted">Reference: </span>
          <span className="text-sm font-mono font-semibold text-caa-navy">{refNumber}</span>
        </div>
        <div className="flex gap-3 mt-7">
          <Link to="/dashboard" onClick={onClose} className="flex-1 py-2.5 bg-caa-navy text-white font-medium rounded-md hover:bg-caa-navy-2 transition-colors">
            View My Dashboard
          </Link>
          <Link to="/vacancies" onClick={onClose} className="flex-1 py-2.5 border border-caa-border text-caa-body rounded-md hover:bg-caa-surface transition-colors">
            Browse More
          </Link>
        </div>
      </div>
    </div>
  );
}