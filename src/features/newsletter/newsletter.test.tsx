import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { ApiError } from "@/api/errors";
import { NewsletterSignup } from "@/components/shell/NewsletterSignup";
import NewsletterConfirmPage from "@/pages/NewsletterConfirmPage";
import NewsletterUnsubscribePage from "@/pages/NewsletterUnsubscribePage";
import { NewsletterToggle } from "@/features/account/NewsletterToggle";
import NewsletterAdminPage from "@/pages/admin/NewsletterAdminPage";
import type { Customer } from "@/api/types";

const mockCustomer: Customer = {
  id: 1,
  name: "Reader One",
  email: "reader@example.com",
  email_verified: true,
  phone: null,
  phone_verified: false,
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewsletterSignup", () => {
  it("renders input and submits email successfully", async () => {
    const user = userEvent.setup();
    const subscribeSpy = vi
      .spyOn(newsletterApi, "subscribe")
      .mockResolvedValue({
        message: "If that email is valid, a confirmation link has been sent.",
      });

    renderWithProviders(<NewsletterSignup />);

    const input = screen.getByPlaceholderText(/your email address/i);
    const button = screen.getByRole("button", { name: /subscribe/i });

    await user.type(input, "reader@example.com");
    await user.click(button);

    await waitFor(() => {
      expect(subscribeSpy).toHaveBeenCalledWith({
        email: "reader@example.com",
        locale: "en",
      });
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
  });

  it("handles api errors gracefully during subscription", async () => {
    const user = userEvent.setup();
    vi.spyOn(newsletterApi, "subscribe").mockRejectedValue(
      new ApiError({
        kind: "rate_limited",
        message: "Too many requests. Please wait.",
      }),
    );

    renderWithProviders(<NewsletterSignup />);

    const input = screen.getByPlaceholderText(/your email address/i);
    const button = screen.getByRole("button", { name: /subscribe/i });

    await user.type(input, "reader@example.com");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});

describe("NewsletterConfirmPage", () => {
  it("shows invalid token message if token param is missing", async () => {
    renderWithProviders(<NewsletterConfirmPage />, {
      route: "/newsletter/confirm",
    });

    await waitFor(() => {
      expect(
        screen.getByText(/invalid or expired confirmation link/i),
      ).toBeInTheDocument();
    });
  });

  it("confirms subscription when valid token is present", async () => {
    const confirmSpy = vi.spyOn(newsletterApi, "confirm").mockResolvedValue({
      message: "Thank you for confirming your subscription!",
    });

    renderWithProviders(<NewsletterConfirmPage />, {
      route: "/newsletter/confirm?token=valid-token-123",
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("valid-token-123");
      expect(
        screen.getByText(/thank you for confirming your subscription!/i),
      ).toBeInTheDocument();
    });
  });
});

describe("NewsletterUnsubscribePage", () => {
  it("shows error when token is missing", async () => {
    renderWithProviders(<NewsletterUnsubscribePage />, {
      route: "/newsletter/unsubscribe",
    });

    await waitFor(() => {
      expect(
        screen.getByText(/invalid or expired unsubscribe link/i),
      ).toBeInTheDocument();
    });
  });

  it("automatically processes unsubscribe when token is present", async () => {
    const unsubSpy = vi.spyOn(newsletterApi, "unsubscribe").mockResolvedValue({
      message: "You have been successfully unsubscribed.",
    });

    renderWithProviders(<NewsletterUnsubscribePage />, {
      route: "/newsletter/unsubscribe?token=unsub-token-456",
    });

    await waitFor(() => {
      expect(unsubSpy).toHaveBeenCalledWith("unsub-token-456");
      expect(
        screen.getByText(/you have been successfully unsubscribed/i),
      ).toBeInTheDocument();
    });
  });
});

describe("NewsletterToggle", () => {
  it("loads preference and allows toggling", async () => {
    const user = userEvent.setup();
    vi.spyOn(newsletterApi, "getCustomerStatus").mockResolvedValue({
      subscribed: false,
      status: "unsubscribed",
      locale: "en",
    });
    const updateSpy = vi
      .spyOn(newsletterApi, "updateCustomerStatus")
      .mockResolvedValue({
        message: "Subscribed successfully.",
        subscribed: true,
        status: "confirmed",
        locale: "en",
      });

    renderWithProviders(<NewsletterToggle customer={mockCustomer} />);

    const switchBtn = await screen.findByRole("switch");
    expect(switchBtn).toHaveAttribute("aria-checked", "false");

    await user.click(switchBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(true, "en");
    });
  });
});

describe("NewsletterAdminPage", () => {
  it("loads and displays newsletter summary and campaigns list", async () => {
    vi.spyOn(newsletterApi, "getSummary").mockResolvedValue({
      total: 150,
      confirmed: 120,
      pending: 20,
      unsubscribed: 10,
      daily_limit: 40,
    });
    const listSpy = vi.spyOn(newsletterApi, "listCampaigns").mockResolvedValue({
      data: [
        {
          id: 1,
          subject_en: "October Highlights",
          subject_km: null,
          body_en: "Great books this month!",
          body_km: null,
          book_ids: [],
          status: "draft",
          created_by_staff_id: 1,
          recipients_total: 0,
          sent_at: null,
          created_at: "2026-10-16T00:00:00Z",
          updated_at: "2026-10-16T00:00:00Z",
        },
        {
          id: 2,
          subject_en: "September picks",
          subject_km: null,
          body_en: "Read these",
          body_km: null,
          book_ids: [],
          status: "sending",
          created_by_staff_id: 1,
          recipients_total: 120,
          sent_count: 40,
          sent_at: null,
          created_at: "2026-09-16T00:00:00Z",
          updated_at: "2026-09-16T00:00:00Z",
        },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
    });

    renderWithProviders(<NewsletterAdminPage />, {
      route: "/admin/newsletter",
    });

    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(await screen.findByText("October Highlights")).toBeInTheDocument();
    expect(await screen.findByText("draft")).toBeInTheDocument();
    expect(screen.getByText("40 of 120 sent")).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalled();
  });
});
