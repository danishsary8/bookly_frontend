import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { prepareDashboard } from "./fixtures/dashboard";

const coupon = { id: 1, code: "READ15", type: "percentage", value: "15", min_order_amount: "20", max_uses: 100, used_count: 8, starts_at: null, expires_at: null, is_active: true };
const offer = { id: 1, name: "Weekend reading", type: "buy_n_percent", applies_to: "all", min_quantity: 2, percent_off: "15", starts_at: null, ends_at: null, max_orders: 100, used_count: 8, is_active: true, status: "live", targets: [], orders_count: 8 };
const conversation = { id: 21, topic: "delivery", status: "open", unread_count: 0, assigned_staff_id: null, customer: { id: 10, name: "Fixture Customer", email: "reader@example.test" }, order_id: null, messages: [{ id: 1, sender: "customer", body: "Could you check the delivery date for my books?", is_internal: false, created_at: "2026-11-15T04:00:00Z" }] };
const faq = { id: 4, question_en: "When will my books arrive?", question_km: "សំណួរ", answer_en: "Check the delivery estimate in your account.", answer_km: "ចម្លើយ", keywords: ["delivery"], is_active: true, hits: 12 };

async function prepare(page: Page, baseURL?: string) {
  const state = await prepareDashboard(page, baseURL);
  const mutations: { path: string; body: unknown }[] = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    if (route.request().method() !== "GET") {
      mutations.push({ path, body: route.request().postDataJSON() });
      return route.fulfill({ json: { data: path === "/staff/coupons" ? { ...coupon, ...route.request().postDataJSON(), id: 2 } : {} } });
    }
    let rows: unknown[] | undefined;
    if (path === "/staff/coupons") rows = [coupon];
    if (path === "/staff/offers") rows = [offer];
    if (path === "/staff/reviews") rows = [{ id: 1, book: { id: 1, title: "The Little Prince" }, customer: { id: 10, name: "Fixture Customer" }, rating: 5, comment: "A wonderful book to read again.", is_visible: true, created_at: "2026-11-15T04:00:00Z" }];
    if (path === "/staff/ratings") rows = [{ id: 1, order_id: 1, order_number: "ORD-FIXTURE-001", stars: 5, comment: "The books arrived in excellent condition.", is_comment_hidden: false }];
    if (path === "/staff/support/conversations") rows = [conversation];
    if (path === "/staff/support/conversations/21") return route.fulfill({ json: { data: conversation } });
    if (path === "/staff/books/1") return route.fulfill({ json: { data: { id: 1, title: "The Little Prince", description: null, status: "live", publish_at: null, language: "en", page_count: 100, publish_date: null, publisher_id: null, series_id: null, series_order: null, authors: [], categories: [], variants: [], is_visible: false, deleted_at: null, created_at: "2026-11-01", updated_at: "2026-11-01" } } });
    if (path === "/series" || path === "/staff/series") rows = [{ id: 1, name: "Reading adventures", books_count: 1 }];
    if (path === "/staff/series/1") return route.fulfill({ json: { data: { id: 1, name: "Reading adventures", books: [], has_duplicate_orders: false } } });
    if (path === "/staff/stock") rows = [{ id: 1, book_id: 1, book_title: "The Little Prince", format: "paperback", sku: "PRINCE-PB", isbn: null, price_usd: "12", stock_quantity: 3, low_stock_threshold: 5, status: "low", is_active: true, cover_image_url: null }];
    if (path === "/staff/support/staff") return route.fulfill({ json: { data: [{ id: 100, name: "Demo Admin" }] } });
    if (path === "/staff/support/quick-replies") return route.fulfill({ json: { data: [{ id: 1, title: "Delivery help", body_en: "Here is your delivery information.", body_km: "ចម្លើយ" }] } });
    if (path === "/staff/assistant/faqs") return route.fulfill({ json: { data: { data: [faq], current_page: 1, last_page: 1 } } });
    if (path === "/staff/assistant/unanswered") return route.fulfill({ json: { data: { data: [{ id: 7, question: "Can I send a gift?", count: 4 }], current_page: 1, last_page: 1 } } });
    if (path === "/staff/promotions") rows = [{ id: 1, title_en: "A weekend of reading", title_km: null, body_en: "Discover your next favourite book.", image_url: null, cta_url: "/books", offer_id: 1, offer_name: offer.name, is_active: true, status: "live", starts_at: null, ends_at: null, views: 120, clicks: 24, orders_count: 8, revenue_usd: "140.00" }];
    if (path === "/staff/collections") rows = [{ id: 1, slug: "rainy-season", title_en: "Rainy season reads", title_km: null, description_en: "A shelf for quiet days.", starts_at: null, ends_at: null, is_active: true, position: 0, status: "live", books: [{ id: 1, title: "The Little Prince", in_trash: false }] }];
    if (rows) return route.fulfill({ json: { data: rows, meta: { current_page: 1, last_page: 1, total: rows.length, from: 1, to: rows.length, per_page: 20 }, links: {} } });
    if (path === "/staff/gifts") return route.fulfill({ json: { data: [{ id: 1, name_en: "Bookly bookmark", name_km: "អំណោយ", stock: 3, is_active: true }] } });
    if (path === "/staff/reading-lists") return route.fulfill({ json: { data: [{ id: 1, title: "A reader's weekend", slug: "readers-weekend", is_staff_pick: true }] } });
    if (path === "/staff/settings/payments") return route.fulfill({ json: { data: { khqr_enabled: true, khqr_discount_percent: "3", cod_max_order_usd: "80" } } });
    if (path === "/staff/reward-rules") return route.fulfill({ json: { data: [{ id: 1, name: "Thank you for reading", is_active: true, min_books: 2, min_amount_usd: null, percent_off: "10", max_discount_usd: "5", valid_days: 30, issued_count: 12, used_count: 4 }] } });
    if (path === "/staff/newsletter/summary") return route.fulfill({ json: { confirmed: 12, pending: 0, unsubscribed: 1, total: 13, daily_limit: 100 } });
    if (path === "/staff/newsletter/campaigns") return route.fulfill({ json: { data: [], current_page: 1, last_page: 1, total: 0 } });
    return route.fallback();
  });
  return { ...state, mutations };
}

