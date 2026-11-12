import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookHeart } from "lucide-react";
import { Link } from "react-router-dom";
import { readingListsApi, type ReadingList } from "@/api/endpoints/readingLists";
import { ApiError } from "@/api/errors";
import { TextField } from "@/components/form/Field";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { AccountSection } from "@/features/account/AccountSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

function ListEditor({ list, refresh }: { list: ReadingList; refresh: () => void }) {
  const { dict } = useT();
  const t = dict.readingLists;
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? "");
  const [removing, setRemoving] = useState(false);
  const mutate = useMutation({ mutationFn: (work: () => Promise<unknown>) => work(), onSuccess: refresh, onError: (error) => toast.error(ApiError.from(error).message) });
  return <details className="shop-card rounded-2xl border border-border bg-card px-5 py-3">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 break-words rounded-md font-display text-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">{list.title}<span className="shrink-0 font-sans text-sm font-medium text-muted-foreground">{dict.pages.bookCount(list.books.length)}</span></summary>
    <form className="grid gap-4 py-4" onSubmit={(event) => { event.preventDefault(); mutate.mutate(() => readingListsApi.update(list.id, { title, description })); }}>
      <TextField required maxLength={100} label={t.listTitle} value={title} onChange={(event) => setTitle(event.target.value)} />
      <TextField maxLength={2000} label={t.description} value={description} onChange={(event) => setDescription(event.target.value)} />
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={list.is_public} disabled={mutate.isPending} onChange={(event) => { const isPublic = event.target.checked; mutate.mutate(() => readingListsApi.update(list.id, { is_public: isPublic })); }} />{t.public}</label>
      <div className="flex flex-wrap gap-3"><Button type="submit" loading={mutate.isPending}>{t.save}</Button><Button type="button" variant="outline" onClick={() => setRemoving(true)}>{t.delete}</Button>{list.is_public ? <Link className="inline-flex min-h-11 items-center text-primary" to={`/lists/${list.slug}`}>{t.openPublic}</Link> : null}</div>
    </form>
    <ol className="grid gap-4">{list.books.map((entry, index) => entry.book ? <li key={entry.book.id} className="grid gap-2 border-t border-border pt-4">
      <Link className="min-h-11 font-semibold text-primary" to={`/books/${entry.book.id}`}>{entry.book.title}</Link>
      <TextField label={t.note} maxLength={1000} defaultValue={entry.note ?? ""} onBlur={(event) => { if (event.target.value !== (entry.note ?? "")) mutate.mutate(() => readingListsApi.add(list.id, entry.book!.id!, event.target.value)); }} />
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={index === 0 || mutate.isPending} onClick={() => mutate.mutate(() => readingListsApi.add(list.id, entry.book!.id!, undefined, index - 1))}>{t.up}</Button><Button variant="outline" disabled={index === list.books.length - 1 || mutate.isPending} onClick={() => mutate.mutate(() => readingListsApi.add(list.id, entry.book!.id!, undefined, index + 1))}>{t.down}</Button><Button variant="ghost" disabled={mutate.isPending} onClick={() => mutate.mutate(() => readingListsApi.removeBook(list.id, entry.book!.id!))}>{t.remove}</Button></div>
    </li> : null)}</ol>
    <ConfirmDialog open={removing} onOpenChange={setRemoving} title={t.delete} description={list.title} confirmLabel={t.delete} loading={mutate.isPending} onConfirm={() => mutate.mutate(() => readingListsApi.remove(list.id))} />
  </details>;
}

export default function ReadingListsPage() {
  const { dict } = useT();
  const t = dict.readingLists;
  useDocumentTitle(t.title);
  const client = useQueryClient();
  const lists = useQuery({ queryKey: ["reading-lists", "own"], queryFn: readingListsApi.own });
  const [title, setTitle] = useState("");
  const refresh = () => { void client.invalidateQueries({ queryKey: ["reading-lists"] }); };
  const create = useMutation({ mutationFn: () => readingListsApi.create({ title }), onSuccess: () => { setTitle(""); refresh(); }, onError: (error) => toast.error(ApiError.from(error).message) });
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate(); };
  const a = dict.accountEmpty;
  return (
    <AccountSection title={t.title} lead={t.limits}>
      <form onSubmit={submit} className="shop-card grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <TextField label={t.listTitle} required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} />
        <Button type="submit" loading={create.isPending} disabled={(lists.data?.length ?? 0) >= 20}>{t.create}</Button>
      </form>
      {lists.isError ? <ErrorState error={lists.error} onRetry={() => lists.refetch()} /> : null}
      {lists.data?.length === 0 ? (
        <EmptyState icon={BookHeart} title={a.listsTitle} description={a.listsLead} action={<Link to="/books" className={buttonVariants({ variant: "outline" })}>{a.findBooks}</Link>} />
      ) : (
        <div className="grid gap-3">{lists.data?.map((list) => <ListEditor key={`${list.id}:${list.title}:${list.is_public}`} list={list} refresh={refresh} />)}</div>
      )}
    </AccountSection>
  );
}
