import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import type { Customer } from "@/api/types";
import { TelegramOrderUpdatesCard } from "./TelegramOrderUpdatesCard";

vi.mock("@/api/endpoints/account", () => ({
  accountApi: {
    updateProfile: vi.fn(),
    disconnectTelegram: vi.fn(),
  },
  accountKeys: {
    me: () => ["account", "me"],
  },
}));

vi.mock("@/api/endpoints/auth", () => ({
  authApi: {
    telegram: {
      orderUpdates: vi.fn(),
      status: vi.fn(),
    },
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("TelegramOrderUpdatesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders not connected state when customer has no telegram linked", () => {
    const customer = {
      id: 1,
      name: "Sokha",
      telegram_connected: false,
      telegram_order_updates: false,
    } as unknown as Customer;

    renderWithClient(<TelegramOrderUpdatesCard customer={customer} />);

    expect(screen.getByText(/Telegram order updates/i)).toBeInTheDocument();
    expect(screen.getByText(/Not connected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect Telegram/i })).toBeInTheDocument();
  });

  it("initiates telegram connection and shows waiting state when connect button is clicked", async () => {
    const user = userEvent.setup();
    const customer = {
      id: 1,
      name: "Sokha",
      telegram_connected: false,
      telegram_order_updates: false,
    } as unknown as Customer;

    vi.mocked(authApi.telegram.orderUpdates).mockResolvedValue({
      url: "https://t.me/BooklyBot?start=XYZ123",
      key: "secretkey123",
      expires_at: "2026-10-16T12:00:00Z",
    });

    // Mock window.open
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderWithClient(<TelegramOrderUpdatesCard customer={customer} />);

    const connectBtn = screen.getByRole("button", { name: /Connect Telegram/i });
    await user.click(connectBtn);

    expect(authApi.telegram.orderUpdates).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith("https://t.me/BooklyBot?start=XYZ123", "_blank", "noopener,noreferrer");

    await waitFor(() => {
      expect(screen.getByText(/Open Telegram to finish connecting/i)).toBeInTheDocument();
    });

    openSpy.mockRestore();
  });

  it("renders connected state and allows toggling updates", async () => {
    const user = userEvent.setup();
    const customer = {
      id: 1,
      name: "Sokha",
      telegram_connected: true,
      telegram_order_updates: true,
    } as unknown as Customer;

    vi.mocked(accountApi.updateProfile).mockResolvedValue({
      ...customer,
      telegram_order_updates: false,
    });

    renderWithClient(<TelegramOrderUpdatesCard customer={customer} />);

    expect(screen.getByText(/Connected to Telegram/i)).toBeInTheDocument();
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeChecked();

    await user.click(switchEl);
    expect(accountApi.updateProfile).toHaveBeenCalledWith({ telegram_order_updates: false });
  });

  it("allows disconnecting telegram", async () => {
    const user = userEvent.setup();
    const customer = {
      id: 1,
      name: "Sokha",
      telegram_connected: true,
      telegram_order_updates: true,
    } as unknown as Customer;

    vi.mocked(accountApi.disconnectTelegram).mockResolvedValue({
      ...customer,
      telegram_connected: false,
      telegram_order_updates: false,
      telegram_chat_id: null,
    });

    renderWithClient(<TelegramOrderUpdatesCard customer={customer} />);

    const disconnectBtn = screen.getByRole("button", { name: /Disconnect/i });
    await user.click(disconnectBtn);

    expect(accountApi.disconnectTelegram).toHaveBeenCalledTimes(1);
  });
});
