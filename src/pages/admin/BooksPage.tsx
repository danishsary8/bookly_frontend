import { useEffect, useRef, useState } from "react";
import { BOOKS_LIST_KEY } from "@/features/admin/books/booksListMemory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, BookCopy, BookPlus, Download, Eye, FileUp, Layers, Pencil, X, BadgeDollarSign, Package } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminFormDialogContent } from "@/features/admin/AdminFormDialog";
import "@/features/admin/catalogue.css";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { staffApi, staffQueries, type BookListSort, type BookStatus, type StaffBook } from "@/api/endpoints/staff";
import type { BookFormat } from "@/api/types";
import { CoverThumb } from "@/components/CoverThumb";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { FilterSelect, Highlight, SearchBox } from "@/features/admin/listKit";
import { BookImportDialog } from "@/features/admin/books/BookImportDialog";
import { BookState } from "@/features/admin/books/BookState";
import { BulkActionsDialog, type BulkActionType } from "@/features/admin/books/BulkActionsDialog";
import { PriceChangeDialog } from "@/features/admin/books/PriceChangeDialog";
import { AddToBundleDialog } from "@/features/admin/books/AddToBundleDialog";
import { useStaff } from "@/features/admin/staffSession";
import { usePortalPath } from "@/features/admin/portal";
import { orderDate } from "@/features/orders/format";
import { formatLabel } from "@/lib/catalog";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";
import { ApiError } from "@/api/errors";

const PER_PAGE = 20;

/** A printed edition's margin next to its price: red at a loss, amber under 20%, a quiet hint with no cost yet. */
function MarginTag({ price, cost, digital }: { price: string; cost?: string | null; digital: boolean }) {
  if (digital) return null;
  if (cost === null || cost === undefined || cost === "") return <span className="text-xs text-muted-foreground">· no cost</span>;
  const p = Number(price);
  const margin = p > 0 ? Math.round(((p - Number(cost)) / p) * 100) : 0;
  return (
    <span
      title={`Cost ${formatUsd(cost)}`}
      className={cn("rounded px-1.5 text-xs font-semibold tabular-nums", margin < 0 ? "bg-destructive-tint text-destructive" : margin < 20 ? "bg-warning-tint text-foreground" : "text-success")}
    >
      {margin < 0 ? `loss ${margin}%` : `${margin}%`}
    </span>
  );
}

