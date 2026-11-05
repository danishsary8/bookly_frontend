import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BookOpen, CheckCircle2, FileUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { ebookApi, ebookKeys, ebookQueries } from "@/api/endpoints/ebooks";
import type { StaffBook } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { controlClassName } from "@/components/form/Field";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

export function EbookPanel({ book }: { book: StaffBook }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [previewInput, setPreviewInput] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const ebookQuery = useQuery({
    ...ebookQueries.staffEbook(book.id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "processing" ? 2000 : false;
    },
  });

  const ebook = ebookQuery.data;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadPercent(0);
      return await ebookApi.uploadStaffEbook(book.id, file, (progress) => {
        if (progress.total && progress.total > 0) {
          setUploadPercent(Math.round((progress.loaded / progress.total) * 100));
        }
      });
    },
    onSuccess: () => {
      setUploadPercent(null);
      void queryClient.invalidateQueries({ queryKey: ebookKeys.staffFile(book.id) });
      toast.success("Ebook PDF uploaded. Rendering pages in background…");
    },
    onError: (err) => {
      setUploadPercent(null);
      toast.error({
        title: "Ebook upload failed",
        description: ApiError.from(err).message,
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: (val: number | null) => ebookApi.updateStaffPreviewPages(book.id, val),
    onSuccess: () => {
      setPreviewError(null);
      void queryClient.invalidateQueries({ queryKey: ebookKeys.staffFile(book.id) });
      toast.success("Preview pages updated");
    },
    onError: (err) => {
      setPreviewError(ApiError.from(err).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ebookApi.deleteStaffEbook(book.id),
    onSuccess: () => {
      setConfirmDelete(false);
      void queryClient.invalidateQueries({ queryKey: ebookKeys.staffFile(book.id) });
      toast.success("Ebook file removed");
    },
    onError: (err) => {
      toast.error({
        title: "Couldn't remove ebook",
        description: ApiError.from(err).message,
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("File must have a .pdf extension");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50 MB limit");
      return;
    }
    uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSavePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ebook) return;
    const trimmed = previewInput.trim();
    if (trimmed === "") {
      previewMutation.mutate(null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 1 || n > ebook.page_count) {
      setPreviewError(`Preview pages must be between 1 and ${ebook.page_count}`);
      return;
    }
    previewMutation.mutate(n);
  };

  return (
    <section aria-labelledby="ebook-panel" className="grid grid-cols-1 content-start gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 id="ebook-panel" className="font-sans text-[1.0625rem] font-semibold tracking-normal flex items-center gap-2">
          <BookOpen className="size-5 text-primary" aria-hidden="true" />
          Ebook (PDF Reader)
        </h2>
        {ebookQuery.isFetching && !ebookQuery.isLoading ? (
          <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-label="Refreshing ebook status" />
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {ebookQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading ebook details…</p>
      ) : !ebook ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No ebook uploaded yet. Upload a PDF (up to 50 MB) to enable in-browser reading.
          </p>
          {uploadMutation.isPending ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                <Loader2 className="size-4 animate-spin" />
                Uploading… {uploadPercent !== null ? `${uploadPercent}%` : ""}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadPercent ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="size-4 mr-1.5" /> Upload PDF
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {ebook.status === "ready" ? (
              <Badge tone="success" shape="tint" className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="size-3.5" /> Ready ({ebook.page_count} pages)
              </Badge>
            ) : ebook.status === "processing" ? (
              <Badge tone="warning" shape="tint" className="flex items-center gap-1 font-semibold">
                <Loader2 className="size-3.5 animate-spin" /> Processing ({ebook.pages_rendered} / {ebook.page_count} pages)
              </Badge>
            ) : (
              <Badge tone="danger" shape="tint" className="flex items-center gap-1">
                <AlertCircle className="size-3.5" /> Failed
              </Badge>
            )}
          </div>

          {ebook.status === "failed" && ebook.error ? (
            <p className="rounded bg-destructive-tint p-2 text-xs text-destructive">
              {ebook.error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block font-medium text-foreground">File size</span>
              {(ebook.size_bytes / (1024 * 1024)).toFixed(2)} MB
            </div>
            <div>
              <span className="block font-medium text-foreground">Default preview (10%)</span>
              {ebook.preview_limit} page{ebook.preview_limit === 1 ? "" : "s"}
            </div>
          </div>

          <form onSubmit={handleSavePreview} className="space-y-2 border-t border-border pt-3">
            <label htmlFor="preview-pages" className="block text-xs font-medium text-foreground">
              Preview pages override (1 - {ebook.page_count})
            </label>
            <div className="flex gap-2">
              <input
                id="preview-pages"
                type="number"
                min="1"
                max={ebook.page_count}
                placeholder={ebook.preview_pages ? String(ebook.preview_pages) : `Default (${ebook.preview_limit})`}
                value={previewInput}
                onChange={(e) => {
                  setPreviewInput(e.target.value);
                  setPreviewError(null);
                }}
                className={cn(controlClassName, "h-9 text-sm")}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                loading={previewMutation.isPending}
              >
                Save
              </Button>
            </div>
            {ebook.preview_pages ? (
              <p className="text-xs text-muted-foreground">
                Currently overridden to {ebook.preview_pages} pages. Leave empty and click Save to reset to default.
              </p>
            ) : null}
            {previewError ? (
              <p className="text-xs text-destructive">{previewError}</p>
            ) : null}
          </form>

          {uploadMutation.isPending ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                <Loader2 className="size-4 animate-spin" />
                Re-uploading… {uploadPercent !== null ? `${uploadPercent}%` : ""}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadPercent ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="size-4 mr-1.5" /> Re-upload PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="border-destructive/50 text-destructive hover:bg-destructive-tint"
              >
                <Trash2 className="size-4 mr-1.5" /> Remove ebook
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove ebook file?"
        description="This deletes the master PDF and all rendered page images. Customers who purchased this ebook will not be able to read it until a new PDF is uploaded."
        confirmLabel="Remove ebook"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </section>
  );
}
