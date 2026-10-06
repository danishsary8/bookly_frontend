import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { toQueryParams } from "./catalog";
import type { Order, OrderStatus, Paginated, Resource, ReturnRequest } from "../types";
import type { StaffRole, StaffUser } from "./staff";

/*
 * Staff operations (phase 9b): orders, returns, reviews, coupons, customers, staff
 * members, exchange rates, audit log. Types follow the backend resources
 * (StaffOrderResource, StaffReturnResource, StaffReviewResource, CouponResource,
 * StaffCustomerResource, StaffMemberResource, ExchangeRateController, AuditLogController).
 */

type Person = { id: number; name: string; email: string; phone?: string | null };

export type StaffOrder = Omit<Order, "status_history"> & {
  customer?: Person;
  status_history?: Array<{ status: string; note: string | null; changed_by: { id: number; name: string } | null; created_at: string }>;
  allowed_next_statuses: OrderStatus[];
};

export type StaffReturn = ReturnRequest & { customer?: Person; handled_by?: { id: number; name: string } | null };

export interface StaffReview {
  id: number;
  book: { id: number; title: string | null };
  customer: { id: number; name: string | null; email: string | null };
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
}

export type CouponType = "percentage" | "fixed";
export interface Coupon {
  id: number;
  code: string;
  type: CouponType;
  value: string;
  min_order_amount: string | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}
export type CouponInput = Partial<{
  code: string;
  type: CouponType;
  value: string;
  min_order_amount: string | null;
  max_uses: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}>;

export interface StaffCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  is_active: boolean;
  login_methods: string[];
  orders_count?: number;
  stats?: { orders_by_status: Record<string, number>; returns_count: number; reviews_count: number; lifetime_spent_usd: string; last_order_at: string | null };
  recent_orders?: Order[];
  created_at: string;
  /** Unfinished sign-ups only: when the account is deleted unless the customer enters their code. */
  removal_at: string | null;
}

/** The customer list also counts both tabs (same search and active filters). */
export type StaffCustomerPage = Paginated<StaffCustomer> & { meta: Paginated<StaffCustomer>["meta"] & { counts?: { verified: number; unverified: number } } };

export type StaffMember = StaffUser & { is_active: boolean; updated_at: string };

