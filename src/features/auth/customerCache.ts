import type { QueryClient } from "@tanstack/react-query";
import { setCoupon } from "@/features/cart/couponStore";

const CUSTOMER_QUERY_ROOTS = new Set([
  "cart", "account", "orders", "returns", "my-reviews", "ebooks", "stock-alerts",
  "payments", "reading-lists", "support", "support-orders", "order-rating",
]);

/** Remove private data (and in-flight requests) before another customer uses this browser. */
export function clearCustomerCache(client: QueryClient) {
  client.removeQueries({ predicate: (query) => CUSTOMER_QUERY_ROOTS.has(String(query.queryKey[0])) });
  setCoupon(null);
}
