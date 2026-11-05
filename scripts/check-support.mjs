import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = "http://127.0.0.1:5187", api = "http://127.0.0.1:8017/api/v1";
// Reuse existing local factory fixtures in memory; credentials/tokens never enter reports or console output.
const factory = (name) => readFileSync(`../bookly_backend_v2/database/factories/${name}Factory.php`, "utf8");
const password = (name) => factory(name).match(/'password_hash' => '([^']+)'/)[1];
function totp() {
  const secret = factory("StaffUser").match(/withTwoFactor\(string \$secret = '([^']+)'/)[1];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest(); const offset = hash[19] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
const smoke = process.env.E2E_SUPPORT_SMOKE === "1";
const output = smoke ? "test-results/support-smoke" : "test-results/support";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch(); const report = [];
const expect = baseExpect.configure({ timeout: 20000 });
async function audit(page, name) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
try {
  const authContext = await browser.newContext();
  const login = await authContext.request.post(`${api}/auth/login`, { data: { email: "support@example.test", password: password("Customer") } }); expect(login.ok()).toBe(true); const auth = await login.json();
  const staffLogin = await authContext.request.post(`${api}/staff/auth/login`, { data: { email: "support-staff@example.test", password: password("StaffUser") } }); expect(staffLogin.ok()).toBe(true); const challenge = await staffLogin.json();
  const verified = await authContext.request.post(`${api}/staff/auth/two-factor/challenge`, { data: { challenge_token: challenge.challenge_token, code: totp() } }); expect(verified.ok()).toBe(true); const staffAuth = await verified.json(); await authContext.close();
  for (const language of ["en", "km"]) for (const theme of ["light", "dark"]) for (const width of [390, 1280]) {
    if (smoke && !((language === "en" && theme === "light" && width === 1280) || (language === "km" && theme === "dark" && width === 390))) continue;
    const tag = `${language}-${theme}-${width}`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(({ auth, staffAuth, language, theme }) => {
      localStorage.setItem("bookly.session.customer", JSON.stringify({ token: auth.token, expiresAt: null, user: auth.customer }));
      localStorage.setItem("bookly.session.staff", JSON.stringify({ token: staffAuth.token, expiresAt: null, user: staffAuth.staff }));
      localStorage.setItem("bookly-language", language); localStorage.setItem("bookly-theme", theme);
    }, { auth, staffAuth, language, theme });
    await context.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    const page = await context.newPage(); await page.goto(base); await page.waitForLoadState("networkidle");
    const trigger = page.getByRole("button", { name: language === "en" ? "Chat with Bookly" : "ជជែកជាមួយ Bookly" });
    await trigger.click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: language === "en" ? "New conversation" : "ចាប់ផ្ដើមការជជែកថ្មី" }).click();
    await dialog.locator("select").first().selectOption("delivery"); await dialog.locator("select").nth(1).selectOption({ index: 1 });
    await dialog.locator("textarea").fill(language === "en" ? `Delivery question ${tag}` : `សំណួរអំពីការដឹកជញ្ជូន ${tag}`);
    await dialog.getByRole("button", { name: language === "en" ? "Send message" : "ផ្ញើសារ" }).click();
    await expect(dialog.getByRole("log")).toBeVisible({ timeout: 20000 });
    const id = await page.evaluate(() => Number(localStorage.getItem("bookly.support.1")));
    expect(id).toBeGreaterThan(0); await audit(page, `${tag}-customer`);
    // Native dialog focus is trapped and Escape returns to the bubble.
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
    const staffPage = await context.newPage(); await staffPage.goto(`${base}/admin/support?conversation=${id}`); await expect(staffPage.getByRole("log")).toBeVisible({ timeout: 20000 });
    await staffPage.getByLabel("Reply", { exact: true }).fill(`Human staff answer ${tag}`);
    const replyResponse = staffPage.waitForResponse((response) => response.url().endsWith(`/conversations/${id}/messages`) && response.request().method() === "POST");
    await staffPage.getByRole("button", { name: "Send message", exact: true }).click();
    expect((await replyResponse).status()).toBe(204);
    await expect(staffPage.getByRole("log").getByText(`Human staff answer ${tag}`)).toBeVisible({ timeout: 15000 });
    await audit(staffPage, `${tag}-staff`);
    await page.bringToFront(); await trigger.click(); await expect(dialog.getByText(`Human staff answer ${tag}`)).toBeVisible({ timeout: 12000 });
    await dialog.getByRole("button", { name: language === "en" ? "Close conversation" : "បិទការជជែក" }).click();
    const radios = dialog.getByRole("radio"); await expect(radios).toHaveCount(5); await radios.nth(3).focus(); await page.keyboard.press("ArrowRight"); await expect(radios.nth(4)).toBeChecked();
    await dialog.getByRole("button", { name: language === "en" ? "Rate this conversation" : "វាយតម្លៃការជជែកនេះ" }).click();
    await expect(dialog.getByText(/5\/5/)).toBeVisible(); await audit(page, `${tag}-rated`);
    const guestContext = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await guestContext.addInitScript(({ language, theme }) => { localStorage.setItem("bookly-language", language); localStorage.setItem("bookly-theme", theme); }, { language, theme });
    await guestContext.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    const guest = await guestContext.newPage(); await guest.goto(base); await guest.waitForLoadState("networkidle");
    await guest.getByRole("button", { name: language === "en" ? "Chat with Bookly" : "ជជែកជាមួយ Bookly" }).click();
    const guestDialog = guest.getByRole("dialog"); await guestDialog.getByLabel(language === "en" ? "Your name" : "ឈ្មោះរបស់អ្នក").fill("Guest Reader");
    await guestDialog.getByLabel(language === "en" ? "Email address" : "អាសយដ្ឋានអ៊ីមែល").fill("guest@example.test");
    await guestDialog.getByLabel(language === "en" ? "Message" : "សារ", { exact: true }).fill("Guest support question");
    await audit(guest, `${tag}-guest`);
    // The real guest IP quota is retained: submit three times, inspect the form in every combination.
    if (!smoke && report.length < 3) {
      await guestDialog.getByRole("button", { name: language === "en" ? "Send message" : "ផ្ញើសារ" }).click();
      await expect(guestDialog.getByRole("status")).toContainText("#");
    }
    await guestContext.close(); await context.close();
    report.push({ language, theme, width, customerChat: true, guestChat: true, guestSubmitted: !smoke && report.length < 3, staffReply: true, closedRating: 5, axeViolations: 0, overflow: false });
    writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(`${tag}: customer/guest/staff/rating passed, axe 0`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
} finally { await browser.close(); }
