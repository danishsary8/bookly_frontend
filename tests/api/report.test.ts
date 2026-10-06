import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeTarget, parseDsn, POST } from "../../api/report";

const DSN = "https://abc123@o4512.ingest.us.sentry.io/4512208";
const envelope = (dsn: string) => `${JSON.stringify({ event_id: "1", dsn })}\n{"type":"event"}\n{"message":"boom"}`;
const post = (body: string) => POST(new Request("https://bookly.test/api/report", { method: "POST", body }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("error-report tunnel", () => {
  it("reads the host and project from a DSN and from an envelope header", () => {
    expect(parseDsn(DSN)).toEqual({ host: "o4512.ingest.us.sentry.io", projectId: "4512208" });
    expect(parseDsn("http://k@o1.ingest.sentry.io/1")).toBeNull();
    expect(parseDsn("nonsense")).toBeNull();
    expect(envelopeTarget(envelope(DSN))).toEqual({ host: "o4512.ingest.us.sentry.io", projectId: "4512208" });
    expect(envelopeTarget("not json\n{}")).toBeNull();
  });

  it("forwards Bookly's own envelopes to Sentry unchanged", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", DSN);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const body = envelope(DSN);

    const response = await post(body);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://o4512.ingest.us.sentry.io/api/4512208/envelope/", expect.objectContaining({ method: "POST", body }));
  });

  it("refuses envelopes for any other project, and does nothing until configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect((await post(envelope(DSN))).status).toBe(503);

    vi.stubEnv("VITE_SENTRY_DSN", DSN);
    expect((await post(envelope("https://k@o999.ingest.us.sentry.io/4512208"))).status).toBe(400);
    expect((await post(envelope("https://k@o4512.ingest.us.sentry.io/1"))).status).toBe(400);
    expect((await post("garbage")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes on Sentry's own refusals", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", DSN);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 429 }));
    expect((await post(envelope(DSN))).status).toBe(429);
  });
});
