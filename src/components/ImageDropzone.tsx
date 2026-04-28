import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Upload, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (file: File, dataUrl: string) => void;
  preview: string | null;
  onClear?: () => void;
  label?: string;
  hint?: string;
}

export function ImageDropzone({ onFile, preview, onClear, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onFile(file, reader.result as string);
    reader.readAsDataURL(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border shadow-card">
        <img src={preview} alt="Preview" className="h-64 w-full object-cover sm:h-80" />
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-3 rounded-full bg-background/90 p-1.5 text-foreground shadow-soft transition hover:bg-background"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all",
        drag
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/10"
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-clay shadow-soft">
        <Upload className="h-6 w-6 text-umber" />
      </div>
      <div>
        <p className="font-serif text-xl text-foreground">{label || "Upload image"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{hint || "Tap to choose or drag here"}</p>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/80"
        >
          <Upload className="h-3.5 w-3.5" /> Gallery
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            cameraRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Camera className="h-3.5 w-3.5" /> Camera
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}
