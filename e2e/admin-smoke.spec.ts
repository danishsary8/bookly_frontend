import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Synthetic sessions only. All API requests, including mutations, stay in this browser.
async function prepareAdmin(page: Page, baseURL?: string) {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Run on localhost only.");
  const user = { id: 100, name: "Fixture Admin", email: "admin@example.test", role: "admin", two_factor_enabled: true };
  await page.addInitScript((user) => {
    window.addEventListener("error", (event) => console.log("ADMIN_ERROR_CAUSE", event.error?.cause?.stack ?? event.error?.stack));
    if (!localStorage.getItem("bookly.session.staff")) localStorage.setItem("bookly.session.staff", JSON.stringify({ token: "fixture-only", expiresAt: null, user }));
    localStorage.setItem("bookly-language", "en");
  }, user);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.text().includes("ADMIN_ERROR_CAUSE")) console.log(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  const period = { from: "2026-11-01", to: "2026-11-16", timezone: "Asia/Phnom_Penh" };
  const summary = { period, revenue: { gross_usd: "100.00", refunds_usd: "0.00", net_usd: "100.00" }, delivered_orders: 2, average_order_value_usd: "50.00", orders_placed: 3, orders_by_status: { delivered: 2, pending: 1 }, new_customers: 1, books_sold: 4, ebooks_sold: 1, best_sellers: [], top_categories: [], open_returns: 0, low_stock: [] };
  const requests = new Set<string>();
  let newsletterUnavailable = false;
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.replace(/^\/api\/v1/, "");
    requests.add(path);
    if (newsletterUnavailable && path.startsWith("/staff/newsletter/")) return route.fulfill({ status: 503, json: { message: "Newsletter temporarily unavailable." } });
    let body: unknown = { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 25, unread_count: 0 }, links: {} };
    if (path === "/staff/dashboard/summary") body = { data: summary };
    if (path === "/staff/dashboard/insights") body = { data: { period, trend: [], dead_stock: { days: 90, variants: 0, copies: 0, value_usd: "0.00", items: [] }, stock_value: { copies: 0, value_usd: "0.00" }, top_authors: [], provinces: [], promotions: { orders: 0, offer_orders: 0, offer_discount_usd: "0.00", coupon_orders: 0, coupon_discount_usd: "0.00", plain_orders: 0 }, repeat_customer_rate: { customers: 0, returning: 0, percent: 0 }, order_ratings: { average: null, count: 0 }, attention: { pending_orders: 1, open_returns: 0, low_stock: 0, waiting_orders: 0, recent_reviews: 0, open_chats: 0 }, activity: [] } };
    if (path === "/staff/dashboard/counts") body = { data: { pending_orders: 1, open_returns: 0, low_stock: 0 } };
    if (path === "/staff/health") body = { status: "ok", checks: { database: { status: "ok" }, queue: { status: "ok", pending: 0, failed: 0, oldest_pending_seconds: null }, telegram_bot: { status: "off" } } };
    if (path === "/staff/settings/payments") body = { data: { khqr_enabled: true, khqr_discount_percent: "3", cod_max_order_usd: "80" } };
    if (path === "/staff/newsletter/summary") body = { confirmed: 0, pending: 0, unsubscribed: 0, total: 0, daily_limit: 100 };
    if (path.startsWith("/staff/assistant/")) body = { data: { data: [], current_page: 1, last_page: 1 } };
    if (path === "/shop/features") body = { data: { referrals: true } };
    if (path === "/staff/referrals") body = { data: [], current_page: 1, last_page: 1, stats: { total: 0, rewarded: 0, credited_usd: "0.00", unrecovered_usd: "0.00" } };
    if (/^\/staff\/(books|orders|returns|customers)\/\d+$/.test(path)) return route.fulfill({ status: 404, json: { message: "Not found." } });
    // Reports have separate, substantial contracts; verify their error recovery here.
    if (path.startsWith("/staff/reports/")) return route.fulfill({ status: 503, json: { message: "Fixture report unavailable." } });
    return route.fulfill({ json: body });
  });
  return { user, errors, requests, setNewsletterUnavailable: (value: boolean) => { newsletterUnavailable = value; } };
}

test("admin routes load without module errors or crashes", async ({ page, baseURL }) => {
  test.setTimeout(360_000);
  const { errors } = await prepareAdmin(page, baseURL);
  const routes = ["", "/reports", "/orders", "/returns", "/customers", "/support", "/reviews", "/ratings", "/assistant/knowledge", "/coupons", "/offers", "/promotions", "/rewards", "/gifts", "/reading-lists", "/collections", "/books", "/books/new", "/stock", "/authors", "/categories", "/publishers", "/series", "/trash", "/newsletter", "/referrals", "/members", "/exchange-rates", "/audit-log", "/purchases", "/security", "/orders/999", "/returns/999", "/customers/999"];
  const findings: string[] = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of routes) {
      console.log(`Checking ${width}/admin${path}`);
      await page.goto(`/admin${path}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator("main").getByRole("status").filter({ hasText: /^Loading/ })).toHaveCount(0);
      if (await page.getByText("Something went wrong", { exact: true }).count() && !["/reports", "/orders/999", "/returns/999", "/customers/999"].includes(path)) findings.push(`${width}${path}: error boundary`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) findings.push(`${width}${path}: horizontal overflow`);
      if (await page.locator("vite-error-overlay").count()) findings.push(`${width}${path}: Vite error overlay`);
      findings.push(...errors.splice(0).map((error) => `${width}${path}: ${error}`));
      if (path === "") await page.screenshot({ path: `overnight-screenshots/admin-audit-${width}.png`, fullPage: true });
    }
  }
  expect(findings).toEqual([]);
});

test("admin controls, newsletter recovery and staff dashboard isolation", async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const { errors, requests, user, setNewsletterUnavailable } = await prepareAdmin(page, baseURL);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/admin/reports");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("alert")).toContainText("Fixture report unavailable.", { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "overnight-screenshots/admin-reports-phone.png", fullPage: true });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const changedPeriod = page.waitForRequest((request) => request.url().includes("/staff/dashboard/summary") && new URL(request.url()).searchParams.get("period") === "7d");
  await page.getByRole("radio", { name: "7 days", exact: true }).click();
  await changedPeriod;
  await expect(page).toHaveURL(/period=7d/);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  setNewsletterUnavailable(true);
  await page.goto("/admin/newsletter");
  await expect(page.getByRole("heading", { name: "Could not load campaigns" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/No newsletter campaigns created yet/)).toHaveCount(0);
  await page.screenshot({ path: "overnight-screenshots/admin-newsletter-error.png", fullPage: true });
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Dark theme", exact: true }).click();
    const result = await new AxeBuilder({ page }).include(".admin-page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map((violation) => violation.id), theme).toEqual([]);
  }
  setNewsletterUnavailable(false);
  await page.getByRole("button", { name: "Try again", exact: true }).first().click();
  await expect(page.getByText("Confirmed subscribers")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText(/No newsletter campaigns created yet/)).toBeVisible();

  await page.evaluate((user) => localStorage.setItem("bookly.session.staff", JSON.stringify({ token: "fixture-staff-only", expiresAt: null, user: { ...user, role: "staff" } })), user);
  requests.clear();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect([...requests].filter((path) => ["/staff/dashboard/summary", "/staff/dashboard/insights", "/staff/health"].includes(path))).toEqual([]);
  expect(errors).toEqual([]);
});
