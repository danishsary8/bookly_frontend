import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * WCAG 2.1 A/AA checks with axe in light and dark, desktop and phone: every public page, and (when sessions are
 * given) the customer account and the staff area. Signed-in pages need the API: the customer signs in through it
 * (E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD, demo data by default) and staff use E2E_STAFF_SESSION.
 */

const API = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
const STAFF_SESSION = process.env.E2E_STAFF_SESSION;
const CUSTOMER = { email: process.env.E2E_CUSTOMER_EMAIL ?? "demo@bookly.test", password: process.env.E2E_CUSTOMER_PASSWORD ?? "Password123!" };

const PAGES = [
  "/", "/books", "/books/1", "/authors", "/authors/1", "/series", "/search?q=holmes", "/cart", "/login", "/register", "/forgot-password",
  "/faq", "/shipping", "/returns-policy", "/about", "/contact", "/privacy", "/terms", "/admin/login", "/no-such-page",
];
const ACCOUNT_PAGES = ["/account", "/account/profile", "/account/security", "/account/addresses", "/account/wishlist", "/account/orders", "/account/returns", "/account/reviews", "/checkout"];
const ADMIN_PAGES = [
  "/admin", "/admin/reports", "/admin/orders", "/admin/returns", "/admin/reviews", "/admin/coupons", "/admin/customers", "/admin/books", "/admin/books/new",
  "/admin/stock", "/admin/authors", "/admin/categories", "/admin/publishers", "/admin/series", "/admin/members", "/admin/exchange-rates", "/admin/audit-log",
];

async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
}

async function auditPages(page: Page, paths: string[]) {
  const found: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    await page.locator("h1").first().waitFor();
    await page.waitForLoadState("networkidle");
    for (const v of await audit(page)) found.push(`${path} → ${v}`);
  }
  return found;
}

// Each test visits 20-25 pages; give it room on slower CI machines.
test.describe.configure({ timeout: 180_000 });

for (const scheme of ["light", "dark"] as const) {
  for (const [label, viewport] of [["desktop", { width: 1366, height: 900 }], ["phone", { width: 375, height: 800 }]] as const) {
    test(`no WCAG A/AA violations · ${scheme} · ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      const found = await auditPages(page, PAGES);
      expect(found, found.join("\n")).toEqual([]);
    });

    test(`no WCAG A/AA violations · signed in · ${scheme} · ${label}`, async ({ page, context, request }) => {
      test.skip(!STAFF_SESSION, "Set E2E_STAFF_SESSION (see .github/workflows/e2e.yml)");
      const login = await request.post(`${API}/auth/login`, { headers: { Accept: "application/json" }, data: CUSTOMER });
      expect(login.ok(), await login.text()).toBe(true);
      const { token, customer } = (await login.json()) as { token: string; customer: unknown };
      await context.addInitScript(
        ([customerSession, staffSession]) => {
          localStorage.setItem("bookly.session.customer", customerSession);
          localStorage.setItem("bookly.session.staff", staffSession);
        },
        [JSON.stringify({ token, expiresAt: null, user: customer }), STAFF_SESSION!] as const,
      );
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      const found = await auditPages(page, [...ACCOUNT_PAGES, ...ADMIN_PAGES]);
      expect(found, found.join("\n")).toEqual([]);
    });
  }
}
