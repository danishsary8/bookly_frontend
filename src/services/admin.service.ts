import api from "../api/axios";
import type { BookAuthor, BookCategory, InventoryMovement } from "../types/book.types";
import type { AdminCustomerDirectoryItem, CustomerCountResponse, CustomerInvoice, DashboardAnalytics, Promotion, PromotionPayload, ReturnRequest, StoreSettings, StoreSettingsPayload } from "../types/customer.types";

interface InvoiceUpdatePayload {
  status: CustomerInvoice["status"];
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery_at?: string | null;
}

interface ReturnUpdatePayload {
  status: ReturnRequest["status"];
  admin_note?: string | null;
}

const adminService = {
  getInvoices: async (): Promise<CustomerInvoice[]> => {
    const response = await api.get<{ status: string; data: CustomerInvoice[] }>("/admin/invoices");
    return response.data.data;
  },

  updateInvoiceStatus: async (
    invoiceId: string,
    payload: InvoiceUpdatePayload,
  ): Promise<CustomerInvoice> => {
    const response = await api.put<{ status: string; data: CustomerInvoice }>(`/admin/invoices/${invoiceId}`, payload);
    return response.data.data;
  },

  getCustomerCount: async (): Promise<CustomerCountResponse> => {
    const response = await api.get<CustomerCountResponse>("/customers/count");
    return response.data;
  },

  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    const response = await api.get<{ status: string; data: DashboardAnalytics }>("/admin/analytics");
    return response.data.data;
  },

  getCustomers: async (): Promise<AdminCustomerDirectoryItem[]> => {
    const response = await api.get<{ status: string; data: AdminCustomerDirectoryItem[] }>("/admin/customers");
    return response.data.data;
  },

  getSettings: async (): Promise<StoreSettings> => {
    const response = await api.get<{ status: string; data: StoreSettings }>("/admin/settings");
    return response.data.data;
  },

  updateSettings: async (payload: StoreSettingsPayload): Promise<StoreSettings> => {
    const response = await api.put<{ status: string; data: StoreSettings }>("/admin/settings", payload);
    return response.data.data;
  },

  createAuthor: async (name: string): Promise<BookAuthor> => {
    const response = await api.post<{ status: string; data: BookAuthor }>("/authors", { name });
    return response.data.data;
  },

  updateAuthor: async (authorId: number, name: string): Promise<BookAuthor> => {
    const response = await api.put<{ status: string; data: BookAuthor }>(`/authors/${authorId}`, { name });
    return response.data.data;
  },

  deleteAuthor: async (authorId: number): Promise<void> => {
    await api.delete(`/authors/${authorId}`);
  },

  createCategory: async (name: string): Promise<BookCategory> => {
    const response = await api.post<{ status: string; data: BookCategory }>("/bookcategory", { name });
    return response.data.data;
  },

  updateCategory: async (categoryId: number, name: string): Promise<BookCategory> => {
    const response = await api.put<{ status: string; data: BookCategory }>(`/bookcategory/${categoryId}`, { name });
    return response.data.data;
  },

  deleteCategory: async (categoryId: number): Promise<void> => {
    await api.delete(`/bookcategory/${categoryId}`);
  },

  getInventoryMovements: async (limit = 40): Promise<InventoryMovement[]> => {
    const response = await api.get<{ status: string; data: InventoryMovement[] }>("/admin/inventory-movements", {
      params: { limit },
    });
    return response.data.data;
  },

  getPromotions: async (): Promise<Promotion[]> => {
    const response = await api.get<{ status: string; data: Promotion[] }>("/admin/promotions");
    return response.data.data;
  },

  createPromotion: async (payload: PromotionPayload): Promise<Promotion> => {
    const response = await api.post<{ status: string; data: Promotion }>("/admin/promotions", payload);
    return response.data.data;
  },

  updatePromotion: async (promotionId: number, payload: PromotionPayload): Promise<Promotion> => {
    const response = await api.put<{ status: string; data: Promotion }>(`/admin/promotions/${promotionId}`, payload);
    return response.data.data;
  },

  deletePromotion: async (promotionId: number): Promise<void> => {
    await api.delete(`/admin/promotions/${promotionId}`);
  },

  getReturnRequests: async (): Promise<ReturnRequest[]> => {
    const response = await api.get<{ status: string; data: ReturnRequest[] }>("/admin/returns");
    return response.data.data;
  },

  updateReturnRequest: async (returnId: number, payload: ReturnUpdatePayload): Promise<ReturnRequest> => {
    const response = await api.put<{ status: string; data: ReturnRequest }>(`/admin/returns/${returnId}`, payload);
    return response.data.data;
  },
};

export default adminService;
