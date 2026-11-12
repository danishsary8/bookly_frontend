import { useQuery } from "@tanstack/react-query";
import type { BookFilters } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { BookShelf } from "./BookShelf";

/*
 * The "where next" row at the foot of a catalogue page (pages/catalogue-v2.md §4), so no page is a dead end:
 * - `similar`: books like the given ones (GET /catalog/recommendations?cart_ids=…), e.g. after an author's books.
 *   With no seeds it is the shop's popular books (empty results, 404).
 * - `filter`: a plain listing (GET /books), e.g. more by a series' author.
 * Books already on the page are left out. Adds open the cart drawer, like the grid above.
 */
export type RelatedSource =
  | { kind: "similar"; seeds?: (number | undefined)[]; exclude?: (number | undefined)[] }
  | { kind: "filter"; filters: BookFilters; exclude?: (number | undefined)[] };

type Props = {
  id: string;
  title: string;
  source: RelatedSource;
  seeAllHref?: string;
  seeAllLabel?: string;
  className?: string;
};

const ids = (list: (number | undefined)[] | undefined) => (list ?? []).filter((n): n is number => typeof n === "number");

export function RelatedShelf({ id, title, source, seeAllHref, seeAllLabel, className }: Props) {
  const exclude = new Set(ids(source.exclude));
  const seeds = source.kind === "similar" ? ids(source.seeds).slice(0, 12) : [];
  const similar = useQuery({
    ...catalogQueries.recommendations({ cart_ids: seeds.length ? seeds.join(",") : undefined, exclude_ids: exclude.size ? [...exclude].join(",") : undefined, limit: 10 }),
    enabled: source.kind === "similar",
  });
  const listing = useQuery({
    ...catalogQueries.books({ ...(source.kind === "filter" ? source.filters : {}), per_page: 12 }),
    enabled: source.kind === "filter",
  });
  const query = source.kind === "similar" ? similar : listing;
  const books = source.kind === "similar" ? similar.data : listing.data?.data;

  return (
    <BookShelf
      id={id}
      title={title}
      books={books?.filter((book) => book.id === undefined || !exclude.has(book.id))}
      loading={query.isPending}
      error={query.isError && !books ? query.error : undefined}
      onRetry={() => void query.refetch()}
      seeAllHref={seeAllHref}
      seeAllLabel={seeAllLabel}
      openCartDrawer
      className={className}
    />
  );
}
