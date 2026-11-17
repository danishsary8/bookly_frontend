import { expect, test } from "@playwright/test";
import { noAxeViolations } from "./axe";

// Browser rendering and interaction smoke with synthetic API fixtures. Money rules run against PostgreSQL in backend tests.
for (const view of [{ width: 1280, theme: "light", lang: "en" }, { width: 390, theme: "dark", lang: "km" }] as const) {
  test(`referrals: ${view.width}px ${view.theme} ${view.lang}`, async ({ page, baseURL }) => {
    if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("This smoke test only runs on localhost.");
    await page.setViewportSize({ width: view.width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((settings) => {
      localStorage.setItem("bookly-theme-choice", settings.theme);
      localStorage.setItem("bookly-language", settings.lang);
      localStorage.setItem("bookly.session.customer", JSON.stringify({ token: "local-browser-fixture", expiresAt: null, user: { id: 100, name: "Reader", email: "reader@example.test", verified: true, email_verified: true, locale: settings.lang } }));
      localStorage.setItem("bookly.session.staff", JSON.stringify({ token: "local-staff-fixture", expiresAt: null, user: { id: 200, name: "Staff", email: "staff@example.test", role: "admin", two_factor_enabled: true } }));
    }, view);
    const balance = "0.00";
    let flags = { referrals: true };
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (!["localhost", "127.0.0.1"].includes(url.hostname)) return route.abort();
      if (!url.pathname.startsWith("/api/v1/")) return route.continue();
      const path = url.pathname.slice("/api/v1".length);
      let body: unknown = { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 20 } };
      if (path === "/shop/features") body = { data: flags };
      if (path === "/cart") body = { data: { id: 1, items: [], item_count: 0, subtotal_usd: "0.00", can_checkout: true } };
      if (path === "/store-rating") body = { data: { average: null, count: 0 } };
      if (path === "/delivery/options") body = { data: { areas: [], provinces: [], payment_methods: [] } };
      if (path === "/me/referrals") body = { data: { code: "ABCDEF1234567890", friend_discount_usd: "2.00", reward_usd: "2.00", balance_usd: balance, current_page: 1, last_page: 1, history: [{ id: 2, status: "qualified", reward_cents: 0, created_at: "2026-11-06", rewarded_at: null }] } };
      if (path === "/staff/referrals") body = { data: [{ id: 2, sharer_customer_id: 100, friend_customer_id: 101, order_id: 1, status: "qualified", reward_cents: 0, unrecovered_cents: 0 }], current_page: 1, last_page: 1, stats: { total: 1, rewarded: 0, credited_usd: "0.00", unrecovered_usd: "0.00" } };
      return route.fulfill({ json: body });
    });
    const overflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto("/account/referrals");
    await expect(page.locator('input[readonly]')).toHaveValue(/\?ref=ABCDEF1234567890$/);
    await overflow(); await noAxeViolations(page);
    await page.goto("/admin/referrals");
    await expect(page.getByRole("button", { name: "Void referral" })).toBeVisible();
    await overflow(); await noAxeViolations(page);
    flags = { referrals: false };
    await page.goto("/admin/referrals");
    await expect(page.getByRole("heading", { name: "Referrals are unavailable", exact: true })).toBeVisible();
    await expect(page.getByText(/REFERRALS_ENABLED|on Render/)).toHaveCount(0);
  });
}
