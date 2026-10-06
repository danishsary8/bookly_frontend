import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Vercel function: Sentry → Telegram.
 * Sentry's alert rule ("Send a notification via Telegram") posts the full error event here. We check
 * Sentry's signature and send ONE message per error: a short summary (title, status code and reason,
 * request, page) and the error log in a code block, which Telegram shows with a copy button, ready to
 * paste to whoever fixes it. The plain "new issue" webhook is ignored: it has no details and would
 * repeat the same error.
 *
 * Environment: SENTRY_WEBHOOK_SECRET (the integration's client secret), TELEGRAM_BOT_TOKEN,
 * TELEGRAM_CHAT_ID.
 */

type Frame = { filename?: string; abs_path?: string; module?: string; function?: string; lineno?: number; colno?: number; in_app?: boolean };
type ExceptionValue = { type?: string; value?: string; stacktrace?: { frames?: Frame[] } | null };
type Tags = Array<[string, string]> | Array<{ key: string; value: string }> | Record<string, string>;
export type SentryEvent = {
  title?: string;
  message?: string;
  culprit?: string;
  level?: string;
  platform?: string;
  project?: string | number;
  project_name?: string;
  release?: string | null;
  environment?: string;
  url?: string;
  web_url?: string;
  issue_url?: string;
  tags?: Tags;
  request?: { url?: string; method?: string } | null;
  exception?: { values?: ExceptionValue[] } | null;
  logentry?: { formatted?: string; message?: string } | null;
};
type SentryPayload = {
  action?: string;
  data?: { event?: SentryEvent; triggered_rule?: string };
};

const MAX_MESSAGE = 4000; // Telegram allows 4096 characters
const MAX_FRAMES = 15;

const REASONS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  409: "Conflict",
  413: "Payload Too Large",
  419: "Session Expired",
  422: "Unprocessable Content (validation failed)",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

/** Sentry signs the raw body with HMAC-SHA256 using the integration's client secret. */
export function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sentry sends tags as [key, value] pairs, {key, value} objects or a plain object. */
export function tagsOf(tags: Tags | undefined): Record<string, string> {
  if (!tags) return {};
  if (!Array.isArray(tags)) return { ...tags };
  const out: Record<string, string> = {};
  for (const tag of tags) {
    if (Array.isArray(tag)) out[tag[0]] = String(tag[1]);
    else if (tag && typeof tag === "object") out[tag.key] = String(tag.value);
  }
  return out;
}

/** "500 Internal Server Error" from any status tag the event carries (our API failures tag api_status). */
export function statusLine(tags: Record<string, string>): string | null {
  const raw = tags.api_status ?? tags["http.status_code"] ?? tags.status_code;
  if (!raw) return null;
  const code = Number(raw);
  if (!Number.isInteger(code)) return `${raw} (no response: the request never reached the server)`;
  return `${code} ${REASONS[code] ?? (code >= 500 ? "Server Error" : "Client Error")}`;
}

function frameLine(frame: Frame): string {
  const where = frame.filename || frame.abs_path || frame.module || "?";
  const position = frame.lineno ? `:${frame.lineno}${frame.colno ? `:${frame.colno}` : ""}` : "";
  return `  at ${frame.function || "<anonymous>"} (${where}${position})`;
}

/** The plain-text error log: what an AI (or a developer) needs to fix it. */
export function errorLog(event: SentryEvent): string {
  const tags = tagsOf(event.tags);
  const lines: string[] = [];
  const values = event.exception?.values ?? [];
  const main = values[values.length - 1];

  if (main) lines.push(`${main.type ?? "Error"}: ${main.value ?? ""}`.trim());
  else lines.push(event.logentry?.formatted ?? event.message ?? event.title ?? "Unknown error");

  const status = statusLine(tags);
  if (status) lines.push(`Status: ${status}`);
  if (tags.api_method || tags.api_path) lines.push(`Request: ${[tags.api_method, tags.api_path].filter(Boolean).join(" ")}`);
  else if (event.request?.url) lines.push(`Request: ${[event.request.method, event.request.url].filter(Boolean).join(" ")}`);
  if (tags.request_id) lines.push(`Request id: ${tags.request_id}`);
  if (tags.url) lines.push(`Page: ${tags.url}`);
  if (event.culprit) lines.push(`Where: ${event.culprit}`);
  const context = [
    event.platform && `platform ${event.platform}`,
    event.environment && `env ${event.environment}`,
    event.release && `release ${String(event.release).slice(0, 12)}`,
    tags.browser && `browser ${tags.browser}`,
    tags["os.name"] && `os ${tags["os.name"]}`,
  ].filter(Boolean);
  if (context.length) lines.push(`Context: ${context.join(", ")}`);

  for (const value of [...values].reverse()) {
    const frames = value.stacktrace?.frames ?? [];
    if (!frames.length) continue;
    const appFrames = frames.filter((f) => f.in_app);
    const shown = (appFrames.length ? appFrames : frames).slice(-MAX_FRAMES).reverse();
    lines.push("", values.length > 1 ? `Stack trace (${value.type ?? "Error"}), most recent call first:` : "Stack trace, most recent call first:");
    lines.push(...shown.map(frameLine));
  }
  return lines.join("\n");
}

const LANGUAGES: Record<string, string> = { javascript: "javascript", node: "javascript", php: "php", python: "python" };

/** The Telegram message (HTML) for a Sentry webhook, or null for webhooks we don't announce. */
export function messageFor(resource: string | null, payload: SentryPayload): string | null {
  if (resource !== "event_alert" || payload.action !== "triggered") return null;
  const event = payload.data?.event;
  if (!event) return null;

  const tags = tagsOf(event.tags);
  const project = event.project_name ?? tags.project ?? (typeof event.project === "string" ? event.project : undefined);
  const status = statusLine(tags);
  const link = event.web_url ?? event.issue_url ?? event.url;
  const language = LANGUAGES[event.platform ?? ""] ?? "log";

  const header = [
    `🔴 <b>Bookly${project ? ` · ${escapeHtml(project)}` : ""}</b>${event.level ? ` · ${escapeHtml(event.level)}` : ""}`,
    `<b>${escapeHtml(event.title ?? "Unknown error")}</b>`,
    status ? `Status: <b>${escapeHtml(status)}</b>` : null,
    tags.api_method || tags.api_path ? `Request: <code>${escapeHtml([tags.api_method, tags.api_path].filter(Boolean).join(" "))}</code>` : null,
    tags.url ? `Page: ${escapeHtml(tags.url)}` : null,
  ].filter(Boolean);
  const footer = link ? `<a href="${escapeHtml(link)}">Open in Sentry</a>` : "";

  // Keep the whole message under Telegram's limit by trimming the end of the log.
  const room = MAX_MESSAGE - header.join("\n").length - footer.length - 80;
  let log = errorLog(event);
  if (log.length > room) log = `${log.slice(0, Math.max(0, room - 20))}\n  … (trimmed)`;

  return [...header, "", `<pre><code class="language-${language}">${escapeHtml(log)}</code></pre>`, footer].filter((part) => part !== "").join("\n");
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!secret || !token || !chatId) return new Response("Not configured", { status: 503 });

  const body = await request.text();
  if (!validSignature(body, request.headers.get("sentry-hook-signature"), secret)) {
    return new Response("Bad signature", { status: 401 });
  }

  let payload: SentryPayload;
  try {
    payload = JSON.parse(body) as SentryPayload;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const html = messageFor(request.headers.get("sentry-hook-resource"), payload);
  if (!html) return new Response(null, { status: 204 }); // e.g. the plain "new issue" webhook, installation

  const send = (text: string, parseMode?: "HTML") =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, ...(parseMode ? { parse_mode: parseMode } : {}) }),
    });

  let sent = await send(html, "HTML");
  // If Telegram can't read the formatting for some reason, still deliver the alert as plain text.
  if (!sent.ok && sent.status === 400) sent = await send(stripHtml(html));
  return new Response(sent.ok ? "Sent" : "Telegram refused the message", { status: sent.ok ? 200 : 502 });
}
