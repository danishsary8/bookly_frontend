import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { prepareDashboard } from "./fixtures/dashboard";

test("dashboard retains all information and controls with a clear responsive hierarchy", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  const { errors, writes } = await prepareDashboard(page, baseURL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const headings = ["Net revenue", "Orders placed", "Average order", "New customers", "Income report", "Orders placed by status", "Books sold", "Ebooks sold", "Order ratings", "Best sellers", "Top categories", "Low stock", "Payment methods", "Cart reminder recovery", "System health"];
  for (const [width, height, theme] of [[1440, 900, "light"], [1366, 768, "light"], [1920, 1080, "light"], [768, 1024, "light"], [390, 844, "light"], [375, 812, "light"], [844, 390, "light"], [1440, 900, "dark"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/admin");
    await page.evaluate((theme) => localStorage.setItem("bookly-theme-choice", theme), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.locator(".dash-kpi")).toHaveCount(4);
    await expect(page.getByRole("region", { name: "Net revenue", exact: true })).toHaveAccessibleDescription(/Changes vs/);
    for (const heading of headings) await expect(page.getByRole("heading", { name: heading, exact: true }), `${width}/${theme}: ${heading}`).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${theme}: overflow`).toBe(true);
    expect(errors, `${width}/${theme}`).toEqual([]);
    if (width >= 1280) {
      const values = await page.locator(".dash-kpi-amount").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
      expect(Math.max(...values) - Math.min(...values)).toBeLessThan(2);
    }
    await page.screenshot({ path: `overnight-screenshots/dashboard-clarity-${width}-${height}-${theme}.png`, fullPage: true });
    if ([1440, 390].includes(width)) {
      const { violations } = await new AxeBuilder({ page }).include(".dash-overview").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) })), `${width}/${theme}: axe`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  await page.getByRole("radio", { name: "7 days", exact: true }).click();
  await expect(page).toHaveURL(/period=7d/);
  await page.getByRole("radio", { name: "Custom", exact: true }).click();
  const custom = page.getByRole("form", { name: "Custom period" });
  await expect(custom).toBeVisible();
  await custom.getByLabel("From", { exact: true }).fill("2026-11-01");
  await custom.getByLabel("To", { exact: true }).fill("2026-11-16");
  await custom.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/period=custom/);
  const chart = page.getByRole("region", { name: "Income report", exact: true });
  await chart.getByRole("button", { name: "Show as a table", exact: true }).click();
  await expect(chart.getByRole("table")).toBeVisible();
  await chart.getByRole("radio", { name: "Orders", exact: true }).click();
  await expect(chart.getByRole("region", { name: "Orders placed by day", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/admin");
  await expect(page.locator(".dash-kpi-amount > p").first()).toHaveText("$101.05");
  await page.locator(".dash-kpi").first().hover();
  await expect.poll(() => page.locator(".dash-kpi").first().evaluate((node) => getComputedStyle(node).getPropertyValue("--spot-x"))).not.toBe("");
  await page.mouse.move(280, 70);
  await page.screenshot({ path: "overnight-screenshots/dashboard-clarity-desktop-first-screen.png" });
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("dashboard fits its available space with enlarged text", async ({ page, baseURL }) => {
  await prepareDashboard(page, baseURL);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin");
  await expect(page.locator(".dash-kpi")).toHaveCount(4);
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  const dimensions = await page.locator(".dash-overview").evaluate((root) => ({
    width: root.clientWidth, scroll: root.scrollWidth,
    outside: Array.from(root.querySelectorAll("*")).filter((node) => {
      if (node.getBoundingClientRect().right <= root.getBoundingClientRect().right + 1) return false;
      for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
        if (["auto", "hidden", "clip", "scroll"].includes(getComputedStyle(parent).overflowX)) return false;
      }
      return true;
    }).slice(0, 10).map((node) => ({ className: node.className, parent: node.parentElement?.className })),
  }));
  if (dimensions.scroll > dimensions.width) console.log("Enlarged dashboard:", dimensions);
  expect(dimensions.scroll <= dimensions.width).toBe(true);
});
