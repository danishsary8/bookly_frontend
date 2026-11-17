import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { prepareDashboard } from "./fixtures/dashboard";

/* Book form 2026-11-17: titled sections, first format and pricing on the new-book page, profit per copy. */
const categories = [{ id: 1, name: "Fiction", slug: "fiction", parent_id: null, sort_order: 1, icon: null, books_count: 3 }];
const author = { id: 7, name: "Clive Oxenden", bio: null, photo_url: null, books_count: 2 };
const paperback = { id: 11, book_id: 5, format: "paperback", sku: "ENGLISH-FILE-PB", isbn: "9780194035910", price_usd: "27.00", price_khr: null, cost_price_usd: "18.50", stock_quantity: 32, low_stock_threshold: 5, is_low_stock: false, is_active: true, in_stock: true, cover_image_url: null };
const book = { id: 5, title: "English File: Intermediate Student's Book", description: "Course book.", status: "live", language: "English", publish_at: null, is_visible: true, deleted_at: null, created_at: "2026-11-01", updated_at: "2026-11-11", authors: [author], categories, variants: [paperback], page_count: 168, publisher: null, series: null };

async function prepare(page: Page, baseURL?: string) {
  const state = await prepareDashboard(page, baseURL);
  const writes: { method: string; path: string; body: unknown }[] = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (request.method() !== "GET") {
      writes.push({ method: request.method(), path, body: request.postDataJSON() });
      if (path === "/staff/books") return route.fulfill({ status: 201, json: { data: { ...book, id: 9, title: "New", variants: [] } } });
      return route.fulfill({ json: { data: paperback } });
    }
    if (path === "/categories") return route.fulfill({ json: { data: categories } });
    if (path === "/authors") return route.fulfill({ json: { data: [author], meta: { current_page: 1, last_page: 1, total: 1 }, links: {} } });
    if (path === "/staff/books/5" || path === "/staff/books/9") return route.fulfill({ json: { data: book } });
    return route.fallback();
  });
  return { ...state, bookWrites: writes };
}

const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const axe = async (page: Page, scope: string) =>
  (await new AxeBuilder({ page }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map((v) => `${v.id}:${v.nodes.map((n) => n.target).join()}`);

test("new book: sections, first format with live profit, one-step create", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const state = await prepare(page, baseURL);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/books/new");
    await expect(page.getByRole("region", { name: "First format and price" })).toBeVisible();
    for (const dark of [false, true]) {
      await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
      expect(await fits(page), `new/${width}/${dark}`).toBe(true);
      expect(await axe(page, ".admin-page"), `new/${width}/${dark}`).toEqual([]);
    }
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/books/new");
  for (const name of ["Basics", "First format and price", "Book information", "Readers and school", "Description", "Publishing"]) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }
  await page.getByLabel("Title").fill("English File: Intermediate");
  await expect(page.getByLabel("SKU")).toHaveValue("ENGLISH-FILE-INTERME-PB");
  await page.getByLabel("Format", { exact: true }).selectOption("hardcover");
  await expect(page.getByLabel("SKU")).toHaveValue("ENGLISH-FILE-INTERME-HC");

  const line = page.getByTestId("profit-line");
  await expect(line).toHaveText("Add the supplier cost to see the profit.");
  await page.getByLabel("Sell price (USD)").fill("12.40");
  await page.getByRole("button", { name: "Make it $12.99" }).click();
  await expect(page.getByLabel("Sell price (USD)")).toHaveValue("12.99");
  await page.getByLabel(/Supplier cost/).fill("15");
  await expect(line).toContainText("Loss of $2.01 per copy");
  await page.screenshot({ path: "overnight-screenshots/book-new-loss-1440.png", fullPage: true });
  expect(await axe(page, "[data-testid=profit-line]")).toEqual([]);
  await page.getByLabel(/Supplier cost/).fill("8.50");
  await expect(line).toContainText("Profit $4.49 per copy");
  await expect(line).toContainText("34.6% margin");
  expect(await axe(page, "[data-testid=profit-line]")).toEqual([]);
  await page.getByLabel("Copies in stock").fill("20");

  await page.getByLabel("Find an author to add").fill("clive");
  await page.getByRole("button", { name: /Clive Oxenden/ }).click();
  await page.getByRole("checkbox", { name: "Fiction" }).click();
  await expect(page.locator(".admin-form-actions")).toContainText("Unsaved changes");
  await page.screenshot({ path: "overnight-screenshots/book-new-1440.png", fullPage: true });

  await page.getByRole("button", { name: "Create book" }).click();
  await expect(page).toHaveURL(/\/admin\/books\/9$/);
  const [create, variant] = state.bookWrites;
  expect(create.path).toBe("/staff/books");
  expect(variant).toEqual({ method: "POST", path: "/staff/books/9/variants", body: expect.objectContaining({ format: "hardcover", sku: "ENGLISH-FILE-INTERME-HC", price_usd: "12.99", cost_price_usd: "8.50", stock_quantity: 20, is_active: true }) });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/books/new");
  await page.getByLabel("Sell price (USD)").fill("20");
  await page.getByLabel(/Supplier cost/).fill("12");
  await page.screenshot({ path: "overnight-screenshots/book-new-390.png", fullPage: true });
  expect(state.errors).toEqual([]);
});

test("edit book: format rows show cost and profit; the format dialog groups pricing", async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const state = await prepare(page, baseURL);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/books/5");
    await expect(page.getByRole("region", { name: "Formats and stock" })).toContainText("Cost $18.50 · Profit $8.50 per copy (31.5% margin)");
    await expect(page.locator(".admin-form-actions")).toContainText("All changes saved");
    await page.getByRole("button", { name: "Edit Paperback" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("region", { name: "Pricing" })).toBeVisible();
    await expect(dialog.getByLabel(/Supplier cost/)).toHaveValue("18.50");
    await expect(dialog.getByTestId("profit-line")).toContainText("Profit $8.50 per copy");
    for (const dark of [false, true]) {
      await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
      expect(await fits(page), `edit/${width}/${dark}`).toBe(true);
      expect(await dialog.locator(".admin-form-scroll").evaluate((el) => el.scrollWidth <= el.clientWidth), `dialog/${width}`).toBe(true);
      expect(await axe(page, "[role=dialog]"), `dialog/${width}/${dark}`).toEqual([]);
      if (width !== 320) await page.screenshot({ path: `overnight-screenshots/book-format-dialog-${width}-${dark ? "dark" : "light"}.png` });
    }
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    if (width === 1440) {
      await dialog.getByLabel(/Supplier cost/).fill("19.25");
      await dialog.getByRole("button", { name: "Save format" }).click();
      await expect(dialog).toHaveCount(0);
      expect(state.bookWrites.at(-1)).toEqual({ method: "PATCH", path: "/staff/variants/11", body: expect.objectContaining({ price_usd: "27.00", cost_price_usd: "19.25" }) });
      await page.screenshot({ path: "overnight-screenshots/book-edit-1440.png", fullPage: true });
    } else {
      await page.keyboard.press("Escape");
    }
  }
  expect(state.errors).toEqual([]);
});
