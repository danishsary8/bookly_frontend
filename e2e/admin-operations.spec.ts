import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { prepareDashboard } from "./fixtures/dashboard";

const actor = { id: 100, name: "Demo Admin", email: "admin@example.test" };
const events = [
  { id: 1, source: "audit", context: { book_id: 1, book_title: "The Little Prince", sku: "PRINCE-PB" }, staff: actor, action: "book_variant.restocked", entity_type: "book_variant", entity_id: 7, before: { stock_quantity: 2 }, after: { stock_quantity: 12 }, created_at: "2026-11-16T04:00:00Z" },
  { id: 1, source: "inventory", staff: actor, action: "inventory.restock", entity_type: "book_variant", entity_id: 7, before: null, after: { quantity_change: 10, book_id: 1, book_title: "The Little Prince", sku: "PRINCE-PB", supplier: "Reader Supply", reference_type: null, note: "Stock received in good condition." }, created_at: "2026-11-16T04:00:00Z" },
  { id: 2, source: "inventory", staff: null, action: "inventory.sale", entity_type: "book_variant", entity_id: 7, before: null, after: { quantity_change: -2, book_id: 1, book_title: "The Little Prince", reference_type: "order", reference_id: 123 }, created_at: "2026-11-15T04:00:00Z" },
  { id: 1, source: "orders", staff: null, action: "order.placed", entity_type: "order", entity_id: 123, before: null, after: { order_number: "ORD-FIXTURE-123", status: "pending", order_total_usd: "25.00", payment_method: "cod" }, created_at: "2026-11-15T04:00:00Z" },
];
const campaigns = [1, 2, 3].map((id) => ({ id, subject_en: id === 1 ? "Summer reading" : id === 2 ? "A sent campaign" : "Another draft", subject_km: null, body_en: "Discover your next favourite book.", body_km: null, book_ids: [1], status: id === 2 ? "sent" : "draft", recipients_total: 12, sent_count: id === 2 ? 12 : 0, created_at: "2026-11-15T04:00:00Z" }));

async function prepare(page: Page, baseURL?: string) {
  const state = await prepareDashboard(page, baseURL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const writes: string[] = []; const reads: string[] = [];
  let enabled = true; let referralVoided = false;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url()); const path = url.pathname.replace("/api/v1", ""); const p = url.searchParams;
    if (route.request().method() !== "GET") { writes.push(path); if (path === "/staff/referrals/1/void") referralVoided = true; return route.fulfill({ json: { data: {}, message: "Fixture action completed." } }); }
    reads.push(path + url.search);
    if (path === "/shop/features") return route.fulfill({ json: { data: { referrals: enabled } } });
    if (path === "/staff/audit-logs") {
      const rows = events.filter((e) => (!p.get("source") || p.get("source") === "all" || e.source === p.get("source")) && (!p.get("action") || e.action === p.get("action")) && (!p.get("entity_type") || e.entity_type === p.get("entity_type")) && (!p.get("entity_id") || e.entity_id === Number(p.get("entity_id"))) && (!p.get("staff_user_id") || e.staff?.id === Number(p.get("staff_user_id"))) && (p.get("actor") !== "system" || !e.staff) && (!p.get("q") || JSON.stringify(e).toLowerCase().includes(p.get("q")!.toLowerCase())));
      const current = Number(p.get("page")) || 1;
      return route.fulfill({ json: { data: rows.slice((current - 1) * 2, current * 2), meta: { current_page: current, last_page: Math.max(1, Math.ceil(rows.length / 2)), per_page: 2, total: rows.length, actions: events.map((e) => e.action), entity_types: ["book_variant", "order"], actors: [actor], sources: ["audit", "inventory", "orders"], timezone: "Asia/Phnom_Penh" } } });
    }
    if (path === "/staff/members") return route.fulfill({ json: { data: [{ ...actor, role: "admin", is_active: true, two_factor_enabled: true, created_at: "2026-10-01T00:00:00Z", permissions: [] }], meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 }, links: {} } });
    if (path === "/staff/exchange-rates") return route.fulfill({ json: { data: [{ id: 1, rate: "4100", is_current: true, effective_at: "2026-11-15T00:00:00Z" }, { id: 2, rate: "4150", is_current: false, effective_at: "2027-01-01T00:00:00Z" }], meta: { current_page: 1, last_page: 1, total: 2, current_rate: "4100" }, links: {} } });
    if (path === "/staff/referrals") return route.fulfill({ json: { data: [{ id: 1, sharer_customer_id: 12, friend_customer_id: 13, order_id: 123, status: referralVoided ? "void" : "rewarded", reward_cents: 300, unrecovered_cents: 0 }], current_page: 1, last_page: 1, stats: { total: 1, rewarded: 1, credited_usd: "3.00", unrecovered_usd: "0" } } });
    if (path === "/staff/newsletter/summary") return route.fulfill({ json: { confirmed: 12, pending: 2, unsubscribed: 1, total: 15, daily_limit: 60 } });
    if (path === "/staff/newsletter/campaigns") {
      const rows = campaigns.filter((c) => (!p.get("status") || c.status === p.get("status")) && (!p.get("q") || c.subject_en.toLowerCase().includes(p.get("q")!.toLowerCase()))); const current = Number(p.get("page")) || 1;
      return route.fulfill({ json: { data: rows.slice((current - 1) * 2, current * 2), current_page: current, last_page: Math.max(1, Math.ceil(rows.length / 2)), total: rows.length } });
    }
    if (/\/staff\/newsletter\/campaigns\/\d+$/.test(path)) return route.fulfill({ json: { campaign: campaigns[1], books: [{ id: 1, title: "The Little Prince" }] } });
    return route.fallback();
  });
  return { ...state, mutations: writes, reads, setEnabled: (value: boolean) => { enabled = value; } };
}

