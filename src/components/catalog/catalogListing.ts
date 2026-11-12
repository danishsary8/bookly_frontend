import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { BookFilters } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { PER_PAGE, parseBookFilters } from "@/lib/catalog";

/**
 * The listing a CatalogBrowser shows for the current URL and `locked` filters. CatalogueHeader's pages call it too,
 * to fan the first covers: the query key is the same, so it is one request.
 */
export function useCatalogListing(locked: Partial<BookFilters> = {}, enabled = true) {
  const [searchParams] = useSearchParams();
  const filters: BookFilters = { ...parseBookFilters(searchParams), ...locked };
  return useQuery({ ...catalogQueries.books({ ...filters, per_page: PER_PAGE, facets: true }), enabled });
}

/** The first covers of a listing, for CatalogueHeader's `covers`. */
export const coversOf = (books: { cover_image_url?: string | null; title?: string | null }[] | undefined, n = 5) =>
  (books ?? []).filter((b) => b.cover_image_url).slice(0, n).map((b) => ({ src: b.cover_image_url, title: b.title }));