export interface ExchangeRate {
  id: number;
  rate: string;
  effective_at: string;
  is_current: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  staff: { id: number; name: string; email: string } | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

type Meta = { current_page: number; last_page: number; total: number; per_page?: number };

export type OrderFilters = { status?: OrderStatus; q?: string; from?: string; to?: string; page?: number; per_page?: number };
export type ReturnFilters = { status?: string; q?: string; page?: number; per_page?: number };
export type ReviewFilters = { visible?: boolean | null; q?: string; max_rating?: number; page?: number; per_page?: number };
export type CouponFilters = { q?: string; active?: boolean | null; page?: number; per_page?: number };
export type CustomerFilters = { q?: string; active?: boolean | null; verified?: boolean | null; page?: number; per_page?: number };
export type MemberFilters = { q?: string; role?: StaffRole; active?: boolean | null; page?: number; per_page?: number };
export type AuditFilters = { staff_user_id?: number; action?: string; entity_type?: string; entity_id?: number; from?: string; to?: string; page?: number; per_page?: number };

/** Booleans that may be "not filtered" (null): 1 / 0 for the API, omitted when null. */
const bool = (v: boolean | null | undefined) => (v === true ? 1 : v === false ? 0 : undefined);

export const opsKeys = {
  orders: (f: object) => ["staff", "orders", toQueryParams(f)] as const,
  order: (id: number) => ["staff", "order", id] as const,
  returns: (f: object) => ["staff", "returns", toQueryParams(f)] as const,
  return: (id: number) => ["staff", "return", id] as const,
  reviews: (f: object) => ["staff", "reviews", toQueryParams(f)] as const,
  coupons: (f: object) => ["staff", "coupons", toQueryParams(f)] as const,
  customers: (f: object) => ["staff", "customers", toQueryParams(f)] as const,
  customer: (id: number) => ["staff", "customer", id] as const,
  members: (f: object) => ["staff", "members", toQueryParams(f)] as const,
  rates: (page: number) => ["staff", "rates", page] as const,
  audit: (f: object) => ["staff", "audit", toQueryParams(f)] as const,
};

export const opsApi = {
  orders: (f: OrderFilters = {}) => api.get<Paginated<StaffOrder>>("/staff/orders", { params: toQueryParams(f) }),
  order: (id: number) => api.get<Resource<StaffOrder>>(`/staff/orders/${id}`).then((r) => r.data),
  setOrderStatus: (id: number, status: OrderStatus, note?: string) =>
    api.post<Resource<StaffOrder>>(`/staff/orders/${id}/status`, { status, ...(note ? { note } : {}) }).then((r) => r.data),
  /** CSV of every order placed between the two days (Phnom Penh), at most 366 days. */
  exportOrders: (from: string, to: string) => api.get<Blob>("/staff/orders/export", { params: { from, to }, responseType: "blob" }),

  returns: (f: ReturnFilters = {}) => api.get<Paginated<StaffReturn>>("/staff/returns", { params: toQueryParams(f) }),
  return: (id: number) => api.get<Resource<StaffReturn>>(`/staff/returns/${id}`).then((r) => r.data),
  approveReturn: (id: number, note?: string) => api.post<Resource<StaffReturn>>(`/staff/returns/${id}/approve`, note ? { note } : {}).then((r) => r.data),
  rejectReturn: (id: number, note: string) => api.post<Resource<StaffReturn>>(`/staff/returns/${id}/reject`, { note }).then((r) => r.data),
  refundReturn: (id: number, note?: string) => api.post<Resource<StaffReturn>>(`/staff/returns/${id}/refund`, note ? { note } : {}).then((r) => r.data),

  reviews: (f: ReviewFilters = {}) => api.get<Paginated<StaffReview>>("/staff/reviews", { params: toQueryParams({ ...f, visible: bool(f.visible) }) }),
  hideReview: (id: number) => api.post<Resource<StaffReview>>(`/staff/reviews/${id}/hide`, {}).then((r) => r.data),
  showReview: (id: number) => api.post<Resource<StaffReview>>(`/staff/reviews/${id}/show`, {}).then((r) => r.data),

  coupons: (f: CouponFilters = {}) => api.get<Paginated<Coupon>>("/staff/coupons", { params: toQueryParams({ ...f, active: bool(f.active) }) }),
  createCoupon: (input: CouponInput) => api.post<Resource<Coupon>>("/staff/coupons", input).then((r) => r.data),
  updateCoupon: (id: number, input: CouponInput) => api.patch<Resource<Coupon>>(`/staff/coupons/${id}`, input).then((r) => r.data),
  deleteCoupon: (id: number) => api.delete(`/staff/coupons/${id}`),

  customers: (f: CustomerFilters = {}) =>
    api.get<StaffCustomerPage>("/staff/customers", { params: toQueryParams({ ...f, active: bool(f.active), verified: bool(f.verified) }) }),
  customer: (id: number) => api.get<Resource<StaffCustomer>>(`/staff/customers/${id}`).then((r) => r.data),
  setCustomerActive: (id: number, active: boolean) =>
    api.post<Resource<StaffCustomer>>(`/staff/customers/${id}/${active ? "activate" : "deactivate"}`, {}).then((r) => r.data),

  members: (f: MemberFilters = {}) => api.get<Paginated<StaffMember>>("/staff/members", { params: toQueryParams({ ...f, active: bool(f.active) }) }),
  inviteMember: (input: { name: string; email: string; role: StaffRole }) => api.post<Resource<StaffMember>>("/staff/members", input).then((r) => r.data),
  updateMember: (id: number, input: { name?: string; role?: StaffRole }) => api.patch<Resource<StaffMember>>(`/staff/members/${id}`, input).then((r) => r.data),
  setMemberActive: (id: number, active: boolean) =>
    api.post<Resource<StaffMember>>(`/staff/members/${id}/${active ? "activate" : "deactivate"}`, {}).then((r) => r.data),
  resetMemberTwoFactor: (id: number) => api.post<Resource<StaffMember>>(`/staff/members/${id}/reset-two-factor`, {}).then((r) => r.data),
  resendInvitation: (id: number) => api.post<{ message: string }>(`/staff/members/${id}/resend-invitation`, {}),

  rates: (page = 1) => api.get<{ data: ExchangeRate[]; meta: Meta & { current_rate: string | null } }>("/staff/exchange-rates", { params: { page } }),
  addRate: (rate: string, effective_at?: string) => api.post<Resource<ExchangeRate>>("/staff/exchange-rates", { rate, ...(effective_at ? { effective_at } : {}) }).then((r) => r.data),

  audit: (f: AuditFilters = {}) =>
    api.get<{ data: AuditEntry[]; meta: Meta & { entity_types: string[] } }>("/staff/audit-logs", { params: toQueryParams(f) }),
};

export const opsQueries = {
  orders: (f: OrderFilters) => queryOptions({ queryKey: opsKeys.orders(f), queryFn: () => opsApi.orders(f), placeholderData: keepPreviousData }),
  order: (id: number) => queryOptions({ queryKey: opsKeys.order(id), queryFn: () => opsApi.order(id) }),
  returns: (f: ReturnFilters) => queryOptions({ queryKey: opsKeys.returns(f), queryFn: () => opsApi.returns(f), placeholderData: keepPreviousData }),
  return: (id: number) => queryOptions({ queryKey: opsKeys.return(id), queryFn: () => opsApi.return(id) }),
  reviews: (f: ReviewFilters) => queryOptions({ queryKey: opsKeys.reviews(f), queryFn: () => opsApi.reviews(f), placeholderData: keepPreviousData }),
  coupons: (f: CouponFilters) => queryOptions({ queryKey: opsKeys.coupons(f), queryFn: () => opsApi.coupons(f), placeholderData: keepPreviousData }),
  customers: (f: CustomerFilters) => queryOptions({ queryKey: opsKeys.customers(f), queryFn: () => opsApi.customers(f), placeholderData: keepPreviousData }),
  customer: (id: number) => queryOptions({ queryKey: opsKeys.customer(id), queryFn: () => opsApi.customer(id) }),
  members: (f: MemberFilters) => queryOptions({ queryKey: opsKeys.members(f), queryFn: () => opsApi.members(f), placeholderData: keepPreviousData }),
  rates: (page: number) => queryOptions({ queryKey: opsKeys.rates(page), queryFn: () => opsApi.rates(page), placeholderData: keepPreviousData }),
  audit: (f: AuditFilters) => queryOptions({ queryKey: opsKeys.audit(f), queryFn: () => opsApi.audit(f), placeholderData: keepPreviousData }),
};
