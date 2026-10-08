import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { updateSessionUser } from "../session";
import { toQueryParams } from "./catalog";
import type { Address, AddressInput, BookCard, Customer, MessageResponse, Paginated, Resource } from "../types";

export const accountKeys = {
  all: ["account"] as const,
  me: () => ["account", "me"] as const,
  addresses: () => ["account", "addresses"] as const,
  wishlist: (params: object) => ["account", "wishlist", toQueryParams(params)] as const,
};

/**
 * Address body. The API also accepts null for the optional text fields (to clear
 * them on edit); the OpenAPI schema doesn't say so, hence the widening here.
 */
export type AddressPayload = Omit<AddressInput, "address_line2" | "state" | "postal_code"> & {
  address_line2?: string | null;
  state?: string | null;
  postal_code?: string | null;
};

export const accountApi = {
  me: () => api.get<Resource<Customer>>("/me").then((r) => r.data),
  updateProfile: async (input: { name?: string; phone?: string | null }) => {
    const customer = (await api.patch<Resource<Customer>>("/me", input)).data;
    updateSessionUser("customer", customer);
    return customer;
  },
  /** current_password is not needed for accounts created with Google/Facebook (has_password false). */
  changePassword: (input: { current_password?: string; password: string; password_confirmation: string }) =>
    api.put<MessageResponse>("/me/password", input),
  /** Closes the account (password, or a fresh Google/Facebook token for accounts without one). */
  closeAccount: (input: { confirm: "DELETE"; password?: string; provider?: "google" | "facebook"; access_token?: string }) =>
    api.delete<MessageResponse & { erase_at?: string }>("/me", { data: input }),
  /** Connects Google/Facebook with a fresh token from its popup (plus the password when the account has one). */
  connect: async (provider: "google" | "facebook", input: { access_token: string; password?: string }) => {
    const response = await api.post<MessageResponse & { customer?: Customer }>(`/me/connections/${provider}`, input);
    if (response.customer) updateSessionUser("customer", response.customer);
    return response;
  },
  /** Refused (422, reason last_way_in) when it's the only way left to sign in. */
  disconnect: async (provider: "google" | "facebook") => {
    const response = await api.delete<MessageResponse & { customer?: Customer }>(`/me/connections/${provider}`);
    if (response.customer) updateSessionUser("customer", response.customer);
    return response;
  },

  addresses: () => api.get<Resource<Address[]>>("/addresses").then((r) => r.data),
  createAddress: (input: AddressPayload) => api.post<Resource<Address>>("/addresses", input).then((r) => r.data),
  updateAddress: (id: number, input: Partial<AddressPayload>) => api.patch<Resource<Address>>(`/addresses/${id}`, input).then((r) => r.data),
  deleteAddress: (id: number) => api.delete(`/addresses/${id}`),

  wishlist: (params: { page?: number; per_page?: number } = {}) =>
    api.get<Paginated<BookCard>>("/wishlist", { params: toQueryParams(params) }),
  addToWishlist: (bookId: number) => api.post<MessageResponse & { book_id: number }>("/wishlist", { book_id: bookId }),
  removeFromWishlist: (bookId: number) => api.delete(`/wishlist/${bookId}`),
};

export const accountQueries = {
  me: () => queryOptions({ queryKey: accountKeys.me(), queryFn: accountApi.me }),
  addresses: () => queryOptions({ queryKey: accountKeys.addresses(), queryFn: accountApi.addresses }),
  wishlist: (params: Parameters<typeof accountApi.wishlist>[0] = {}) =>
    queryOptions({ queryKey: accountKeys.wishlist(params), queryFn: () => accountApi.wishlist(params) }),
};
