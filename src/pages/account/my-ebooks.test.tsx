import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ebookApi, type EbookDeviceItem, type EbookLibraryItem } from "@/api/endpoints/ebooks";
import { clearSession, setSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import MyEbooksPage from "./MyEbooksPage";

const customer: Customer = {
  id: 1,
  name: "Dara Sok",
  email: "dara@example.com",
  phone: "012345678",
  email_verified: true,
  has_password: true,
};

describe("MyEbooksPage", () => {
  beforeEach(() => {
    setSession("customer", { token: "tok", expiresAt: null, user: customer });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dismissToast();
    clearSession("customer");
  });

  const renderPage = () =>
    renderWithProviders(
      <>
        <Routes>
          <Route path="/account/ebooks" element={<MyEbooksPage />} />
        </Routes>
        <Toaster />
      </>,
      { route: "/account/ebooks" },
    );

  it.each([[-60_000, true], [86_400_000, false]])("applies the device cooldown using its timestamp (%s ms)", async (offset, enabled) => {
    vi.spyOn(ebookApi, "library").mockResolvedValue([]);
    vi.spyOn(ebookApi, "devices").mockResolvedValue({
      data: [{ id: 99, name: "Old laptop", created_at: "2026-01-01T00:00:00Z", last_used_at: null, is_current: false }],
      meta: { max_devices: 3, next_removal_at: new Date(Date.now() + offset).toISOString() },
    });
    renderPage();
    const button = await screen.findByRole("button", { name: /Remove device/i });
    if (enabled) expect(button).toBeEnabled();
    else expect(button).toBeDisabled();
  });

  it("shows empty state when customer owns no ebooks", async () => {
    vi.spyOn(ebookApi, "library").mockResolvedValue([]);
    vi.spyOn(ebookApi, "devices").mockResolvedValue({
      data: [],
      meta: { max_devices: 3, next_removal_at: null },
    });

    renderPage();

    expect(await screen.findByText(/No ebooks yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse books/i })).toBeInTheDocument();
  });

  it("renders library items with progress and continue reading button", async () => {
    const items: EbookLibraryItem[] = [
      {
        book: {
          id: 5,
          title: "Khmer History",
          authors: [{ id: 1, name: "Dr. Chan" }],
          primary_cover_url: null,
          min_price_usd: "5.00",
          formats: ["ebook"],
          is_ebook: true,
        } as never,
        status: "ready",
        page_count: 100,
        last_page: 25,
        last_read_at: "2026-11-06T10:00:00Z",
      },
    ];

    vi.spyOn(ebookApi, "library").mockResolvedValue(items);
    vi.spyOn(ebookApi, "devices").mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Chrome on Windows",
          last_used_at: "2026-11-06T10:00:00Z",
          created_at: "2026-11-01T00:00:00Z",
          is_current: true,
        },
      ],
      meta: { max_devices: 3, next_removal_at: null },
    });

    renderPage();

    expect(await screen.findByText("Khmer History")).toBeInTheDocument();
    expect(screen.getByText(/25% complete/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue reading/i })).toHaveAttribute("href", "/read/5");
    expect(screen.getByText("Chrome on Windows")).toBeInTheDocument();
    expect(screen.getByText(/This device/i)).toBeInTheDocument();
  });

  it("allows removing a device", async () => {
    const user = userEvent.setup();
    const devices: EbookDeviceItem[] = [
      {
        id: 99,
        name: "Safari on iPhone",
        last_used_at: "2026-11-05T00:00:00Z",
        created_at: "2026-11-01T00:00:00Z",
        is_current: false,
      },
    ];

    vi.spyOn(ebookApi, "library").mockResolvedValue([]);
    vi.spyOn(ebookApi, "devices").mockResolvedValue({
      data: devices,
      meta: { max_devices: 3, next_removal_at: null },
    });
    const removeSpy = vi.spyOn(ebookApi, "removeDevice").mockResolvedValue(undefined);

    renderPage();

    const removeBtn = await screen.findByRole("button", { name: /Remove device/i });
    await user.click(removeBtn);

    // Confirm dialog appears
    const dialog = await screen.findByRole("alertdialog");
    const confirmBtn = within(dialog).getByRole("button", { name: /Remove device/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(99);
    });
  });
});
