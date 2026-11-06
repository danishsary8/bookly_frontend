import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "http://127.0.0.1:5191", api = "http://127.0.0.1:8021/api/v1";
const factory = readFileSync("../bookly_backend_v2/database/factories/StaffUserFactory.php", "utf8");
const password = factory.match(/'password_hash' => '([^']+)'/)[1];
function totp() {
  const secret = factory.match(/withTwoFactor\(string \$secret = '([^']+)'/)[1];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest(); const offset = hash[19] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
const output = "test-results/dashboard-v2";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 30000 });
const report = [];
try {
  const loginContext = await browser.newContext();
  const login = await loginContext.request.post(`${api}/staff/auth/login`, { data: { email: "dashboard-staff@example.test", password } });
  expect(login.ok()).toBe(true);
  const challenge = await login.json();
  const verified = await loginContext.request.post(`${api}/staff/auth/two-factor/challenge`, { data: { challenge_token: challenge.challenge_token, code: totp() } });
  expect(verified.ok()).toBe(true);
  const auth = await verified.json();
  await loginContext.close();
  for (const [language, theme, width] of [["en", "light", 1280], ["km", "dark", 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(({ auth, language, theme }) => {
      localStorage.setItem("bookly.session.staff", JSON.stringify({ token: auth.token, expiresAt: null, user: auth.staff }));
      localStorage.setItem("bookly-language", language); localStorage.setItem("bookly-theme", theme);
    }, { auth, language, theme });
    await context.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    const page = await context.newPage();
    // Staff pages and printed documents deliberately use the existing English-only policy.
    for (const [path, heading] of [["/admin?period=90d", "Dashboard"], ["/admin/purchases", "Stock purchase list"], ["/admin/reports/print?period=90d", "Dashboard report"]]) {
      await page.goto(`${base}${path}`); await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: heading, exact: true }).last()).toBeVisible();
      if (path === "/admin/purchases") {
        const table = page.getByRole("region", { name: "Stock purchase list" });
        await table.focus();
        await expect(table).toBeFocused();
        await page.keyboard.press("ArrowRight");
      }
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      if (violations.length) process.stdout.write(`Accessibility issues on ${path} (${width}px).\n`);
      expect(violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      report.push({ language, theme, width, path, axeViolations: 0, overflow: false });
    }
    await context.close();
  }
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  process.stdout.write(`Dashboard smoke passed: ${report.length} page audits.\n`);
} finally {
  await browser.close();
}
