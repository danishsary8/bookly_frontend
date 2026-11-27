import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { prepareDashboard } from "./fixtures/dashboard";

const categories = [
  { id: 1, name: "Fiction & literature", slug: "fiction", parent_id: null, sort_order: 1, icon: "book-open", books_count: 30 },
  { id: 2, name: "Fantasy adventures", slug: "fantasy", parent_id: 1, sort_order: 2, icon: null, books_count: 12 },
  { id: 3, name: "Children's books", slug: "children", parent_id: null, sort_order: 3, icon: "book-open", books_count: 8 },
];
const author = { id: 7, name: "Antoine de Saint-Exupéry", bio: "A writer and aviator whose imaginative stories continue to inspire readers around the world.", photo_url: null, books_count: 4 };
const book = { id: 1, title: "Molecular Biology of the Cell (6th Edition) — A comprehensive illustrated introduction", description: null, status: "live", language: "en", publish_at: null, is_visible: true, deleted_at: null, created_at: "2026-11-01", updated_at: "2026-11-15", authors: [author, { id: 8, name: "Another author with a lengthy name" }], categories: [categories[0]], sold_recent: 12, variants: [{ id: 1, format: "paperback", sku: "CELL-PB", price_usd: "18.50", stock_quantity: 3, low_stock_threshold: 5, is_low_stock: true, is_active: true, cover_image_url: null }, { id: 2, format: "ebook", price_usd: "9.50", is_active: true, cover_image_url: null }] };
async function prepare(page: Page, baseURL?: string) {
  const state = await prepareDashboard(page, baseURL);
  const writes: { path: string; body: unknown }[] = [];
  let uploadPending: (() => void) | undefined;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (request.method() !== "GET") {
      writes.push({ path, body: request.headers()["content-type"]?.includes("multipart") ? "multipart" : request.postDataJSON() });
      if (path === "/staff/media/upload") { await new Promise<void>((resolve) => { uploadPending = resolve; }); return route.fulfill({ json: { url: "http://localhost:5173/fixture-author.png" } }); }
      return route.fulfill({ json: { data: {} } });
    }
    if (path === "/categories") return route.fulfill({ json: { data: categories } });
    if (path === "/authors") return route.fulfill({ json: { data: [author], meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 }, links: {} } });
    if (path === "/staff/books") return route.fulfill({ json: { data: [book, { ...book, id: 2, title: "Scheduled release", status: "scheduled", publish_at: "2027-12-01T00:00:00Z" }, { ...book, id: 3, title: "Draft book", status: "draft" }, { ...book, id: 4, title: "Deleted book", deleted_at: "2026-11-15" }], meta: { current_page: 1, last_page: 1, total: 4, from: 1, to: 4 }, links: {} } });
    if (path === "/staff/books/1") return route.fulfill({ json: { data: book } });
    return route.fallback();
  });
  return { ...state, mutations: writes, releaseUpload: () => uploadPending?.() };
}

test("catalogue actions and hierarchy fit every width without sideways scrolling", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const state = await prepare(page, baseURL);
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["books", "authors", "categories"]) {
      await page.goto(`/admin/${route}`);
      await page.waitForLoadState("networkidle");
      for (const dark of [false, true]) {
        await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}/${width}`).toBe(true);
        expect(await page.locator(".catalogue-books, .catalogue-lookups").evaluate((el) => el.scrollWidth <= el.clientWidth), `${route}/${width} inner fit`).toBe(true);
        const axe = await new AxeBuilder({ page }).include(".admin-page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(axe.violations.map((item) => `${item.id}:${item.nodes.map((n) => n.target).join()}`), `${route}/${width}/${dark}`).toEqual([]);
        if (!dark && [1440, 390].includes(width)) await page.screenshot({ path: `overnight-screenshots/catalogue-${route}-${width}-light.png`, fullPage: true });
      }
      if (route === "books") {
        await expect(page.getByRole("button", { name: /^View details for / })).toHaveCount(4);
        await page.getByRole("button", { name: `View details for ${book.title}`, exact: true }).click();
        await expect(page.getByRole("dialog")).toContainText("18.50");
        await expect(page.getByRole("link", { name: "Edit book", exact: true })).toHaveAttribute("href", "/admin/books/1");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("link", { name: `Edit ${book.title}`, exact: true })).toBeVisible();
        for (const title of ["Scheduled release", "Draft book", "Deleted book"]) {
          await page.getByRole("button", { name: `View details for ${title}`, exact: true }).click();
          expect(await page.getByRole("dialog").locator(".admin-form-scroll").evaluate((el) => el.scrollWidth <= el.clientWidth), `${title}/${width} preview fit`).toBe(true);
          await page.keyboard.press("Escape");
        }
        await page.getByRole("checkbox", { name: `Select ${book.title}`, exact: true }).click();
        // The Stock & Formats bulk action was removed (64972eb); Categories opens the same bulk dialog.
        await page.getByRole("button", { name: "Categories", exact: true }).click();
        await expect(page.getByRole("dialog")).toContainText("Manage Categories");
        expect(await page.getByRole("dialog").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.keyboard.press("Escape");
      }
      if ([1440, 390].includes(width)) await page.screenshot({ path: `overnight-screenshots/catalogue-${route}-${width}.png`, fullPage: true });
    }
  }
  expect(state.errors).toEqual([]); expect(state.mutations).toEqual([]);
});

test("authors upload, preview and save photos; categories add children with the right parent", async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const state = await prepare(page, baseURL);
  await page.goto("/admin/authors");
  const dataUrl = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 200; c.height = 200; const ctx = c.getContext("2d")!; ctx.fillStyle = "#14207a"; ctx.fillRect(0, 0, 200, 200); return c.toDataURL("image/png"); });
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  await page.route("**/fixture-author.png", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await page.getByRole("button", { name: `Edit ${author.name}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: png });
  await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect.poll(() => state.mutations.some((item) => item.path === "/staff/media/upload")).toBe(true);
  state.releaseUpload();
  await expect(dialog.getByRole("img", { name: "Author photo preview" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Replace", exact: true })).toBeVisible();
  await page.screenshot({ path: "overnight-screenshots/catalogue-author-upload.png" });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.mutations).toContainEqual({ path: "/staff/authors/7", body: expect.objectContaining({ photo_url: "http://localhost:5173/fixture-author.png" }) });
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "Add sub-category under Fiction & literature", exact: true }).click();
  await expect(dialog.getByLabel(/Parent category/)).toHaveValue("1");
  await expect(dialog.getByRole("radio", { name: "No icon" })).toHaveCount(0);
  await dialog.getByLabel("Name", { exact: true }).fill("New mystery shelf");
  await dialog.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.mutations).toContainEqual({ path: "/staff/categories", body: expect.objectContaining({ name: "New mystery shelf", parent_id: 1, icon: null }) });
  await page.getByRole("button", { name: "Edit Fiction & literature", exact: true }).click();
  await expect(dialog.getByLabel(/Parent category/)).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("searchbox", { name: "Search categories" }).fill("Fantasy");
  await expect(page.getByRole("rowheader", { name: "Sub-category: Fantasy adventures" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Children's books" })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
