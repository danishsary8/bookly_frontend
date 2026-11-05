import { api } from "../client";
import type { components } from "../schema";
import type { Paginated, Resource } from "../types";

export type OrderRating = components["schemas"]["OrderRating"];
export const ratingsApi = {
  own: (id: number) => api.get<Resource<OrderRating | null>>(`/orders/${id}/rating`).then((r) => r.data),
  save: (id: number, input: { stars: number; comment: string | null }, editing: boolean) => (editing ? api.patch<Resource<OrderRating>>(`/orders/${id}/rating`, input) : api.post<Resource<OrderRating>>(`/orders/${id}/rating`, input)).then((r) => r.data),
  store: () => api.get<Resource<components["schemas"]["StoreRating"]>>("/store-rating").then((r) => r.data),
  staff: (stars: string, page: number) => api.get<Paginated<OrderRating>>("/staff/ratings", { params: { ...(stars ? { stars } : {}), page } }),
  hide: (id: number) => api.post(`/staff/ratings/${id}/hide`, {}),
};
