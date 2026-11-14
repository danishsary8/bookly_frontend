import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { getCoupon, setCoupon } from "@/features/cart/couponStore";
import { clearCustomerCache } from "./customerCache";

it("removes private data when customers switch accounts, preserving public and staff data", () => {
  const client = new QueryClient();
  const privateRoots = ["account", "cart", "orders", "returns", "my-reviews", "ebooks", "stock-alerts", "payments", "reading-lists", "support", "support-orders", "order-rating"];
  for (const root of [...privateRoots, "catalog", "staff"]) client.setQueryData([root, 1], { private: true });
  setCoupon("CUSTOMER-ONLY");
  clearCustomerCache(client);
  for (const root of privateRoots) expect(client.getQueryData([root, 1])).toBeUndefined();
  expect(client.getQueryData(["catalog", 1])).toBeDefined();
  expect(client.getQueryData(["staff", 1])).toBeDefined();
  expect(getCoupon()).toBeNull();
  client.clear();
});
