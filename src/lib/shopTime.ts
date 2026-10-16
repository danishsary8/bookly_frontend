/*
 * The shop works in Cambodia time (Asia/Phnom_Penh, UTC+7 all year, no daylight saving). Admin date-time fields
 * show and take shop time whatever the admin's own computer is set to.
 */
export const SHOP_TIME_ZONE = "Asia/Phnom_Penh";
const SHOP_OFFSET = "+07:00";

/** ISO time from the API → "YYYY-MM-DDTHH:mm" in shop time, for an <input type="datetime-local">. */
export function toShopInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SHOP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "YYYY-MM-DDTHH:mm" typed in shop time → ISO string with the shop's offset (what the API stores as UTC). */
export function fromShopInput(value: string): string {
  return `${value.length === 16 ? `${value}:00` : value}${SHOP_OFFSET}`;
}

/** A shop-time input value as a Date (invalid Date when empty or malformed). */
export const shopInputDate = (value: string | null | undefined): Date =>
  new Date(value ? fromShopInput(value) : NaN);

/** "20 Oct 2026, 09:00" in shop time. */
export const formatShopDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: SHOP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** True while the time is still ahead (a scheduled book that is not live yet). */
export const isFutureTime = (iso: string) => new Date(iso).getTime() > Date.now();
