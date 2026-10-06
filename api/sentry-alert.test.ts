import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messageFor, POST, validSignature } from "./sentry-alert";

const SECRET = "test-secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");
const issue = {
  action: "created",
  data: { issue: { title: "TypeError: x is undefined", culprit: "src/pages/CheckoutPage.tsx", level: "error", shortId: "BOOKLY-1", web_url: "https://sentry.io/i/1", project: { slug: "bookly-frontend" } } },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Sentry → Telegram", () => {
  it("accepts only Sentry's signature", () => {
    const body = JSON.stringify(issue);
    expect(validSignature(body, sign(body), SECRET)).toBe(true);
    expect(validSignature(body, sign(body + "x"), SECRET)).toBe(false);
    expect(validSignature(body, null, SECRET)).toBe(false);
  });

  it("writes a short message for new issues and alerts, and ignores other events", () => {
    const text = messageFor("issue", issue)!;
    expect(text).toContain("New error (bookly-frontend)");
    expect(text).toContain("TypeError: x is undefined");
    expect(text).toContain("Where: src/pages/CheckoutPage.tsx");
    expect(text).toContain("https://sentry.io/i/1");
    expect(messageFor("event_alert", { action: "triggered", data: { triggered_rule: "API errors", event: { title: "500 on /orders" } } })).toContain("Alert: API errors");
    expect(messageFor("issue", { action: "resolved", data: issue.data })).toBeNull();
    expect(messageFor("installation", { action: "created" })).toBeNull();
  });

  it("forwards a signed webhook to Telegram and rejects unsigned ones", async () => {
    vi.stubEnv("SENTRY_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "bot-token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "42");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const body = JSON.stringify(issue);
    const request = (signature: string) =>
      new Request("https://example.com/api/sentry-alert", { method: "POST", body, headers: { "sentry-hook-resource": "issue", "sentry-hook-signature": signature } });

    expect((await POST(request("wrong"))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();

    expect((await POST(request(sign(body)))).status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botbot-token/sendMessage");
    expect(JSON.parse(init.body)).toMatchObject({ chat_id: "42", text: expect.stringContaining("TypeError: x is undefined") });
  });
});
