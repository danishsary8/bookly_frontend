import { useId, useRef, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { staffApi } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { validateImageFile, validateImageUrl } from "@/lib/imageValidation";
import { Button } from "./button";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  error,
  hint = "JPEG, PNG, or WebP up to 5 MB (min 100×100, max 4000×4000).",
  optional = false,
  className = "",
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const displayError = error || localError;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const uploadFile = async (file: File) => {

    setLocalError(null);

    // 1. Client-side pre-validation
    const check = await validateImageFile(file);
    if (!check.ok) {
      setLocalError(check.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Upload via staff API
    try {
      setIsUploading(true);
      const res = await staffApi.uploadMedia(file);
      onChange(res.url);
    } catch (err) {
      setLocalError(ApiError.from(err).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUrlBlur = (url: string) => {
    if (!url.trim()) {
      setLocalError(null);
      return;
    }
    const check = validateImageUrl(url);
    if (!check.ok) {
      setLocalError(check.error);
    } else {
      setLocalError(null);
    }
  };

  return (
    // grid-cols-1 + min-w-0: a long image address is cut with "…" instead of widening the page.
    <div className={`grid min-w-0 grid-cols-1 gap-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={`${id}-file`} className="font-medium text-foreground">
          {label}
          {optional ? <span className="ml-1 text-muted-foreground font-normal">(optional)</span> : null}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          {showUrlInput ? "Hide URL input" : "Or enter URL"}
        </button>
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
            <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-mono text-muted-foreground">{value}</p>
            <p className="mt-1 text-success font-medium">Image uploaded</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setLocalError(null);
            }}
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file && !isUploading) void uploadFile(file);
          }}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-surface-1 focus-within:ring-2 focus-within:ring-ring ${dragging ? "border-primary bg-surface-1" : "border-border"}`}
        >
          <input
            id={`${id}-file`}
            aria-describedby={displayError ? `${id}-error` : `${id}-hint`}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Validating & uploading...</span>
            </div>
          ) : (
            <>
              <div className="grid size-10 place-items-center rounded-full bg-surface-2 transition-colors group-hover:bg-primary/10">
                <Upload className="size-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="mt-2 text-sm font-medium">
                <span className="text-primary font-semibold">Click to upload</span> or drag and drop
              </p>
              <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </>
          )}
        </div>
      )}

      {showUrlInput ? (
        <div className="mt-1 flex items-center gap-2">
          <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => handleUrlBlur(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      ) : null}

      {displayError ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
