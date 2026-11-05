import { api } from "../client";
import type { components } from "../schema";
import type { Resource } from "../types";

export type ReadingList = Required<components["schemas"]["ReadingList"]>;
export type ReadingListInput = components["schemas"]["ReadingListInput"];
export const readingListsApi = {
  own: () => api.get<Resource<ReadingList[]>>("/reading-lists").then((r) => r.data),
  public: (slug: string) => api.get<Resource<ReadingList>>(`/lists/${encodeURIComponent(slug)}`).then((r) => r.data),
  picks: () => api.get<Resource<ReadingList[]>>("/lists/staff-picks").then((r) => r.data),
  addAll: (slug: string) => api.post<Resource<{ added: number; skipped: number }>>(`/lists/${encodeURIComponent(slug)}/cart`, {}).then((r) => r.data),
  create: (input: ReadingListInput) => api.post<Resource<ReadingList>>("/reading-lists", input).then((r) => r.data),
  update: (id: number, input: ReadingListInput) => api.patch<Resource<ReadingList>>(`/reading-lists/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/reading-lists/${id}`),
  add: (id: number, bookId: number, note?: string | null, position?: number) => api.post(`/reading-lists/${id}/books`, { book_id: bookId, ...(note !== undefined ? { note } : {}), ...(position !== undefined ? { position } : {}) }),
  removeBook: (id: number, bookId: number) => api.delete(`/reading-lists/${id}/books/${bookId}`),
  staff: () => api.get<Resource<ReadingList[]>>("/staff/reading-lists").then((r) => r.data),
  pick: (id: number, selected: boolean) => api.patch(`/staff/reading-lists/${id}`, { is_staff_pick: selected }),
};
