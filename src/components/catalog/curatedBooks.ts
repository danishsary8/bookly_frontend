import type { BookCard } from "@/api/types";

/** Full resource arrays only: never sorts or filters one server page as though it were the entire catalogue. */
export function curatedBooks<T extends BookCard>(books: T[], params: URLSearchParams) {
  const q = (params.get("q") ?? "").trim().toLocaleLowerCase();
  const matching = books.filter(b => (!q || `${b.title} ${(b.authors ?? []).map(a => a.name).join(" ")}`.toLocaleLowerCase().includes(q)) && (params.get("in_stock") !== "1" || b.in_stock !== false));
  const sorted = [...matching];
  if (params.get("sort") === "title") sorted.sort((a,b) => (a.title ?? "").localeCompare(b.title ?? ""));
  if (params.get("sort") === "price_asc") sorted.sort((a,b) => Number(a.price_from_usd) - Number(b.price_from_usd));
  const lastPage = Math.max(1, Math.ceil(sorted.length / 12));
  const page = Math.min(lastPage, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
  return { books: sorted.slice((page - 1) * 12, page * 12), total: sorted.length, page, lastPage };
}

