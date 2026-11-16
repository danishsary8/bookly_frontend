import type { Page } from "@playwright/test";
const period = { from: "2026-10-18", to: "2026-11-16", timezone: "Asia/Phnom_Penh" };
const previous = { from: "2026-09-18", to: "2026-10-17", timezone: "Asia/Phnom_Penh" };
export const summary = {
  period, revenue: { gross_usd: "128.05", refunds_usd: "27.00", net_usd: "101.05", net_khr: "414305" },
  delivered_orders: 5, average_order_value_usd: "25.61", average_order_value_khr: "105001", orders_placed: 106,
  orders_by_status: { pending: 10, paid: 12, processing: 16, shipped: 20, delivered: 40, cancelled: 7, returned: 1 },
  new_customers: 14, books_sold: 42, ebooks_sold: 8, open_returns: 1,
  best_sellers: [{ book_id: 1, title: "The Little Prince", copies_sold: 12, sales_usd: "96.00", sales_khr: "393600" }, { book_id: 2, title: "A Reader's Guide to Cambodia", copies_sold: 7, sales_usd: "84.00" }],
  top_categories: [{ category_id: 1, name: "Literature & fiction", copies_sold: 19, sales_usd: "180.00" }],
  low_stock: [{ book_variant_id: 1, book_id: 1, title: "The Little Prince", format: "paperback", sku: "PRINCE-PB", stock_quantity: 2, low_stock_threshold: 5 }],
  comparison: { period: previous, revenue: { gross_usd: "124.44", refunds_usd: "0.00", net_usd: "124.44" }, delivered_orders: 4, average_order_value_usd: "24.89", orders_placed: 6, new_customers: 4, change_percent: { gross_revenue: 2.9, refunds: 100, net_revenue: -18.8, delivered_orders: 25, average_order_value: 2.9, orders_placed: 1666.7, new_customers: 250 } },
};
export const insights = {
  period,
  trend: Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 9, 18 + index)).toISOString().slice(0, 10),
    previous_date: new Date(Date.UTC(2026, 8, 18 + index)).toISOString().slice(0, 10),
    net_revenue_usd: String(index % 7 === 0 ? 20.21 : 0), previous_net_revenue_usd: String(index % 5 === 0 ? 18 : 1),
    orders_placed: index % 8 === 0 ? 23 : 1, previous_orders_placed: index % 6 === 0 ? 2 : 0,
    average_order_usd: String(index % 7 === 0 ? 25.61 : 0), previous_average_order_usd: "24.89",
    new_customers: index % 4 === 0 ? 2 : 0, previous_new_customers: index % 9 === 0 ? 1 : 0,
    books_sold: index % 3 + 1, ebooks_sold: index % 4 === 0 ? 1 : 0,
  })),
  dead_stock: { days: 90, variants: 2, copies: 10, value_usd: "80.00", value_khr: "328000", items: [{ book_variant_id: 3, book_id: 3, title: "Treasure Island", format: "paperback", sku: "ISLAND-PB", stock_quantity: 5, value_usd: "40.00", last_sold_at: null }] },
  stock_value: { copies: 240, value_usd: "1920.00", value_khr: "7872000", basis: "selling_price" },
  top_authors: [{ author_id: 1, name: "Antoine de Saint-Exupéry", copies_sold: 12, sales_usd: "96.00", sales_khr: "393600" }],
  provinces: [{ code: "phnom_penh", name: "Phnom Penh", name_km: null, orders: 70, total_usd: "400.00", total_khr: "1640000" }],
  promotions: { orders: 106, offer_orders: 20, offer_discount_usd: "12.00", coupon_orders: 10, coupon_discount_usd: "5.00", gift_orders: 2, plain_orders: 76 },
  repeat_customer_rate: { customers: 32, returning: 12, percent: 37.5 },
  cart_reminder_recovery: { sent: 20, recovered: 3, percent: 15 },
  payment_methods: [{ method: "khqr", orders: 80, total_usd: "700.00", percent: 75.5 }, { method: "cod", orders: 26, total_usd: "200.00", percent: 24.5 }],
  attention: { pending_orders: 10, open_returns: 1, low_stock: 2, waiting_orders: 3, recent_reviews: 5, open_chats: 2 },
  activity: [{ id: 1, action: "order.updated", entity_type: "order", entity_id: 123, staff_name: "Dara", created_at: "2026-11-16T03:00:00Z" }],
  order_ratings: { average: 4.7, count: 23 }, delivery_areas: { phnom_penh: 70, provinces: 32, unknown: 4 },
};

export async function prepareDashboard(page: Page, baseURL?: string) {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Local fixture test only.");
  await page.addInitScript(() => {
    localStorage.setItem("bookly.session.staff", JSON.stringify({ token: "dashboard-fixture-only", expiresAt: null, user: { id: 100, name: "Demo Admin", email: "admin@example.test", role: "admin", two_factor_enabled: true } }));
    localStorage.setItem("bookly-language", "en");
  });
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.replace(/^\/api\/v1/, "");
    if (route.request().method() !== "GET") writes.push(path);
    let body: unknown = { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, unread_count: 0 }, links: {} };
    if (path === "/staff/dashboard/summary") body = { data: summary };
    if (path === "/staff/dashboard/insights") body = { data: insights };
    if (path === "/staff/dashboard/sales") body = { data: insights.trend.map((day) => ({ date: day.date, orders_placed: day.orders_placed, gross_revenue_usd: day.net_revenue_usd, refunds_usd: "0.00", net_revenue_usd: day.net_revenue_usd })) };
    if (path === "/staff/dashboard/counts") body = { data: insights.attention };
    if (path === "/staff/orders") body = { data: [{ id: 123, order_number: "BK-2026-00123", status: "pending", payment_method: "cod", total_usd: "25.61", allowed_next_statuses: ["processing"] }], meta: { current_page: 1, last_page: 1, total: 1, per_page: 5 }, links: {} };
    if (path === "/staff/health") body = { status: "ok", checks: { database: { status: "ok" }, queue: { status: "ok", pending: 0, failed: 0, oldest_pending_seconds: null }, telegram_bot: { status: "ok" }, payments: { mode: "bakong", status: "ok", token_expires_at: null, last_check_at: null } } };
    return route.fulfill({ json: body });
  });
  return { errors, writes };
}

