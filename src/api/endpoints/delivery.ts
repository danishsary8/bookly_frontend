import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { DeliveryOptionsData, Resource } from "../types";

export const deliveryKeys = {
  all: ["delivery"] as const,
  options: () => [...deliveryKeys.all, "options"] as const,
};

export const deliveryApi = {
  options: async (): Promise<DeliveryOptionsData> => {
    const res = await api.get<Resource<DeliveryOptionsData>>("/delivery/options");
    return res.data;
  },
};

export const deliveryQueries = {
  options: () =>
    queryOptions({
      queryKey: deliveryKeys.options(),
      queryFn: () => deliveryApi.options(),
      staleTime: 10 * 60 * 1000,
    }),
};
