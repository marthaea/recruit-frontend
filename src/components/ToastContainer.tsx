import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { useApp, type Toast } from "@/context/AppContext";

const config: Record<Toast["type"], { Icon: typeof CheckCircle2; bar: string; tint: string }> = {
  success: { Icon: CheckCircle2, bar: "bg-caa-success", tint: "text-caa-success" },
  info:    { Icon: Info,         bar: "bg-caa-navy-2", tint: "text-caa-navy-2" },
  warning: { Icon: AlertTriangle,bar: "bg-caa-warning",tint: "text-caa-warning" },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[340px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const { Icon, bar, tint } = config[t.type];
        return (
          <div key={t.id} className="caa-toast-in bg-white rounded-lg border border-caa-border shadow-lg flex overflow-hidden">
            <div className={`w-1 ${bar}`} />
            <div className="flex-1 flex items-start gap-3 p-3">
              <Icon className={`h-5 w-5 mt-0.5 ${tint}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-caa-body">{t.title}</p>
                {t.message && <p className="text-[13px] text-caa-muted mt-0.5">{t.message}</p>}
              </div>
              <button onClick={() => dismissToast(t.id)} className="text-caa-light hover:text-caa-body">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}