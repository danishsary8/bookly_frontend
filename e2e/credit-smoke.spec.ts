import { expect, test } from "@playwright/test";
import { noAxeViolations } from "./axe";

// Browser rendering and interaction smoke with synthetic API fixtures. Money rules run against PostgreSQL in backend tests.
for (const view of [{ width: 1280, theme: "light", lang: "en" }, { width: 390, theme: "dark", lang: "km" }] as const) {
  test(`gift cards and referrals: ${view.width}px ${view.theme} ${view.lang}`, async ({ page, baseURL }) => {
    if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("This smoke test only runs on localhost.");
    await page.setViewportSize({ width: view.width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((settings) => {
      localStorage.setItem("bookly-theme", settings.theme);
      localStorage.setItem("bookly-language", settings.lang);
      localStorage.setItem("bookly.session.customer", JSON.stringify({ token: "local-browser-fixture", expiresAt: null, user: { id: 100, name: "Reader", email: "reader@example.test", verified: true, email_verified: true, locale: settings.lang } }));
      localStorage.setItem("bookly.session.staff", JSON.stringify({ token: "local-staff-fixture", expiresAt: null, user: { id: 200, name: "Staff", email: "staff@example.test", role: "admin", two_factor_enabled: true } }));
    }, view);
    let balance = "0.00";
    let flags = { gift_cards: true, referrals: true };
    const card = { id: 1, amount_usd: "10.00", recipient_name: "Reader", recipient_email: "reader@example.test", message: null, send_on: "2026-11-06", status: "pending_payment", last_four: "ABCD", expires_at: null, can_reveal: false, email_sent_at: null, email_failed_at: null };
    let bought = false;
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
      if (path === "/me/gift-cards") {
        if (route.request().method() === "POST") { bought = true; body = { data: card }; }
        else body = { data: bought ? [card] : [], balance_usd: balance, current_page: 1, last_page: 1 };
      }
      if (path === "/me/gift-cards/redeem") { balance = "10.00"; body = { data: { balance_usd: balance } }; }
      if (path === "/me/gift-cards/1/payment") body = { data: card, payment: { qr_payload: "local-test-only", expires_at: "2026-11-06T12:00:00Z", mode: "test" } };
      if (path === "/me/referrals") body = { data: { code: "ABCDEF1234567890", friend_discount_usd: "2.00", reward_usd: "2.00", balance_usd: balance, current_page: 1, last_page: 1, history: [{ id: 2, status: "qualified", reward_cents: 0, created_at: "2026-11-06", rewarded_at: null }] } };
      if (path === "/staff/gift-cards") body = { data: [{ ...card, buyer_customer_id: 100, amount_cents: 1000, paid_at: null }], current_page: 1, last_page: 1, totals: { sold_usd: "0.00", redeemed_usd: "0.00", outstanding_usd: balance, refund_review_usd: "0.00" } };
      if (path === "/staff/referrals") body = { data: [{ id: 2, sharer_customer_id: 100, friend_customer_id: 101, order_id: 1, status: "qualified", reward_cents: 0, unrecovered_cents: 0 }], current_page: 1, last_page: 1, stats: { total: 1, rewarded: 0, credited_usd: "0.00", unrecovered_usd: "0.00" } };
      return route.fulfill({ json: body });
    });
    const overflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto("/account/gift-cards");
    await expect(page.locator("#buy-title")).toBeVisible();
    await page.locator('input[name="name"]').focus();
    await page.keyboard.press("Tab");
    await expect(page.locator('input[name="email"]')).toBeFocused();
    await page.locator('input[name="name"]').fill("Reader");
    await page.locator('input[name="email"]').fill("reader@example.test");
    await page.locator('form').filter({ has: page.locator('input[name="name"]') }).getByRole("button", { name: view.lang === "en" ? "Continue to KHQR" : "បន្តទៅ KHQR" }).click();
    await expect(page.getByText(view.lang === "en" ? /Test mode: gift cards cannot be activated/ : /របៀបសាកល្បង៖/)).toBeVisible();
    await overflow(); await noAxeViolations(page);
    await page.goto("/account/referrals");
    await expect(page.locator('input[readonly]')).toHaveValue(/\?ref=ABCDEF1234567890$/);
    await overflow(); await noAxeViolations(page);
    await page.goto("/admin/gift-cards");
    await expect(page.getByRole("button", { name: "Cancel card" })).toBeVisible();
    await overflow(); await noAxeViolations(page);
    await page.goto("/admin/referrals");
    await expect(page.getByRole("button", { name: "Void referral" })).toBeVisible();
    await overflow(); await noAxeViolations(page);
    flags = { gift_cards: false, referrals: false };
    await page.goto("/admin/gift-cards");
    await expect(page.getByText("Turned off: set GIFT_CARDS_ENABLED=true on Render when ready.")).toBeVisible();
  });
}
