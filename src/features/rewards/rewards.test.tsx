import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { cartApi } from "@/api/endpoints/cart";
import { deliveryApi } from "@/api/endpoints/delivery";
import { rewardsApi, type RewardCoupon } from "@/api/endpoints/rewards";
import { clearSession, setSession } from "@/api/session";
import type { Address, Cart, CheckoutPreview, Customer } from "@/api/types";
import { getCoupon, setCoupon } from "@/features/cart/couponStore";
import { setLanguage } from "@/i18n";
import { renderWithProviders } from "@/test/render";
import CartPage from "@/pages/cart/CartPage";
import CheckoutPage from "@/pages/checkout/CheckoutPage";
import CouponsPage from "@/pages/account/CouponsPage";

/* KHQR discount, cash on delivery limit and next-order rewards in the shop (owner 2026-11-12). */

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true };
const home: Address = { id: 11, label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12", address_line2: null, city: "Phnom Penh", state: null, postal_code: null, country: "Cambodia", is_default: true };
const line = { id: 1, book_variant_id: 1, book: { id: 1, title: "Angkor at Dawn" }, format: "paperback" as const, quantity: 1, unit_price_usd: "10.00", unit_price_khr: "0", line_total_usd: "10.00", line_total_khr: "0", issues: [] };
const cart: Cart = { id: 1, items: [line], item_count: 1, subtotal_usd: "10.00", subtotal_khr: "41000", can_checkout: true, khqr_discount_percent: "3.00", reward: { percent_off: "10.00", max_discount_usd: "5.00", valid_days: 30, min_books: 2, min_amount_usd: null, add_books: 1, earns: false } };
const amount = (usd: string) => ({ usd, khr: "0" });
const preview = (method: "cod" | "khqr" | null | undefined, codAllowed = true): CheckoutPreview => ({
  has_delivery_address: true, subtotal: amount("10.00"), shipping_fee: amount("1.50"), tax: amount("0.00"),
  discount: amount(method === "khqr" ? "0.30" : "0.00"), khqr_discount: amount(method === "khqr" ? "0.30" : "0.00"), khqr_saving: amount("0.30"), khqr_discount_percent: "3.00",
  total: amount(method === "khqr" ? "11.20" : "11.50"), cod_allowed: codAllowed, cod_max: amount("80.00"),
  coupon_code: null, requires_shipping: true, delivery_area: "phnom_penh", can_checkout: true, applied: null, offer: null, coupon_not_used: null,
});
const coupon = (patch: Partial<RewardCoupon> = {}): RewardCoupon => ({
  id: 5, code: "THANKS-K7M2Q9", percent_off: "10.00", max_discount_usd: "5.00", expires_at: "2026-12-12T16:59:59Z", used: false, expired: false, is_usable: true,
  earned_by_order: { id: 40, order_number: "BK-000040" }, created_at: "2026-11-12T00:00:00Z", ...patch,
});

const app = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/account/coupons" element={<CouponsPage />} />
    </Routes>,
    { route },
  );

beforeEach(() => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
  vi.spyOn(cartApi, "preview").mockImplementation(async (_c, _a, _area, _credit, method) => preview(method));
  vi.spyOn(accountApi, "addresses").mockResolvedValue([home]);
  vi.spyOn(accountApi, "wishlist").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } } as never);
  vi.spyOn(deliveryApi, "options").mockResolvedValue({ payment_methods: [{ code: "cod" }, { code: "khqr", mode: "test", pay_minutes: 15 }] } as never);
  vi.spyOn(rewardsApi, "myCoupons").mockResolvedValue([]);
});
afterEach(() => {
  vi.restoreAllMocks();
  setCoupon(null);
  setLanguage("en");
  clearSession("customer");
});

describe("Cart: reward nudge, KHQR hint and a saved reward coupon", () => {
  it("says how many more books earn the reward and what KHQR saves", async () => {
    app("/cart");
    expect(await screen.findByText("Add 1 more book to get 10% off your next order (up to $5.00)")).toBeInTheDocument();
    expect(screen.getByText("Pay by KHQR at checkout and save 3%")).toBeInTheDocument();
  });

  it("offers the customer's reward coupon in one tap", async () => {
    vi.spyOn(rewardsApi, "myCoupons").mockResolvedValue([coupon({ id: 4, code: "THANKS-OLD", is_usable: false, used: true }), coupon()]);
    vi.spyOn(cartApi, "checkCoupon").mockResolvedValue({ code: "THANKS-K7M2Q9", type: "percentage", value: "10.00", subtotal_usd: "10.00", discount_usd: "1.00", discount_khr: "4100", total_before_shipping_usd: "9.00", total_before_shipping_khr: "0", applied: "coupon", best_discount_usd: "1.00", best_discount_khr: "4100", best_total_before_shipping_usd: "9.00", best_total_before_shipping_khr: "0" } as never);
    const user = userEvent.setup();
    app("/cart");
    const summary = await screen.findByRole("complementary", { name: "Order summary" });
    await user.click(await within(summary).findByRole("button", { name: "Apply coupon THANKS-K7M2Q9" }));
    expect(getCoupon()).toBe("THANKS-K7M2Q9");
    expect(await within(summary).findByRole("button", { name: "Remove coupon THANKS-K7M2Q9" })).toBeInTheDocument();
  });
});

describe("Checkout: KHQR saving and the cash on delivery limit", () => {
  it("tags KHQR with its saving and shows the KHQR discount once chosen", async () => {
    const user = userEvent.setup();
    app("/checkout");
    expect((await screen.findAllByText("Save $0.30")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("radio", { name: /Bakong KHQR/ }));
    expect(await screen.findByText("KHQR discount (3%)")).toBeInTheDocument();
    expect(await screen.findByText("$11.20")).toBeInTheDocument();
    expect(cartApi.preview).toHaveBeenLastCalledWith(null, 11, undefined, false, "khqr");
  });

  it("switches to KHQR when the order is over the cash on delivery limit", async () => {
    vi.spyOn(cartApi, "preview").mockImplementation(async (_c, _a, _area, _credit, method) => preview(method, false));
    app("/checkout");
    const cod = await screen.findByRole("radio", { name: /Cash on delivery/ });
    await waitFor(() => expect(cod).toBeDisabled());
    expect(screen.getByText("For orders up to $80.00. Please pay this order by KHQR.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Bakong KHQR/ })).toBeChecked();
  });
});

describe("My coupons", () => {
  it("lists usable coupons with a way to use them, and used ones as used", async () => {
    vi.spyOn(rewardsApi, "myCoupons").mockResolvedValue([coupon(), coupon({ id: 4, code: "THANKS-OLD", is_usable: false, used: true, earned_by_order: { id: 30, order_number: "BK-000030" } })]);
    app("/account/coupons");
    expect(await screen.findByText("THANKS-K7M2Q9")).toBeInTheDocument();
    expect(screen.getByText("Ready to use")).toBeInTheDocument();
    expect(screen.getByText("Used")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Use in cart/ })).toHaveLength(1);
    expect(screen.getByText(/Up to \$5\.00 off · Use by .* · From order BK-000040/)).toBeInTheDocument();
  });

  it("explains how to earn one when there are none", async () => {
    app("/account/coupons");
    expect(await screen.findByText(/No coupons yet/)).toBeInTheDocument();
  });
});
