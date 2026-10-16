import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { cartApi } from "@/api/endpoints/cart";
import { ordersApi } from "@/api/endpoints/orders";
import { setSession } from "@/api/session";
import type { Address, Cart, CheckoutPreview, Customer, Order } from "@/api/types";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { CAMBODIA_PROVINCES, findProvince } from "@/lib/provinces";
import { renderWithProviders } from "@/test/render";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmationPage from "./OrderConfirmationPage";

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true };
const home: Address = {
  id: 11,
  label: "Home",
  recipient_name: "Sok Dara",
  phone: "012345678",
  address_line1: "House 12, St 240",
  address_line2: null,
  city: "Phnom Penh",
  state: null,
  postal_code: null,
  country: "Cambodia",
  is_default: true,
};

const cart: Cart = {
  id: 1,
  items: [{ id: 5, book_variant_id: 3, book: { id: 1, title: "The Mekong Letters" }, format: "paperback", quantity: 2, unit_price_usd: "25.00", unit_price_khr: "102500", line_total_usd: "50.00", line_total_khr: "205000", issues: [] }],
  item_count: 2,
  subtotal_usd: "50.00",
  subtotal_khr: "205000",
  can_checkout: true,
};

const amount = (usd: string) => ({ usd, khr: String(Math.round(Number(usd) * 4100)) });

describe("Delivery provinces and helpers", () => {
  it("contains all 25 provinces of Cambodia with metadata", () => {
    expect(CAMBODIA_PROVINCES).toHaveLength(25);
    const pp = findProvince("Phnom Penh");
    expect(pp).toBeDefined();
    expect(pp?.area).toBe("phnom_penh");
    expect(pp?.feeUsd).toBe("1.50");

    const mondul = findProvince("Mondulkiri");
    expect(mondul?.feeUsd).toBe("3.50");
    expect(mondul?.daysMin).toBe(3);

    const khmerSr = findProvince("សៀមរាប");
    expect(khmerSr?.code).toBe("siem_reap");
  });

  it("renders FreeShippingBar in progress and unlocked states", () => {
    // Under threshold ($30 / $50)
    const { rerender } = renderWithProviders(<FreeShippingBar subtotalUsd="30.00" thresholdUsd="50.00" />);
    expect(screen.getByText(/Add \$20\.00 more for FREE delivery/)).toBeInTheDocument();

    // Meeting threshold ($50 / $50)
    rerender(<FreeShippingBar subtotalUsd="50.00" thresholdUsd="50.00" />);
    expect(screen.getByText(/You've unlocked FREE delivery!/)).toBeInTheDocument();
  });
});

describe("CheckoutPage with free delivery and estimated dates", () => {
  it("displays free delivery badge and estimated delivery date range", async () => {
    setSession("customer", { token: "t", expiresAt: null, user: customer });
    vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
    vi.spyOn(accountApi, "addresses").mockResolvedValue([home]);
    vi.spyOn(accountApi, "wishlist").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } } as never);

    const freePreview: CheckoutPreview = {
      subtotal: amount("50.00"),
      discount: amount("0.00"),
      shipping_fee: amount("0.00"),
      tax: amount("0.00"),
      total: amount("50.00"),
      coupon_code: null,
      requires_shipping: true,
      delivery_area: "phnom_penh",
      can_checkout: true,
      is_free_shipping: true,
      free_shipping_threshold: amount("50.00"),
      amount_needed_for_free_shipping: amount("0.00"),
      province_code: "phnom_penh",
      province_name: "Phnom Penh",
      estimated_delivery: {
        days_min: 1,
        days_max: 2,
        delivery_time_en: "1 working day",
        delivery_time_km: "១ ថ្ងៃធ្វើការ",
        earliest_date: "2026-10-17",
        latest_date: "2026-10-19",
        formatted: "1 working day (Sat, 17 Oct – Mon, 19 Oct)",
      },
    };

    vi.spyOn(cartApi, "preview").mockResolvedValue(freePreview);

    renderWithProviders(
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>,
      { route: "/checkout" },
    );

    const summary = await screen.findByRole("complementary", { name: "Order total" });
    expect(await within(summary).findByText("Delivery (Phnom Penh)")).toBeInTheDocument();
    expect(within(summary).getByText("$0.00")).toBeInTheDocument();
    expect(within(summary).getByText("Free")).toBeInTheDocument();

    expect(await screen.findByText(/Phnom Penh · 1 working day \(Sat, 17 Oct – Mon, 19 Oct\)/)).toBeInTheDocument();
    expect(within(summary).getByText(/Est\. delivery: 1 working day \(Sat, 17 Oct – Mon, 19 Oct\)/)).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage with estimated delivery", () => {
  it("renders estimated delivery in order confirmation header", async () => {
    const confirmedOrder: Order = {
      id: 99,
      order_number: "ORD-20261016-DELIV",
      status: "pending",
      payment_method: "cod",
      items: [{ id: 1, title: "Cambodia History", quantity: 1, unit_price_usd: "50.00", subtotal_usd: "50.00" }],
      subtotal_usd: "50.00",
      discount_usd: "0.00",
      shipping_fee_usd: "0.00",
      tax_usd: "0.00",
      total_usd: "50.00",
      total_khr: "205000",
      shipping_address: { recipient_name: "Sok", phone: "012345", address_line1: "St 1", city: "Phnom Penh", country: "Cambodia" },
      is_free_shipping: true,
      estimated_delivery: {
        days_min: 1,
        days_max: 2,
        delivery_time_en: "1 working day",
        delivery_time_km: "១ ថ្ងៃធ្វើការ",
        earliest_date: "2026-10-17",
        latest_date: "2026-10-19",
        formatted: "1 working day (Sat, 17 Oct)",
      },
      placed_at: "2026-10-16T09:00:00Z",
    };

    vi.spyOn(ordersApi, "order").mockResolvedValue(confirmedOrder);

    renderWithProviders(
      <Routes>
        <Route path="/checkout/success/:id" element={<OrderConfirmationPage />} />
      </Routes>,
      {
        route: "/checkout/success/99",
        locationState: { order: confirmedOrder },
      },
    );

    expect(await screen.findByText(/Est\. delivery: 1 working day \(Sat, 17 Oct\)/)).toBeInTheDocument();
  });
});