test("customer care and marketing have readable populated layouts in both themes and at phone widths", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  const state = await prepare(page, baseURL);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dark of [false, true]) {
      for (const route of ["support", "reviews", "ratings", "assistant/knowledge", "coupons", "offers", "promotions", "rewards", "gifts", "reading-lists", "collections"]) {
        await page.goto(`/admin/${route}`);
        await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
        await expect(page.locator("main h1")).toBeVisible();
        await page.waitForLoadState("networkidle");
        await expect(page.getByText("Something went wrong", { exact: true })).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}/${width}/${dark}`).toBe(true);
        const axe = await new AxeBuilder({ page }).include(".admin-page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(axe.violations.map((item) => `${item.id}: ${item.nodes.map((n) => n.target).join()}`), `${route}/${width}/${dark}`).toEqual([]);
        if (["support", "ratings", "gifts", "assistant/knowledge"].includes(route)) await page.screenshot({ path: `overnight-screenshots/care-${route.replace("/", "-")}-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      }
    }
  }
  expect(state.errors).toEqual([]);
  expect(state.mutations).toEqual([]);
});

test("admin create forms fit the viewport, retain focus and validate and save using fixtures", async ({ page, baseURL }) => {
  test.setTimeout(360_000);
  const state = await prepare(page, baseURL);
  const forms = [
    ["coupons", "New coupon"], ["promotions", "New promotion"], ["rewards", "New reward rule"], ["gifts", "Create gift"],
    ["authors", "Add author"], ["categories", "Add category"], ["publishers", "Add publisher"], ["series", "Add series"], ["series", "Manage volumes for Reading adventures"], ["members", "Invite member"], ["newsletter", "New campaign"], ["books", "Import CSV"], ["assistant/knowledge", "Add FAQ"], ["books/1", "Add format"], ["stock", "Restock"],
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [route, action] of forms) {
      console.log(`Checking form ${width}: ${route} / ${action}`);
      await page.goto(`/admin/${route}`);
      const trigger = page.getByRole("button", { name: action, exact: true });
      await trigger.click({ timeout: 10_000 });
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), `${route}/${width} horizontal fit`).toBe(true);
      expect(await dialog.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }), `${route}/${width} viewport fit`).toBe(true);
      const scroll = dialog.locator(".admin-form-scroll");
      await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await expect(dialog.getByRole("button", { name: "Close", exact: true }).last()).toBeInViewport();
      await expect(dialog.locator('[data-slot="dialog-footer"]')).toBeInViewport();
      for (const dark of [false, true]) {
        await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
        // Colours fade between themes; check contrast once every running transition has settled, not mid-fade.
        await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => undefined))));
        const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(axe.violations.map((item) => `${item.id}: ${item.nodes.map((n) => n.target).join()}`), `${route}/${width}/${dark}`).toEqual([]);
      }
      if (["coupons", "offers", "promotions", "newsletter"].includes(route)) { await scroll.evaluate((el) => { el.scrollTop = 0; }); await page.screenshot({ path: `overnight-screenshots/form-${route}-${width}.png` }); await page.evaluate(() => document.documentElement.classList.remove("dark")); await page.screenshot({ path: `overnight-screenshots/form-${route}-${width}-light.png` }); }
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  }
  // Offers and collections open their own page instead of a dialog (owner 2026-11-17).
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [route, action] of [["offers", "New offer"], ["collections", "New collection"]]) {
      await page.goto(`/admin/${route}`);
      await page.getByRole("button", { name: action, exact: true }).click({ timeout: 10_000 });
      await expect(page).toHaveURL(new RegExp(`/admin/${route}/new$`));
      await expect(page.getByRole("heading", { level: 1, name: action })).toBeVisible();
      for (const dark of [false, true]) {
        await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
        await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => undefined))));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} page/${width}`).toBe(true);
        const axe = await new AxeBuilder({ page }).include(".admin-page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(axe.violations.map((item) => `${item.id}: ${item.nodes.map((n) => n.target).join()}`), `${route} page/${width}/${dark}`).toEqual([]);
      }
      await page.evaluate(() => document.documentElement.classList.remove("dark"));
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/${route}$`));
    }
  }
  await page.setViewportSize({ width: 1440, height: 844 });
  await page.goto("/admin/coupons");
  await page.getByRole("button", { name: "New coupon", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Create coupon", exact: true }).click();
  expect(state.mutations).toEqual([]);
  await expect(dialog.getByLabel("Code", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await dialog.getByLabel("Code", { exact: true }).fill("READ20");
  await dialog.getByLabel("Percent off", { exact: true }).fill("20");
  await dialog.getByRole("button", { name: "Create coupon", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.mutations).toEqual([{ path: "/staff/coupons", body: expect.objectContaining({ code: "READ20", value: "20" }) }]);
  expect(state.errors).toEqual([]);
});

test("support conversations and knowledge editors keep their workflows", async ({ page, baseURL }) => {
  const state = await prepare(page, baseURL);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/support");
    await page.getByRole("button", { name: /Fixture Customer/ }).click();
    await expect(page.getByRole("log")).toContainText("Could you check the delivery date");
    await page.getByRole("combobox", { name: "Quick replies", exact: true }).selectOption("1");
    await expect(page.getByLabel("Reply", { exact: true })).toHaveValue("Here is your delivery information.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const axe = await new AxeBuilder({ page }).include(".admin-page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations.map((item) => item.id)).toEqual([]);
    await page.screenshot({ path: `overnight-screenshots/care-support-conversation-${width}.png`, fullPage: true });
  }
  await page.locator("summary").filter({ hasText: "Quick replies" }).click();
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.map((item) => item.id)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.goto("/admin/assistant/knowledge");
  await page.getByRole("button", { name: "Create FAQ from this", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Question in English")).toHaveValue("Can I send a gift?");
  await page.keyboard.press("Escape");
  expect(state.mutations).toEqual([]);
  expect(state.errors).toEqual([]);
});
