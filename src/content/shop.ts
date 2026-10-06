/*
 * Facts the help pages quote, in one place.
 *
 * - `policy` mirrors what the API enforces (bookly_backend_v2/config/shop.php). If the shop
 *   changes SHIPPING_FEE_PHNOM_PENH, SHIPPING_FEE_PROVINCES or RETURN_WINDOW_DAYS on the
 *   server, change it here too.
 * - `contact` and `delivery` are the owner's details (confirmed 2026-10-06). The email is a
 *   temporary personal address until the shop has its own.
 */

export const shop = {
  name: "Bookly Shop",
} as const;

export const policy = {
  shippingFeesUsd: { phnomPenh: "1.50", provinces: "3.00" },
  returnWindowDays: 3,
  timezone: "Asia/Phnom_Penh",
} as const;

export const contact = {
  email: "dnshsary@gmail.com",
  phone: "087 860 999",
  phoneHref: "tel:+85587860999",
  telegram: "@danishashai",
  telegramHref: "https://t.me/danishashai",
  /** Online only: there's no shop to visit, everything is delivered. */
  address: null,
  hours: [
    { days: "Monday to Saturday", time: "8:00 to 18:00" },
    { days: "Sunday", time: "Closed" },
  ],
} as const;

export const delivery = {
  areas: [
    { area: "Phnom Penh", time: "1 working day", feeUsd: policy.shippingFeesUsd.phnomPenh },
    { area: "Other provinces", time: "2 to 3 working days", feeUsd: policy.shippingFeesUsd.provinces },
  ],
} as const;

export const legal = {
  updated: "2026-10-06",
} as const;
