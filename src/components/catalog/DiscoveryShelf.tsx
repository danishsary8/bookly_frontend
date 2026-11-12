import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import { BookShelf } from "./BookShelf";
import { useT } from "@/i18n";

export function DiscoveryShelf({ exclude = [] }: { exclude?: number[] }) {
  const { dict } = useT();
  const query = useQuery(catalogQueries.recommendations({ exclude_ids: exclude.join(",") || undefined, limit: 6 }));
  return <BookShelf id="catalogue-discovery" title={dict.catalogueV2.explore} books={query.data} loading={query.isPending} error={query.error} onRetry={() => query.refetch()} seeAllHref="/books?sort=best_selling" className="mt-12" />;
}
