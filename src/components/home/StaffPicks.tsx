import { useQuery } from "@tanstack/react-query";
import { readingListsApi } from "@/api/endpoints/readingLists";
import { BookShelf } from "@/components/catalog/BookShelf";
import { useT } from "@/i18n";

export function StaffPicks() {
  const { dict } = useT();
  const lists = useQuery({ queryKey: ["reading-lists", "picks"], queryFn: readingListsApi.picks });
  return <>{lists.data?.map((list) => <BookShelf key={list.id} id={`staff-list-${list.id}`} title={list.title} eyebrow={dict.readingLists.staffPick} books={list.books.flatMap((entry) => entry.book ? [entry.book] : []).slice(0, 12)} seeAllHref={`/lists/${list.slug}`} seeAllLabel={dict.shopExtras.viewAll} />)}</>;
}
