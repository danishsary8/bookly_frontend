import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { toQueryParams } from "./catalog";
import type { OrderStatus, Order, OwnReview, Paginated, Resource, ReturnableItems, ReturnRequest } from "../types";

export interface ReturnLineInput {
  order_item_id: number;
  quantity: number;
  reason?: string;
}

export interface ReviewInput {
  rating: number;
  comment?: string | null;
}

export const orderKeys = {
  orders: (params: object) => ["orders", toQueryParams(params)] as const,
  order: (id: number) => ["orders", id] as const,
  returnable: (orderId: number) => ["orders", orderId, "returnable"] as const,
  returns: (params: object) => ["returns", toQueryParams(params)] as const,
  return: (id: number) => ["returns", id] as const,
  reviews: (params: object) => ["my-reviews", toQueryParams(params)] as const,
};

export const ordersApi = {
  orders: (params: { status?: OrderStatus; page?: number; per_page?: number } = {}) =>
    api.get<Paginated<Order>>("/orders", { params: toQueryParams(params) }),
  order: (id: number) => api.get<Resource<Order>>(`/orders/${id}`).then((r) => r.data),
  cancel: (id: number, reason?: string) => api.post<Resource<Order>>(`/orders/${id}/cancel`, reason ? { reason } : {}).then((r) => r.data),

  returnable: (orderId: number) => api.get<Resource<ReturnableItems>>(`/orders/${orderId}/returnable-items`).then((r) => r.data),
  requestReturn: (orderId: number, reason: string, items: ReturnLineInput[]) =>
    api.post<Resource<ReturnRequest>>(`/orders/${orderId}/returns`, { reason, items }).then((r) => r.data),
  returns: (params: { page?: number; per_page?: number } = {}) =>
    api.get<Paginated<ReturnRequest>>("/returns", { params: toQueryParams(params) }),
  return: (id: number) => api.get<Resource<ReturnRequest>>(`/returns/${id}`).then((r) => r.data),
  withdrawReturn: (id: number) => api.delete(`/returns/${id}`),

  myReviews: (params: { page?: number; per_page?: number } = {}) =>
    api.get<Paginated<OwnReview>>("/reviews", { params: toQueryParams(params) }),
  createReview: (bookId: number, input: ReviewInput) => api.post<Resource<OwnReview>>(`/books/${bookId}/reviews`, input).then((r) => r.data),
  updateReview: (id: number, input: Partial<ReviewInput>) => api.patch<Resource<OwnReview>>(`/reviews/${id}`, input).then((r) => r.data),
  deleteReview: (id: number) => api.delete(`/reviews/${id}`),
};

export const orderQueries = {
  orders: (params: Parameters<typeof ordersApi.orders>[0] = {}) =>
    queryOptions({ queryKey: orderKeys.orders(params), queryFn: () => ordersApi.orders(params), placeholderData: keepPreviousData }),
  order: (id: number) => queryOptions({ queryKey: orderKeys.order(id), queryFn: () => ordersApi.order(id) }),
  returnable: (orderId: number) => queryOptions({ queryKey: orderKeys.returnable(orderId), queryFn: () => ordersApi.returnable(orderId) }),
  returns: (params: Parameters<typeof ordersApi.returns>[0] = {}) =>
    queryOptions({ queryKey: orderKeys.returns(params), queryFn: () => ordersApi.returns(params) }),
  return: (id: number) => queryOptions({ queryKey: orderKeys.return(id), queryFn: () => ordersApi.return(id) }),
  myReviews: (params: Parameters<typeof ordersApi.myReviews>[0] = {}) =>
    queryOptions({ queryKey: orderKeys.reviews(params), queryFn: () => ordersApi.myReviews(params) }),
};
