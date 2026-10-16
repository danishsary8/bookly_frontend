import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";

export interface NewsletterSummary {
  confirmed: number;
  pending: number;
  unsubscribed: number;
  total: number;
  /** Newsletter + back-in-stock emails sent per day at most (MARKETING_DAILY_LIMIT). */
  daily_limit: number;
}

export interface NewsletterCampaign {
  id: number;
  subject_en: string;
  subject_km: string | null;
  body_en: string;
  body_km: string | null;
  book_ids: number[];
  status: "draft" | "sending" | "sent";
  created_by_staff_id: number | null;
  created_by_staff?: {
    id: number;
    name: string;
    email: string;
  } | null;
  recipients_total: number;
  /** Emails of this campaign that have really gone out (the list endpoint only). */
  sent_count?: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterCampaignInput {
  subject_en: string;
  subject_km?: string | null;
  body_en: string;
  body_km?: string | null;
  book_ids?: number[];
}

export interface NewsletterStatusResponse {
  subscribed: boolean;
  status: string;
  locale: string;
}

export interface NewsletterCampaignsResponse {
  data: NewsletterCampaign[];
  current_page: number;
  last_page: number;
  total: number;
}

export const newsletterKeys = {
  all: ["newsletter"] as const,
  customer: () => ["newsletter", "customer"] as const,
  summary: () => ["newsletter", "summary"] as const,
  campaigns: (page?: number) => ["newsletter", "campaigns", page ?? 1] as const,
  campaign: (id: number) => ["newsletter", "campaign", id] as const,
};

export const newsletterApi = {
  // Public
  subscribe: (data: { email: string; locale?: string; turnstile_token?: string }) =>
    api.post<{ message: string }>("/newsletter/subscribe", data),
  confirm: (token: string) =>
    api.post<{ message: string }>("/newsletter/confirm", { token }),
  unsubscribe: (token: string) =>
    api.post<{ message: string }>("/newsletter/unsubscribe", { token }),

  // Customer
  getCustomerStatus: () =>
    api.get<NewsletterStatusResponse>("/me/newsletter"),
  updateCustomerStatus: (subscribed: boolean, locale?: string) =>
    api.put<{ message: string; subscribed: boolean; status: string; locale: string }>("/me/newsletter", {
      subscribed,
      locale,
    }),

  // Admin
  getSummary: () =>
    api.get<NewsletterSummary>("/staff/newsletter/summary"),
  listCampaigns: (page = 1, perPage = 20) =>
    api.get<NewsletterCampaignsResponse>("/staff/newsletter/campaigns", { params: { page, per_page: perPage } }),
  getCampaign: (id: number) =>
    api.get<{ campaign: NewsletterCampaign; books: Array<{ id: number; title: string }> }>(
      `/staff/newsletter/campaigns/${id}`
    ),
  createCampaign: (data: NewsletterCampaignInput) =>
    api.post<NewsletterCampaign>("/staff/newsletter/campaigns", data),
  updateCampaign: (id: number, data: NewsletterCampaignInput) =>
    api.put<NewsletterCampaign>(`/staff/newsletter/campaigns/${id}`, data),
  deleteCampaign: (id: number) =>
    api.delete<{ message: string }>(`/staff/newsletter/campaigns/${id}`),
  testSendCampaign: (id: number) =>
    api.post<{ message: string }>(`/staff/newsletter/campaigns/${id}/test`),
  sendCampaign: (id: number) =>
    api.post<{
      message: string;
      estimated_days: number;
      daily_limit: number;
      recipients_total: number;
      campaign: NewsletterCampaign;
    }>(`/staff/newsletter/campaigns/${id}/send`),
};

export const newsletterQueries = {
  customerStatus: () =>
    queryOptions({
      queryKey: newsletterKeys.customer(),
      queryFn: newsletterApi.getCustomerStatus,
    }),
  summary: () =>
    queryOptions({
      queryKey: newsletterKeys.summary(),
      queryFn: newsletterApi.getSummary,
    }),
  campaigns: (page = 1) =>
    queryOptions({
      queryKey: newsletterKeys.campaigns(page),
      queryFn: () => newsletterApi.listCampaigns(page),
    }),
  campaign: (id: number) =>
    queryOptions({
      queryKey: newsletterKeys.campaign(id),
      queryFn: () => newsletterApi.getCampaign(id),
    }),
};
