import type { DashboardPeriod, DashboardRange } from "@/api/endpoints/staff";

/** The API's limit (DashboardService::MAX_DAYS). */
export const MAX_RANGE_DAYS = 366;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PRESETS: DashboardPeriod[] = ["today", "7d", "30d"];

/** Today in shop time (Phnom Penh), "2026-10-13". */
export const shopToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Phnom_Penh" });

const isDay = (value: string | null): value is string => !!value && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Days from `from` to `to`, both counted ("2026-10-01"–"2026-10-01" is 1). */
export const daysIn = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** Why a custom range can't be shown, or null when it can. */
export function rangeProblem(from: string, to: string): string | null {
  if (!isDay(from) || !isDay(to)) return "Choose a start and an end day.";
  if (to < from) return "The end day must be on or after the start day.";
  if (daysIn(from, to) > MAX_RANGE_DAYS) return `Choose at most ${MAX_RANGE_DAYS} days.`;
  return null;
}

/** The range in the URL (?period=7d, or ?period=custom&from=…&to=…); anything unusable falls back to 30 days. */
export function rangeFromParams(params: URLSearchParams): DashboardRange {
  const period = params.get("period");
  if (period === "custom") {
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    return rangeProblem(from, to) ? { period: "30d" } : { period: "custom", from, to };
  }
  return PRESETS.includes(period as DashboardPeriod) ? { period: period as DashboardPeriod } : { period: "30d" };
}

/** URL params for a range (30 days is the default, so it leaves the URL clean). */
export const rangeToParams = (range: DashboardRange): Record<string, string> =>
  range.period === "custom" ? { period: "custom", from: range.from, to: range.to } : range.period === "30d" ? {} : { period: range.period };

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
/** "15 Oct" for a Y-m-d day. */
export const day = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`));

/** The first and last Phnom Penh day of a dashboard range ("7d" is today and the 6 days before). */
export function rangeDays(range: DashboardRange): { from: string; to: string } {
  if (range.period === "custom") return { from: range.from, to: range.to };
  const to = shopToday();
  const back = { today: 0, "7d": 6, "30d": 29 }[range.period];
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}
