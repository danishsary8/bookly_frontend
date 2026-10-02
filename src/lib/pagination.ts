export type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Page numbers to show (MASTER §6.8): all of them up to 7 pages, otherwise the
 * first, the last and the current page with one neighbour on each side, with an
 * ellipsis wherever a gap remains. The list always has 7 entries in that case,
 * so the control keeps its width while paging.
 */
export function pageRange(current: number, last: number): PageItem[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const page = Math.min(Math.max(current, 1), last);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", last];
  if (page >= last - 3) return [1, "ellipsis-start", last - 4, last - 3, last - 2, last - 1, last];
  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", last];
}

/** "Showing 25–48 of 286 books" */
export function rangeSummary(from: number | null | undefined, to: number | null | undefined, total: number, noun = "results") {
  if (!total || !from || !to) return `0 ${noun}`;
  return `Showing ${from}–${to} of ${total.toLocaleString("en-US")} ${noun}`;
}
