import { NotFoundState } from "@/components/catalog/NotFoundState";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { curatedBooks } from "@/components/catalog/curatedBooks";
import { CuratedToolbar } from "@/components/catalog/CuratedToolbar";
import { useSearchParams } from "react-router-dom";
import { DiscoveryShelf } from "@/components/catalog/DiscoveryShelf";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import { Share2, ShoppingBag } from "lucide-react";
import { useAddToCart, useWishlist } from "@/components/catalog/useCatalogActions";
import { BookCard } from "@/components/catalog/BookCard";
import { CatalogueHeader as PageHeader } from "@/components/catalog/CatalogueHeader";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

/* /lists/:slug (pages/catalogue.md): a shared reading list as a header panel (covers, owner, actions) and the books,
   each owner's note as a small speech card under its book. */
export default function ReadingListPage() {
  const [curatedParams] = useSearchParams();
  const { slug = "" } = useParams();
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const { dict } = useT();
  const t = dict.readingLists;
  const list = useQuery({ queryKey: ["reading-lists", "public", slug], queryFn: () => readingListsApi.public(slug), retry: false });
  const [sharing, setSharing] = useState(false);
  const session = useSession("customer");
  const navigate = useNavigate();
  const client = useQueryClient();
  useDocumentTitle(list.data?.title ?? t.title);
  const addAll = useMutation({ mutationFn: () => readingListsApi.addAll(slug), onSuccess: ({ added, skipped }) => {
    toast.info(t.addResult(added, skipped)); void client.invalidateQueries({ queryKey: ["cart"] });
  }, onError: (error) => toast.error(ApiError.from(error).message) });
  if (list.isError && ApiError.from(list.error).kind === "not_found") return <NotFoundState what={t.title} backTo="/books" backLabel={dict.pages.browseAll} />;
  if (list.isError) return <div className="container-shell py-12"><ErrorState error={list.error} onRetry={() => list.refetch()} headingLevel="h1" /></div>;
  if (!list.data) return <div className="catalogue-v2 container-shell pb-16"><PageHeader title={t.title} /><SkeletonGroup label={t.loading} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{[0,1,2,3].map(i => <BookCardSkeleton key={i} />)}</SkeletonGroup></div>;
  const data = list.data;
  const selection = curatedBooks(data.books.flatMap(entry => entry.book ? [entry.book] : []), curatedParams);
  const visibleIds = new Set(selection.books.map(book => book.id));
  const url = `${window.location.origin}/lists/${data.slug}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success(t.copied); } catch { toast.error(t.copyFailed); } };
  const covers = data.books.flatMap((entry) => (entry.book?.cover_image_url ? [{ src: entry.book.cover_image_url, title: entry.book.title }] : [])).slice(0, 5);
  return (
    <div className="catalogue-v2 container-shell pb-16">
      <PageHeader
        crumbs={[{ label: dict.pages.home, to: "/" }, { label: t.title }]}
        eyebrow={t.by(data.owner_first_name)}
        title={<span className="break-words">{data.title}</span>}
        lead={data.description ? <p className="whitespace-pre-wrap break-words">{data.description}</p> : undefined}
        variant="panel"
        covers={covers}
        meta={
          <div className="grid gap-3 border-t border-dashed border-border pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={data.books.length === 0} loading={addAll.isPending} onClick={() => (session ? addAll.mutate() : navigate(`/login?next=${encodeURIComponent(`/lists/${slug}`)}`))}>
                <ShoppingBag aria-hidden="true" /> {t.addAll}
              </Button>
              <Button variant="outline" aria-expanded={sharing} aria-controls="list-share" onClick={() => setSharing(!sharing)}>
                <Share2 aria-hidden="true" /> {t.share}
              </Button>
              <Link className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline" to="/account/lists">
                {t.manage}
              </Link>
            </div>
            {sharing ? (
              <div id="list-share" className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={copy}>{t.copy}</Button>
                <a className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a>
                <a className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(data.title)}`}>Telegram</a>
              </div>
            ) : null}
          </div>
        }
      />
      <CuratedToolbar {...selection} />
      {!selection.total ? <p className="py-8 text-muted-foreground" role="status">{dict.browse.noMatchFilters}</p> : null}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {data.books.filter(entry => visibleIds.has(entry.book?.id)).map((entry) =>
          entry.book ? (
            <li key={entry.book.id} className="grid min-w-0 content-start gap-3 [&>*]:min-w-0">
              <BookCard book={entry.book} headingLevel="h2" onAddToCart={cart.add} onToggleWishlist={wishlist.toggle} saved={wishlist.isSaved(entry.book.id)} adding={cart.pendingBookId === entry.book.id} />
              {entry.note ? (
                <p className="relative whitespace-pre-wrap break-words rounded-xl border border-border bg-card px-3.5 py-3 text-sm italic text-muted-foreground before:absolute before:-top-1.5 before:left-5 before:size-3 before:rotate-45 before:border-l before:border-t before:border-border before:bg-card">
                  {entry.note}
                </p>
              ) : null}
            </li>
          ) : null,
        )}
      </ul>
      <DiscoveryShelf />
    </div>
  );
}
