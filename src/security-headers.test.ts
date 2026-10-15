import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Security headers on Vercel (vercel.json). Security review 2026-10-15: a Content-Security-Policy limits what a
 * script injected into the page could load or send. The whole policy is enforced since the owner checked the live
 * site (2026-10-15: no Report-Only warnings; Google, Turnstile and Telegram work). These tests keep the allowlist in
 * step with the code.
 */
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
const all = vercel.headers.find((h) => h.source === "/(.*)")!.headers;
const header = (key: string) => all.find((h) => h.key === key)?.value ?? "";
const directive = (policy: string, name: string) => policy.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";
const origin = (url: string) => new URL(url).origin;

describe("Content-Security-Policy", () => {
  it("enforces no framing, no plugins and no base or form hijacking, with no Report-Only copy left", () => {
    const enforced = header("Content-Security-Policy");
    expect(header("Content-Security-Policy-Report-Only")).toBe("");
    expect(directive(enforced, "default-src")).toBe("default-src 'self'");
    expect(directive(enforced, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(enforced, "object-src")).toBe("object-src 'none'");
    expect(directive(enforced, "base-uri")).toBe("base-uri 'self'");
    expect(directive(enforced, "form-action")).toBe("form-action 'self'");
  });

  it("allows every outside script the site loads, and nothing inline", () => {
    const scripts = directive(header("Content-Security-Policy"), "script-src");
    const sources = ["src/features/auth/turnstile.tsx", "src/features/auth/social.ts"].map((file) => readFileSync(file, "utf8")).join("\n");
    const loaded = [...sources.matchAll(/"(https:\/\/[^"]+)"/g)].map((m) => origin(m[1]));
    expect(loaded.length).toBeGreaterThanOrEqual(3);
    for (const host of loaded) expect(scripts).toContain(host);
    expect(scripts).not.toContain("unsafe-inline");
    expect(scripts).not.toContain("unsafe-eval");
  });

  it("lets the site call the production API", () => {
    const api = readFileSync(".env.production", "utf8").match(/^VITE_API_BASE_URL=(\S+)/m)![1];
    expect(directive(header("Content-Security-Policy"), "connect-src")).toContain(origin(api));
  });
});
