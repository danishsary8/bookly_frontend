import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { toQueryParams } from "./catalog";
import type { Author, BookFormat, Category, Paginated, Publisher, Resource, Series } from "../types";

/*
 * Staff API (/staff/*). The API client sends the staff token for these paths
 * automatically (sessionKindFor). Types follow the backend resources
 * (StaffUserResource, StaffBookResource, StaffBookVariantResource, DashboardService),
 * which the OpenAPI file only describes inline.
 */

export type StaffRole = "admin" | "staff";

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  two_factor_enabled: boolean;
  created_at?: string;
}

interface IssuedToken {
  token: string;
  token_type: "Bearer";
  expires_at: string | null;
}

/** Step 1 of sign-in: either a 2FA challenge, or (2FA not set up yet) a token that only works for 2FA setup. */
export type StaffLoginResult =
  | { two_factor_required: true; challenge_token: string; expires_in: number }
  | ({ two_factor_required: false; two_factor_setup_required: true; staff: StaffUser } & IssuedToken);

export type StaffSignedIn = { staff: StaffUser } & IssuedToken;

export interface TwoFactorSetup {
  secret: string;
  otpauth_uri: string;
}

export interface StaffVariant {
  id: number;
  book_id: number;
  format: BookFormat;
  sku: string;
  isbn: string | null;
  price_usd: string;
  price_khr: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_active: boolean;
  in_stock: boolean;
  cover_image_url: string | null;
}

export interface StaffBook {
  id: number;
  title: string;
  description: string | null;
  language: string;
  page_count: number | null;
  publish_date: string | null;
  publisher_id: number | null;
  series_id: number | null;
  series_order: number | null;
  authors: Array<{ id: number; name: string }>;
  categories: Category[];
  variants: StaffVariant[];
  is_visible: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  title?: string;
  description?: string | null;
  language?: string;
  page_count?: number | null;
  publish_date?: string | null;
  publisher_id?: number | null;
  series_id?: number | null;
  series_order?: number | null;
  author_ids?: number[];
  category_ids?: number[];
}

export interface VariantInput {
  format?: BookFormat;
  sku?: string;
  isbn?: string | null;
  price_usd?: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  cover_image_url?: string | null;
  is_active?: boolean;
}

export type DashboardPeriod = "today" | "7d" | "30d";

export interface DashboardSummary {
  period: { from: string; to: string; timezone: string };
  revenue: { gross_usd: string; refunds_usd: string; net_usd: string };
  delivered_orders: number;
  average_order_value_usd: string;
  orders_placed: number;
  orders_by_status: Record<string, number>;
  new_customers: number;
  best_sellers: Array<{ book_id: number; title: string; copies_sold: number; sales_usd: string }>;
  open_returns: number;
  low_stock: Array<{ book_variant_id: number; book_id: number; title: string; format: BookFormat; sku: string; stock_quantity: number; low_stock_threshold: number }>;
}

export interface DailySales {
  date: string;
  orders_placed: number;
  gross_revenue_usd: string;
  refunds_usd: string;
  net_revenue_usd: string;
}

export interface StaffNotification {
  id: string;
  type: string;
  data: { message?: string; book_id?: number; title?: string; format?: string; stock_quantity?: number };
  read_at: string | null;
  created_at: string;
}

export interface NotificationsPage {
  data: StaffNotification[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; unread_count: number };
}

export type LookupKind = "authors" | "categories" | "publishers" | "series";
export type AuthorInput = { name?: string; bio?: string | null; photo_url?: string | null };
export type CategoryInput = { name?: string; slug?: string };
export type PublisherInput = { name: string };
export type SeriesInput = { name?: string; description?: string | null };
type LookupOf<K extends LookupKind> = K extends "authors" ? Author : K extends "categories" ? Category : K extends "publishers" ? Publisher : Series;
type LookupInputOf<K extends LookupKind> = K extends "authors" ? AuthorInput : K extends "categories" ? CategoryInput : K extends "publishers" ? PublisherInput : SeriesInput;

export const staffKeys = {
  me: () => ["staff", "me"] as const,
  dashboard: (period: DashboardPeriod) => ["staff", "dashboard", period] as const,
  sales: (period: DashboardPeriod) => ["staff", "sales", period] as const,
  books: (params: object) => ["staff", "books", toQueryParams(params)] as const,
  book: (id: number) => ["staff", "book", id] as const,
  notifications: () => ["staff", "notifications"] as const,
};

