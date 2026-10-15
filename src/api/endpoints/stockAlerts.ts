import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { Resource, StockAlert } from "../types";

export const stockAlertKeys = {
  all: ["stock-alerts"] as const,
};

export const stockAlertsApi = {
  list: () => api.get<Resource<StockAlert[]>>("/me/stock-alerts").then((r) => r.data),
  create: (bookVariantId: number) =>
    api.post<Resource<StockAlert>>("/me/stock-alerts", { book_variant_id: bookVariantId }).then((r) => r.data),
  delete: (id: number) => api.delete<void>(`/me/stock-alerts/${id}`),
};

export const stockAlertQueries = {
  all: () => stockAlertKeys.all,
  list: () =>
    queryOptions({
      queryKey: stockAlertKeys.all,
      queryFn: stockAlertsApi.list,
    }),
};
