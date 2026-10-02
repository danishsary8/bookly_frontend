import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type {
  Author,
  BookCard,
  BookDetail,
  BookFormat,
  BookReviewsPage,
  Category,
  Paginated,
  Publisher,
  Resource,
  Series,
  SeriesDetail,
} from "../types";

export type BookSort = "relevance" | "newest" | "price_asc" | "price_desc" | "title" | "rating";

export interface BookFilters {
  q?: string;
  category_id?: number;
  author_id?: number;
  series_id?: number;
  publisher_id?: number;
  format?: BookFormat;
  language?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort?: BookSort;
  page?: number;
  per_page?: number;
}

/** Drops empty values and turns booleans into 1, as the API expects. */
export const toQueryParams = (filters: object): Record<string, string | number> => {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    params[key] = value === true ? 1 : (value as string | number);
  }
  return params;
};

export const catalogKeys = {
  all: ["catalog"] as const,
  books: (filters: BookFilters) => ["catalog", "books", toQueryParams(filters)] as const,
  book: (id: number) => ["catalog", "book", id] as const,
  bookReviews: (id: number, params: object) => ["catalog", "book", id, "reviews", toQueryParams(params)] as const,
  authors: (params: object) => ["catalog", "authors", toQueryParams(params)] as const,
  author: (id: number) => ["catalog", "author", id] as const,
  categories: () => ["catalog", "categories"] as const,
  publishers: (params: object) => ["catalog", "publishers", toQueryParams(params)] as const,
  seriesList: (params: object) => ["catalog", "series", toQueryParams(params)] as const,
  series: (id: number) => ["catalog", "series", id] as const,
};

export const catalogApi = {
  books: (filters: BookFilters = {}) => api.get<Paginated<BookCard>>("/books", { params: toQueryParams(filters) }),
  book: (id: number) => api.get<Resource<BookDetail>>(`/books/${id}`).then((r) => r.data),
  bookReviews: (id: number, params: { sort?: "newest" | "highest" | "lowest"; rating?: number; page?: number; per_page?: number } = {}) =>
    api.get<BookReviewsPage>(`/books/${id}/reviews`, { params: toQueryParams(params) }),
  authors: (params: { q?: string; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<Author>>("/authors", { params: toQueryParams(params) }),
  author: (id: number) => api.get<Resource<Author>>(`/authors/${id}`).then((r) => r.data),
  categories: () => api.get<Resource<Category[]>>("/categories").then((r) => r.data),
  publishers: (params: { q?: string; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<Publisher>>("/publishers", { params: toQueryParams(params) }),
  seriesList: (params: { page?: number; per_page?: number } = {}) =>
    api.get<Paginated<Series>>("/series", { params: toQueryParams(params) }),
  series: (id: number) => api.get<Resource<SeriesDetail>>(`/series/${id}`).then((r) => r.data),
};

export const catalogQueries = {
  // Keep showing the current page while the next page or filter loads.
  books: (filters: BookFilters = {}) =>
    queryOptions({ queryKey: catalogKeys.books(filters), queryFn: () => catalogApi.books(filters), placeholderData: keepPreviousData }),
  book: (id: number) => queryOptions({ queryKey: catalogKeys.book(id), queryFn: () => catalogApi.book(id) }),
  bookReviews: (id: number, params: Parameters<typeof catalogApi.bookReviews>[1] = {}) =>
    queryOptions({ queryKey: catalogKeys.bookReviews(id, params), queryFn: () => catalogApi.bookReviews(id, params), placeholderData: keepPreviousData }),
  authors: (params: Parameters<typeof catalogApi.authors>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.authors(params), queryFn: () => catalogApi.authors(params) }),
  author: (id: number) => queryOptions({ queryKey: catalogKeys.author(id), queryFn: () => catalogApi.author(id) }),
  categories: () => queryOptions({ queryKey: catalogKeys.categories(), queryFn: catalogApi.categories, staleTime: 10 * 60_000 }),
  publishers: (params: Parameters<typeof catalogApi.publishers>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.publishers(params), queryFn: () => catalogApi.publishers(params), staleTime: 10 * 60_000 }),
  seriesList: (params: Parameters<typeof catalogApi.seriesList>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.seriesList(params), queryFn: () => catalogApi.seriesList(params) }),
  series: (id: number) => queryOptions({ queryKey: catalogKeys.series(id), queryFn: () => catalogApi.series(id) }),
};
