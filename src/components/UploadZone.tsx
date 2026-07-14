import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";

type Props = {
  label: string;
  hint?: string;
  accept?: string;
  required?: boolean;
  initialFileName?: string;
};

export function UploadZone({ label, hint, accept = ".pdf,.doc,.docx", required, initialFileName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useApp();
  const [fileName, setFileName] = useState<string | null>(initialFileName ?? null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(0) + " KB");
    pushToast({ type: "success", title: "File uploaded", message: `${file.name} uploaded successfully.` });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-caa-body mb-1.5">
        {label} {required && <span className="text-caa-danger">*</span>}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-caa-border hover:border-caa-navy bg-caa-surface/50 rounded-lg p-5 text-left transition-colors"
      >
        {fileName ? (
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-caa-navy" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-caa-body truncate">{fileName}</p>
              <p className="text-xs text-caa-muted">{fileSize ?? "On file"} · Click to replace</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-caa-success font-medium">
              <CheckCircle2 className="h-4 w-4" /> Uploaded
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <UploadCloud className="h-6 w-6 text-caa-muted" />
            <div>
              <p className="text-sm text-caa-body">Click to upload or drag and drop</p>
              <p className="text-xs text-caa-muted">{hint ?? "PDF, DOC up to 5MB"}</p>
            </div>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}