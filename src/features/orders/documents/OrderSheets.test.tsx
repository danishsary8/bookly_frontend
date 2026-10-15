import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceSheet } from "./OrderSheets";
import type { OrderDocument } from "@/api/types";

const baseDoc: OrderDocument = {
  id: 1,
  order_number: "ORD-2026-0001",
  status: "pending",
  placed_at: "2026-10-15T10:00:00Z",
  delivered_at: null,
  delivery_note: null,
  payment_method: "cod",
  payment_status: "pending",
  customer: { name: "Sophea", email: "sophea@example.com", phone: "+85512345678" },
  shipping_address: {
    recipient_name: "Sophea",
    phone: "+85512345678",
    address_line1: "St. 2004",
    address_line2: undefined,
    city: "Phnom Penh",
    state: undefined,
    postal_code: "12000",
    country: "Cambodia",
  },
  items: [
    {
      id: 101,
      title: "Building Microservices",
      authors: ["Sam Newman"],
      format: "paperback",
      is_digital: false,
      sku: "BK-001",
      isbn: "9781492034025",
      quantity: 2,
      unit_price_usd: "15.00",
      subtotal_usd: "30.00",
    },
  ],
  subtotal_usd: "30.00",
  discount_usd: "0.00",
  coupon_code: null,
  shipping_fee_usd: "2.00",
  tax_usd: "0.00",
  total_usd: "32.00",
  refunded_usd: "0.00",
  amount_to_collect_usd: "32.00",
  khr: {
    rate: "4000",
    rate_effective_at: "2026-10-15T00:00:00Z",
    total: "128000",
    amount_to_collect: "128000",
  },
};

describe("InvoiceSheet riel per line", () => {
  it("shows riel equivalent under line USD amount when exchange rate is present", () => {
    render(<InvoiceSheet doc={baseDoc} />);
    // Line subtotal $30.00 at rate 4000 should show ≈ 120,000 ៛
    expect(screen.getByText(/≈\s*120,000\s*៛/)).toBeInTheDocument();
  });

  it("shows nothing when no exchange rate was in force at the order date", () => {
    const docWithoutKhr = { ...baseDoc, khr: null };
    render(<InvoiceSheet doc={docWithoutKhr} />);
    expect(screen.queryByText(/≈.*៛/)).not.toBeInTheDocument();
  });
});
