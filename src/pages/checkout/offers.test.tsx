import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { cartApi } from "@/api/endpoints/cart";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { Address, BookCard as Book, Cart, CheckoutPreview, CouponCheck, Customer, Order } from "@/api/types";
import { BookCard } from "@/components/catalog/BookCard";
import { Toaster } from "@/components/ui/toaster";
import { setCoupon } from "@/features/cart/couponStore";
import { cartTotals } from "@/features/offers/cartTotals";
import { setLanguage } from "@/i18n";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import CartPage from "@/pages/cart/CartPage";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmationPage from "./OrderConfirmationPage";

/* Automatic offers in the shop (backend docs/superpowers/specs/2026-10-31-offers-design.md 6.1-6.6, 8). */

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true };
const home: Address = { id: 11, label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", address_line2: null, city: "Phnom Penh", state: null, postal_code: null, country: "Cambodia", is_default: true };
const offer = { id: 3, type: "buy_n_percent" as const, min_quantity: 2, percent_off: "15.00", ends_at: null, target_label: "Sherlock Holmes", discount_usd: "3.00", discount_khr: "12300" };
const line = (id: number, title: string, price: string, inOffer: boolean) => ({
  id, book_variant_id: id, book: { id, title }, format: "paperback" as const, quantity: 1,
  unit_price_usd: price, unit_price_khr: "0", line_total_usd: price, line_total_khr: "0", issues: [], in_offer: inOffer,
});
// Spec example 1: Holmes A $10 + Holmes B $10 + cookbook $30, "Buy 2 Holmes, save 15%".
const cart: Cart = {
  id: 1,
  items: [line(1, "A Study in Scarlet", "10.00", true), line(2, "The Sign of the Four", "10.00", true), line(3, "Khmer Kitchen", "30.00", false)],
  item_count: 3,
  subtotal_usd: "50.00",
  subtotal_khr: "205000",
  can_checkout: true,
  pricing: {
    subtotal_usd: "50.00", subtotal_khr: "205000", discount_usd: "3.00", discount_khr: "12300",
    total_before_shipping_usd: "47.00", total_before_shipping_khr: "192700",
    offer, nudge: null,
    free_shipping: { threshold_usd: "50.00", threshold_khr: "205000", amount_needed_usd: "3.00", amount_needed_khr: "12300", is_free: false },
  },
};
const amount = (usd: string) => ({ usd, khr: "0" });
const preview: CheckoutPreview = {
  subtotal: amount("50.00"), discount: amount("3.00"), shipping_fee: amount("1.50"), tax: amount("0.00"), total: amount("48.50"),
  coupon_code: null, requires_shipping: true, delivery_area: "phnom_penh", can_checkout: true,
  applied: "offer", offer, coupon_not_used: null,
};
const order: Order = {
  id: 42, order_number: "BK-000042", status: "pending", payment_method: "cod",
  items: [{ id: 1, book_id: 1, title: "A Study in Scarlet", format: "paperback", quantity: 1, unit_price_usd: "10.00", subtotal_usd: "10.00" }],
  subtotal_usd: "50.00", discount_usd: "3.00", shipping_fee_usd: "1.50", tax_usd: "0.00", total_usd: "48.50", total_khr: "0",
  coupon_code: null, offer: { id: 3, name: "Buy 2 Holmes", min_quantity: 2, percent_off: "15.00" },
  shipping_address: { label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", city: "Phnom Penh", country: "Cambodia" },
};

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success/:id" element={<OrderConfirmationPage />} />
      </Routes>
      <Toaster />
    </>,
    { route },
  );

beforeEach(() => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
  vi.spyOn(cartApi, "preview").mockResolvedValue(preview);
  vi.spyOn(accountApi, "addresses").mockResolvedValue([home]);
  vi.spyOn(accountApi, "wishlist").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } } as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  setCoupon(null);
  setLanguage("en");
  clearSession("customer");
});

