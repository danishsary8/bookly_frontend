import { useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, RefreshCw } from "lucide-react";
import { staffApi, type BookImportPreviewResult } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

export function BookImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BookImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: (f: File) => staffApi.previewImportBooksCsv(f),
    onSuccess: (data) => {
      setPreview(data);
      setError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to parse CSV file.");
      } else {
        setError("An error occurred while uploading the file.");
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (token: string) => staffApi.confirmImportBooksCsv(token),
    onSuccess: (res) => {
      toast.success({
        title: "Import completed",
        description: `Successfully created ${res.books_created} books and updated ${res.variants_updated} variants.`,
      });
      onSuccess();
      handleClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to confirm import.");
      } else {
        setError("An error occurred during import execution.");
      }
    },
  });

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onOpenChange(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024) {
      setError("File exceeds maximum allowed size of 2MB.");
      return;
    }
    setFile(selected);
    setError(null);
    previewMutation.mutate(selected);
  };

  const downloadTemplate = async () => {
    try {
      const blob = await staffApi.exportTemplateCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "books-import-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download template.");
    }
  };

  const validRowsCount = (preview?.new_books_count ?? 0) + (preview?.update_variants_count ?? 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Import books from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing books and format variants. You can preview changes before applying them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {error ? <FormAlert title={error} /> : null}

          {!preview ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Need the format template?</h3>
                  <p className="text-xs text-muted-foreground">Download our sample CSV template with example columns and fields.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void downloadTemplate()}>
                  <Download className="mr-1.5 size-4" aria-hidden="true" />
                  Download template
                </Button>
              </div>

              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-8 text-center hover:bg-surface-2/30">
                <FileUp className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">Select a CSV file to preview</p>
                <p className="text-xs text-muted-foreground">Up to 2,000 rows, max 2MB (.csv format)</p>
                <label className="mt-4 cursor-pointer">
                  <span className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90">
                    {previewMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Analyzing CSV…
                      </>
                    ) : (
                      "Browse file"
                    )}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={previewMutation.isPending}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="text-sm">
                  <span className="font-semibold">{file?.name}</span>
                  <span className="ml-2 text-muted-foreground">({preview.total_rows} rows found)</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                >
                  <RefreshCw className="mr-1.5 size-3.5" aria-hidden="true" />
                  Upload different file
                </Button>
              </div>

              {/* Summary pills */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <div className="text-2xl font-bold">{preview.total_rows}</div>
                  <div className="text-xs text-muted-foreground">Total rows</div>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{preview.new_books_count}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">New books</div>
                </div>
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{preview.update_variants_count}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Variants to update</div>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{preview.error_rows_count}</div>
                  <div className="text-xs text-rose-700 dark:text-rose-300">Errors</div>
                </div>
              </div>

              {/* Table preview */}
              <div className="max-h-72 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-border bg-surface-2 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Row</th>
                      <th className="px-3 py-2 font-semibold">Action</th>
                      <th className="px-3 py-2 font-semibold">Title</th>
                      <th className="px-3 py-2 font-semibold">Format / SKU</th>
                      <th className="px-3 py-2 font-semibold">Price</th>
                      <th className="px-3 py-2 font-semibold">Stock</th>
                      <th className="px-3 py-2 font-semibold">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.rows.map((row) => (
                      <tr
                        key={row.row_number}
                        className={cn(
                          row.action === "error" ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-surface-2/50",
                        )}
                      >
                        <td className="px-3 py-2 font-mono text-muted-foreground">{row.row_number}</td>
                        <td className="px-3 py-2">
                          {row.action === "new" ? (
                            <Badge tone="success" shape="tint">
                              <CheckCircle2 className="size-3" aria-hidden="true" /> New
                            </Badge>
                          ) : row.action === "update" ? (
                            <Badge tone="neutral" shape="tint">
                              Update
                            </Badge>
                          ) : (
                            <Badge tone="danger" shape="outline">
                              <AlertCircle className="size-3" aria-hidden="true" /> Error
                            </Badge>
                          )}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2 font-medium" title={row.title}>
                          {row.title || <span className="text-muted-foreground">None</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.format || "-"} {row.sku ? `· ${row.sku}` : ""}
                        </td>
                        <td className="px-3 py-2">{row.price_usd ? `$${row.price_usd}` : "-"}</td>
                        <td className="px-3 py-2">{row.stock_quantity ?? "-"}</td>
                        <td className="max-w-[220px] px-3 py-2 text-rose-600 dark:text-rose-400">
                          {row.errors.length > 0 ? row.errors.join("; ") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.error_rows_count > 0 ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Note:</span> Rows with validation errors will be skipped. Only valid rows will be imported.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={confirmMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          {preview ? (
            <Button
              type="button"
              disabled={validRowsCount === 0 || confirmMutation.isPending}
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(preview.preview_token)}
            >
              Confirm & Import {validRowsCount} valid {validRowsCount === 1 ? "item" : "items"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
