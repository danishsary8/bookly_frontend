import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { noAxeViolations } from "./axe";

/*
 * The other two journeys that must never break, against a running API with demo data:
 * a new customer signs up and confirms the email code; a customer returns a delivered book and
 * staff approve and refund it. The email code is read from the API's mail log (MAIL_MAILER=log),
 * given as E2E_MAIL_LOG. Staff steps use E2E_STAFF_SESSION (see .github/workflows/e2e.yml).
 */

const API = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
const MAIL_LOG = process.env.E2E_MAIL_LOG;
const STAFF_SESSION = process.env.E2E_STAFF_SESSION;
const CUSTOMER = { email: process.env.E2E_CUSTOMER_EMAIL ?? "demo@bookly.test", password: process.env.E2E_CUSTOMER_PASSWORD ?? "Password123!" };
const json = { Accept: "application/json" };

// Reduced motion: headings fade in with JavaScript motion, which axe would catch half-visible.
test.use({ contextOptions: { reducedMotion: "reduce" } });

/** The last 6-digit code mailed to this address (the log keeps the whole email). */
function codeMailedTo(email: string): string | null {
  const log = readFileSync(MAIL_LOG!, "utf8");
  const at = log.lastIndexOf(email);
  return at === -1 ? null : (log.slice(at).match(/\b\d{6}\b/)?.[0] ?? null);
}

test("new customer: sign up → email code → verified", async ({ page }) => {
  test.skip(!MAIL_LOG, "Set E2E_MAIL_LOG to the API's storage/logs/laravel.log (MAIL_MAILER=log)");
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Test Reader");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Reading123");
  await page.getByLabel("Confirm password").fill("Reading123");
  await page.getByRole("button", { name: /Create/ }).click();
  await page.waitForURL(/\/verify-email/);
  await noAxeViolations(page);

  let code: string | null = null;
  await expect.poll(() => (code = codeMailedTo(email)), { message: "the code email reached the mail log" }).not.toBeNull();
  await page.getByRole("textbox").first().pressSequentially(code!);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/verify-email"));

  // Verified customers can open their account and shop.
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

/** Places and delivers an order for one printed book (ebooks can't be returned) through the API. */
async function deliveredPrintedOrder(request: APIRequestContext, customerToken: string, staffToken: string) {
  const asCustomer = { ...json, Authorization: `Bearer ${customerToken}` };
  const asStaff = { ...json, Authorization: `Bearer ${staffToken}` };
  const books = (await (await request.get(`${API}/books?per_page=50`)).json()) as { data: Array<{ id: number; in_stock: boolean }> };
  let variantId: number | undefined;
  for (const book of books.data.filter((b) => b.in_stock)) {
    const detail = (await (await request.get(`${API}/books/${book.id}`)).json()) as { data: { variants: Array<{ id: number; format: string; in_stock: boolean }> } };
    variantId = detail.data.variants.find((v) => v.in_stock && (v.format === "paperback" || v.format === "hardcover"))?.id;
    if (variantId) break;
  }
  expect(variantId, "a printed book in stock").toBeTruthy();

  const cart = (await (await request.get(`${API}/cart`, { headers: asCustomer })).json()) as { data: { items: Array<{ id: number }> } };
  for (const item of cart.data.items) await request.delete(`${API}/cart/items/${item.id}`, { headers: asCustomer });
  expect((await request.post(`${API}/cart/items`, { headers: asCustomer, data: { book_variant_id: variantId, quantity: 1 } })).ok()).toBe(true);

  let addresses = ((await (await request.get(`${API}/addresses`, { headers: asCustomer })).json()) as { data: Array<{ id: number }> }).data;
  if (!addresses.length) {
    await request.post(`${API}/addresses`, { headers: asCustomer, data: { recipient_name: "Test Reader", phone: "012345678", street_address: "House 12, St 240", city: "Phnom Penh", country: "Cambodia" } });
    addresses = ((await (await request.get(`${API}/addresses`, { headers: asCustomer })).json()) as { data: Array<{ id: number }> }).data;
  }
  const placed = await request.post(`${API}/checkout`, {
    headers: { ...asCustomer, "Idempotency-Key": randomUUID() },
    data: { address_id: addresses[0].id, payment_method: "cod" },
  });
  expect(placed.ok(), await placed.text()).toBe(true);
  const order = ((await placed.json()) as { data: { id: number; order_number: string } }).data;

  for (const status of ["processing", "shipped", "delivered"]) {
    const moved = await request.post(`${API}/staff/orders/${order.id}/status`, { headers: asStaff, data: { status } });
    expect(moved.ok(), await moved.text()).toBe(true);
  }
  return order;
}

test("return: customer asks to return a delivered book → staff approve → refund", async ({ page, context, request }) => {
  test.skip(!STAFF_SESSION, "Set E2E_STAFF_SESSION (see .github/workflows/e2e.yml)");
  const staff = JSON.parse(STAFF_SESSION!) as { token: string };
  const login = await request.post(`${API}/auth/login`, { headers: json, data: CUSTOMER });
  expect(login.ok(), await login.text()).toBe(true);
  const customer = (await login.json()) as { token: string; customer: unknown };
  const order = await deliveredPrintedOrder(request, customer.token, staff.token);

  // Customer asks for the return.
  await context.addInitScript((session) => localStorage.setItem("bookly.session.customer", session), JSON.stringify({ token: customer.token, expiresAt: null, user: customer.customer }));
  await page.goto(`/account/orders/${order.id}/return`);
  await page.getByRole("checkbox").first().check();
  await page.getByLabel("What's wrong with it?").first().fill("The cover arrived torn.");
  await page.getByLabel("Why are you returning these books?").fill("Damaged in delivery.");
  await noAxeViolations(page);
  await page.getByRole("button", { name: "Request return" }).click();
  await page.waitForURL(/\/account\/returns\/\d+/);
  const returnId = Number(page.url().match(/returns\/(\d+)/)![1]);

  // Staff approve it, then refund it.
  await page.evaluate((session) => localStorage.setItem("bookly.session.staff", session), STAFF_SESSION!);
  await page.goto(`/admin/returns/${returnId}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noAxeViolations(page);
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Return approved").first()).toBeVisible();
  await page.getByRole("button", { name: /record refund|refund/i }).click();
  await page.getByRole("dialog").getByLabel(/how was the money returned/i).selectOption("cash");
  await page.getByRole("dialog").getByRole("button", { name: /record refund|refund/i }).click();
  await expect(page.getByText("Refund recorded").first()).toBeVisible();

  // The customer sees it refunded, and the whole order is returned.
  const asCustomer = { ...json, Authorization: `Bearer ${customer.token}` };
  const after = (await (await request.get(`${API}/returns/${returnId}`, { headers: asCustomer })).json()) as { data: { status: string } };
  expect(after.data.status).toBe("refunded");
  const orderAfter = (await (await request.get(`${API}/orders/${order.id}`, { headers: asCustomer })).json()) as { data: { status: string } };
  expect(orderAfter.data.status).toBe("returned");
});
