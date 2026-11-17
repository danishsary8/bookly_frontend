import { api } from "../client";
import type { ReferralSummary } from "./credit";

export interface StaffReferral { id: number; sharer_customer_id: number; friend_customer_id: number; order_id: number | null; status: ReferralSummary["history"][number]["status"]; reward_cents: number; unrecovered_cents: number }
interface Paged<T> { data: T[]; current_page: number; last_page: number }
export const staffCreditApi = {
  referrals: (page: number, status: string) => api.get<Paged<StaffReferral> & { stats: { total: number; rewarded: number; credited_usd: string; unrecovered_usd: string } }>("/staff/referrals", { params: { page, ...(status ? { status } : {}) } }),
  void: (id: number) => api.post(`/staff/referrals/${id}/void`),
};
