import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import { Share2, ShoppingBag } from "lucide-react";
import { BookCard } from "@/components/catalog/BookCard";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

/* /lists/:slug (pages/catalogue.md): a shared reading list as a header panel (covers, owner, actions) and the books,
   each owner's note as a small speech card under its book. */
export default function ReadingListPage() {
  const { slug = "" } = useParams();
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
  if (list.isError) return <div className="container-shell py-12"><ErrorState error={list.error} onRetry={() => list.refetch()} headingLevel="h1" /></div>;
  if (!list.data) return <p className="container-shell py-12" role="status">{t.loading}</p>;
  const data = list.data;
  const url = `${window.location.origin}/lists/${data.slug}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success(t.copied); } catch { toast.error(t.copyFailed); } };
  const covers = data.books.flatMap((entry) => (entry.book?.cover_image_url ? [{ src: entry.book.cover_image_url, title: entry.book.title }] : [])).slice(0, 5);
  return (
    <div className="container-shell pb-16">
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
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {data.books.map((entry) =>
          entry.book ? (
            <li key={entry.book.id} className="grid content-start gap-3">
              <BookCard book={entry.book} headingLevel="h2" />
              {entry.note ? (
                <p className="relative whitespace-pre-wrap break-words rounded-xl border border-border bg-card px-3.5 py-3 text-sm italic text-muted-foreground before:absolute before:-top-1.5 before:left-5 before:size-3 before:rotate-45 before:border-l before:border-t before:border-border before:bg-card">
                  {entry.note}
                </p>
              ) : null}
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
