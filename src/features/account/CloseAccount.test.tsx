import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import type { Customer } from "@/api/types";
import { CloseAccount } from "./CloseAccount";

vi.mock("@/api/endpoints/account", () => ({
  accountApi: {
    closeAccount: vi.fn(),
  },
}));

vi.mock("@/api/endpoints/auth", () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue({ message: "Logged out" }),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("CloseAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows Telegram-only accounts (no password, no social) to delete without credentials", async () => {
    const user = userEvent.setup();
    const telegramCustomer = {
      id: 1,
      name: "Sokha",
      email: null,
      phone: "+85512345678",
      has_password: false,
      connected: {},
    } as unknown as Customer;

    vi.mocked(accountApi.closeAccount).mockResolvedValue({ message: "Account closed" });

    renderWithClient(<CloseAccount customer={telegramCustomer} />);

    // Open modal
    await user.click(screen.getByRole("button", { name: /delete my account/i }));

    // Should not render password field
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    // Should not render social provider warning
    expect(screen.queryByText(/confirm with/i)).not.toBeInTheDocument();

    // Type DELETE
    const confirmInput = screen.getByLabelText(/type delete to confirm/i);
    await user.type(confirmInput, "DELETE");

    // Click submit in modal
    const deleteButtons = screen.getAllByRole("button", { name: /^delete my account$/i });
    const modalDeleteBtn = deleteButtons[deleteButtons.length - 1];
    await user.click(modalDeleteBtn);

    await waitFor(() => {
      expect(accountApi.closeAccount).toHaveBeenCalledWith({ confirm: "DELETE" });
    });
  });

  it("displays 'Sign in again' button on 403 sign_in_again for stale sessions", async () => {
    const user = userEvent.setup();
    const telegramCustomer = {
      id: 1,
      name: "Sokha",
      email: null,
      phone: "+85512345678",
      has_password: false,
      connected: {},
    } as unknown as Customer;

    const axiosError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          message: "For your safety, sign in again first, then try this within 10 minutes.",
          reason: "sign_in_again",
        },
      },
    };
    vi.mocked(accountApi.closeAccount).mockRejectedValue(axiosError);

    renderWithClient(<CloseAccount customer={telegramCustomer} />);

    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    await user.type(screen.getByLabelText(/type delete to confirm/i), "DELETE");

    const deleteButtons = screen.getAllByRole("button", { name: /^delete my account$/i });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    // Should display the error message and 'Sign in again' button
    await waitFor(() => {
      expect(screen.getByText(/sign in again first/i)).toBeInTheDocument();
    });
    const signInAgainBtn = screen.getByRole("button", { name: /sign in again/i });
    expect(signInAgainBtn).toBeInTheDocument();

    // Clicking Sign in again logs out and navigates to login
    await user.click(signInAgainBtn);
    expect(authApi.logout).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login?next=%2Faccount%2Fsecurity");
    });
  });
});
