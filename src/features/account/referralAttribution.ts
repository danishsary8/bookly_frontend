const REFERRAL_KEY = "bookly:referral";
const DEVICE_KEY = "bookly:referral-device";
const LIFETIME = 30 * 24 * 60 * 60 * 1000;

export function rememberReferral(search: string, now = Date.now()): void {
  const code = new URLSearchParams(search).get("ref")?.toUpperCase();
  if (!code || !/^[A-Z0-9]{16}$/.test(code)) return;
  try { localStorage.setItem(REFERRAL_KEY, JSON.stringify({ code, expires: now + LIFETIME })); } catch { /* Storage can be blocked; shopping still works. */ }
}
export function referralDevice(): string | undefined {
  try {
    let device = localStorage.getItem(DEVICE_KEY);
    if (!device || !/^[a-zA-Z0-9_-]{16,64}$/.test(device)) {
      device = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, device);
    }
    return device;
  } catch { return undefined; }
}
export function referralSignup(now = Date.now()): { referral_code?: string; referral_device?: string } {
  let code: string | undefined;
  try {
    const saved = JSON.parse(localStorage.getItem(REFERRAL_KEY) ?? "null") as { code?: unknown; expires?: unknown } | null;
    if (saved && typeof saved.code === "string" && /^[A-Z0-9]{16}$/.test(saved.code) && typeof saved.expires === "number" && saved.expires > now) code = saved.code;
    else localStorage.removeItem(REFERRAL_KEY);
  } catch { /* Ignore damaged or unavailable storage. */ }
  return { ...(code ? { referral_code: code } : {}), referral_device: referralDevice() };
}
