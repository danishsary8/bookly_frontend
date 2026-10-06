/*
 * Vercel function: error-report tunnel (Sentry's `tunnel` option).
 * Ad and tracker blockers (Brave Shields, uBlock…) block requests to sentry.io, so the website sends
 * its error reports here, to its own address, and this forwards them to Sentry unchanged.
 * Only envelopes for Bookly's own Sentry project are forwarded, so this can't be used as an open proxy.
 *
 * Environment: VITE_SENTRY_DSN (the same DSN the website uses).
 */

const MAX_BYTES = 1_000_000;

type Target = { host: string; projectId: string };

/** Host and project id from a DSN like https://key@o123.ingest.us.sentry.io/456. */
export function parseDsn(dsn: string | undefined): Target | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
    if (url.protocol !== "https:" || !/^\d+$/.test(projectId)) return null;
    return { host: url.host, projectId };
  } catch {
    return null;
  }
}

/** The envelope's first line names the DSN it was written for; it must be ours. */
export function envelopeTarget(envelope: string): Target | null {
  const firstLine = envelope.slice(0, envelope.indexOf("\n") === -1 ? undefined : envelope.indexOf("\n"));
  try {
    const header = JSON.parse(firstLine) as { dsn?: string };
    return parseDsn(header.dsn);
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const ours = parseDsn(process.env.VITE_SENTRY_DSN);
  if (!ours) return new Response("Not configured", { status: 503 });

  const body = await request.text();
  if (body.length > MAX_BYTES) return new Response("Too large", { status: 413 });

  const target = envelopeTarget(body);
  if (!target || target.host !== ours.host || target.projectId !== ours.projectId) {
    return new Response("Unknown project", { status: 400 });
  }

  const forwarded = await fetch(`https://${ours.host}/api/${ours.projectId}/envelope/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body,
  });
  return new Response(null, { status: forwarded.ok ? 200 : forwarded.status });
}