describe("Cart with an automatic offer", () => {
  it("shows one offer line, marks the covered lines and uses the API's free-delivery numbers", async () => {
    app("/cart");
    const summary = await screen.findByRole("complementary", { name: "Order summary" });
    expect(within(summary).getByText("Offer: buy 2, save 15%")).toBeInTheDocument();
    expect(within(summary).getByText("−$3.00")).toBeInTheDocument();
    expect(within(summary).getByText("$47.00")).toBeInTheDocument();
    expect(within(summary).getByText(/Add \$3\.00 more for FREE delivery/)).toBeInTheDocument();
    expect(screen.getAllByText("In offer")).toHaveLength(2);
  });

  it("nudges toward the offer with a link to those books", async () => {
    vi.spyOn(cartApi, "cart").mockResolvedValue({
      ...cart,
      items: [line(1, "A Study in Scarlet", "10.00", false)],
      item_count: 1,
      pricing: { ...cart.pricing!, offer: null, discount_usd: "0.00", nudge: { offer_id: 3, add_quantity: 1, percent_off: "15.00", target_label: "Sherlock Holmes" } },
    });
    app("/cart");
    expect(await screen.findByText(/Add 1 more book from Sherlock Holmes to save 15%/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the books" })).toHaveAttribute("href", "/books?q=Sherlock%20Holmes");
    expect(screen.queryByText(/Offer: buy/)).not.toBeInTheDocument();
  });

  it("says a valid coupon was not used when the offer saves more", async () => {
    const user = userEvent.setup();
    const check: CouponCheck = {
      code: "READ5", type: "fixed", value: "2.00", subtotal_usd: "50.00", discount_usd: "2.00", discount_khr: "8200",
      total_before_shipping_usd: "48.00", total_before_shipping_khr: "0",
      applied: "offer", offer, coupon_not_used: { code: "READ5", reason: "offer_better" },
      best_discount_usd: "3.00", best_discount_khr: "12300", best_total_before_shipping_usd: "47.00", best_total_before_shipping_khr: "0",
      free_shipping: cart.pricing!.free_shipping,
    };
    vi.spyOn(cartApi, "checkCoupon").mockResolvedValue(check);
    app("/cart");
    await user.type(await screen.findByLabelText("Coupon code"), "read5");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(/Your coupon READ5 wasn't used: the offer saves you more/)).toBeInTheDocument();
    const summary = screen.getByRole("complementary", { name: "Order summary" });
    expect(within(summary).getByText("Offer: buy 2, save 15%")).toBeInTheDocument();
    expect(within(summary).queryByText("Discount (READ5)")).not.toBeInTheDocument();
    expect(within(summary).getByText("$47.00")).toBeInTheDocument();
  });

  it("hides the free-delivery bar when the API says there is none (ebooks only)", async () => {
    vi.spyOn(cartApi, "cart").mockResolvedValue({ ...cart, pricing: { ...cart.pricing!, free_shipping: null } });
    app("/cart");
    await screen.findByText("Offer: buy 2, save 15%");
    expect(screen.queryByText(/FREE delivery/)).not.toBeInTheDocument();
  });

  it("shows the offer in Khmer", async () => {
    setLanguage("km");
    app("/cart");
    expect(await screen.findByText("ការផ្តល់ជូន៖ ទិញ 2 សន្សំ 15%")).toBeInTheDocument();
  });
});

describe("Checkout with an automatic offer", () => {
  it("shows the offer line, sends the offer it showed, and the confirmation names the offer", async () => {
    const user = userEvent.setup();
    const place = vi.spyOn(cartApi, "placeOrder").mockResolvedValue(order);
    app("/checkout");
    expect(await screen.findByText("Offer: buy 2, save 15%")).toBeInTheDocument();
    expect(screen.getByText("$48.50")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Place order/ }));
    await waitFor(() => expect(place).toHaveBeenCalled());
    expect(place.mock.calls[0][0]).toMatchObject({ offer_id: 3, address_id: home.id });
    expect(await screen.findByText("Offer: buy 2, save 15%")).toBeInTheDocument();
  });

  it("says when the coupon lost to the offer", async () => {
    setCoupon("READ5");
    vi.spyOn(cartApi, "preview").mockResolvedValue({ ...preview, coupon_not_used: { code: "READ5", reason: "offer_better" } });
    app("/checkout");
    expect(await screen.findByText(/Your coupon READ5 wasn't used/)).toBeInTheDocument();
  });

  it("shows the API's message when the offer ended before placing the order", async () => {
    const user = userEvent.setup();
    vi.spyOn(cartApi, "placeOrder").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "Invalid", fieldErrors: { offer_id: ["This offer has just ended. Check your new total, then place the order."] } }),
    );
    app("/checkout");
    await user.click(await screen.findByRole("button", { name: /Place order/ }));
    expect(await screen.findByText("This offer has just ended. Check your new total, then place the order.")).toBeInTheDocument();
  });

  it("sends no offer_id when no offer applies (older API or no offer)", async () => {
    const user = userEvent.setup();
    vi.spyOn(cartApi, "preview").mockResolvedValue({ ...preview, applied: undefined, offer: undefined, discount: amount("0.00"), total: amount("51.50") });
    const place = vi.spyOn(cartApi, "placeOrder").mockResolvedValue({ ...order, offer: null, discount_usd: "0.00" });
    app("/checkout");
    await user.click(await screen.findByRole("button", { name: /Place order/ }));
    await waitFor(() => expect(place).toHaveBeenCalled());
    expect(place.mock.calls[0][0]).not.toHaveProperty("offer_id");
  });
});

