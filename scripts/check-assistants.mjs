import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const expect = baseExpect.configure({ timeout: 30000 });
const base = "http://127.0.0.1:5188", api = "http://127.0.0.1:8018/api/v1";
const factory = (name) => readFileSync(`../bookly_backend_v2/database/factories/${name}Factory.php`, "utf8");
const password = factory("StaffUser").match(/'password_hash' => '([^']+)'/)[1];
function totp() {
  const secret = factory("StaffUser").match(/withTwoFactor\(string \$secret = '([^']+)'/)[1];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest(); const offset = hash[19] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
mkdirSync("test-results/assistants", { recursive: true });
const browser = await chromium.launch(); const report = [];
async function audit(page, tag) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }))).toEqual([]);
  await page.screenshot({ path: `test-results/assistants/${tag}.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, elements: [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map((element) => ({ tag: element.tagName, className: element.getAttribute("class"), right: Math.round(element.getBoundingClientRect().right) })) }));
  if (overflow.documentWidth > overflow.width) console.error(JSON.stringify(overflow));
  expect(overflow).toMatchObject({ documentWidth: overflow.width });
}
try {
  const authContext = await browser.newContext();
  const login = await authContext.request.post(`${api}/staff/auth/login`, { data: { email: "assistant-staff@example.test", password } });
  expect(login.ok()).toBe(true); const challenge = await login.json();
  const verified = await authContext.request.post(`${api}/staff/auth/two-factor/challenge`, { data: { challenge_token: challenge.challenge_token, code: totp() } });
  expect(verified.ok()).toBe(true); const staff = await verified.json(); await authContext.close();
  for (const [language, theme, width] of [["en", "light", 1280], ["km", "dark", 390]]) {
    if (process.env.ASSIST_SMOKE_KM_ONLY === "1" && language !== "km") continue;
    const tag = `${language}-${theme}-${width}`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(({ language, theme }) => { localStorage.setItem("bookly-language", language); localStorage.setItem("bookly-theme", theme); }, { language, theme });
    await context.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    const page = await context.newPage(); await page.goto(base);
    await page.getByRole("button", { name: language === "en" ? "Chat with Bookly" : "ជជែកជាមួយ Bookly" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("tab", { name: language === "en" ? "Automatic assistant" : "ជំនួយការស្វ័យប្រវត្តិ" })).toHaveAttribute("aria-selected", "true");
    await dialog.getByRole("button", { name: language === "en" ? "Delivery fees" : "ថ្លៃដឹកជញ្ជូន" }).click();
    await expect(dialog.getByText(/1\.50/)).toBeVisible();
    await dialog.getByLabel(language === "en" ? "Your question" : "សំណួររបស់អ្នក").fill(`Unusual question ${tag}`);
    await dialog.getByRole("button", { name: language === "en" ? "Ask" : "សួរ", exact: true }).click();
    await dialog.getByRole("button", { name: language === "en" ? "Talk to a person about this" : "និយាយជាមួយបុគ្គលិកអំពីសំណួរនេះ" }).click();
    await expect(dialog.getByLabel(language === "en" ? "Message" : "សារ", { exact: true })).toHaveValue(`Unusual question ${tag}`);
    await audit(page, `${tag}-customer`);
    await context.addInitScript((staff) => localStorage.setItem("bookly.session.staff", JSON.stringify({ token: staff.token, expiresAt: null, user: staff.staff })), staff);
    const admin = await context.newPage(); await admin.goto(`${base}/admin/assistant`);
    await admin.getByLabel("Your question").fill("sales today");
    await admin.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(admin.getByText(/Net revenue/)).toBeVisible();
    await audit(admin, `${tag}-staff`);
    await admin.goto(`${base}/admin/assistant/knowledge`);
    await expect(admin.getByText("How do reading lists work?")).toBeVisible();
    await expect(admin.getByText(`Unusual question ${tag}`)).toBeVisible();
    await audit(admin, `${tag}-knowledge`);
    report.push({ language, theme, width, customerHandoff: true, staffAnswer: true, knowledge: true, axeViolations: 0, overflow: false });
    writeFileSync("test-results/assistants/report.json", JSON.stringify(report, null, 2));
    console.log(`${tag}: assistant, staff and knowledge checks passed, axe 0`);
    await context.close();
  }
} finally { await browser.close(); }
