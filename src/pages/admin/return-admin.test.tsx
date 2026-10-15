import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { opsApi, type StaffReturn } from "@/api/endpoints/staffOps";
import { accountApi, type StoreCredit } from "@/api/endpoints/account";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import ReturnAdminPage from "./ReturnAdminPage";
import { StoreCreditsCard } from "@/features/account/StoreCreditsCard";

const admin = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin" as const, two_factor_enabled: true };
const customer = { id: 10, name: "Sok Dara", email: "dara@example.com" };

const approvedReturn: StaffReturn = {
  id: 42,
  order_id: 100,
  order_number: "ORD-2026-0042",
  status: "approved",
  reason: "Cover was bent",
  items: [
    {
      id: 1,
      order_item_id: 10,
      title: "Clean Code",
      format: "paperback",
      quantity: 1,
      unit_price_usd: "25.00",
      reason: "Cover was bent",
    },
  ],
  refund_amount_usd: "25.00",
  is_refund_final: false,
  staff_note: null,
  requested_at: "2026-10-15T10:00:00Z",
  resolved_at: null,
  can_withdraw: false,
  customer,
};

const refundedReturn: StaffReturn = {
  ...approvedReturn,
  status: "refunded",
  is_refund_final: true,
  refund_amount_usd: "25.00",
  refund_method: "store_credit",
  refund_reference: "CREDIT-ABCD-1234",
  refunded_at: "2026-10-16T08:00:00Z",
  refunded_by: { id: 1, name: "Demo Admin" },
  resolved_at: "2026-10-16T08:00:00Z",
};

describe("Return Admin & Store Credits", () => {
  afterEach(() => {
    clearSession("staff");
    clearSession("customer");
    vi.restoreAllMocks();
  });

  it("shows Record refund button on approved returns and submits store credit refund", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(opsApi, "return").mockResolvedValue(approvedReturn);
    const refundSpy = vi.spyOn(opsApi, "refundReturn").mockResolvedValue(refundedReturn);

    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/returns/:id" element={<ReturnAdminPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/returns/42" },
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Return #42" })).toBeInTheDocument();
    });

    const refundButton = screen.getByRole("button", { name: /record refund/i });
    expect(refundButton).toBeInTheDocument();

    await user.click(refundButton);

    expect(screen.getByRole("heading", { name: /record refund return #42\?/i })).toBeInTheDocument();
    expect(screen.getByText("Calculated refund amount:")).toBeInTheDocument();
    expect(screen.getAllByText("$25.00").length).toBeGreaterThanOrEqual(1);

    // Default method is store credit
    const select = screen.getByLabelText(/refund method/i);
    expect(select).toHaveValue("store_credit");

    // Add optional note and submit
    const noteField = screen.getByLabelText(/note for the customer/i);
    await user.type(noteField, "Store credit issued for return");

    const confirmBtn = screen.getByRole("button", { name: /^record refund$/i });
    await user.click(confirmBtn);

    expect(refundSpy).toHaveBeenCalledWith(42, {
      method: "store_credit",
      reference: undefined,
      note: "Store credit issued for return",
    });
  });

  it("requires reference when selecting manual offline refund", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(opsApi, "return").mockResolvedValue(approvedReturn);
    const refundSpy = vi.spyOn(opsApi, "refundReturn").mockResolvedValue({
      ...refundedReturn,
      refund_method: "manual_offline",
      refund_reference: "ABA-TX-998877",
    });

    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/returns/:id" element={<ReturnAdminPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/returns/42" },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /record refund/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /record refund/i }));

    const select = screen.getByLabelText(/refund method/i);
    await user.selectOptions(select, "manual_offline");

    // Reference field should now appear
    const refInput = screen.getByLabelText(/payment reference \/ receipt/i);
    expect(refInput).toBeInTheDocument();

    // Submitting without reference triggers validation
    await user.click(screen.getByRole("button", { name: /^record refund$/i }));
    expect(screen.getByText(/payment reference is required/i)).toBeInTheDocument();
    expect(refundSpy).not.toHaveBeenCalled();

    // Fill reference and submit
    await user.type(refInput, "ABA-TX-998877");
    await user.click(screen.getByRole("button", { name: /^record refund$/i }));

    expect(refundSpy).toHaveBeenCalledWith(42, {
      method: "manual_offline",
      reference: "ABA-TX-998877",
      note: undefined,
    });
  });

  it("displays refund badge and details when return is already refunded", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(opsApi, "return").mockResolvedValue(refundedReturn);

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/returns/:id" element={<ReturnAdminPage />} />
          </Route>
        </Routes>
      </>,
      { route: "/admin/returns/42" },
    );

    await waitFor(() => {
      expect(screen.getByText(/Refunded \(\$25\.00 via Store Credit - CREDIT-ABCD-1234\)/i)).toBeInTheDocument();
    });

    // In summary section
    expect(screen.getByText("Refund record")).toBeInTheDocument();
    expect(screen.getByText("Store Credit")).toBeInTheDocument();
    expect(screen.getByText(/Ref: CREDIT-ABCD-1234/)).toBeInTheDocument();
    expect(screen.getByText(/by Demo Admin/)).toBeInTheDocument();

    // No Record refund button should be shown
    expect(screen.queryByRole("button", { name: /record refund/i })).not.toBeInTheDocument();
  });

  it("StoreCreditsCard displays active customer credits with copy button", async () => {
    const credits: StoreCredit[] = [
      {
        id: 1,
        code: "CREDIT-ABCD-1234",
        value_usd: "25.00",
        type: "fixed",
        used_count: 0,
        max_uses: 1,
        starts_at: "2026-10-16T08:00:00Z",
        expires_at: "2027-10-16T08:00:00Z",
        created_at: "2026-10-16T08:00:00Z",
      },
    ];

    vi.spyOn(accountApi, "storeCredits").mockResolvedValue(credits);

    renderWithProviders(
      <>
        <StoreCreditsCard />
        <Toaster />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Store credits" })).toBeInTheDocument();
    });

    expect(screen.getByText("CREDIT-ABCD-1234")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy code CREDIT-ABCD-1234/i })).toBeInTheDocument();
  });
});
