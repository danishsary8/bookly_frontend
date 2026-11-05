import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AdminPage } from "@/features/admin/AdminPage";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

export default function ReadingListPicksPage() {
  const { dict } = useT();
  const client = useQueryClient();
  const lists = useQuery({ queryKey: ["staff", "reading-lists"], queryFn: readingListsApi.staff });
  const pick = useMutation({ mutationFn: ({ id, selected }: { id: number; selected: boolean }) => readingListsApi.pick(id, selected), onSuccess: () => { void client.invalidateQueries({ queryKey: ["staff", "reading-lists"] }); }, onError: (error) => toast.error(ApiError.from(error).message) });
  return <AdminPage title={dict.readingLists.staffPick}>
    {lists.isError ? <ErrorState error={lists.error} onRetry={() => lists.refetch()} /> : null}
    <ul className="grid gap-4">{lists.data?.map((list) => <li key={list.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"><Link className="min-h-11 break-words font-semibold text-primary" to={`/lists/${list.slug}`}>{list.title}</Link><Button variant="outline" aria-pressed={list.is_staff_pick} disabled={pick.isPending} onClick={() => pick.mutate({ id: list.id, selected: !list.is_staff_pick })}>{dict.readingLists.staffPick}</Button></li>)}</ul>
  </AdminPage>;
}
