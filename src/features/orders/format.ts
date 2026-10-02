const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dayTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** "2 Oct 2026" — empty when the API has no date. */
export const orderDate = (value: string | null | undefined) => (value ? day.format(new Date(value)) : "");

/** "2 Oct 2026, 17:43" for timelines. */
export const orderDateTime = (value: string | null | undefined) => (value ? dayTime.format(new Date(value)) : "");
