import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorLog, messageFor, POST, statusLine, tagsOf, validSignature, type SentryEvent } from "../../api/sentry-alert";

const SECRET = "test-secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

/** Shaped like Sentry's event_alert webhook for one of our API failures (src/api/client.ts). */
const apiFailure: SentryEvent = {
  title: "ApiFailure: API GET /books → 500",
  level: "error",
  platform: "javascript",
  project_name: "javascript-react",
  environment: "production",
  release: "07ba7658bddc9d2655d48c2826d750e153e5adac",
  culprit: "src/api/client",
  web_url: "https://danish-4g.sentry.io/issues/77/events/abc/",
  tags: [
    ["api_status", "500"],
    ["api_method", "GET"],
    ["api_path", "/books"],
    ["request_id", "req-123"],
    ["url", "https://bookly-frontend-five.vercel.app/books?sort=new"],
    ["browser", "Chrome 129"],
  ],
  exception: {
    values: [
      {
        type: "ApiFailure",
        value: "API GET /books → 500",
        stacktrace: {
          frames: [
            { filename: "node_modules/axios/lib/core.js", function: "dispatch", lineno: 10, in_app: false },
            { filename: "src/api/client.ts", function: "onRejected", lineno: 41, colno: 9, in_app: true },
            { filename: "src/pages/BooksPage.tsx", function: "load", lineno: 77, colno: 3, in_app: true },
          ],
        },
      },
    ],
  },
};
const alert = (event: SentryEvent) => ({ action: "triggered", data: { triggered_rule: "Telegram", event } });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Sentry → Telegram", () => {
  it("accepts only Sentry's signature", () => {
    const body = JSON.stringify(alert(apiFailure));
    expect(validSignature(body, sign(body), SECRET)).toBe(true);
    expect(validSignature(body, sign(body + "x"), SECRET)).toBe(false);
    expect(validSignature(body, null, SECRET)).toBe(false);
  });

  it("reads tags in every shape Sentry sends and names the status", () => {
    expect(tagsOf([["a", "1"]])).toEqual({ a: "1" });
    expect(tagsOf([{ key: "a", value: "1" }])).toEqual({ a: "1" });
    expect(tagsOf({ a: "1" })).toEqual({ a: "1" });
    expect(statusLine({ api_status: "500" })).toBe("500 Internal Server Error");
    expect(statusLine({ api_status: "422" })).toBe("422 Unprocessable Content (validation failed)");
    expect(statusLine({ api_status: "network" })).toBe("network (no response: the request never reached the server)");
    expect(statusLine({})).toBeNull();
  });

  it("builds a copyable error log with status, request, page and the app's stack frames, newest first", () => {
    const log = errorLog(apiFailure);
    expect(log.split("\n").slice(0, 6)).toEqual([
      "ApiFailure: API GET /books → 500",
      "Status: 500 Internal Server Error",
      "Request: GET /books",
      "Request id: req-123",
      "Page: https://bookly-frontend-five.vercel.app/books?sort=new",
      "Where: src/api/client",
    ]);
    expect(log).toContain("Context: platform javascript, env production, release 07ba7658bddc, browser Chrome 129");
    expect(log).toContain("Stack trace, most recent call first:\n  at load (src/pages/BooksPage.tsx:77:3)\n  at onRejected (src/api/client.ts:41:9)");
    expect(log).not.toContain("axios");
  });

  it("sends one detailed message with the log in a code block, and ignores the plain new-issue webhook", () => {
    const html = messageFor("event_alert", alert(apiFailure))!;
    expect(html).toContain("🔴 <b>Bookly · javascript-react</b> · error");
    expect(html).toContain("Status: <b>500 Internal Server Error</b>");
    expect(html).toContain("Request: <code>GET /books</code>");
    expect(html).toContain('<pre><code class="language-javascript">ApiFailure: API GET /books → 500\nStatus: 500 Internal Server Error');
    expect(html).toContain('<a href="https://danish-4g.sentry.io/issues/77/events/abc/">Open in Sentry</a>');
    expect(messageFor("issue", { action: "created", data: { event: apiFailure } })).toBeNull();
    expect(messageFor("installation", { action: "created" })).toBeNull();
  });

  it("escapes code and keeps long logs under Telegram's limit", () => {
    const php: SentryEvent = {
      title: "ErrorException: Undefined array key <id>",
      platform: "php",
      exception: {
        values: [
          {
            type: "ErrorException",
            value: "Undefined array key <id> & more",
            stacktrace: { frames: Array.from({ length: 200 }, (_, i) => ({ filename: `app/Services/VeryLongServiceName${i}.php`, function: `handle${i}`, lineno: i, in_app: true })) },
          },
        ],
      },
    };
    const html = messageFor("event_alert", alert(php))!;
    expect(html).toContain('<code class="language-php">ErrorException: Undefined array key &lt;id&gt; &amp; more');
    expect(html).not.toContain("<id>");
    expect(html.length).toBeLessThanOrEqual(4096);
    expect((html.match(/ at handle/g) ?? []).length).toBeLessThanOrEqual(15);
  });

  it("forwards a signed alert to Telegram as HTML, falls back to plain text, and rejects unsigned ones", async () => {
    vi.stubEnv("SENTRY_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "bot-token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "42");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 400 })).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const body = JSON.stringify(alert(apiFailure));
    const request = (signature: string, resource = "event_alert") =>
      new Request("https://example.com/api/sentry-alert", { method: "POST", body, headers: { "sentry-hook-resource": resource, "sentry-hook-signature": signature } });

    expect((await POST(request("wrong"))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await POST(request(sign(body), "issue"))).status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();

    expect((await POST(request(sign(body)))).status).toBe(200);
    const [url, first] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botbot-token/sendMessage");
    expect(JSON.parse(first.body)).toMatchObject({ chat_id: "42", parse_mode: "HTML", text: expect.stringContaining("<pre><code") });
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.parse_mode).toBeUndefined();
    expect(second.text).toContain("Status: 500 Internal Server Error");
    expect(second.text).not.toContain("<b>");
  });
});