export const staffAuthApi = {
  login: (email: string, password: string) => api.post<StaffLoginResult>("/staff/auth/login", { email, password }),
  challenge: (challenge_token: string, code: string) => api.post<StaffSignedIn>("/staff/auth/two-factor/challenge", { challenge_token, code }),
  setupTwoFactor: () => api.post<TwoFactorSetup>("/staff/auth/two-factor/setup", {}),
  confirmTwoFactor: (code: string) => api.post<{ message: string; staff: StaffUser }>("/staff/auth/two-factor/confirm", { code }),
  me: () => api.get<Resource<StaffUser>>("/staff/auth/me").then((r) => r.data),
  logout: () => api.post<{ message: string }>("/staff/auth/logout", {}),
  forgotPassword: (email: string) => api.post<{ message: string }>("/staff/auth/forgot-password", { email }),
  resetPassword: (input: { email: string; code: string; password: string; password_confirmation: string }) =>
    api.post<{ message: string }>("/staff/auth/reset-password", input),
};

export const staffApi = {
  summary: (period: DashboardPeriod) => api.get<Resource<DashboardSummary>>("/staff/dashboard/summary", { params: { period } }).then((r) => r.data),
  sales: (period: DashboardPeriod) => api.get<Resource<DailySales[]>>("/staff/dashboard/sales", { params: { period } }).then((r) => r.data),

  notifications: (params: { unread?: boolean; per_page?: number } = {}) =>
    api.get<NotificationsPage>("/staff/notifications", { params: toQueryParams(params) }),
  readNotification: (id: string) => api.post(`/staff/notifications/${id}/read`, {}),
  readAllNotifications: () => api.post("/staff/notifications/read-all", {}),

  books: (params: { q?: string; trashed?: boolean; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<StaffBook>>("/staff/books", { params: toQueryParams(params) }),
  book: (id: number) => api.get<Resource<StaffBook>>(`/staff/books/${id}`).then((r) => r.data),
  createBook: (input: BookInput) => api.post<Resource<StaffBook>>("/staff/books", input).then((r) => r.data),
  updateBook: (id: number, input: BookInput) => api.patch<Resource<StaffBook>>(`/staff/books/${id}`, input).then((r) => r.data),
  deleteBook: (id: number) => api.delete(`/staff/books/${id}`),
  restoreBook: (id: number) => api.post<Resource<StaffBook>>(`/staff/books/${id}/restore`, {}).then((r) => r.data),

  createVariant: (bookId: number, input: VariantInput) => api.post<Resource<StaffVariant>>(`/staff/books/${bookId}/variants`, input).then((r) => r.data),
  updateVariant: (id: number, input: VariantInput) => api.patch<Resource<StaffVariant>>(`/staff/variants/${id}`, input).then((r) => r.data),
  deleteVariant: (id: number) => api.delete(`/staff/variants/${id}`),

  createLookup: <K extends LookupKind>(kind: K, input: LookupInputOf<K>) => api.post<Resource<LookupOf<K>>>(`/staff/${kind}`, input).then((r) => r.data),
  updateLookup: <K extends LookupKind>(kind: K, id: number, input: LookupInputOf<K>) =>
    api.patch<Resource<LookupOf<K>>>(`/staff/${kind}/${id}`, input).then((r) => r.data),
  deleteLookup: (kind: LookupKind, id: number) => api.delete(`/staff/${kind}/${id}`),
};

export const staffQueries = {
  me: () => queryOptions({ queryKey: staffKeys.me(), queryFn: staffAuthApi.me }),
  summary: (period: DashboardPeriod) => queryOptions({ queryKey: staffKeys.dashboard(period), queryFn: () => staffApi.summary(period), placeholderData: keepPreviousData }),
  sales: (period: DashboardPeriod) => queryOptions({ queryKey: staffKeys.sales(period), queryFn: () => staffApi.sales(period), placeholderData: keepPreviousData }),
  notifications: () =>
    queryOptions({ queryKey: staffKeys.notifications(), queryFn: () => staffApi.notifications({ per_page: 10 }), refetchInterval: 60_000 }),
  books: (params: Parameters<typeof staffApi.books>[0] = {}) =>
    queryOptions({ queryKey: staffKeys.books(params), queryFn: () => staffApi.books(params), placeholderData: keepPreviousData }),
  book: (id: number) => queryOptions({ queryKey: staffKeys.book(id), queryFn: () => staffApi.book(id) }),
};
