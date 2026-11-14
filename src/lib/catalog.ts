import type { BookFilters, BookSort } from "@/api/endpoints/catalog";
import type { BookFormat } from "@/api/types";
import type { Translations } from "@/i18n/en";

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
  { value: "release_soon", label: "Release date: soonest" },
  { value: "best_selling", label: "Best selling" },
  { value: "rating", label: "Best rated" },
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
];

// Fill the five-column desktop grid, as well as the two/three/six-column layouts.
export const PER_PAGE = 30;

/** English learning levels (CEFR) and Khmer school grades the API filters on. */
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const GRADES = [7, 8, 9, 10, 11, 12] as const;
/** Reader age choices: the filter sends one age inside the band. */
export const AGE_BANDS = [
  { key: "baby", age: 2 },
  { key: "young", age: 5 },
  { key: "middle", age: 10 },
  { key: "teen", age: 15 },
] as const;

const between = (value: string | null, min: number, max: number) => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
};

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
    has_ebook: params.get("has_ebook") === "1" ? true : undefined,
    coming_soon: params.get("coming_soon") === "1" ? true : undefined,
    age: between(params.get("age"), 0, 18),
    school_grade: between(params.get("school_grade"), 1, 12),
    level: LEVELS.find((l) => l === params.get("level")),
    sort: SORTS.some((s) => s.value === sort) ? (sort as BookSort) : undefined,
    page: positiveInt(params.get("page")),
  };
}

const ORDER: (keyof BookFilters)[] = ["q", "category_id", "author_id", "series_id", "publisher_id", "format", "language", "age", "school_grade", "level", "min_price", "max_price", "in_stock", "has_ebook", "coming_soon", "sort", "page"];

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

/** A sort's name in the shop's language (the newer sorts live under catalogFilters). */
export function sortLabel(dict: Translations, sort: BookSort): string {
  return sort === "best_selling" || sort === "most_reviewed" || sort === "release_soon" ? dict.catalogFilters.sorts[sort] : dict.browse.sorts[sort];
}

/** The sort the API applies when none is chosen: relevance for a search, newest otherwise. */
export const effectiveSort = (filters: BookFilters): BookSort => filters.sort ?? (filters.q ? "relevance" : "newest");

/** Filters a visitor can clear (search text, sort and page are not "filters"). */
const FILTER_KEYS = ["category_id", "author_id", "series_id", "publisher_id", "format", "language", "age", "school_grade", "level", "min_price", "max_price", "in_stock", "has_ebook", "coming_soon"] as const;

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

/**
 * A chosen sort that differs from the default (e.g. "Best selling" from a home "See all" link). It is shown as a
 * removable chip so the visitor can see why the order looks the way it does.
 */
export const customSort = (filters: BookFilters): BookSort | undefined =>
  filters.sort && filters.sort !== (filters.q ? "relevance" : "newest") ? filters.sort : undefined;

/** The digits of an ISBN-10 or ISBN-13 typed with or without hyphens/spaces ("978-1-84…"), else null. */
export function isbnDigits(query: string | undefined): string | null {
  if (!query) return null;
  const compact = query.replace(/[\s-]/g, "");
  return /^(97[89]\d{10}|\d{9}[\dXx])$/.test(compact) ? compact.toUpperCase() : null;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * "Did you mean …?" for a search the API answered with similar spellings. The API only says *that* it matched
 * loosely, so each misspelt word is swapped for the closest word in the titles and authors it returned. Returns null
 * when nothing would change.
 */
export function suggestSpelling(query: string, texts: string[]): string | null {
  const vocabulary = Array.from(new Set(texts.flatMap((t) => t.toLowerCase().split(/[^\p{L}\p{N}']+/u)).filter((w) => w.length > 2)));
  let changed = false;
  const words = query
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower.length < 4 || vocabulary.includes(lower)) return word;
      let best: string | null = null;
      let bestDistance = Math.max(1, Math.floor(lower.length / 3));
      for (const candidate of vocabulary) {
        const distance = editDistance(lower, candidate);
        if (distance <= bestDistance && (best === null || distance < bestDistance)) {
          best = candidate;
          bestDistance = distance;
        }
      }
      if (!best) return word;
      changed = true;
      return best;
    });
  return changed ? words.join(" ") : null;
}
