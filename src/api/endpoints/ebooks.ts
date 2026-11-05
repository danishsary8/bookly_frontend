import { queryOptions } from "@tanstack/react-query";
import { api, http } from "../client";
import type { BookCard } from "../types";

const DEVICE_STORAGE_KEY = "bookly:reader-device";

/**
 * Returns the stable random device identifier (16-100 chars [A-Za-z0-9_-])
 * stored in this browser's localStorage, creating one if not present.
 */
export function getReaderDeviceId(): string {
  if (typeof window === "undefined") return "browser-ssr-placeholder";
  try {
    let id = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,100}$/.test(id)) {
      id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
      // Ensure between 16 and 100 characters
      if (id.length < 24) id = id.padEnd(24, "0");
      localStorage.setItem(DEVICE_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "dev_fallback_local_device_0000";
  }
}

export interface EbookReaderMeta {
  book_id: number;
  title: string;
  status: "processing" | "ready" | "failed";
  page_count: number;
  preview_pages: number;
  owned: boolean;
  last_page: number | null;
}

export interface EbookPreviewMeta {
  book_id: number;
  title: string;
  page_count: number;
  preview_pages: number;
}

export interface EbookLibraryItem {
  book: BookCard;
  status: "processing" | "ready" | "failed" | "missing";
  page_count: number;
  last_page: number | null;
  last_read_at: string | null;
}

export interface EbookDeviceItem {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string;
  is_current: boolean;
}

export interface EbookDevicesMeta {
  max_devices: number;
  next_removal_at: string | null;
}

export interface StaffEbookFile {
  book_id: number;
  status: "processing" | "ready" | "failed";
  page_count: number;
  pages_rendered: number;
  preview_pages: number | null;
  preview_limit: number;
  size_bytes: number;
  error: string | null;
  uploaded_at: string;
}

export const ebookKeys = {
  all: ["ebooks"] as const,
  meta: (bookId: number) => ["ebooks", "meta", bookId] as const,
  previewMeta: (bookId: number) => ["ebooks", "preview-meta", bookId] as const,
  library: () => ["ebooks", "library"] as const,
  devices: () => ["ebooks", "devices"] as const,
  staffFile: (bookId: number) => ["staff", "ebook", bookId] as const,
};

export const ebookApi = {
  meta: (bookId: number) =>
    api.get<{ data: EbookReaderMeta }>(`/reader/${bookId}`).then((r) => r.data),

  previewMeta: (bookId: number) =>
    api.get<{ data: EbookPreviewMeta }>(`/reader/${bookId}/preview`).then((r) => r.data),

  /**
   * Fetches a single page image as a blob URL using the current session token
   * and reader device header. The caller must revoke the URL when done.
   */
  fetchPageBlobUrl: async (bookId: number, page: number): Promise<string> => {
    const deviceId = getReaderDeviceId();
    const res = await http.get(`/reader/${bookId}/pages/${page}`, {
      responseType: "blob",
      headers: { "X-Reader-Device": deviceId },
    });
    return URL.createObjectURL(res.data as Blob);
  },

  /**
   * Fetches a preview page image as a blob URL (public, no account needed).
   */
  fetchPreviewPageBlobUrl: async (bookId: number, page: number): Promise<string> => {
    const res = await http.get(`/reader/${bookId}/preview/pages/${page}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(res.data as Blob);
  },

  saveProgress: (bookId: number, page: number) =>
    api.put<{ data: { page: number } }>(`/reader/${bookId}/progress`, { page }).then((r) => r.data),

  library: () =>
    api.get<{ data: EbookLibraryItem[] }>("/me/ebooks").then((r) => r.data),

  devices: () => {
    const deviceId = getReaderDeviceId();
    return http
      .get<{ data: EbookDeviceItem[]; meta: EbookDevicesMeta }>("/me/ebook-devices", {
        headers: { "X-Reader-Device": deviceId },
      })
      .then((r) => r.data);
  },

  removeDevice: (deviceId: number) =>
    api.delete<void>(`/me/ebook-devices/${deviceId}`),

  staffEbook: (bookId: number) =>
    api.get<{ data: StaffEbookFile | null }>(`/staff/books/${bookId}/ebook`).then((r) => r.data),

  uploadStaffEbook: async (bookId: number, file: File, onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await http.post<{ data: StaffEbookFile }>(`/staff/books/${bookId}/ebook`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
    return res.data.data;
  },

  updateStaffPreviewPages: (bookId: number, previewPages: number | null) =>
    api.patch<{ data: StaffEbookFile }>(`/staff/books/${bookId}/ebook`, { preview_pages: previewPages }).then((r) => r.data),

  deleteStaffEbook: (bookId: number) =>
    api.delete<void>(`/staff/books/${bookId}/ebook`),

  resetCustomerDevices: (customerId: number) =>
    api.post<{ data: { cleared: number } }>(`/staff/customers/${customerId}/ebook-devices/reset`).then((r) => r.data),
};

export const ebookQueries = {
  meta: (bookId: number) =>
    queryOptions({
      queryKey: ebookKeys.meta(bookId),
      queryFn: () => ebookApi.meta(bookId),
      retry: false,
    }),

  previewMeta: (bookId: number) =>
    queryOptions({
      queryKey: ebookKeys.previewMeta(bookId),
      queryFn: () => ebookApi.previewMeta(bookId),
      retry: false,
    }),

  library: () =>
    queryOptions({
      queryKey: ebookKeys.library(),
      queryFn: ebookApi.library,
    }),

  devices: () =>
    queryOptions({
      queryKey: ebookKeys.devices(),
      queryFn: ebookApi.devices,
    }),

  staffEbook: (bookId: number) =>
    queryOptions({
      queryKey: ebookKeys.staffFile(bookId),
      queryFn: () => ebookApi.staffEbook(bookId),
    }),
};
