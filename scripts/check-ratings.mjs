import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "http://127.0.0.1:5186";
const api = "http://127.0.0.1:8016/api/v1";
if (!process.env.E2E_CUSTOMER_PASSWORD) throw new Error("Set the local factory password in the process environment.");
const browser = await chromium.launch();
const report = [];
mkdirSync("test-results/ratings", { recursive: true });
try {
  const authContext = await browser.newContext();
  const response = await authContext.request.post(`${api}/auth/login`, { data: { email: "ratings@example.test", password: process.env.E2E_CUSTOMER_PASSWORD }, headers: { Accept: "application/json" } });
  expect(response.ok()).toBe(true);
  const auth = await response.json();
  await authContext.close();
  let order = 10;
  for (const language of ["en", "km"]) for (const theme of ["light", "dark"]) for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(({ auth, language, theme }) => {
      localStorage.setItem("bookly.session.customer", JSON.stringify({ token: auth.token, expiresAt: null, user: auth.customer }));
      localStorage.setItem("bookly-language", language); localStorage.setItem("bookly-theme", theme);
    }, { auth, language, theme });
    const page = await context.newPage();
    await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    if (order === 10) {
      const below = await context.request.get(`${api}/store-rating`);
      expect((await below.json()).data).toBeNull();
    }
    await page.goto(`${base}/account/orders/${order}`);
    await page.waitForLoadState("networkidle");
    const group = page.locator('fieldset[role="radiogroup"]');
    await expect(group).toBeVisible({ timeout: 15000 });
    const radios = group.getByRole("radio");
    await radios.nth(3).focus(); await page.keyboard.press("ArrowRight");
    await expect(radios.nth(4)).toBeChecked();
    const form = page.locator("form").filter({ has: group });
    await form.getByRole("textbox").fill(language === "en" ? "Arrived safely" : "បានទទួលទំនិញដោយសុវត្ថិភាព");
    await form.getByRole("button", { name: language === "en" ? "Save rating" : "រក្សាទុកការវាយតម្លៃ" }).click();
    await page.waitForLoadState("networkidle");
    const result = await context.request.get(`${api}/orders/${order}/rating`, { headers: { Authorization: `Bearer ${auth.token}` } });
    expect((await result.json()).data.stars).toBe(5);
    for (const path of [`/account/orders/${order}`, "/"]) {
      await page.goto(base + path); await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      if (path === "/") await expect(page.getByText(language === "en" ? /orders rated/ : /ការបញ្ជាទិញ.*បានវាយតម្លៃ/)).toHaveCount(2);
      await page.screenshot({ path: `test-results/ratings/${language}-${theme}-${width}-${path === "/" ? "home" : "order"}.png`, fullPage: true });
    }
    report.push({ language, theme, width, ratedOrder: order, axeViolations: 0, overflow: false });
    writeFileSync("test-results/ratings/report.json", JSON.stringify(report, null, 2));
    console.log(`${language} ${theme} ${width}: rating saved, badge threshold checked, axe 0`);
    await context.close(); order++;
    if (order < 18) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
} finally { await browser.close(); }
