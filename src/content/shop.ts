/*
 * Facts the help pages quote, in one place.
 *
 * - `policy` mirrors what the API enforces (bookly_backend_v2/config/shop.php). If the
 *   shop changes SHIPPING_FLAT_FEE or RETURN_WINDOW_DAYS on the server, change it here too.
 * - `contact` and `delivery` are PLACEHOLDERS until the owner confirms them. Anything with
 *   `confirmed: false` is shown with a "To be confirmed" mark, so a placeholder can never
 *   pass for a real number. Replace the values and set `confirmed: true` before launch.
 * - `legal.reviewed: false` shows a "Draft" notice on Privacy and Terms.
 */

export const policy = {
  shippingFeeUsd: "2.00",
  returnWindowDays: 14,
  timezone: "Asia/Phnom_Penh",
} as const;

export const contact = {
  confirmed: false,
  email: "hello@bookly.example",
  phone: "+855 00 000 000",
  phoneHref: "tel:+85500000000",
  telegram: "@bookly_example",
  telegramHref: "https://t.me/bookly_example",
  address: ["Street 000, Sangkat Example", "Phnom Penh, Cambodia"],
  hours: [
    { days: "Monday to Saturday", time: "8:00 to 18:00" },
    { days: "Sunday", time: "Closed" },
  ],
} as const;

export const delivery = {
  confirmed: false,
  areas: [
    { area: "Phnom Penh", time: "1 to 2 working days" },
    { area: "Other provinces", time: "3 to 5 working days" },
  ],
} as const;

export const legal = {
  reviewed: false,
  updated: "2026-10-02",
} as const;
