import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { useSession } from "@/api/session";
import { ApiError } from "@/api/errors";
import { SelectField } from "@/components/form/Field";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

export function AddToReadingList({ bookId }: { bookId: number }) {
  const session = useSession("customer");
  const location = useLocation();
  const client = useQueryClient();
  const { dict } = useT();
  const t = dict.readingLists;
  const lists = useQuery({ queryKey: ["reading-lists", "own"], queryFn: readingListsApi.own, enabled: Boolean(session) });
  const add = useMutation({ mutationFn: (id: number) => readingListsApi.add(id, bookId), onSuccess: () => {
    toast.success(t.added); void client.invalidateQueries({ queryKey: ["reading-lists"] });
  }, onError: (error) => toast.error(ApiError.from(error).message) });
  if (!session) return <Link className="inline-flex min-h-11 items-center font-semibold text-primary" to={`/login?next=${encodeURIComponent(location.pathname)}`}>{t.addToList}</Link>;
  return <div className="grid gap-2">
    <SelectField label={t.addToList} value="" disabled={add.isPending} onChange={(event) => { if (event.target.value) add.mutate(Number(event.target.value)); }}>
      <option value="">{t.choose}</option>{lists.data?.map((list) => <option value={list.id} key={list.id}>{list.title}</option>)}
    </SelectField>
    <Link to="/account/lists" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">{t.manage}</Link>
  </div>;
}
