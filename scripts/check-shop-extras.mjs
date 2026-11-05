// Run only against tests/Support/prepare-shop-extras-browser.php fixtures and the local Vite/API servers.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5185";
const api = process.env.E2E_API_URL ?? "http://127.0.0.1:8015/api/v1";
for (const url of [base, api]) {
  if (new URL(url).hostname !== "127.0.0.1") throw new Error("This check requires dedicated local servers.");
}
if (!process.env.E2E_CUSTOMER_PASSWORD) throw new Error("Set the local fixture account password in E2E_CUSTOMER_PASSWORD.");
const directory = "test-results/shop-extras";
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const loginContext = await browser.newContext();
  const login = await loginContext.request.post(`${api}/auth/login`, { data: { email: "phase5@example.test", password: process.env.E2E_CUSTOMER_PASSWORD }, headers: { Accept: "application/json" } });
  expect(login.ok(), "Local fixture login").toBe(true);
  const auth = await login.json();
  const session = { token: auth.token, expiresAt: null, user: auth.customer };
  await loginContext.close();
  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
      await context.addInitScript(({ session, theme }) => {
        localStorage.setItem("bookly.session.customer", JSON.stringify(session));
        localStorage.setItem("bookly-theme", theme);
        localStorage.setItem("bookly-language", "en");
      }, { session, theme });
      const page = await context.newPage();
      const external = [];
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === "127.0.0.1" || url.protocol === "data:" || url.protocol === "blob:") return route.continue();
        external.push(url.hostname); return route.abort();
      });
      for (const [name, path] of [["home", "/"], ["cart", "/cart"], ["list", "/lists/browser-weekend"]]) {
        await page.goto(base + path);
        await page.waitForLoadState("networkidle");
        if (name === "home") {
          for (const title of ["Best sellers", "New arrivals", "Coming soon", "Ebooks under $5"]) await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
          const row = page.locator('[aria-labelledby="auto-home-new_arrivals-heading"]');
          const links = row.locator("h3 a");
          await links.last().focus();
          expect(await row.locator("ul").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
          await expect(row.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/books?sort=newest");
        } else if (name === "cart") {
          await expect(page.getByText("Free gift: Highlighter pen ×1")).toBeVisible();
          await expect(page.getByText(/Estimated delivery fee:/)).toBeVisible();
          await expect(page.getByRole("region", { name: "Free delivery progress" })).toBeVisible();
        } else {
          await expect(page.getByRole("heading", { name: "Weekend reading" })).toBeVisible();
          await expect(page.getByText("By Danish", { exact: true })).toBeVisible();
          await page.getByRole("button", { name: "Share list" }).click();
          await expect(page.getByRole("link", { name: "Facebook", exact: true })).toHaveAttribute("href", /sharer/);
          await expect(page.getByRole("link", { name: "Telegram", exact: true })).toHaveAttribute("href", /t\.me\/share/);
          await page.getByRole("button", { name: "Copy link" }).click();
          await expect(page.getByText("Link copied", { exact: true })).toBeVisible();
          await page.getByRole("button", { name: "Add all to cart" }).click();
          await expect(page.getByText(/\d+ added to cart · \d+ skipped/, { exact: true })).toBeVisible();
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        expect(overflow, `${name} horizontal overflow`).toBe(false);
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const problems = violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }));
        report.push({ name, width, theme, overflow, violations: problems });
        writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2));
        expect(problems, `${name} ${width} ${theme}`).toEqual([]);
        await page.screenshot({ path: `${directory}/${name}-${width}-${theme}.png`, fullPage: true });
        console.log(`${name} ${width}px ${theme}: axe 0, no overflow`);
      }
      expect(external, "No external network requests").toEqual([]);
      await context.close();
      // Keep repeated full-page runs within the existing catalogue request limit.
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  }
} finally {
  await browser.close();
}
