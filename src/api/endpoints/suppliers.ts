import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";

/** Suppliers (GET/POST/PATCH /staff/suppliers). Never deleted; `is_active: false` switches one off. */
export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  is_active: boolean;
  restocks: number;
  units: number;
  spend_usd: string;
  last_restock_at: string | null;
}

export type SupplierInput = Partial<Pick<Supplier, "name" | "contact_name" | "phone" | "email" | "note" | "is_active">>;

export const suppliersApi = {
  list: (params: { q?: string; active?: "0" | "1" } = {}) => api.get<{ data: Supplier[] }>("/staff/suppliers", { params }).then((r) => r.data),
  create: (input: SupplierInput) => api.post<{ data: Supplier }>("/staff/suppliers", input).then((r) => r.data),
  update: (id: number, input: SupplierInput) => api.patch<{ data: Supplier }>(`/staff/suppliers/${id}`, input).then((r) => r.data),
};

export const supplierQueries = {
  list: (params: { q?: string; active?: "0" | "1" } = {}) => queryOptions({ queryKey: ["staff", "suppliers", params] as const, queryFn: () => suppliersApi.list(params), staleTime: 30_000 }),
};
