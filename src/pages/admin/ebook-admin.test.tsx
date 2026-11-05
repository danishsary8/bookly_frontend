import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ebookApi, type StaffEbookFile } from "@/api/endpoints/ebooks";
import { opsApi, type StaffCustomer } from "@/api/endpoints/staffOps";
import type { StaffBook, StaffUser } from "@/api/endpoints/staff";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import { EbookPanel } from "@/features/admin/books/EbookPanel";
import CustomerAdminPage from "./CustomerAdminPage";

const admin: StaffUser = {
  id: 1,
  name: "Demo Admin",
  email: "admin@bookly.test",
  role: "admin",
  two_factor_enabled: true,
};

const sampleBook: StaffBook = {
  id: 42,
  title: "Angkor Wat Guide",
  description: null,
  status: "draft",
  publish_at: null,
  language: "English",
  page_count: 120,
  publish_date: "2026-01-01",
  publisher_id: null,
  series_id: null,
  series_order: null,
  authors: [],
  categories: [],
  variants: [],
  is_visible: true,
  deleted_at: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

describe("EbookPanel in Admin", () => {
  beforeEach(() => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dismissToast();
    clearSession("staff");
  });

  it("shows empty state and allows uploading a PDF", async () => {
    vi.spyOn(ebookApi, "staffEbook").mockResolvedValue(null);

    renderWithProviders(
      <>
        <EbookPanel book={sampleBook} />
        <Toaster />
      </>,
    );

    expect(await screen.findByText(/No ebook uploaded yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload PDF/i })).toBeInTheDocument();
  });

  it("shows ready ebook with details and updates preview pages", async () => {
    const user = userEvent.setup();
    const readyEbook: StaffEbookFile = {
      book_id: 42,
      status: "ready",
      page_count: 50,
      pages_rendered: 50,
      preview_pages: null,
      preview_limit: 5,
      size_bytes: 5 * 1024 * 1024,
      error: null,
      uploaded_at: "2026-11-06T00:00:00Z",
    };
    vi.spyOn(ebookApi, "staffEbook").mockResolvedValue(readyEbook);
    const updatePreview = vi.spyOn(ebookApi, "updateStaffPreviewPages").mockResolvedValue({
      ...readyEbook,
      preview_pages: 10,
    });

    renderWithProviders(
      <>
        <EbookPanel book={sampleBook} />
        <Toaster />
      </>,
    );

    expect(await screen.findByText(/Ready \(50 pages\)/i)).toBeInTheDocument();
    expect(screen.getByText(/5.00 MB/i)).toBeInTheDocument();
    expect(screen.getByText(/Default preview \(10%\)/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/Preview pages override/i);
    await user.type(input, "10");
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(updatePreview).toHaveBeenCalledWith(42, 10);
    });
  });

  it("allows removing an existing ebook", async () => {
    const user = userEvent.setup();
    const readyEbook: StaffEbookFile = {
      book_id: 42,
      status: "ready",
      page_count: 50,
      pages_rendered: 50,
      preview_pages: null,
      preview_limit: 5,
      size_bytes: 5 * 1024 * 1024,
      error: null,
      uploaded_at: "2026-11-06T00:00:00Z",
    };
    vi.spyOn(ebookApi, "staffEbook").mockResolvedValue(readyEbook);
    const deleteSpy = vi.spyOn(ebookApi, "deleteStaffEbook").mockResolvedValue(undefined);

    renderWithProviders(
      <>
        <EbookPanel book={sampleBook} />
        <Toaster />
      </>,
    );

    const removeBtn = await screen.findByRole("button", { name: /Remove ebook/i });
    await user.click(removeBtn);

    const confirmBtn = screen.getByRole("button", { name: /^Remove ebook$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(42);
    });
  });
});

describe("CustomerAdminPage reset ebook devices", () => {
  const customer: StaffCustomer = {
    id: 15,
    name: "Channary Meas",
    email: "channary@example.com",
    phone: null,
    is_active: true,
    email_verified: true,
    created_at: "2026-01-01T00:00:00Z",
    closed_at: null,
    erase_at: null,
    removal_at: null,
    login_methods: ["password"],
    tags: [],
    stats: {
      lifetime_spent_usd: "120.00",
      orders_by_status: { delivered: 3 },
      returns_count: 0,
      reviews_count: 2,
      last_order_at: "2026-11-01T00:00:00Z",
    },
    recent_orders: [],
  };

  beforeEach(() => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(opsApi, "customer").mockResolvedValue(customer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dismissToast();
    clearSession("staff");
  });

  it("resets ebook devices from customer admin page", async () => {
    const user = userEvent.setup();
    const resetSpy = vi.spyOn(ebookApi, "resetCustomerDevices").mockResolvedValue({ cleared: 3 });

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/customers/:id" element={<CustomerAdminPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/customers/15" },
    );

    const resetBtn = await screen.findByRole("button", { name: /Reset ebook devices/i });
    await user.click(resetBtn);

    const confirmBtn = screen.getByRole("button", { name: /^Reset devices$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(15);
    });
  });
});
