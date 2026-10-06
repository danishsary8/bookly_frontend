import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Vercel function: Sentry → Telegram.
 * A Sentry "internal integration" posts here when a new issue appears (or an alert rule fires);
 * we check Sentry's signature and send a short message to the developers' Telegram chat.
 * The bot token stays on the server (Vercel environment variables), never in the browser.
 *
 * Environment: SENTRY_WEBHOOK_SECRET (the integration's client secret), TELEGRAM_BOT_TOKEN,
 * TELEGRAM_CHAT_ID.
 */

type SentryIssue = {
  title?: string;
  culprit?: string;
  level?: string;
  shortId?: string;
  web_url?: string;
  permalink?: string;
  project?: { slug?: string; name?: string };
};
type SentryPayload = {
  action?: string;
  data?: { issue?: SentryIssue; event?: SentryIssue & { url?: string }; triggered_rule?: string };
};

/** Sentry signs the raw body with HMAC-SHA256 using the integration's client secret. */
export function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The Telegram text for a Sentry webhook, or null for events we don't announce. */
export function messageFor(resource: string | null, payload: SentryPayload): string | null {
  let item: (SentryIssue & { url?: string }) | undefined;
  let heading: string;
  if (resource === "issue" && payload.action === "created") {
    item = payload.data?.issue;
    heading = "New error";
  } else if (resource === "event_alert" && payload.action === "triggered") {
    item = payload.data?.event;
    heading = payload.data?.triggered_rule ? `Alert: ${payload.data.triggered_rule}` : "Alert";
  } else {
    return null;
  }
  if (!item) return null;
  const project = item.project?.name ?? item.project?.slug;
  const lines = [
    `🔴 Bookly · ${heading}${project ? ` (${project})` : ""}`,
    item.title ?? "Unknown error",
    item.culprit ? `Where: ${item.culprit}` : null,
    item.level ? `Level: ${item.level}${item.shortId ? ` · ${item.shortId}` : ""}` : null,
    item.web_url ?? item.permalink ?? item.url ?? null,
  ].filter(Boolean);
  return lines.join("\n").slice(0, 3500);
}

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

  const text = messageFor(request.headers.get("sentry-hook-resource"), payload);
  if (!text) return new Response(null, { status: 204 }); // e.g. installation or resolved events

  const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  return new Response(sent.ok ? "Sent" : "Telegram refused the message", { status: sent.ok ? 200 : 502 });
}
