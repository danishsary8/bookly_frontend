import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import { BookCard } from "@/components/catalog/BookCard";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

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
  return <div className="container-shell grid gap-6 py-12">
    <h1 className="break-words font-display text-4xl">{data.title}</h1>
    <p className="text-muted-foreground">{t.by(data.owner_first_name)}</p>
    {data.description ? <p className="whitespace-pre-wrap break-words">{data.description}</p> : null}
    <div className="flex flex-wrap gap-3">
      <Button disabled={data.books.length === 0} loading={addAll.isPending} onClick={() => session ? addAll.mutate() : navigate(`/login?next=${encodeURIComponent(`/lists/${slug}`)}`)}>{t.addAll}</Button>
      <Button variant="outline" aria-expanded={sharing} aria-controls="list-share" onClick={() => setSharing(!sharing)}>{t.share}</Button>
      <Link className="inline-flex min-h-11 items-center text-primary" to="/account/lists">{t.manage}</Link>
    </div>
    {sharing ? <div id="list-share" className="flex flex-wrap gap-4"><Button variant="outline" onClick={copy}>{t.copy}</Button><a className="inline-flex min-h-11 items-center text-primary" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a><a className="inline-flex min-h-11 items-center text-primary" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(data.title)}`}>Telegram</a></div> : null}
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{data.books.map((entry) => entry.book ? <li key={entry.book.id} className="grid content-start gap-3"><BookCard book={entry.book} headingLevel="h2" />{entry.note ? <p className="whitespace-pre-wrap break-words text-sm">{entry.note}</p> : null}</li> : null)}</ul>
  </div>;
}
