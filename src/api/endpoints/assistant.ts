import { api } from "../client";
import type { components } from "../schema";
import type { Resource } from "../types";

export type AssistantAnswer = components["schemas"]["AssistantResponse"];
export type AssistantFaq = components["schemas"]["AssistantFaq"];
export type FaqInput = Pick<AssistantFaq, "question_en" | "question_km" | "answer_en" | "answer_km" | "keywords" | "is_active"> & { unanswered_id?: number };
export type Unanswered = { id: number; question: string; count: number; last_seen: string };
type Page<T> = { data: T[]; current_page: number; last_page: number };

export const assistantApi = {
  ask: (question: string) => api.post<Resource<AssistantAnswer>>("/assistant", { question }).then((r) => r.data),
  staff: (question: string) => api.post<Resource<{ intent: string; text: string; link: string | null }>>("/staff/assistant", { question }).then((r) => r.data),
  faqs: (page: number) => api.get<Resource<Page<AssistantFaq>>>("/staff/assistant/faqs", { params: { page } }).then((r) => r.data),
  unanswered: (page: number) => api.get<Resource<Page<Unanswered>>>("/staff/assistant/unanswered", { params: { page } }).then((r) => r.data),
  save: (input: FaqInput, id?: number) => id ? api.patch(`/staff/assistant/faqs/${id}`, input) : api.post("/staff/assistant/faqs", input),
  remove: (id: number) => api.delete(`/staff/assistant/faqs/${id}`),
};
