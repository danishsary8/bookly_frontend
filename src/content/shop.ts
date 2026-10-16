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
  shippingFeesUsd: { phnomPenh: "1.50", provinces: "3.00", kandal: "2.00", remote: "3.50" },
  freeShippingThresholdUsd: "50.00",
  returnWindowDays: 7,
  accountEraseDays: 30,
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
    { area: "Phnom Penh", areaKm: "រាជធានីភ្នំពេញ", time: "1 working day", timeKm: "១ ថ្ងៃធ្វើការ", feeUsd: policy.shippingFeesUsd.phnomPenh },
    { area: "Kandal Province", areaKm: "ខេត្តកណ្តាល", time: "1 to 2 working days", timeKm: "១ ទៅ ២ ថ្ងៃធ្វើការ", feeUsd: policy.shippingFeesUsd.kandal },
    { area: "Other Provinces (22 provinces)", areaKm: "ខេត្តដទៃទៀត (២២ ខេត្ត)", time: "2 to 3 working days", timeKm: "២ ទៅ ៣ ថ្ងៃធ្វើការ", feeUsd: policy.shippingFeesUsd.provinces },
    { area: "Remote Provinces (Mondulkiri, Ratanakiri)", areaKm: "ខេត្តដាច់ស្រយាល (មណ្ឌលគិរី, រតនគិរី)", time: "3 to 4 working days", timeKm: "៣ ទៅ ៤ ថ្ងៃធ្វើការ", feeUsd: policy.shippingFeesUsd.remote },
  ],
} as const;

export const legal = {
  updated: "2026-10-06",
} as const;
