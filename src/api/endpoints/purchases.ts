import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { Resource } from "../types";

export interface PurchaseRow {
  book_id: number;
  title: string;
  variant_id: number;
  format: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  waiting_quantity: number;
  quantity_to_buy: number;
  /** Copies in orders placed in the last 30 days (API with the inventory report). */
  sold_last_30_days?: number;
  /** Days until it runs out at that speed; null when it did not sell. */
  days_left?: number | null;
}

export const purchaseApi = {
  list: () => api.get<Resource<PurchaseRow[]>>("/staff/dashboard/purchases").then((result) => result.data),
  csv: () => api.get<Blob>("/staff/dashboard/purchases", { params: { format: "csv" }, responseType: "blob" }),
};

export const purchaseQuery = () => queryOptions({ queryKey: ["staff", "purchases"] as const, queryFn: purchaseApi.list });