describe("Book card offer badge", () => {
  const book: Book = { id: 1, title: "A Study in Scarlet", authors: [], formats: ["paperback"], in_stock: true, price_from_usd: "10.00", price_from_khr: "41000", rating_avg: null, review_count: 0 };

  it("shows the badge only when the book has an offer and is in stock", () => {
    const { rerender } = renderWithProviders(<BookCard book={{ ...book, offer: { id: 3, min_quantity: 2, percent_off: "15.00", ends_at: null, target_label: null } }} />);
    expect(screen.getByText("Buy 2, save 15%")).toBeInTheDocument();
    rerender(<BookCard book={{ ...book, offer: null }} />);
    expect(screen.queryByText(/save 15%/)).not.toBeInTheDocument();
    rerender(<BookCard book={{ ...book, in_stock: false, offer: { id: 3, min_quantity: 2, percent_off: "15.00", ends_at: null, target_label: null } }} />);
    expect(screen.queryByText(/save 15%/)).not.toBeInTheDocument();
  });
});

describe("cartTotals", () => {
  const plain: Cart = { id: 1, items: [], item_count: 0, subtotal_usd: "25.98", subtotal_khr: "1", can_checkout: true };

  it("works exactly as before on an API without offers", () => {
    expect(cartTotals(plain, null)).toEqual({ discount: null, totalBeforeShipping: { usd: "25.98", khr: "1" }, freeShipping: undefined, couponNotUsed: null });
    const old: CouponCheck = { code: "WELCOME10", discount_usd: "2.59", discount_khr: "2", total_before_shipping_usd: "23.39", total_before_shipping_khr: "3" };
    expect(cartTotals(plain, old)).toMatchObject({
      discount: { kind: "coupon", code: "WELCOME10", amount: { usd: "2.59" } },
      totalBeforeShipping: { usd: "23.39" },
      freeShipping: undefined,
    });
  });

  it("uses the winner's numbers when the coupon wins", () => {
    const check: CouponCheck = {
      code: "READ10", discount_usd: "5.00", total_before_shipping_usd: "45.00", applied: "coupon", offer,
      best_discount_usd: "5.00", best_total_before_shipping_usd: "45.00", free_shipping: null,
    };
    expect(cartTotals(cart, check)).toMatchObject({ discount: { kind: "coupon", code: "READ10", amount: { usd: "5.00" } }, freeShipping: null, couponNotUsed: null });
  });
});
