import { useQueries, useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";

/*
 * Books from across the shop for the home hero and the shelf (owner 2026-11-11: "mix categories — personal growth,
 * comics …"). The top-level categories that have books (largest first) each give their best sellers; the lanes are
 * then dealt out in turns, one book from each lane per round, so a row mixes genres instead of showing one.
 * Category queries are shared through the query cache, so the hero and the shelf make the same requests once.
 */

/** One book from each lane per round, skipping repeats, until `limit` books. */
export function interleave(lanes: BookCard[][], limit: number): BookCard[] {
  const seen = new Set<number>();
  const out: BookCard[] = [];
  const longest = Math.max(0, ...lanes.map((lane) => lane.length));
  for (let round = 0; round < longest && out.length < limit; round++) {
    for (const lane of lanes) {
      const book = lane[round];
      if (!book?.id || seen.has(book.id)) continue;
      seen.add(book.id);
      out.push(book);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function useCategoryLanes({ categories = 6, perCategory = 4, enabled = true } = {}) {
  const tree = useQuery({ ...catalogQueries.categoryTree(), enabled });
  const top = [...(tree.data ?? [])]
    .filter((c) => c.id && (c.total_books ?? 0) > 0)
    .sort((a, b) => (b.total_books ?? 0) - (a.total_books ?? 0))
    .slice(0, categories);
  const results = useQueries({
    queries: top.map((c) => ({ ...catalogQueries.books({ category_id: c.id, sort: "best_selling", per_page: perCategory }), staleTime: 10 * 60_000, enabled })),
  });
  return {
    lanes: results.map((r) => r.data?.data ?? []),
    // A failed tree or category simply adds nothing; only wait while something is still loading.
    pending: tree.isPending || results.some((r) => r.isPending),
  };
}
