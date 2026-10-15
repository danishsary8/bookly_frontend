import { expect, test } from "@playwright/test";
import { noAxeViolations } from "./axe";
import fs from "node:fs";
import path from "node:path";

test.describe("Khmer and Latin search browser check", () => {
  test.beforeAll(() => {
    const screenshotDir = path.resolve(process.cwd(), "../overnight-screenshots/task-7");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test("storefront search in dark mode at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Latin query
    const searchInput = page.getByRole("combobox", { name: /search/i }).first();
    await searchInput.fill("Dune");
    await page.waitForTimeout(500); // Wait for debounce and dropdown
    await page.screenshot({ path: "../overnight-screenshots/task-7/desktop-dark-search-latin.png" });
    await noAxeViolations(page);

    // Khmer query
    await searchInput.fill("រឿង");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../overnight-screenshots/task-7/desktop-dark-search-khmer.png" });
    await noAxeViolations(page);
  });

  test("mobile-menu search field at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open mobile menu
    const menuBtn = page.getByRole("button", { name: /menu/i });
    await menuBtn.click();
    await page.waitForTimeout(300);

    const mobileSearch = page.locator("#mobile-search");
    await expect(mobileSearch).toBeVisible();

    // Latin query
    await mobileSearch.fill("Hobbit");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../overnight-screenshots/task-7/mobile-menu-search-latin.png" });
    await noAxeViolations(page);

    // Khmer query
    await mobileSearch.fill("ខ្មែរ");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../overnight-screenshots/task-7/mobile-menu-search-khmer.png" });
    await noAxeViolations(page);
  });
});
