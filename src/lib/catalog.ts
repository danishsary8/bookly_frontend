import type { BookFilters, BookSort } from "@/api/endpoints/catalog";
import type { BookFormat } from "@/api/types";

/*
 * Catalogue vocabulary and the URL <-> filter mapping for /books and /search.
 * The URL is the single source of truth for filters, sort and page, so every
 * result list is shareable and Back/Forward walk through filter changes.
 */

export const FORMATS: { value: NonNullable<BookFormat>; label: string }[] = [
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audiobook" },
];

export const formatLabel = (format: string | null | undefined) =>
  FORMATS.find((f) => f.value === format)?.label ?? (format ? format[0].toUpperCase() + format.slice(1) : "");

export const LANGUAGES = ["English", "Khmer"] as const;

export const SORTS: { value: BookSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Best rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
];

export const PER_PAGE = 24;

const positiveInt = (value: string | null) => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
};

const price = (value: string | null) => {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) return undefined;
  return Number(value);
};

/** Reads filters from the URL, dropping anything malformed instead of sending it to the API. */
export function parseBookFilters(params: URLSearchParams): BookFilters {
  const sort = params.get("sort");
  const format = params.get("format");
  const language = params.get("language");
  const q = params.get("q")?.trim();
  let min = price(params.get("min_price"));
  let max = price(params.get("max_price"));
  if (min !== undefined && max !== undefined && max < min) [min, max] = [max, min];

  return {
    q: q || undefined,
    category_id: positiveInt(params.get("category_id")),
    author_id: positiveInt(params.get("author_id")),
    series_id: positiveInt(params.get("series_id")),
    publisher_id: positiveInt(params.get("publisher_id")),
    format: FORMATS.some((f) => f.value === format) ? (format as BookFilters["format"]) : undefined,
    language: language && language.length <= 50 ? language : undefined,
    min_price: min,
    max_price: max,
    in_stock: params.get("in_stock") === "1" ? true : undefined,
    sort: SORTS.some((s) => s.value === sort) ? (sort as BookSort) : undefined,
    page: positiveInt(params.get("page")),
  };
}

const ORDER: (keyof BookFilters)[] = ["q", "category_id", "author_id", "series_id", "publisher_id", "format", "language", "min_price", "max_price", "in_stock", "sort", "page"];

/** Writes filters back as a stable, minimal query string (no empty values, page 1 omitted). */
export function toSearchParams(filters: BookFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ORDER) {
    const value = filters[key];
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (key === "page" && value === 1) continue;
    params.set(key, value === true ? "1" : String(value));
  }
  return params;
}

/** The sort the API applies when none is chosen: relevance for a search, newest otherwise. */
export const effectiveSort = (filters: BookFilters): BookSort => filters.sort ?? (filters.q ? "relevance" : "newest");

/** Filters a visitor can clear (search text, sort and page are not "filters"). */
export const FILTER_KEYS = ["category_id", "author_id", "series_id", "publisher_id", "format", "language", "min_price", "max_price", "in_stock"] as const;

export const activeFilterCount = (filters: BookFilters) => FILTER_KEYS.filter((key) => filters[key] !== undefined).length;

/** Sets or clears one filter; any filter change goes back to page 1. */
export function withFilter<K extends keyof BookFilters>(filters: BookFilters, key: K, value: BookFilters[K] | undefined): BookFilters {
  const next = { ...filters, [key]: value };
  if (key !== "page") delete next.page;
  return next;
}

export function clearFilters(filters: BookFilters): BookFilters {
  return { q: filters.q, sort: filters.sort };
}
