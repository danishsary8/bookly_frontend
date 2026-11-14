import { expect, test, type Route } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Run these fixtures against localhost only.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("bookly-language", "en"));
});

for (const width of [1440, 390]) {
  test(`homepage stays usable while all API requests stall (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const held: Route[] = [];
    await page.route("**/api/v1/**", (route) => { held.push(route); });
    try {
      await page.goto("/");
      await expect(page.getByTestId("home-loading")).toBeVisible();
      await expect(page.locator("#home-hero-title")).toBeHidden();
      await expect(page.locator("#home-hero-title")).toBeVisible();
      await expect(page.getByRole("link", { name: "Browse catalogue", exact: true })).toBeVisible();
      await expect(page.getByTestId("home-loading")).toHaveCount(0);
      expect(held.some((route) => new URL(route.request().url()).pathname.endsWith("/catalog/rows"))).toBe(false);
      await page.getByRole("link", { name: "Browse catalogue", exact: true }).click();
      await expect(page).toHaveURL(/\/books$/);
    } finally {
      await Promise.allSettled(held.map((route) => route.abort()));
    }
  });
}

test("an available hero book shows while categories, other books and covers stall", async ({ page }) => {
  const held: Route[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/books") && url.searchParams.has("ids")) {
      await route.fulfill({ json: {
        data: [{ id: 408, title: "Atomic Habits", authors: [{ id: 1, name: "James Clear" }], price_from_usd: "18.00", price_from_khr: "72000", cover_image_url: "https://covers.example.test/slow.jpg", formats: ["paperback"], in_stock: true }],
        meta: { current_page: 1, last_page: 1, total: 1, per_page: 2 }, links: {},
      } });
    } else held.push(route);
  });
  await page.route("https://covers.example.test/**", (route) => { held.push(route); });
  try {
    await page.goto("/");
    await expect(page.locator("#home-hero-title")).toBeVisible();
    const hero = page.locator('section[aria-labelledby="home-hero-title"]');
    await expect(hero.getByRole("link", { name: "Atomic Habits", exact: true })).toBeVisible();
    await expect.poll(() => held.some((route) => route.request().url().includes("/catalog/rows"))).toBe(true);
    await expect(hero.getByRole("link", { name: "Atomic Habits", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.allSettled(held.map((route) => route.abort()));
  }
});

test("failed primary requests offer retry without hiding the hero", async ({ page }) => {
  const held: Route[] = [];
  let recovered = false;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const primary = url.pathname.endsWith("/books") && (url.searchParams.has("ids") || url.searchParams.get("per_page") === "15");
    if (!primary) { held.push(route); return; }
    if (!recovered) {
      await route.fulfill({ status: 500, json: { message: "Server Error" } });
    } else {
      await route.fulfill({ json: { data: [{ id: 408, title: "Recovered book", authors: [], price_from_usd: "12.00", formats: ["paperback"], in_stock: true }], meta: { current_page: 1, last_page: 1, total: 1, per_page: 15 }, links: {} } });
    }
  });
  try {
    await page.goto("/");
    await expect(page.getByRole("alert").getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.locator("#home-hero-title")).toBeVisible();
    recovered = true;
    await page.getByRole("alert").getByRole("button", { name: "Try again" }).click();
    await expect(page.locator('section[aria-labelledby="home-hero-title"]').getByRole("link", { name: "Recovered book", exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally {
    await Promise.allSettled(held.map((route) => route.abort()));
  }
});
