import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type {
  Author,
  BookCard,
  BookDetail,
  BookFormat,
  BookReviewsPage,
  Category,
  CategoryNode,
  Paginated,
  Publisher,
  Resource,
  Series,
  SeriesDetail,
} from "../types";

export type BookSort = "relevance" | "newest" | "price_asc" | "price_desc" | "title" | "rating" | "best_selling" | "most_reviewed";

/** Book counts per filter choice, with the other filters applied (GET /books?facets=1). */
export interface BookFacets {
  formats?: Record<string, number>;
  languages?: Record<string, number>;
  categories?: Record<string, number>;
  school_grades?: Record<string, number>;
  levels?: Record<string, number>;
  with_age?: number;
}

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
  has_ebook?: boolean;
  age?: number;
  school_grade?: number;
  level?: string;
  facets?: boolean;
  sort?: BookSort;
  page?: number;
  per_page?: number;
  ids?: string;
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
  related: (id: number, limit = 6) => ["catalog", "book", id, "related", limit] as const,
  recommendations: (params: { cart_ids?: string; exclude_ids?: string; limit?: number }) =>
    ["catalog", "recommendations", toQueryParams(params)] as const,
  bookReviews: (id: number, params: object) => ["catalog", "book", id, "reviews", toQueryParams(params)] as const,
  authors: (params: object) => ["catalog", "authors", toQueryParams(params)] as const,
  author: (id: number) => ["catalog", "author", id] as const,
  categories: () => ["catalog", "categories"] as const,
  categoryTree: () => ["catalog", "categories", "tree"] as const,
  publishers: (params: object) => ["catalog", "publishers", toQueryParams(params)] as const,
  seriesList: (params: object) => ["catalog", "series", toQueryParams(params)] as const,
  series: (id: number) => ["catalog", "series", id] as const,
};

/** A page of books; `search.typo_tolerant` is true when nothing matched exactly and the API matched similar spellings. */
export type BookList = Paginated<BookCard> & { search?: { typo_tolerant?: boolean }; facets?: BookFacets };

export const catalogApi = {
  books: (filters: BookFilters = {}) => api.get<BookList>("/books", { params: toQueryParams(filters) }),
  book: (id: number) => api.get<Resource<BookDetail>>(`/books/${id}`).then((r) => r.data),
  related: (id: number, limit = 6) => api.get<Resource<BookCard[]>>(`/books/${id}/related`, { params: { limit } }).then((r) => r.data),
  recommendations: (params: { cart_ids?: string; exclude_ids?: string; limit?: number } = {}) =>
    api.get<Resource<BookCard[]>>("/catalog/recommendations", { params: toQueryParams(params) }).then((r) => r.data),
  bookReviews: (id: number, params: { sort?: "newest" | "highest" | "lowest"; rating?: number; page?: number; per_page?: number } = {}) =>
    api.get<BookReviewsPage>(`/books/${id}/reviews`, { params: toQueryParams(params) }),
  authors: (params: { q?: string; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<Author>>("/authors", { params: toQueryParams(params) }),
  author: (id: number) => api.get<Resource<Author>>(`/authors/${id}`).then((r) => r.data),
  categories: () => api.get<Resource<Category[]>>("/categories").then((r) => r.data),
  /** Top-level categories with their non-empty children and total_books (the menu tree). */
  categoryTree: () => api.get<Resource<CategoryNode[]>>("/categories", { params: { tree: 1 } }).then((r) => r.data),
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
  related: (id: number, limit = 6) =>
    queryOptions({ queryKey: catalogKeys.related(id, limit), queryFn: () => catalogApi.related(id, limit), enabled: id > 0 }),
  recommendations: (params: Parameters<typeof catalogApi.recommendations>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.recommendations(params), queryFn: () => catalogApi.recommendations(params) }),
  bookReviews: (id: number, params: Parameters<typeof catalogApi.bookReviews>[1] = {}) =>
    queryOptions({ queryKey: catalogKeys.bookReviews(id, params), queryFn: () => catalogApi.bookReviews(id, params), placeholderData: keepPreviousData }),
  authors: (params: Parameters<typeof catalogApi.authors>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.authors(params), queryFn: () => catalogApi.authors(params) }),
  author: (id: number) => queryOptions({ queryKey: catalogKeys.author(id), queryFn: () => catalogApi.author(id) }),
  categories: () => queryOptions({ queryKey: catalogKeys.categories(), queryFn: catalogApi.categories, staleTime: 10 * 60_000 }),
  categoryTree: () => queryOptions({ queryKey: catalogKeys.categoryTree(), queryFn: catalogApi.categoryTree, staleTime: 10 * 60_000 }),
  publishers: (params: Parameters<typeof catalogApi.publishers>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.publishers(params), queryFn: () => catalogApi.publishers(params), staleTime: 10 * 60_000 }),
  seriesList: (params: Parameters<typeof catalogApi.seriesList>[0] = {}) =>
    queryOptions({ queryKey: catalogKeys.seriesList(params), queryFn: () => catalogApi.seriesList(params) }),
  series: (id: number) => queryOptions({ queryKey: catalogKeys.series(id), queryFn: () => catalogApi.series(id) }),
};
