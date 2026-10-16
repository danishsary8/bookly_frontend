import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookCopy, BookPlus, Download, FileUp, Layers, Search, Sliders, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { staffApi, staffQueries, type BookStatus, type StaffBook } from "@/api/endpoints/staff";
import { CoverThumb } from "@/components/CoverThumb";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { BookImportDialog } from "@/features/admin/books/BookImportDialog";
import { BookState } from "@/features/admin/books/BookState";
import { BulkActionsDialog, type BulkActionType } from "@/features/admin/books/BulkActionsDialog";
import { useStaff } from "@/features/admin/staffSession";
import { orderDate } from "@/features/orders/format";
import { formatLabel } from "@/lib/catalog";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const PER_PAGE = 20;

function FormatsCell({ book }: { book: StaffBook }) {
  if (!book.variants.length) return <span className="text-muted-foreground">No formats yet</span>;
  return (
    <ul className="grid gap-0.5">
      {book.variants.map((v) => (
        <li key={v.id} className={cn("flex items-center gap-1.5 whitespace-nowrap", !v.is_active && "text-muted-foreground line-through")}>
          {formatLabel(v.format)} · {formatUsd(v.price_usd)}
          {v.format === "ebook" || v.format === "audiobook" ? null : (
            <span className={cn("tabular-nums", v.is_low_stock ? "font-semibold text-warning" : "text-muted-foreground")}>
              {v.is_low_stock ? <AlertTriangle className="mr-0.5 inline size-3.5 align-[-2px]" aria-hidden="true" /> : null}
              {v.stock_quantity} in stock{v.is_low_stock ? <span className="sr-only"> (low)</span> : null}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/*
 * /admin/books: every book, including hidden ones (no active format yet); a
 * "Deleted" view lists soft-deleted books for restoring. Search, status filter, and page are in the URL.
 */
export default function BooksPage() {
  const queryClient = useQueryClient();
  const staffSession = useStaff();
  const isAdmin = staffSession?.user?.role === "admin";

  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const trashed = params.get("view") === "deleted";
  const statusParam = (params.get("status") as BookStatus | null) ?? undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionType>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const books = useQuery(staffQueries.books({ q: q || undefined, status: statusParam, trashed, page, per_page: PER_PAGE }));
  const meta = books.data?.meta;
  const list = books.data?.data ?? [];

  const go = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged, { replace: true });
    setSelectedIds([]);
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    go({ q: draft.trim() || undefined, page: undefined });
  };

  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    return `?${next.toString()}`;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await staffApi.exportBooksCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `books-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Catalog exported to CSV.");
    } catch {
      toast.error("Failed to export catalog.");
    } finally {
      setExporting(false);
    }
  };

  const allSelected = list.length > 0 && list.every((b) => selectedIds.includes(b.id));
  const someSelected = list.some((b) => selectedIds.includes(b.id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(Array.from(new Set([...selectedIds, ...list.map((b) => b.id)])));
    } else {
      const pageIds = new Set(list.map((b) => b.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const toggleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const selectedBooks = list.filter((b) => selectedIds.includes(b.id));

  return (
    <AdminPage
      title="Books"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "book" : "books") : "Titles, formats, prices and stock."}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <Button type="button" variant="outline" loading={exporting} onClick={() => void handleExport()}>
                <Download className="mr-1.5 size-4" aria-hidden="true" />
                Export CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                <FileUp className="mr-1.5 size-4" aria-hidden="true" />
                Import CSV
              </Button>
            </>
          ) : null}
          <Link to="/admin/books/new" className={buttonVariants()}>
            <BookPlus aria-hidden="true" /> New book
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={search} role="search" className="relative min-w-0 flex-1 basis-64">
          <label htmlFor="book-search" className="sr-only">
            Search books by title
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="book-search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by title"
            className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        {/* Status filters */}
        <div role="radiogroup" aria-label="Status filter" className="inline-flex flex-wrap rounded-md border border-border bg-card p-1">
          {[
            { label: "All", status: undefined, view: undefined },
            { label: "Live", status: "live", view: undefined },
            { label: "Scheduled", status: "scheduled", view: undefined },
            { label: "Draft", status: "draft", view: undefined },
            { label: "Deleted", status: undefined, view: "deleted" },
          ].map((opt) => {
            const active = opt.view ? trashed : !trashed && statusParam === opt.status;
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => go({ status: opt.status, view: opt.view, page: undefined })}
                className={cn(
                  "min-h-9 rounded-[4px] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{selectedIds.length} books selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex size-6 items-center justify-center rounded-md hover:bg-surface-2"
              title="Clear selection"
            >
              <X className="size-4" />
              <span className="sr-only">Clear selection</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkAction("categories")}>
              <Layers className="mr-1.5 size-3.5" aria-hidden="true" />
              Categories
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isAdmin}
              title={!isAdmin ? "Only administrators can change status" : undefined}
              onClick={() => setBulkAction("status")}
            >
              Status
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkAction("variants")}>
              <Sliders className="mr-1.5 size-3.5" aria-hidden="true" />
              Stock & Formats
            </Button>
          </div>
        </div>
      ) : null}

      {books.isError && !books.data ? (
        <ErrorState error={books.error} onRetry={() => books.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : books.isPending ? (
        <SkeletonGroup label="Loading books…" className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </SkeletonGroup>
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookCopy}
          title={q ? `No books match "${q}"` : trashed ? "No deleted books" : "No books yet"}
          description={q ? "Check the spelling or search for part of the title." : trashed ? "Books you delete can be restored from here." : "Add the first book to start selling."}
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <div className={cn("relative overflow-x-auto rounded-xl border border-border bg-card", books.isPlaceholderData && "opacity-60 transition-opacity")}>
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead className="border-b border-border bg-surface-2 text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                    aria-label="Select all books on this page"
                  />
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">Book</th>
                <th scope="col" className="px-4 py-3 font-semibold">Formats and stock</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((book) => {
                const isChecked = selectedIds.includes(book.id);
                return (
                  <tr key={book.id} className={cn("hover:bg-surface-2/60", isChecked && "bg-primary/5")}>
                    <td className="w-10 px-4 py-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => toggleSelectRow(book.id, Boolean(checked))}
                        aria-label={`Select ${book.title}`}
                      />
                    </td>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        <CoverThumb src={book.variants.find((v) => v.cover_image_url)?.cover_image_url} className="w-10 shrink-0" />
                        <span className="grid min-w-0 gap-0.5">
                          <Link to={`/admin/books/${book.id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                            {book.title}
                          </Link>
                          <span className="truncate text-sm text-muted-foreground">{book.authors.map((a) => a.name).join(", ") || "No author"}</span>
                        </span>
                      </div>
                    </th>
                    <td className="px-4 py-3 text-sm">
                      <FormatsCell book={book} />
                    </td>
                    <td className="px-4 py-3">
                      <BookState book={book} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{orderDate(book.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />

      {/* Bulk actions modal */}
      <BulkActionsDialog
        books={selectedBooks}
        action={bulkAction}
        isAdmin={Boolean(isAdmin)}
        onClose={() => setBulkAction(null)}
        onSuccess={() => {
          setSelectedIds([]);
          void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
        }}
      />

      {/* CSV Import modal */}
      <BookImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
        }}
      />
    </AdminPage>
  );
}
