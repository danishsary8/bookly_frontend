import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookHeart, Share2, ShoppingBag } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { BookCard } from "@/api/types";
import { BookGrid } from "@/components/catalog/BookGrid";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { useT } from "@/i18n";
import { openShellPanel } from "@/stores/shell";
import { toast } from "@/stores/toast";

const link = "inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline";

/*
 * /lists/:slug (pages/catalogue-v2.md §4): a shared or staff-pick reading list. The sheet names the list and its
 * owner (first name only) with Add all to cart / Share / Manage; the books follow in the owner's order, each owner's
 * note as a small speech card under its book; then books like these.
 */
export default function ReadingListPage() {
  const { slug = "" } = useParams();
  const { dict } = useT();
  const t = dict.readingLists;
  const p = dict.pages;
  const list = useQuery({ queryKey: ["reading-lists", "public", slug], queryFn: () => readingListsApi.public(slug), retry: false });
  const showSkeleton = useSkeletonVisible(list.isPending);
  useScrollMemory(Boolean(list.data));
  const [sharing, setSharing] = useState(false);
  const session = useSession("customer");
  const navigate = useNavigate();
  const client = useQueryClient();
  useDocumentTitle(list.data?.title ?? t.title);
  const addAll = useMutation({
    mutationFn: () => readingListsApi.addAll(slug),
    onSuccess: ({ added, skipped }) => {
      toast.info(t.addResult(added, skipped));
      void client.invalidateQueries({ queryKey: ["cart"] });
      if (added > 0) openShellPanel("cart");
    },
    onError: (error) => toast.error(ApiError.from(error).message),
  });

  if (list.isError && ApiError.from(list.error).kind === "not_found") return <NotFoundState what={dict.catalogue.whatList} backTo="/books" backLabel={p.browseAll} />;
  if (list.isError) return <div className="container-shell py-16"><ErrorState error={list.error} onRetry={() => list.refetch()} headingLevel="h1" /></div>;

  const data = list.data;
  const entries = (data?.books ?? []).flatMap((entry) => (entry.book ? [{ book: entry.book, note: entry.note }] : []));
  const books: BookCard[] = entries.map((e) => e.book);
  const notes = new Map(entries.map((e) => [e.book.id, e.note]));
  const ids = books.map((b) => b.id);
  const url = `${window.location.origin}/lists/${slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        variant="entity"
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: data?.title ?? t.title }]}
        eyebrow={data ? t.by(data.owner_first_name) : t.title}
        title={data?.title ?? <span aria-hidden="true" className="skeleton inline-block h-10 w-72 max-w-full rounded-sm align-middle" />}
        blurb={data?.description}
        covers={books.map((b) => ({ src: b.cover_image_url, title: b.title }))}
        facts={data ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{p.bookCount(books.length)}</span> : undefined}
        actions={
          data ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={books.length === 0} loading={addAll.isPending} onClick={() => (session ? addAll.mutate() : navigate(`/login?next=${encodeURIComponent(`/lists/${slug}`)}`))}>
                  <ShoppingBag aria-hidden="true" /> {t.addAll}
                </Button>
                <Button variant="outline" aria-expanded={sharing} aria-controls="list-share" onClick={() => setSharing(!sharing)}>
                  <Share2 aria-hidden="true" /> {t.share}
                </Button>
                <Link className={link} to="/account/lists">
                  {t.manage}
                </Link>
              </div>
              {sharing ? (
                <div id="list-share" className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={copy}>
                    {t.copy}
                  </Button>
                  <a className={link} target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>
                    Facebook
                  </a>
                  <a className={link} target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(data.title)}`}>
                    Telegram
                  </a>
                </div>
              ) : null}
            </div>
          ) : undefined
        }
      />
      <div className="grid gap-14">
        <BookGrid
          books={books}
          loading={list.isPending && showSkeleton}
          headingLevel="h2"
          instancePrefix="list"
          below={(book) => {
            const note = notes.get(book.id);
            return note ? (
              <p className="relative whitespace-pre-wrap break-words rounded-xl border border-border bg-card px-3.5 py-3 text-sm italic text-muted-foreground before:absolute before:-top-1.5 before:left-5 before:size-3 before:rotate-45 before:border-l before:border-t before:border-border before:bg-card">
                <span className="sr-only">{data ? dict.catalogue.listNoteBy(data.owner_first_name) : null}: </span>
                {note}
              </p>
            ) : null;
          }}
          empty={list.isPending ? null : <EmptyState icon={BookHeart} title={dict.collections.empty} description={p.checkBack} />}
        />
        {ids.length > 0 ? <RelatedShelf id={`list-${slug}-similar`} title={dict.catalogue.moreLikeThese} source={{ kind: "similar", seeds: ids, exclude: ids }} /> : null}
      </div>
    </div>
  );
}
