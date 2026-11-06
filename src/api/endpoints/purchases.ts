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
}

export const purchaseApi = {
  list: () => api.get<Resource<PurchaseRow[]>>("/staff/dashboard/purchases").then((result) => result.data),
  csv: () => api.get<Blob>("/staff/dashboard/purchases", { params: { format: "csv" }, responseType: "blob" }),
};

export const purchaseQuery = () => queryOptions({ queryKey: ["staff", "purchases"] as const, queryFn: purchaseApi.list });
