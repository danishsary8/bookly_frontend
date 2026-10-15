import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** axe on the settled page: no "Loading…" left (a half-faded loader fails contrast at random) and finite animations done. */
export async function noAxeViolations(page: Page) {
  await expect(page.getByText(/^Loading/)).toHaveCount(0);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.html.slice(0, 160)).join(" | ")}`)).toEqual([]);
}
