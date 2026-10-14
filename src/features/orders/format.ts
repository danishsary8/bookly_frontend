const formatters = new Map<string, { day: Intl.DateTimeFormat; dayTime: Intl.DateTimeFormat }>();
const formatFor = (locale: string | string[]) => {
  const key = String(locale);
  let f = formatters.get(key);
  if (!f) {
    f = {
      day: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
      dayTime: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
    formatters.set(key, f);
  }
  return f;
};

/** "2 Oct 2026" — empty when the API has no date. Pass the shop language's locale (useT().locale) on customer pages. */
export const orderDate = (value: string | null | undefined, locale: string | string[] = "en-GB") => (value ? formatFor(locale).day.format(new Date(value)) : "");

/** "2 Oct 2026, 17:43" for timelines. */
export const orderDateTime = (value: string | null | undefined, locale: string | string[] = "en-GB") => (value ? formatFor(locale).dayTime.format(new Date(value)) : "");
