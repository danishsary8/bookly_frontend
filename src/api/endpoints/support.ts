import { api, http } from "../client";
import type { components } from "../schema";
import type { Paginated, Resource } from "../types";
export type Conversation = components["schemas"]["SupportConversation"];
export type QuickReply = components["schemas"]["SupportQuickReply"];
export type Topic = Conversation["topic"];
export const supportPath = (staff = false) => staff ? "/staff/support/conversations" : "/support/conversations";
export type Conditional<T> = { value: T; etag?: string };
/** The caller owns the cached response, scoped to the signed-in user; no shared personal-data cache. */
export async function conditionalSupport<T>(url: string, previous?: Conditional<T>): Promise<Conditional<T>> {
  const response = await http.get<T>(url, { headers: previous?.etag ? { "If-None-Match": previous.etag } : {}, validateStatus: (status) => status === 200 || status === 304 });
  if (response.status === 304 && previous) return previous;
  return { value: response.data, etag: response.headers.etag };
}
export const supportApi = {
  list: (staff = false, query = "", previous?: Conditional<Paginated<Conversation>>) => conditionalSupport(`${supportPath(staff)}${query}`, previous),
  show: (id: number, staff = false, previous?: Conditional<Resource<Conversation>>) => conditionalSupport(`${supportPath(staff)}/${id}`, previous),
  older: (id: number, before: number, staff = false) => api.get<Resource<Conversation>>(`${supportPath(staff)}/${id}`, { params: { before_id: before } }).then((r) => r.data),
  start: (input: { topic: Topic; message: string; order_id?: number }) => api.post<Resource<Conversation>>(supportPath(), input).then((r) => r.data),
  guest: (input: { name: string; email: string; message: string; turnstile_token?: string }) => api.post<Resource<{ id: number }>>("/support/guest", input).then((r) => r.data),
  message: (id: number, message: string, staff = false, is_internal = false) => api.post(`${supportPath(staff)}/${id}/messages`, { message, is_internal }),
  read: (id: number, staff = false) => api.post(`${supportPath(staff)}/${id}/read`),
  status: (id: number, status: Conversation["status"], staff = false) => api.post(`${supportPath(staff)}/${id}/status`, { status }),
  rate: (id: number, stars: number, comment: string) => api.post(`${supportPath()}/${id}/rating`, { stars, comment: comment || null }),
  assign: (id: number, staff_id: number | null) => api.post(`${supportPath(true)}/${id}/assign`, { staff_id }),
  staff: () => api.get<Resource<{ id: number; name: string }[]>>("/staff/support/staff").then((r) => r.data),
  templates: () => api.get<Resource<QuickReply[]>>("/staff/support/quick-replies").then((r) => r.data),
  saveTemplate: (input: Pick<QuickReply, "title" | "body_en" | "body_km">, id?: number) => id ? api.patch(`/staff/support/quick-replies/${id}`, input) : api.post("/staff/support/quick-replies", input),
  deleteTemplate: (id: number) => api.delete(`/staff/support/quick-replies/${id}`),
  bind: (staff_id: number, telegram_user_id: number | null) => api.post("/staff/support/telegram-users", { staff_id, telegram_user_id }),
};
