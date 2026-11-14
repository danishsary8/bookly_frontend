import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Synthetic customer only: every API request is intercepted, including mutations.
test("account routes render and remain usable on a laptop", async ({ page, baseURL }) => {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Run this fixture test on localhost only.");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const customer = { id: 100, name: "Test Reader", email: "reader@example.test", verified: true, email_verified: true, has_password: true, locale: "en", created_at: "2026-01-01T00:00:00Z", phone: "012345678", newsletter_subscribed: true, price_drop_alerts: true, cart_reminders: false, telegram_connected: false, connected: { google: false, facebook: false } };
  await page.addInitScript((user) => {
    localStorage.setItem("bookly-language", "en");
    localStorage.setItem("bookly.session.customer", JSON.stringify({ token: "local-fixture-only", expiresAt: null, user }));
  }, customer);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith("/api/v1/")) return route.continue();
    const path = url.pathname.slice("/api/v1".length);
    let body: unknown = { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 20, from: null, to: null }, links: {} };
    if (path === "/me") body = { data: customer };
    if (path === "/shop/features") body = { data: { gift_cards: true, referrals: true } };
    if (path === "/cart") body = { data: { id: 1, items: [], item_count: 0, subtotal_usd: "0.00", can_checkout: true } };
    if (path === "/store-rating") body = { data: { average: null, count: 0 } };
    if (path === "/delivery/options") body = { data: { areas: [], provinces: [], payment_methods: [] } };
    if (path === "/me/ebook-devices") body = { data: [], meta: { max_devices: 3, next_removal_at: null } };
    if (path === "/me/gift-cards") body = { data: [], balance_usd: "0.00", current_page: 1, last_page: 1 };
    if (path === "/me/referrals") body = { data: { code: "TESTREFERRAL", friend_discount_usd: "2.00", reward_usd: "2.00", balance_usd: "0.00", current_page: 1, last_page: 1, history: [] } };
    if (/^\/orders\//.test(path)) return route.fulfill({ status: 404, json: { message: "Not found." } });
    return route.fulfill({ json: body });
  });
  for (const route of ["", "/orders", "/wishlist", "/lists", "/reviews", "/ebooks", "/coupons", "/profile", "/security", "/addresses", "/support", "/gift-cards", "/referrals", "/orders/999", "/orders/999/pay"]) {
    await page.goto(`/account${route}`);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.getByText(/^Loading/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    const duplicateIds = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("[id]")).map((node) => node.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicateIds, route).toEqual([]);
    expect(errors, route).toEqual([]);
    if (["", "/profile", "/security", "/orders"].includes(route)) {
      await page.screenshot({ path: `overnight-screenshots/account-redesign-${route.slice(1) || "overview"}.png`, fullPage: true });
    }
  }
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/profile", "/security", "/orders", "/ebooks"]) {
      await page.goto(`/account${route}`);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.getByText(/^Loading/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}${route}`).toBe(true);
      expect(errors, `${width}${route}`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => localStorage.setItem("bookly-theme", value), theme);
    for (const route of ["/profile", "/security"]) {
      await page.goto(`/account${route}`);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.getByText(/^Loading/)).toHaveCount(0);
      const { violations } = await new AxeBuilder({ page }).include(".account-area").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`), `${theme}${route}`).toEqual([]);
      if (theme === "dark") await page.screenshot({ path: `overnight-screenshots/account-redesign-${theme}-${route.slice(1)}.png`, fullPage: true });
    }
  }
});
