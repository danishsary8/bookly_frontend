import { createHmac } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * The flows that must never break, end to end against a running API with demo data:
 * browse → book → cart → cash-on-delivery checkout → order page, then a staff member signs
 * in with an authenticator code and moves that order on. Plus keyboard basics and axe on
 * signed-in pages. Accounts come from the environment (README → Testing).
 */

const API = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
const CUSTOMER = { email: process.env.E2E_CUSTOMER_EMAIL ?? "demo@bookly.test", password: process.env.E2E_CUSTOMER_PASSWORD ?? "Password123!" };
const STAFF = { email: process.env.E2E_STAFF_EMAIL ?? "admin@bookly.test", password: process.env.E2E_STAFF_PASSWORD, secret: process.env.E2E_STAFF_TOTP_SECRET };


/** RFC 6238 code (SHA-1, 30 s, 6 digits) from a base32 secret, as an authenticator app shows it. */
function totp(secret: string, at = Date.now()) {
  const bits = [...secret.replace(/[\s=]/g, "").toUpperCase()].map((c) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function noAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.html.slice(0, 160)).join(" | ")}`)).toEqual([]);
}

let orderNumber = "";

test("keyboard: skip link, cart drawer focus and Escape", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#content")).toBeFocused();

  const cart = page.getByRole("button", { name: /^Cart/ });
  await cart.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(cart).toBeFocused();
});

test("customer: book → cart → cash on delivery → order page", async ({ page, request }) => {
  const books = (await (await request.get(`${API}/books?per_page=50`)).json()) as { data: Array<{ id: number; title: string; in_stock: boolean }> };
  const book = books.data.find((b) => b.in_stock);
  test.skip(!book, "No book in stock in the demo data");

  await page.goto("/login?next=%2Fcart");
  await page.getByLabel("Email").fill(CUSTOMER.email);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/cart$/);

  await page.goto(`/books/${book!.id}`);
  await expect(page.getByRole("heading", { level: 1, name: book!.title })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("button", { name: "View cart" })).toBeVisible();

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Cash on delivery/ })).toBeChecked();
  await noAxeViolations(page);
  if (await page.getByRole("button", { name: "Add a new address" }).isVisible() && !(await page.getByRole("radio", { name: /Phnom Penh|St |Street|House/ }).count())) {
    await page.getByRole("button", { name: "Add a new address" }).click();
    const dialog = page.getByRole("dialog", { name: "New address" });
    await dialog.getByLabel("Street address").fill("House 12, St 240");
    await dialog.getByLabel("City").fill("Phnom Penh");
    await dialog.getByRole("button", { name: "Use this address" }).click();
  }
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/checkout\/success\/\d+/);
  await expect(page.getByRole("heading", { level: 1, name: "Thank you for your order" })).toBeVisible();
  orderNumber = (await page.locator("strong.tabular-nums").first().innerText()).trim();

  await page.goto("/account/orders");
  await page.getByRole("link", { name: orderNumber }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(orderNumber);
  await noAxeViolations(page);
});

test("staff: sign in with an authenticator code and start processing the order", async ({ page }) => {
  test.skip(!STAFF.password || !STAFF.secret, "Set E2E_STAFF_PASSWORD and E2E_STAFF_TOTP_SECRET");
  test.skip(!orderNumber, "Needs the order from the customer test");

  await page.goto("/admin/login");
  await page.getByLabel("Work email").fill(STAFF.email);
  await page.getByLabel("Password", { exact: true }).fill(STAFF.password!);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Authentication code")).toBeVisible();
  // A code can be used once; if this window's code was just used, wait for the next one.
  if (30_000 - (Date.now() % 30_000) < 3_000) await page.waitForTimeout(3_500);
  await page.keyboard.type(totp(STAFF.secret!));
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page.waitForURL(/\/admin$/);
  await noAxeViolations(page);

  await page.goto(`/admin/orders?q=${orderNumber}`);
  await page.getByRole("link", { name: orderNumber }).click();
  await page.getByRole("button", { name: "Start processing" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Start processing" }).click();
  await expect(page.getByText("Order is being processed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as shipped" })).toBeVisible();
  await noAxeViolations(page);
});