function FormatsCell({ book }: { book: StaffBook }) {
  if (!book.variants.length) return <span className="text-muted-foreground">No formats yet</span>;
  return (
    <ul className="grid gap-0.5">
      {book.variants.map((v) => (
        <li key={v.id} className={cn("flex items-center gap-1.5 whitespace-nowrap", !v.is_active && "text-muted-foreground line-through")}>
          {formatLabel(v.format)} · {formatUsd(v.price_usd)}
          <MarginTag price={v.price_usd} cost={v.cost_price_usd} digital={v.format === "ebook" || v.format === "audiobook"} />
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
  const [preview, setPreview] = useState<StaffBook | null>(null);
  const toPortal = usePortalPath();
  const queryClient = useQueryClient();
  const staffSession = useStaff();
  const isAdmin = staffSession?.user?.role === "admin";

  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params.toString());
  // "← All books" on a book page comes back to this list as it was: same search, filters and page.
  useEffect(() => {
    latestParams.current = params.toString();
    try {
      sessionStorage.setItem(BOOKS_LIST_KEY, params.toString());
    } catch {
      /* private mode */
    }
  }, [params]);
  const q = params.get("q") ?? "";
  const trashed = params.get("view") === "deleted";
  const statusParam = (params.get("status") as BookStatus | null) ?? undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const categoryId = Number(params.get("category")) || undefined;
  const formatParam = (params.get("format") as BookFormat | null) || undefined;
  const stockParam = (["in", "low", "out"] as const).find((v) => v === params.get("stock"));
  const marginParam = (["loss", "low", "no_cost"] as const).find((v) => v === params.get("margin"));
  const categories = useQuery(catalogQueries.categoryTree());

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionType>(null);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  /** "Select all N books in this filter": every page, for Change prices (owner 2026-11-26). */
  const [allMatching, setAllMatching] = useState(false);
  const [priceBooks, setPriceBooks] = useState<StaffBook[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [priceScope, setPriceScope] = useState<string | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Sales next to stock (owner 2026-11-12): the Sold column's header switches newest → most sold → least sold.
  const sortParam = params.get("sort");
  const sort: BookListSort = sortParam === "most_sold" || sortParam === "least_sold" || sortParam === "title" ? sortParam : "newest";
  const nextSort: BookListSort = sort === "most_sold" ? "least_sold" : sort === "least_sold" ? "newest" : "most_sold";
  const listFilters = { q: q || undefined, status: statusParam, trashed, sort: sort === "newest" ? undefined : sort, category_id: categoryId, format: formatParam, stock: stockParam, margin: marginParam };
  const books = useQuery(staffQueries.books({ ...listFilters, page, per_page: PER_PAGE }));
  const filtered = Boolean(q || categoryId || formatParam || stockParam || marginParam);
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...(categories.data ?? []).flatMap((c) => [
      { value: String(c.id), label: c.name ?? "" },
      ...(c.children ?? []).map((child) => ({ value: String(child.id), label: child.name ?? "", indent: true })),
    ]),
  ];
  const categoryName = categoryOptions.find((o) => o.value === String(categoryId))?.label;
  const meta = books.data?.meta;
  const list = books.data?.data ?? [];

  const go = (next: Record<string, string | undefined>) => {
    // Built from the latest filters (not this render's copy), so two quick changes never undo each other.
    const merged = new URLSearchParams(latestParams.current);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    latestParams.current = merged.toString();
    setParams(merged, { replace: true });
    setSelectedIds([]);
    setAllMatching(false);
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
      setAllMatching(false);
      const pageIds = new Set(list.map((b) => b.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const toggleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setAllMatching(false);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const selectedBooks = list.filter((b) => selectedIds.includes(b.id));
  const total = meta?.total ?? 0;
  const clearSelection = () => {
    setSelectedIds([]);
    setAllMatching(false);
  };

  /** Change prices: the selected books, or every book in the filter (all pages, 100 at a time). */
  const openPrices = async (all = allMatching) => {
    setPriceScope(all ? (filtered ? `All ${total} books in this filter` : `All ${total} books`) : undefined);
    if (!all) {
      setPriceBooks(selectedBooks);
      setPricesOpen(true);
      return;
    }
    setLoadingAll(true);
    try {
      const all: StaffBook[] = [];
      for (let p = 1; p <= 50; p++) {
        const res = await staffApi.books({ ...listFilters, page: p, per_page: 100 });
        all.push(...res.data);
        if (p >= (res.meta?.last_page ?? 1)) break;
      }
      setPriceBooks(all);
      setPricesOpen(true);
    } catch (error) {
      toast.error(ApiError.from(error).message);
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <AdminPage
      title="Books"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "book" : "books") : "Titles, formats, prices and stock."}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <Button type="button" variant="outline" loading={loadingAll && !allMatching} disabled={!total} title="Change sell and cost prices for every book in the current filter" onClick={() => void openPrices(true)}>
                <BadgeDollarSign className="mr-1.5 size-4" aria-hidden="true" />
                Change prices
              </Button>
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
          <Link to={toPortal("books/new")} className={buttonVariants()}>
            <BookPlus aria-hidden="true" /> New book
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          label="Search books by title, author or ISBN"
          value={q}
          busy={books.isFetching && books.isPlaceholderData}
          onSearch={(next) => go({ q: next || undefined, page: undefined })}
          placeholder="Search title, author or ISBN"
        />

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

      {/* Narrow the list: shelf, format, stock and order. Every choice lives in the URL, so a filtered view can be shared. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch">
        <FilterSelect className="col-span-2 sm:w-60" label="Category" value={categoryId ? String(categoryId) : ""} onChange={(v) => go({ category: v || undefined, page: undefined })} options={categoryOptions} />
        <FilterSelect className="sm:w-40" label="Format" value={formatParam ?? ""} onChange={(v) => go({ format: v || undefined, page: undefined })} options={[{ value: "", label: "Any format" }, { value: "paperback", label: "Paperback" }, { value: "hardcover", label: "Hardcover" }, { value: "ebook", label: "Ebook" }, { value: "audiobook", label: "Audiobook" }]} />
        <FilterSelect className="sm:w-44" label="Stock" value={stockParam ?? ""} onChange={(v) => go({ stock: v || undefined, page: undefined })} options={[{ value: "", label: "Any stock" }, { value: "in", label: "In stock" }, { value: "low", label: "Running low" }, { value: "out", label: "Out of stock" }]} />
        {isAdmin ? (
          <FilterSelect className="sm:w-48" label="Margin" value={marginParam ?? ""} onChange={(v) => go({ margin: v || undefined, page: undefined })} options={[{ value: "", label: "Any margin" }, { value: "low", label: "Under 20% margin" }, { value: "loss", label: "Selling at a loss" }, { value: "no_cost", label: "No cost price yet" }]} />
        ) : null}
        <FilterSelect className="col-span-2 sm:w-44" label="Sort" value={sort === "newest" ? "" : sort} onChange={(v) => go({ sort: v || undefined, page: undefined })} options={[{ value: "", label: "Newest first" }, { value: "title", label: "Title A–Z" }, { value: "most_sold", label: "Most sold (90 days)" }, { value: "least_sold", label: "Least sold (90 days)" }]} />
        {filtered ? (
          <button type="button" onClick={() => go({ q: undefined, category: undefined, format: undefined, stock: undefined, margin: undefined, page: undefined })} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold text-primary outline-none hover:bg-lapis-tint focus-visible:ring-2 focus-visible:ring-ring sm:ml-auto">
            <X className="size-4" aria-hidden="true" /> Clear filters
          </button>
        ) : null}
      </div>

            {/* Bulk action toolbar */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{allMatching ? `All ${total} books in this filter selected` : `${selectedIds.length} books selected`}</span>
            {!allMatching && isAdmin && allSelected && total > list.length ? (
              <button type="button" onClick={() => setAllMatching(true)} className="rounded-md px-1.5 py-0.5 font-semibold text-primary underline-offset-4 hover:underline">
                Select all {total} books in this filter
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex size-6 items-center justify-center rounded-md hover:bg-surface-2"
              title="Clear selection"
            >
              <X className="size-4" />
              <span className="sr-only">Clear selection</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {allMatching ? null : (
              <>
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
                    {isAdmin ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setBundleOpen(true)}>
                    <Package className="mr-1.5 size-3.5" aria-hidden="true" />
                    Add to bundle
                  </Button>
                ) : null}
              </>
            )}
            {isAdmin ? (
              <Button type="button" size="sm" variant={allMatching ? "default" : "outline"} loading={loadingAll} onClick={() => void openPrices()}>
                <BadgeDollarSign className="mr-1.5 size-3.5" aria-hidden="true" />
                Change prices
              </Button>
            ) : null}
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
          title={filtered ? (q ? `No books match "${q}"` : "No books match these filters") : trashed ? "No deleted books" : "No books yet"}
          description={filtered ? `Try part of the title, an author's surname or an ISBN${categoryName ? `, or look outside ${categoryName}` : ""}.` : trashed ? "Books you delete can be restored from here." : "Add the first book to start selling."}
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <div className={cn("catalogue-books desk-card rounded-xl border border-border bg-card", books.isPlaceholderData && "opacity-60 transition-opacity")}>
          <table className="w-full text-left text-[15px]">
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
                <th scope="col" className="px-4 py-3 text-right font-semibold" aria-sort={sort === "most_sold" ? "descending" : sort === "least_sold" ? "ascending" : "none"}>
                  <button
                    type="button"
                    onClick={() => go({ sort: nextSort === "newest" ? undefined : nextSort, page: undefined })}
                    title={sort === "newest" ? "Sort by most sold" : sort === "most_sold" ? "Sort by least sold" : "Back to newest first"}
                    className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 font-semibold underline-offset-4 hover:underline"
                  >
                    <span>Sold<span className="block text-xs font-normal">90 days</span></span>
                    {sort === "most_sold" ? <ArrowDown className="size-3.5" aria-hidden="true" /> : sort === "least_sold" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
                <th scope="col" className="catalogue-actions-heading px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((book) => {
                const isChecked = selectedIds.includes(book.id);
                return (
                  <tr key={book.id} className={cn("hover:bg-surface-2/60", isChecked && "bg-primary/5")}>
                    <td className="catalogue-select w-10 px-4 py-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => toggleSelectRow(book.id, Boolean(checked))}
                        aria-label={`Select ${book.title}`}
                      />
                    </td>
                    <th scope="row" className="catalogue-book-name px-4 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        <CoverThumb src={book.variants.find((v) => v.cover_image_url)?.cover_image_url} className="w-10 shrink-0" />
                        <span className="grid min-w-0 gap-0.5">
                          <Link to={toPortal(`books/${book.id}`)} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                            <Highlight text={book.title} query={q} />
                          </Link>
                          <span className="text-sm text-muted-foreground"><Highlight text={book.authors.map((a) => a.name).join(", ") || "No author"} query={q} /></span>
                        </span>
                      </div>
                    </th>
                    <td data-label="Formats & stock" className="catalogue-formats px-4 py-3 text-sm">
                      <FormatsCell book={book} />
                    </td>
                    <td data-label="Sold · 90 days" className={cn("catalogue-sold px-4 py-3 text-right tabular-nums", book.sold_recent ? "font-semibold" : "text-muted-foreground")}>{book.sold_recent ?? "—"}</td>
                    <td data-label="Status" className="catalogue-state px-4 py-3">
                      <BookState book={book} />
                    </td>
                    <td data-label="Updated" className="catalogue-updated px-4 py-3 text-sm text-muted-foreground">{orderDate(book.updated_at)}</td>
                    <td className="catalogue-row-actions px-4 py-3"><div className="catalogue-actions"><Button size="sm" variant="outline" aria-label={`View details for ${book.title}`} onClick={() => setPreview(book)}><Eye aria-hidden="true" />Details</Button><Link aria-label={`Edit ${book.title}`} to={toPortal(`books/${book.id}`)} className={buttonVariants({ variant: "ghost", size: "sm" })}><Pencil aria-hidden="true" />Edit</Link></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}><AdminFormDialogContent>{preview ? <><DialogHeader><DialogTitle>{preview.title}</DialogTitle><DialogDescription>Book details at a glance. Open the editor to manage this book and its formats.</DialogDescription></DialogHeader><div className="catalogue-book-preview"><CoverThumb src={preview.variants.find((v) => v.cover_image_url)?.cover_image_url} className="w-24" /><div className="grid min-w-0 gap-3"><p className="text-sm text-muted-foreground">{preview.authors.map((a) => a.name).join(", ") || "No author"}</p><BookState book={preview} /><FormatsCell book={preview} /><p className="text-sm text-muted-foreground">Updated {orderDate(preview.updated_at)} · {preview.sold_recent ?? 0} sold in 90 days</p></div></div><DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose><Link to={toPortal(`books/${preview.id}`)} className={buttonVariants()}><Pencil aria-hidden="true" />Edit book</Link></DialogFooter></> : null}</AdminFormDialogContent></Dialog>

      {/* Bulk actions modal */}
      {bulkAction ? (
        <BulkActionsDialog
          key={bulkAction}
          books={selectedBooks}
          action={bulkAction}
          isAdmin={Boolean(isAdmin)}
          onClose={() => setBulkAction(null)}
          onSuccess={() => {
            setSelectedIds([]);
            void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
          }}
        />
      ) : null}

      {bundleOpen ? (
        <AddToBundleDialog books={selectedBooks} onClose={() => setBundleOpen(false)} onSuccess={clearSelection} />
      ) : null}

      {pricesOpen ? (
        <PriceChangeDialog
          books={priceBooks ?? []}
          scope={priceScope}
          onClose={() => setPricesOpen(false)}
          onSuccess={() => {
            clearSelection();
            void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
          }}
        />
      ) : null}

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