test("all five Admin pages are readable and accessible in both themes and responsive widths", async ({ page, baseURL }) => {
  test.setTimeout(300_000); const state = await prepare(page, baseURL);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["newsletter", "referrals", "members", "exchange-rates", "audit-log"]) {
      await page.goto(`/admin/${route}`); await page.waitForLoadState("networkidle");
      if (route === "audit-log") await page.getByText("1 field", { exact: true }).click();
      for (const dark of [false, true]) {
        await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}/${width}`).toBe(true);
        const results = await new AxeBuilder({ page }).include(".admin-page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join()}`), `${route}/${width}/${dark}`).toEqual([]);
        if ([1440, 390].includes(width)) await page.screenshot({ path: `overnight-screenshots/operations-${route}-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      }
    }
  }
  expect(state.errors).toEqual([]); expect(state.mutations).toEqual([]);
});

test("audit filters and links, campaign paging and financial confirmations retain the complete flow", async ({ page, baseURL }) => {
  test.setTimeout(120_000); const state = await prepare(page, baseURL);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/admin/audit-log");
  await expect(page.getByRole("list", { name: "Changes" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Book format #7", exact: true })).toHaveAttribute("href", "/admin/stock?q=PRINCE-PB");
  await page.getByRole("button", { name: "Restocks", exact: true }).click();
  await expect(page).toHaveURL(/action=inventory.restock/);
  await page.getByRole("searchbox", { name: "Search activity" }).fill("Reader Supply");
  await expect(page).toHaveURL(/q=Reader\+Supply/);
  await expect(page.getByRole("list", { name: "Changes" })).toContainText("+10 copies");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: "Sales / orders placed", exact: true }).click();
  await expect(page.getByRole("link", { name: "Order #123", exact: true })).toHaveAttribute("href", "/admin/orders/123");
  await page.getByLabel("Record ID", { exact: true }).fill("123");
  await page.getByLabel("From", { exact: true }).fill("2026-11-15");
  await page.getByLabel("To", { exact: true }).fill("2026-11-16");
  await expect(page).toHaveURL(/entity_id=123/);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("link", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.goto("/admin/newsletter");
  await page.getByRole("link", { name: "Next page", exact: true }).click(); await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Another draft", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search campaigns" }).fill("Summer");
  await expect(page).not.toHaveURL(/page=2/); await expect(page.getByText("Summer reading", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: "View A sent campaign", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Sent campaigns are read-only");
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveCount(0); await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Campaign status", exact: true }).selectOption("sending");
  await expect(page.getByText("No campaigns match these filters. Try another subject or status.")).toBeVisible();
  await page.goto("/admin/members"); await page.getByRole("button", { name: "Actions for Demo Admin", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "View activity log", exact: true })).toHaveAttribute("href", "/admin/audit-log?staff=100"); await page.keyboard.press("Escape");
  await page.goto("/admin/referrals"); await page.getByRole("button", { name: "Void referral", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("recover available reward credit"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Void referral", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Void referral", exact: true }).click();
  await expect(page.locator('.admin-record [data-slot="badge"]').filter({ hasText: "Voided" })).toBeVisible();
  expect(state.mutations).toEqual(["/staff/referrals/1/void"]);
  state.setEnabled(false);
  await page.goto("/admin/referrals"); await expect(page.getByRole("heading", { name: "Referrals are unavailable" })).toBeVisible();
  expect(state.errors).toEqual([]);
});
