import { useState, useRef, useEffect } from "react";
import { X, Upload, ZoomIn, Check } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

const CROP_SIZE = 220;

interface Props {
  open: boolean;
  currentPhoto?: string;
  onClose: () => void;
  onSave: (dataUrl: string, blob: Blob) => void;
}

export function PhotoCropModal({ open, currentPhoto, onClose, onSave }: Props) {
  const [imgSrc, setImgSrc]             = useState<string | null>(null);
  const [naturalSize, setNaturalSize]   = useState<{ w: number; h: number } | null>(null);
  const [userScale, setUserScale]       = useState(1);
  // Pan position as a fraction (-1..1) of the available drag range, not raw
  // pixels — scale-invariant, so the same visual point in the image stays
  // under the same screen position when the zoom level changes.
  const [pan, setPan]                   = useState({ x: 0, y: 0 });
  const [dragging, setDragging]         = useState(false);
  const [lastPos, setLastPos]           = useState({ x: 0, y: 0 });

  const imgRef       = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef     = useModalA11y<HTMLDivElement>(onClose, open);

  useEffect(() => {
    if (!open) {
      setImgSrc(null);
      setNaturalSize(null);
      setUserScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open]);

  // Scale factor so the image covers the CROP_SIZE square at userScale=1
  const baseScale  = naturalSize ? Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h) : 1;
  const renderedW  = naturalSize ? naturalSize.w * baseScale * userScale : CROP_SIZE;
  const renderedH  = naturalSize ? naturalSize.h * baseScale * userScale : CROP_SIZE;

  // Half of the pixel range the image can pan across at the current zoom —
  // pan.x/y (-1..1) times this gives the actual pixel offset.
  const halfRangeX = Math.max((renderedW - CROP_SIZE) / 2, 0);
  const halfRangeY = Math.max((renderedH - CROP_SIZE) / 2, 0);

  const clampPan = (fx: number, fy: number) => ({
    x: Math.min(Math.max(fx, -1), 1),
    y: Math.min(Math.max(fy, -1), 1),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setUserScale(1);
      setPan({ x: 0, y: 0 });
      setNaturalSize(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setPan(prev => clampPan(
      prev.x + (halfRangeX > 0 ? dx / halfRangeX : 0),
      prev.y + (halfRangeY > 0 ? dy / halfRangeY : 0),
    ));
    setLastPos({ x: e.clientX, y: e.clientY });
  };
  const onMouseUp = () => setDragging(false);

  // ── Touch drag ──────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setDragging(true);
    setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastPos.x;
    const dy = e.touches[0].clientY - lastPos.y;
    setPan(prev => clampPan(
      prev.x + (halfRangeX > 0 ? dx / halfRangeX : 0),
      prev.y + (halfRangeY > 0 ? dy / halfRangeY : 0),
    ));
    setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  // pan is a fraction of the drag range, so it's already scale-invariant —
  // changing zoom needs no offset recalculation to keep the framed point fixed.
  const handleScaleChange = (newScale: number) => setUserScale(newScale);

  // ── Canvas crop ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!imgRef.current || !containerRef.current || !naturalSize) return;

    const img  = imgRef.current;
    const cont = containerRef.current;
    const contRect = cont.getBoundingClientRect();
    const imgRect  = img.getBoundingClientRect();

    // Map screen pixels → natural image pixels
    const scaleX = naturalSize.w / imgRect.width;
    const scaleY = naturalSize.h / imgRect.height;

    const srcX = Math.max(0, (contRect.left - imgRect.left) * scaleX);
    const srcY = Math.max(0, (contRect.top  - imgRect.top)  * scaleY);
    const srcW = Math.min(contRect.width  * scaleX, naturalSize.w - srcX);
    const srcH = Math.min(contRect.height * scaleY, naturalSize.h - srcY);

    const OUTPUT = 256;
    const canvas = canvasRef.current!;
    canvas.width = canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d")!;

    // Circular clip
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT, OUTPUT);

    canvas.toBlob(blob => {
      if (blob) onSave(canvas.toDataURL("image/jpeg", 0.85), blob);
    }, "image/jpeg", 0.85);
  };

  if (!open) return null;

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    width: renderedW,
    height: renderedH,
    // Tailwind's preflight sets `img { max-width: 100%; height: auto }`,
    // which silently caps this element below CROP_SIZE-relative sizing at
    // any zoom that needs the image larger than its container — without
    // this override the browser renders a smaller box than left/top were
    // computed for, so the visible crop drifts off the actual image.
    maxWidth: "none",
    maxHeight: "none",
    left: (CROP_SIZE - renderedW) / 2 + pan.x * halfRangeX,
    top:  (CROP_SIZE - renderedH) / 2 + pan.y * halfRangeY,
    userSelect: "none",
    pointerEvents: "none",
    display: "block",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Update profile photo" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-caa-body">Update profile photo</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-caa-muted hover:text-caa-body p-1 rounded-full hover:bg-caa-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!imgSrc ? (
          /* ── Pick phase ── */
          <div>
            {currentPhoto && (
              <div className="flex justify-center mb-5">
                <img
                  src={currentPhoto}
                  alt="Current"
                  className="h-24 w-24 rounded-full object-cover border-2 border-caa-border shadow"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-caa-border rounded-xl text-center hover:border-caa-navy hover:bg-caa-surface transition-colors group"
            >
              <Upload className="h-8 w-8 mx-auto text-caa-light group-hover:text-caa-navy mb-2 transition-colors" />
              <p className="text-sm font-medium text-caa-body">Click to choose a photo</p>
              <p className="text-xs text-caa-muted mt-1">JPG, PNG or WEBP · max 5 MB</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        ) : (
          /* ── Crop phase ── */
          <div>
            <p className="text-xs text-caa-muted text-center mb-4">
              Drag to reposition · use the slider to zoom
            </p>

            {/* Circular viewport */}
            <div className="flex justify-center mb-4">
              <div
                ref={containerRef}
                className="relative overflow-hidden rounded-full border-4 border-caa-navy shadow-xl select-none"
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  cursor: dragging ? "grabbing" : "grab",
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={() => setDragging(false)}
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt=""
                  style={imgStyle}
                  onLoad={handleImgLoad}
                  draggable={false}
                />
              </div>
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 mb-4">
              <ZoomIn className="h-4 w-4 text-caa-light shrink-0" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={userScale}
                onChange={e => handleScaleChange(parseFloat(e.target.value))}
                className="flex-1 accent-caa-navy"
              />
              <span className="text-xs text-caa-muted w-9 text-right">
                {Math.round(userScale * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => { setImgSrc(null); setNaturalSize(null); fileInputRef.current?.click(); }}
              className="w-full text-center text-xs text-caa-navy hover:underline mb-5"
            >
              Choose a different photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-caa-border text-caa-body rounded-lg text-sm hover:bg-caa-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!naturalSize}
                className="flex-1 py-2.5 bg-caa-navy text-white rounded-lg text-sm font-semibold hover:bg-caa-navy-2 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" /> Save photo
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
