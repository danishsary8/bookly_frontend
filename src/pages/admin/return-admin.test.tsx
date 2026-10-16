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

const admin = {
  id: 1,
  name: "Demo Admin",
  email: "admin@bookly.test",
  role: "admin" as const,
  two_factor_enabled: true,
};
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
  refund_reference: null,
  store_credit: {
    code: "CREDIT-K7M2Q9XA",
    amount_usd: "25.00",
    expires_at: "2027-10-16T16:59:59Z",
  },
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

  const renderReturn = (data: StaffReturn) => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(opsApi, "return").mockResolvedValue(data);
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
  };

  it("makes staff choose how the money was returned before recording the refund", async () => {
    const refundSpy = vi
      .spyOn(opsApi, "refundReturn")
      .mockResolvedValue(refundedReturn);
    renderReturn(approvedReturn);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /record refund/i }),
    );
    const select = screen.getByLabelText(/how was the money returned/i);
    expect(select).toHaveValue("");
    expect(
      [...(select as HTMLSelectElement).options].map((o) => o.textContent),
    ).toEqual(["Choose…", "Cash", "Bank transfer", "Store credit"]);

    await user.click(screen.getByRole("button", { name: /^record refund$/i }));
    expect(
      screen.getByText("Choose how the money was returned."),
    ).toBeInTheDocument();
    expect(refundSpy).not.toHaveBeenCalled();

    await user.selectOptions(select, "store_credit");
    expect(screen.queryByLabelText(/reference/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /one-use code for \$25\.00 that only this customer can use, valid for 12 months/i,
      ),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/note for the customer/i),
      "Sorry about the cover",
    );
    await user.click(screen.getByRole("button", { name: /^record refund$/i }));

    expect(refundSpy).toHaveBeenCalledWith(42, {
      method: "store_credit",
      reference: undefined,
      note: "Sorry about the cover",
    });
  });

  it("asks for an optional reference only for a bank transfer", async () => {
    const refundSpy = vi
      .spyOn(opsApi, "refundReturn")
      .mockResolvedValue({
        ...refundedReturn,
        refund_method: "bank_transfer",
        refund_reference: "ABA-1",
        store_credit: null,
      });
    renderReturn(approvedReturn);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /record refund/i }),
    );
    const select = screen.getByLabelText(/how was the money returned/i);
    await user.selectOptions(select, "cash");
    expect(screen.queryByLabelText(/reference/i)).not.toBeInTheDocument();
    await user.selectOptions(select, "bank_transfer");
    await user.type(screen.getByLabelText(/reference/i), "ABA-TX-998877");
    await user.click(screen.getByRole("button", { name: /^record refund$/i }));

    expect(refundSpy).toHaveBeenCalledWith(42, {
      method: "bank_transfer",
      reference: "ABA-TX-998877",
      note: undefined,
    });
  });

  it("shows the refund record: how, the store-credit code, who and when", async () => {
    renderReturn(refundedReturn);

    expect(await screen.findByText("Refund record")).toBeInTheDocument();
    expect(screen.getByText("Store credit")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "CREDIT-K7M2Q9XA" }),
    ).toHaveAttribute("href", "/admin/coupons?q=CREDIT-K7M2Q9XA");
    expect(screen.getByText(/By Demo Admin/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /record refund/i }),
    ).not.toBeInTheDocument();
  });

  it("says Not recorded for refunds made before records were kept", async () => {
    renderReturn({
      ...refundedReturn,
      refund_method: null,
      store_credit: null,
      refunded_by: null,
      refunded_at: null,
    });

    expect(await screen.findByText(/Not recorded/)).toBeInTheDocument();
  });

  it("StoreCreditsCard lists credits, with copy only for ones that can still be used", async () => {
    const credits: StoreCredit[] = [
      {
        id: 1,
        code: "CREDIT-ABCD-1234",
        amount_usd: "25.00",
        expires_at: "2027-10-16T08:00:00Z",
        used: false,
        expired: false,
        created_at: "2026-10-16T08:00:00Z",
      },
      {
        id: 2,
        code: "CREDIT-USED-0001",
        amount_usd: "5.00",
        expires_at: "2027-01-01T08:00:00Z",
        used: true,
        expired: false,
        created_at: "2026-01-01T08:00:00Z",
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
      expect(
        screen.getByRole("heading", { name: "Store credits" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("CREDIT-ABCD-1234")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /copy code CREDIT-ABCD-1234/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /copy code CREDIT-USED-0001/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Used")).toBeInTheDocument();
  });
});
