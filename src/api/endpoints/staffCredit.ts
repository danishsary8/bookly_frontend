import { api } from "../client";
import type { GiftCard, ReferralSummary } from "./credit";

export interface StaffGiftCard {
  id: number; buyer_customer_id: number; amount_cents: number; recipient_name: string; recipient_email: string;
  message: string | null; last_four: string | null; status: GiftCard["status"]; send_on: string;
  email_sent_at: string | null; email_failed_at: string | null; paid_at: string | null;
}
export interface StaffReferral { id: number; sharer_customer_id: number; friend_customer_id: number; order_id: number | null; status: ReferralSummary["history"][number]["status"]; reward_cents: number; unrecovered_cents: number }
interface Paged<T> { data: T[]; current_page: number; last_page: number }
export const staffCreditApi = {
  gifts: (params: { page: number; last_four?: string; buyer_id?: string; status?: string }) => api.get<Paged<StaffGiftCard> & { totals: { sold_usd: string; redeemed_usd: string; outstanding_usd: string; refund_review_usd: string } }>("/staff/gift-cards", { params }),
  gift: (id: number) => api.get<{ data: StaffGiftCard }>(`/staff/gift-cards/${id}`),
  giftAction: (id: number, action: "cancel" | "resend") => api.post(`/staff/gift-cards/${id}/${action}`),
  referrals: (page: number, status: string) => api.get<Paged<StaffReferral> & { stats: { total: number; rewarded: number; credited_usd: string; unrecovered_usd: string } }>("/staff/referrals", { params: { page, ...(status ? { status } : {}) } }),
  void: (id: number) => api.post(`/staff/referrals/${id}/void`),
};
