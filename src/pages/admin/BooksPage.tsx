import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookCopy, BookPlus, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { staffQueries, type StaffBook } from "@/api/endpoints/staff";
import { CoverThumb } from "@/components/CoverThumb";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { BookState } from "@/features/admin/books/BookState";
import { orderDate } from "@/features/orders/format";
import { formatLabel } from "@/lib/catalog";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

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
 * "Deleted" view lists soft-deleted books for restoring. Search and page are in the URL.
 */
export default function BooksPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const trashed = params.get("view") === "deleted";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const books = useQuery(staffQueries.books({ q: q || undefined, trashed, page, per_page: PER_PAGE }));
  const meta = books.data?.meta;
  const list = books.data?.data ?? [];

  const go = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged, { replace: true });
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

  return (
    <AdminPage
      title="Books"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "book" : "books") : "Titles, formats, prices and stock."}
      actions={
        <Link to="/admin/books/new" className={buttonVariants()}>
          <BookPlus aria-hidden="true" /> New book
        </Link>
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
        <div role="radiogroup" aria-label="Show" className="inline-flex rounded-md border border-border bg-card p-1">
          {[
            { value: false, label: "In the catalogue" },
            { value: true, label: "Deleted" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={trashed === opt.value}
              onClick={() => go({ view: opt.value ? "deleted" : undefined, page: undefined })}
              className={cn(
                "min-h-9 rounded-[4px] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                trashed === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
        <div className={cn("overflow-x-auto rounded-xl border border-border bg-card", books.isPlaceholderData && "opacity-60 transition-opacity")}>
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead className="border-b border-border bg-surface-2 text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Book</th>
                <th scope="col" className="px-4 py-3 font-semibold">Formats and stock</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((book) => (
                <tr key={book.id} className="hover:bg-surface-2/60">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
    </AdminPage>
  );
}
