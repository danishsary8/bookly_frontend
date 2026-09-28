import api from "../api/axios";
import { emitCartChanged } from "../lib/cart";
import type {
  CartResponseData,
  CheckoutPreview,
  CustomerCountResponse,
  CustomerInvoice,
  CustomerProfile,
  CustomerProfileUpdateData,
  ReturnRequest,
  StorefrontSettings,
} from "../types/customer.types";

const customerService = {
  getCurrentProfile: async (): Promise<CustomerProfile> => {
    const response = await api.get<{ status: string; data: CustomerProfile }>("/auth/me");
    return response.data.data;
  },

  updateCurrentProfile: async (userId: number, payload: CustomerProfileUpdateData): Promise<void> => {
    await api.put(`/customers/${userId}`, payload);
  },

  getCustomerCount: async (): Promise<CustomerCountResponse> => {
    const response = await api.get<CustomerCountResponse>("/customers/count");
    return response.data;
  },

  getCart: async (): Promise<CartResponseData> => {
    const response = await api.get<{ status: string; data: CartResponseData }>("/cart");
    return response.data.data;
  },

  addCartItem: async (bookId: number, quantity = 1): Promise<CartResponseData> => {
    const response = await api.post<{ status: string; data: CartResponseData }>("/cart/items", {
      book_id: bookId,
      quantity,
    });
    emitCartChanged();
    return response.data.data;
  },

  updateCartItemQuantity: async (bookId: number, quantity: number): Promise<CartResponseData> => {
    const response = await api.put<{ status: string; data: CartResponseData }>(`/cart/items/${bookId}`, { quantity });
    emitCartChanged();
    return response.data.data;
  },

  removeCartItem: async (bookId: number): Promise<CartResponseData> => {
    const response = await api.delete<{ status: string; data: CartResponseData }>(`/cart/items/${bookId}`);
    emitCartChanged();
    return response.data.data;
  },

  previewCheckout: async (promoCode?: string): Promise<CheckoutPreview> => {
    const response = await api.post<{ status: string; data: CheckoutPreview }>("/cart/checkout-preview", {
      promo_code: promoCode?.trim() || null,
    });
    return response.data.data;
  },

  checkout: async (paymentMethod: "card" | "cod", shippingAddress: string, promoCode?: string): Promise<CustomerInvoice> => {
    const response = await api.post<{ status: string; data: CustomerInvoice }>("/cart/checkout", {
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      promo_code: promoCode?.trim() || null,
    });
    emitCartChanged();
    return response.data.data;
  },

  getInvoices: async (): Promise<CustomerInvoice[]> => {
    const response = await api.get<{ status: string; data: CustomerInvoice[] }>("/invoices");
    return response.data.data;
  },

  // GET /invoices/{id}: a single order for the signed-in customer.
  getInvoice: async (invoiceId: string): Promise<CustomerInvoice> => {
    const response = await api.get<{ status: string; data: CustomerInvoice }>(`/invoices/${encodeURIComponent(invoiceId)}`);
    return response.data.data;
  },

  createReturnRequest: async (
    invoiceId: string,
    payload: { invoice_item_id: number; quantity: number; reason: string },
  ): Promise<ReturnRequest> => {
    const response = await api.post<{ status: string; data: ReturnRequest }>(`/invoices/${invoiceId}/returns`, payload);
    return response.data.data;
  },

  getStorefrontSettings: async (): Promise<StorefrontSettings> => {
    const response = await api.get<{ status: string; data: StorefrontSettings }>("/storefront/settings");
    return response.data.data;
  },
};

export default customerService;
