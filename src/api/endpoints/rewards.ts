import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { Resource } from "../types";

/*
 * Next-order reward coupons and the payment settings (owner 2026-11-12). Shop: the customer's reward coupons
 * (GET /me/coupons). Staff: reward rules (admins change them) and the KHQR discount / cash on delivery limit.
 */
export interface RewardCoupon {
  id: number;
  code: string;
  percent_off: string;
  max_discount_usd: string | null;
  expires_at: string | null;
  used: boolean;
  expired: boolean;
  is_usable: boolean;
  earned_by_order: { id: number; order_number: string | null };
  created_at: string | null;
}

export interface RewardRule {
  id: number;
  name: string;
  is_active: boolean;
  min_books: number | null;
  min_amount_usd: string | null;
  percent_off: string;
  max_discount_usd: string | null;
  valid_days: number;
  issued_count: number;
  used_count: number;
}

export type RewardRuleInput = {
  name: string;
  is_active: boolean;
  min_books: number | null;
  min_amount: string | null;
  percent_off: string;
  max_discount: string | null;
  valid_days: number;
};

export interface PaymentSettings {
  khqr_discount_percent: string | null;
  cod_max_order_usd: string | null;
  khqr_enabled: boolean;
}

export const rewardKeys = {
  myCoupons: () => ["account", "coupons"] as const,
  rules: () => ["staff", "reward-rules"] as const,
  paymentSettings: () => ["staff", "settings", "payments"] as const,
};

export const rewardsApi = {
  myCoupons: () => api.get<Resource<RewardCoupon[]>>("/me/coupons").then((r) => r.data),
  rules: () => api.get<Resource<RewardRule[]>>("/staff/reward-rules").then((r) => r.data),
  createRule: (input: RewardRuleInput) => api.post<Resource<RewardRule>>("/staff/reward-rules", input).then((r) => r.data),
  updateRule: (id: number, input: Partial<RewardRuleInput>) => api.patch<Resource<RewardRule>>(`/staff/reward-rules/${id}`, input).then((r) => r.data),
  deleteRule: (id: number) => api.delete(`/staff/reward-rules/${id}`),
  paymentSettings: () => api.get<Resource<PaymentSettings>>("/staff/settings/payments").then((r) => r.data),
  updatePaymentSettings: (input: { khqr_discount_percent: string | null; cod_max_order_usd: string | null }) =>
    api.patch<Resource<PaymentSettings>>("/staff/settings/payments", input).then((r) => r.data),
};

export const rewardQueries = {
  myCoupons: () => queryOptions({ queryKey: rewardKeys.myCoupons(), queryFn: rewardsApi.myCoupons }),
  rules: () => queryOptions({ queryKey: rewardKeys.rules(), queryFn: rewardsApi.rules }),
  paymentSettings: () => queryOptions({ queryKey: rewardKeys.paymentSettings(), queryFn: rewardsApi.paymentSettings }),
};
