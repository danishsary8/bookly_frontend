import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/api/endpoints/catalog";
import { useT } from "@/i18n";
import { BookShelf } from "./BookShelf";

// The API owns membership and ordering; dictionary keys remain stable across languages.
type RowId = "best_sellers" | "new_arrivals" | "coming_soon" | "ebook_deals";
const links: Record<RowId, string> = {
  best_sellers: "sort=best_selling",
  new_arrivals: "sort=newest",
  coming_soon: "coming_soon=1&sort=release_soon",
  ebook_deals: "has_ebook=1&format=ebook&max_price=4.99&sort=price_asc",
};

export function CatalogRows({ categoryId, categoryName }: { categoryId?: number; categoryName?: string }) {
  const { dict } = useT();
  const rows = useQuery({
    queryKey: ["catalog", "rows", categoryId ?? null],
    queryFn: () => catalogApi.rows(categoryId),
    staleTime: 15 * 60 * 1000,
  });
  return <>{rows.data?.map((row) => <BookShelf
    key={row.id}
    id={`auto-${categoryId ?? "home"}-${row.id}`}
    title={categoryName ? dict.shopExtras.categoryBest(categoryName) : dict.shopExtras.rows[row.id]}
    books={row.books}
    seeAllHref={`/books?${links[row.id]}${categoryId ? `&category_id=${categoryId}` : ""}`}
    seeAllLabel={dict.shopExtras.viewAll}
  />)}</>;
}
