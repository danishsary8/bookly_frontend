import { expect, test, type Locator } from "@playwright/test";
import { prepareDashboard, summary, insights } from "./fixtures/dashboard";

test.use({ hasTouch: true });

async function scrollToChart(chart: Locator) {
  // Tooltip inspection intentionally dismisses on scroll. Finish scrolling before moving the pointer,
  // including its queued scroll event; hover's automatic scroll can dispatch that event after pointermove.
  await chart.evaluate(async (node) => {
    node.scrollIntoView({ behavior: "instant", block: "center" });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

function periodData(count: number) {
  const date = (index: number) => new Date(Date.UTC(2026, 10, 17 - count + index)).toISOString().slice(0, 10);
  const trend = Array.from({ length: count }, (_, index) => ({
    date: date(index), previous_date: new Date(Date.UTC(2026, 10, 17 - count * 2 + index)).toISOString().slice(0, 10),
    net_revenue_usd: String(count === 1 ? 0 : count === 7 ? [3, 8, 2, 10, 1, 4, 7][index] : 10 + index % 6 * 3),
    previous_net_revenue_usd: "2.00", orders_placed: index % 4 + 1, previous_orders_placed: 1,
    average_order_usd: String(4 + index % 7), previous_average_order_usd: "2.00", new_customers: index % 3, previous_new_customers: 1,
    books_sold: index % 3, ebooks_sold: index % 4 === 0 ? 2 : 0,
  }));
  const period = { from: date(0), to: date(count - 1), timezone: "Asia/Phnom_Penh" };
  const sum = (pick: (point: typeof trend[number]) => number) => trend.reduce((total, point) => total + pick(point), 0);
  const income = sum((point) => Number(point.net_revenue_usd)).toFixed(2);
  return {
    summary: { ...summary, period, revenue: { ...summary.revenue, gross_usd: income, net_usd: income, refunds_usd: "0.00" }, orders_placed: sum((point) => point.orders_placed), books_sold: sum((point) => point.books_sold), ebooks_sold: sum((point) => point.ebooks_sold) },
    insights: { ...insights, period, trend },
    sales: trend.map((point) => ({ date: point.date, orders_placed: point.orders_placed, gross_revenue_usd: point.net_revenue_usd, net_revenue_usd: point.net_revenue_usd, refunds_usd: "0.00" })),
  };
}

test("dashboard charts morph between periods and expose exact hover, keyboard and touch values", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const { errors, writes } = await prepareDashboard(page, baseURL);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/v1/staff/dashboard/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["summary", "insights", "sales"].includes(url.pathname.split("/").at(-1) ?? "")) return route.fallback();
    const data = periodData(url.searchParams.get("period") === "7d" ? 7 : url.searchParams.get("period") === "today" ? 1 : 30);
    await new Promise((resolve) => setTimeout(resolve, url.pathname.endsWith("summary") ? 150 : 400));
    const body = url.pathname.endsWith("summary") ? data.summary : url.pathname.endsWith("insights") ? data.insights : data.sales;
    return route.fulfill({ json: { data: body } });
  });
  await page.goto("/admin");
  await expect(page.locator(".dash-kpi-amount > p").first()).toHaveText("$525.00");
  const income = page.getByRole("region", { name: "Income report", exact: true });
  await income.getByRole("button", { name: "Show as a table", exact: true }).click();
  await income.getByRole("radio", { name: "Orders", exact: true }).click();
  const curve = page.locator('[data-chart-path="trend"]').first();
  const curveNode = await curve.elementHandle();
  const oldCurve = await curve.getAttribute("d");
  const response = page.waitForResponse((response) => response.url().includes("dashboard/insights") && new URL(response.url()).searchParams.get("period") === "7d");
  await page.getByRole("radio", { name: "7 days", exact: true }).click();
  expect(await curve.getAttribute("d")).toBe(oldCurve);
  await expect(page.locator(".dash-kpi")).toHaveCount(4);
  await response;
  await expect.poll(() => curve.getAttribute("d")).not.toBe(oldCurve);
  const intermediate = await curve.getAttribute("d");
  await expect(page.locator(".dash-kpi-amount > p").first()).toHaveText("$35.00");
  await page.waitForTimeout(750); // Sample the completed curve after its 700ms interpolation.
  const sevenDayCurve = await curve.getAttribute("d");
  expect(sevenDayCurve).not.toBe(intermediate);
  expect(await curveNode?.evaluate((node) => node.isConnected)).toBe(true);
  await expect(income.getByRole("radio", { name: "Orders", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(income.getByRole("table").getByRole("row")).toHaveCount(8);

  await curve.locator("xpath=ancestor::div[@role='group']").focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tooltip")).toContainText("$3.00");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tooltip")).toContainText("$8.00");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("heading", { name: "Dashboard", exact: true }).click();

  // Cached responses and quick reversals must converge to the final selection without remounting.
  await page.getByRole("radio", { name: "30 days", exact: true }).click();
  await page.getByRole("radio", { name: "7 days", exact: true }).click();
  await expect.poll(() => curve.getAttribute("d")).toBe(sevenDayCurve);
  await expect(page.locator(".dash-kpi-amount > p").first()).toHaveText("$35.00");
  const books = page.getByRole("region", { name: "Books sold", exact: true });
  await scrollToChart(books);
  // The bars are still settling after the period change: hover again until the tooltip opens for the first day.
  await expect(async () => {
    await page.mouse.move(0, 0);
    await books.locator(".dash-daily-bar-hit").first().hover();
    await expect(page.getByRole("tooltip")).toContainText("0 copies", { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await expect(books.locator(".dash-daily-bar").first()).toHaveCSS("height", "0px");
  expect(await page.getByRole("tooltip").evaluate((node) => node.parentElement === document.body)).toBe(true);
  await page.getByRole("tooltip").hover();
  await page.waitForTimeout(250); // A tooltip must remain open while the pointer is over it.
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const bookLink = page.locator(".magic-bento__card").filter({ has: page.getByRole("heading", { name: "Books sold", exact: true }) });
  await scrollToChart(bookLink);
  await bookLink.focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tooltip")).toContainText("0 copies");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tooltip")).toContainText("1 copy");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await scrollToChart(books);
  await books.locator(".dash-daily-bar-hit").first().tap();
  await expect(page.getByRole("tooltip")).toContainText("0 copies");
  await expect(page).toHaveURL(/\/admin\?period=7d$/);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "overnight-screenshots/dashboard-motion-touch.png", fullPage: true });
});
