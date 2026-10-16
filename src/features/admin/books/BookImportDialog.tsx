import { useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Download, FileUp, RefreshCw } from "lucide-react";
import {
  staffApi,
  type BookImportPreviewResult,
  type BookImportRow,
} from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/stores/toast";

type Filter = "all" | BookImportRow["action"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "update", label: "Update" },
  { key: "error", label: "Errors" },
];

const MAX_BYTES = 2 * 1024 * 1024;

function ActionBadge({ action }: { action: BookImportRow["action"] }) {
  if (action === "new")
    return (
      <Badge tone="success" shape="tint">
        New
      </Badge>
    );
  if (action === "update")
    return (
      <Badge tone="info" shape="tint">
        Update
      </Badge>
    );
  return (
    <Badge tone="danger" shape="outline">
      <AlertCircle className="size-3" aria-hidden="true" /> Error
    </Badge>
  );
}

/**
 * Admin CSV import in two steps: upload → preview (nothing written; every row is New, Update or Error) → import.
 * The API checks every row again on import, so rows that became invalid since the preview are skipped and listed.
 */
export function BookImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<BookImportPreviewResult | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFileName(null);
    setPreview(null);
    setFilter("all");
    setError(null);
  };

  const previewMutation = useMutation({
    mutationFn: (file: File) => staffApi.previewImportBooksCsv(file),
    onSuccess: (data) => {
      setPreview(data);
      setError(null);
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("file") ?? apiError.message);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (token: string) => staffApi.confirmImportBooksCsv(token),
    onSuccess: (res) => {
      const skipped = res.skipped > 0 ? `, ${res.skipped} skipped` : "";
      toast.success({
        title: "Import finished",
        description: `${res.created} formats created, ${res.updated} updated${skipped}.`,
      });
      onSuccess();
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("preview_token") ?? apiError.message);
    },
  });

  const close = (next: boolean) => {
    if (next || confirmMutation.isPending) return;
    reset();
    onOpenChange(false);
  };

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("The file is bigger than 2 MB.");
    setFileName(file.name);
    setError(null);
    previewMutation.mutate(file);
  };

  const downloadTemplate = async () => {
    try {
      const blob = await staffApi.exportTemplateCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "books-import-template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download the template.");
    }
  };

  const valid = preview ? preview.totals.new + preview.totals.update : 0;
  const rows = preview
    ? preview.rows.filter((row) => filter === "all" || row.action === filter)
    : [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Import books from CSV</DialogTitle>
          <DialogDescription>
            One row per format, same columns as the export. A row with an
            existing SKU (or ISBN) updates that format; a blank cell keeps the
            current value. Other rows become new draft books.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {error ? <FormAlert title={error} /> : null}

          {!preview ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Template</h3>
                  <p className="text-xs text-muted-foreground">
                    The header row and one example row.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void downloadTemplate()}
                >
                  <Download aria-hidden="true" /> Download template
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-8 text-center">
                <FileUp
                  className="mb-3 size-10 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">
                  Choose a CSV file to preview
                </p>
                <p className="text-xs text-muted-foreground">
                  Up to 2,000 rows and 2 MB. Nothing changes until you press
                  Import.
                </p>
                <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                  {previewMutation.isPending
                    ? "Reading the file…"
                    : "Choose file"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={pickFile}
                    disabled={previewMutation.isPending}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <p className="text-sm">
                  <span className="font-semibold">{fileName}</span>
                  <span className="ml-2 text-muted-foreground">
                    {preview.totals.total} rows
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={confirmMutation.isPending}
                >
                  <RefreshCw aria-hidden="true" /> Choose another file
                </Button>
              </div>

              <div
                role="group"
                aria-label="Show rows"
                className="flex flex-wrap gap-2"
              >
                {FILTERS.map(({ key, label }) => {
                  const count =
                    key === "all" ? preview.totals.total : preview.totals[key];
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={filter === key ? "default" : "outline"}
                      aria-pressed={filter === key}
                      onClick={() => setFilter(key)}
                    >
                      {label} <span className="tabular-nums">{count}</span>
                    </Button>
                  );
                })}
              </div>

              <div className="max-h-80 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Import preview</caption>
                  <thead className="sticky top-0 border-b border-border bg-surface-2 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Row
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Action
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Title
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Format · SKU
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Messages
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr
                        key={row.row_number}
                        className={
                          row.action === "error"
                            ? "bg-destructive-tint"
                            : undefined
                        }
                      >
                        <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">
                          {row.row_number}
                        </td>
                        <td className="px-3 py-2">
                          <ActionBadge action={row.action} />
                        </td>
                        <td
                          className="max-w-[14rem] truncate px-3 py-2 font-medium"
                          title={row.title}
                        >
                          {row.title || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.format || "—"}
                          {row.sku ? (
                            <span className="font-mono"> · {row.sku}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-destructive">
                          {row.messages.length > 0 ? (
                            row.messages.join(" ")
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.totals.error > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Rows with an error are skipped; fix them in the file and
                  import it again.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={confirmMutation.isPending}
            >
              Cancel
            </Button>
          </DialogClose>
          {preview ? (
            <Button
              type="button"
              disabled={valid === 0}
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(preview.preview_token)}
            >
              Import {valid} {valid === 1 ? "row" : "rows"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
