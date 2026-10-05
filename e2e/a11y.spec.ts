import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/* WCAG 2.1 A/AA checks with axe on the public pages, in light and dark, desktop and phone. */

const PAGES = ["/", "/books", "/books/1", "/authors", "/authors/1", "/series", "/search?q=holmes", "/cart", "/login", "/register", "/faq", "/shipping", "/contact", "/admin/login", "/no-such-page"];

async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
}

for (const scheme of ["light", "dark"] as const) {
  for (const [label, viewport] of [["desktop", { width: 1366, height: 900 }], ["phone", { width: 375, height: 800 }]] as const) {
    test(`no WCAG A/AA violations · ${scheme} · ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      const found: string[] = [];
      for (const path of PAGES) {
        await page.goto(path);
        await page.locator("h1").first().waitFor();
        await page.waitForLoadState("networkidle");
        for (const v of await audit(page)) found.push(`${path} → ${v}`);
      }
      expect(found, found.join("\n")).toEqual([]);
    });
  }
}
