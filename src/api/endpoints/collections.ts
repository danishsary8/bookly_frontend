import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { BookCard, Resource } from "../types";

/*
 * Seasonal collections (owner 2026-11-01): GET /collections/live (up to 2 for the home page, 12 books each) and
 * GET /collections/{slug} (one, all its books). Both languages come from the API; `collectionText` picks one, Khmer
 * falling back to English. An API without collections answers 404: the home page then simply shows no row.
 */
export interface SeasonalCollection {
  id: number;
  slug: string;
  title_en: string;
  title_km: string | null;
  description_en: string | null;
  description_km: string | null;
  ends_at: string | null;
  books_count: number;
  books: BookCard[];
}

export const collectionsApi = {
  live: () => api.get<Resource<SeasonalCollection[]>>("/collections/live").then((r) => r.data),
  bySlug: (slug: string) => api.get<Resource<SeasonalCollection>>(`/collections/${encodeURIComponent(slug)}`).then((r) => r.data),
};

export const collectionQueries = {
  live: () => queryOptions({ queryKey: ["catalog", "collections", "live"], queryFn: collectionsApi.live, retry: false, staleTime: 5 * 60_000 }),
  bySlug: (slug: string) => queryOptions({ queryKey: ["catalog", "collections", slug], queryFn: () => collectionsApi.bySlug(slug), retry: false }),
};

/** Title and description in the shop's language; Khmer falls back to English when left empty. */
export const collectionText = (c: SeasonalCollection, lang: string) => ({
  title: (lang === "km" && c.title_km) || c.title_en,
  description: (lang === "km" && c.description_km) || c.description_en,
});
