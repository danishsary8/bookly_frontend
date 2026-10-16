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

export type BookStatus = "draft" | "scheduled" | "live";

export interface StaffBook {
  id: number;
  title: string;
  description: string | null;
  status: BookStatus;
  publish_at: string | null;
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
  status?: BookStatus;
  publish_at?: string | null;
  language?: string;
  page_count?: number | null;
  publish_date?: string | null;
  publisher_id?: number | null;
  series_id?: number | null;
  series_order?: number | null;
  author_ids?: number[];
  category_ids?: number[];
}

export interface BulkBooksInput {
  ids: number[];
  add_category_ids?: number[];
  remove_category_ids?: number[];
  status?: BookStatus;
  publish_at?: string | null;
}

export interface BulkVariantsInput {
  ids: number[];
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
  price_usd?: string;
}

export interface BookImportRow {
  /** Data rows start at 2 (row 1 is the header). */
  row_number: number;
  action: "new" | "update" | "error";
  title: string;
  format: string;
  sku: string;
  messages: string[];
}

export interface BookImportPreviewResult {
  preview_token: string;
  totals: { total: number; new: number; update: number; error: number };
  rows: BookImportRow[];
}

/** What confirm applied; rows that became errors since the preview are in `errors`. */
export interface BookImportConfirmResult {
  created: number;
  updated: number;
  skipped: number;
  errors: BookImportRow[];
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
/** A preset period, or Phnom Penh days `from`–`to` (YYYY-MM-DD, at most 366 days; the API checks it too). */
export type DashboardRange = { period: DashboardPeriod } | { period: "custom"; from: string; to: string };

/** Money pair from the dashboard: KHR is whole riel at the current rate, null until a rate is set. */
type Khr = string | null;

export interface DashboardRevenue {
  gross_usd: string;
  refunds_usd: string;
  net_usd: string;
  gross_khr?: Khr;
  refunds_khr?: Khr;
  net_khr?: Khr;
}

/** The same numbers for the period of equal length just before, and the change in percent (API since 2026-10-13). */
export interface DashboardComparison {
  period: { from: string; to: string; timezone: string };
  revenue: DashboardRevenue;
  delivered_orders: number;
  average_order_value_usd: string;
  average_order_value_khr?: Khr;
  orders_placed: number;
  new_customers: number;
  change_percent: Record<"gross_revenue" | "refunds" | "net_revenue" | "delivered_orders" | "average_order_value" | "orders_placed" | "new_customers", number>;
}

export interface DashboardSummary {
  period: { from: string; to: string; timezone: string };
  revenue: DashboardRevenue;
  delivered_orders: number;
  average_order_value_usd: string;
  average_order_value_khr?: Khr;
  orders_placed: number;
  orders_by_status: Record<string, number>;
  new_customers: number;
  best_sellers: Array<{ book_id: number; title: string; copies_sold: number; sales_usd: string; sales_khr?: Khr }>;
  top_categories?: Array<{ category_id: number; name: string; copies_sold: number; sales_usd: string; sales_khr?: Khr }>;
  open_returns: number;
  low_stock: Array<{ book_variant_id: number; book_id: number; title: string; format: BookFormat; sku: string; stock_quantity: number; low_stock_threshold: number }>;
  comparison?: DashboardComparison;
}

export interface DailySales {
  date: string;
  orders_placed: number;
  gross_revenue_usd: string;
  refunds_usd: string;
  net_revenue_usd: string;
  net_revenue_khr?: Khr;
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

export interface StrictDeletePayload {
  confirm: string;
  password: string;
  code: string;
}

export interface TrashItem {
  id: number;
  type: "book" | "author" | "category" | "publisher" | "series";
  name: string;
  deleted_at: string;
  days_until_purge: number;
}

export interface StockItem {
  id: number;
  book_id: number;
  book_title: string;
  format: BookFormat;
  sku: string;
  isbn: string | null;
  price_usd: string;
  stock_quantity: number;
  low_stock_threshold: number;
  status: "in_stock" | "low" | "out";
  is_active: boolean;
  cover_image_url: string | null;
}

export interface InventoryMovementItem {
  id: number;
  book_variant_id: number;
  change_qty: number;
  reason: "sale" | "restock" | "return" | "adjustment";
  reference: { type: string; id: number; order_number?: string | null } | null;
  staff: { id: number; name: string } | null;
  note: string | null;
  supplier: string | null;
  stock_after: number | null;
  unit_cost_usd?: string | null;
  created_at: string;
}

export interface RestockInput {
  quantity: number;
  supplier?: string | null;
  unit_cost_usd?: string | number | null;
  note?: string | null;
}

export interface StaffHealth {
  status: "ok" | "degraded" | "down";
  checks: {
    database: { status: "ok" | "down" };
    queue: {
      status: "ok" | "degraded";
      driver?: string;
      pending: number;
      failed: number;
      oldest_pending_seconds: number | null;
    };
    telegram_bot: {
      status: "off" | "ok" | "degraded";
      error?: string;
      repaired?: boolean;
    };
  };
}

export const staffKeys = {
  me: () => ["staff", "me"] as const,
  health: () => ["staff", "health"] as const,
  dashboard: (range: DashboardRange) => ["staff", "dashboard", range] as const,
  sales: (range: DashboardRange) => ["staff", "sales", range] as const,
  books: (params: object) => ["staff", "books", toQueryParams(params)] as const,
  book: (id: number) => ["staff", "book", id] as const,
  stock: (params: object) => ["staff", "stock", toQueryParams(params)] as const,
  stockHistory: (variantId: number, params: object) => ["staff", "variants", variantId, "history", toQueryParams(params)] as const,
  trash: (params: object) => ["staff", "trash", toQueryParams(params)] as const,
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
  health: () => api.get<StaffHealth>("/staff/health"),
  summary: (range: DashboardRange) => api.get<Resource<DashboardSummary>>("/staff/dashboard/summary", { params: range }).then((r) => r.data),
  sales: (range: DashboardRange) => api.get<Resource<DailySales[]>>("/staff/dashboard/sales", { params: range }).then((r) => r.data),

  notifications: (params: { unread?: boolean; per_page?: number } = {}) =>
    api.get<NotificationsPage>("/staff/notifications", { params: toQueryParams(params) }),
  readNotification: (id: string) => api.post(`/staff/notifications/${id}/read`, {}),
  readAllNotifications: () => api.post("/staff/notifications/read-all", {}),

  books: (params: { q?: string; status?: BookStatus; trashed?: boolean; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<StaffBook>>("/staff/books", { params: toQueryParams(params) }),
  book: (id: number) => api.get<Resource<StaffBook>>(`/staff/books/${id}`).then((r) => r.data),
  createBook: (input: BookInput) => api.post<Resource<StaffBook>>("/staff/books", input).then((r) => r.data),
  updateBook: (id: number, input: BookInput) => api.patch<Resource<StaffBook>>(`/staff/books/${id}`, input).then((r) => r.data),
  deleteBook: (id: number, payload?: StrictDeletePayload) =>
    api.delete(`/staff/books/${id}`, { data: payload }),
  restoreBook: (id: number) => api.post<Resource<StaffBook>>(`/staff/books/${id}/restore`, {}).then((r) => r.data),
  bulkUpdateBooks: (input: BulkBooksInput) =>
    api.post<Resource<{ updated_count: number; items: Array<{ id: number; title: string; status: BookStatus; success: boolean }> }>>("/staff/books/bulk", input).then((r) => r.data),
  bulkUpdateVariants: (input: BulkVariantsInput) =>
    api.post<Resource<{ updated_count: number; items: Array<{ id: number; sku: string; stock_quantity: number; price_usd: string; is_active: boolean; success: boolean }> }>>("/staff/variants/bulk", input).then((r) => r.data),
  exportBooksCsv: () => api.get<Blob>("/staff/books/export", { responseType: "blob" }),
  exportTemplateCsv: () => api.get<Blob>("/staff/books/export-template", { responseType: "blob" }),
  previewImportBooksCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<Resource<BookImportPreviewResult>>("/staff/books/import/preview", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  confirmImportBooksCsv: (preview_token: string) =>
    api.post<Resource<BookImportConfirmResult>>("/staff/books/import/confirm", { preview_token }).then((r) => r.data),

  createVariant: (bookId: number, input: VariantInput) => api.post<Resource<StaffVariant>>(`/staff/books/${bookId}/variants`, input).then((r) => r.data),
  updateVariant: (id: number, input: VariantInput) => api.patch<Resource<StaffVariant>>(`/staff/variants/${id}`, input).then((r) => r.data),
  deleteVariant: (id: number) => api.delete(`/staff/variants/${id}`),

  stock: (params: { status?: "low" | "out"; q?: string; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<StockItem>>("/staff/stock", { params: toQueryParams(params) }),
  restockVariant: (variantId: number, input: RestockInput) =>
    api.post<{ variant: StaffVariant; movement: InventoryMovementItem }>(`/staff/variants/${variantId}/restock`, input),
  stockHistory: (variantId: number, params: { page?: number; per_page?: number } = {}) =>
    api.get<Paginated<InventoryMovementItem>>(`/staff/variants/${variantId}/stock-history`, { params: toQueryParams(params) }),

  trash: (params: { type?: string; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<TrashItem>>("/staff/trash", { params: toQueryParams(params) }),
  restoreTrash: (type: string, id: number) =>
    api.post<{ message: string; item: { id: number; type: string; name: string } }>(`/staff/trash/${type}/${id}/restore`, {}),

  createLookup: <K extends LookupKind>(kind: K, input: LookupInputOf<K>) => api.post<Resource<LookupOf<K>>>(`/staff/${kind}`, input).then((r) => r.data),
  updateLookup: <K extends LookupKind>(kind: K, id: number, input: LookupInputOf<K>) =>
    api.patch<Resource<LookupOf<K>>>(`/staff/${kind}/${id}`, input).then((r) => r.data),
  deleteLookup: (kind: LookupKind, id: number, payload?: StrictDeletePayload) =>
    api.delete(`/staff/${kind}/${id}`, { data: payload }),
};

export const staffQueries = {
  me: () => queryOptions({ queryKey: staffKeys.me(), queryFn: staffAuthApi.me }),
  health: () =>
    queryOptions({ queryKey: staffKeys.health(), queryFn: () => staffApi.health(), refetchInterval: 30_000 }),
  summary: (range: DashboardRange) => queryOptions({ queryKey: staffKeys.dashboard(range), queryFn: () => staffApi.summary(range), placeholderData: keepPreviousData }),
  sales: (range: DashboardRange) => queryOptions({ queryKey: staffKeys.sales(range), queryFn: () => staffApi.sales(range), placeholderData: keepPreviousData }),
  notifications: () =>
    queryOptions({ queryKey: staffKeys.notifications(), queryFn: () => staffApi.notifications({ per_page: 10 }), refetchInterval: 60_000 }),
  books: (params: Parameters<typeof staffApi.books>[0] = {}) =>
    queryOptions({ queryKey: staffKeys.books(params), queryFn: () => staffApi.books(params), placeholderData: keepPreviousData }),
  book: (id: number) => queryOptions({ queryKey: staffKeys.book(id), queryFn: () => staffApi.book(id) }),
  stock: (params: Parameters<typeof staffApi.stock>[0] = {}) =>
    queryOptions({ queryKey: staffKeys.stock(params), queryFn: () => staffApi.stock(params), placeholderData: keepPreviousData }),
  stockHistory: (variantId: number, params: Parameters<typeof staffApi.stockHistory>[1] = {}) =>
    queryOptions({ queryKey: staffKeys.stockHistory(variantId, params), queryFn: () => staffApi.stockHistory(variantId, params), placeholderData: keepPreviousData }),
  trash: (params: Parameters<typeof staffApi.trash>[0] = {}) =>
    queryOptions({ queryKey: staffKeys.trash(params), queryFn: () => staffApi.trash(params), placeholderData: keepPreviousData }),
};
