# Shopping pages — deviations from MASTER

> Overrides `design-system/bookly/MASTER.md` for the cart (page and drawer), checkout, order confirmation
> (`/checkout/success/:id`) and the KHQR payment page (`/account/orders/:id/pay`). Added 2026-11-10 (redesign phase 1,
> branch `design/shopping-pages`). The home page (`pages/home.md`) is the quality bar.

## 1. Warm paper on the buying pages
Cart, checkout and confirmation sit on the home page's warm paper (`.home-paper`): MASTER §1 says "nothing cream",
but the home page already moved to it and the buying journey should feel like the same place. SiteShell puts the paper
on `<main>` for `/cart` and `/checkout/*` and drops the footer's top margin there (as on home), so the paper runs down
to the footer on short pages too. The KHQR page stays inside the account frame (redesigned in phase 3).

Cards on the paper use `.shop-card`: hairline border, a white inner top edge and a soft lift
(`0 24px 48px -36px` lapis), the same treatment as the home shelf caption. This is a resting shadow (MASTER §8),
allowed here because the cards need to read as sheets on the paper; radius 2xl (14px) like the home cards.

## 2. Shared pieces (`src/components/shopping/`)
- **CheckoutProgress**: Cart → Delivery & payment → (Pay, KHQR only) → Done. 28px discs: done = solid lapis with a
  check, current = lapis ring + 4px halo and `aria-current="step"`, todo = `--input` outline. The hairline between
  two steps fills by `scaleX` (700ms) once the first is done. While checking out, the done Cart step links to `/cart`.
  Below 640px only the discs and the current label show; other labels stay as screen-reader text.
- **CoverStack**: a fan of up to 4–5 real covers (5° per step, 42% overlap, spine hinge + gloss), `aria-hidden`
  because the books are named nearby. Opens a little on hover of its `.group` (`.cover-fan`). Sizes sm 30 / md 46 /
  lg 92 / xl 132px wide. Covers without an image get a cloth board with the title's initial.
- **TrustRow**: three plain promises (pay in cash or KHQR, all 25 provinces, the return window from
  `src/content/shop.ts`) in 32px lapis-tint discs under a dashed rule. Facts only.
- **Seal**: success ring + check drawn with Motion `m` (`pathLength`, 700ms + 450ms); reduced motion shows it done.
- **FreeShippingBar** (restyled, same props and words): a gold-to-lapis track filled by `scaleX`, a lapis truck disc
  riding its end (moved by `translateX`, not `left`); reached = success tint, solid green fill, a check. Numbers come
  only from the API threshold (shop setting as fallback). The 🎉 emoji left the copy (MASTER §8: no emoji).
  Gold here is a graphic gradient, never text on paper.

## 3. Cart
- Title row: h1 + the progress rail on the right (no lead line: the lines card already says "4 items").
- Lines (7/12, 8/12 at xl): one card, header row (count + Empty cart), lines divided by hairlines. Each line: cover
  88×132 with the BookCard spine/gloss, lifts 4px on hover; Gloock title 1.3rem; a format chip and the unit price;
  "In offer" and "Only N left" (from `low_stock_remaining`) under it; the line total in Gloock 1.45rem; stepper + remove.
- Summary (5/12, 4/12 at xl), sticky: title + item count with the cart's covers (CoverStack sm); delivery fee and
  date from the preview (truck disc) and the free-delivery bar; coupon; subtotal/discount/shipping; "Total before
  shipping" in Gloock 2rem; the one vermilion CTA; TrustRow.
- Empty cart: a card with five popular covers fanned (the same recommendations query the row below uses, so no extra
  request), Gloock title, one sentence, Browse books.
- Fits: at 1366×768 and 1440×900 the checkout button is on the first screen (`short:` variant tightens the title
  and summary on laptops under 820px tall).
- Drawer: same lines in compact form divided by hairlines, the total in Gloock 1.75rem.

## 4. Checkout
- Steps on a vertical rail: 36px discs (lapis ring + number; solid lapis + check once the step is settled: an address
  chosen, a payment chosen), a dotted hairline down to the next step; "(completed)" for screen readers.
- Address and payment are tiles (radius 2xl, native radio kept): selected = lapis border, lapis tint 70%, soft lift;
  the payment icon sits in a 44px square that turns solid lapis when chosen; unavailable ways (card) are dashed and
  muted, still announced as disabled.
- Delivery date card under the addresses: "Delivering to {province}", the date, a "Free delivery" chip.
- Review list: covers 56×84 with shadow, Gloock titles.
- Summary: like the cart's; the total in Gloock 2rem; the line under Place order follows the payment choice
  (cash: nothing is charged now; KHQR: the pay window and bank apps).

## 5. Order confirmation
- The rail at Done (right), then a thank-you panel: Seal + status badge, h1, the order number in the lead, a dashed
  rule, then Placed and Arriving. On the right the covers just bought (CoverStack xl) over a blurred wash of the first
  cover. Covers come from the checkout (router state) because order lines have no covers in the API; after a reload
  the panel simply has no covers (see WORKLOG: proposed `cover_image_url` on order items).
- "What happens next": three stops on one dotted line; the first (where the order is now) solid lapis with a halo.
- Then the order card (7/12) + address and Telegram cards (5/12), and the actions.

## 6. KHQR payment
- Left: the official KHQR card (white, red header, unchanged in dark mode) on a deep lapis stage (`.premiere-stage`,
  the home Coming soon colour) lit by a soft periwinkle glow, with "Paid straight to Bookly's Bakong account" under it.
- Right: eyebrow, h1, order number, test-mode note, then one card: currency switch (tabs) beside a countdown ring
  (the share of the time left when the page opened; red under a minute) and the waiting status; numbered steps;
  Download QR / View order; Simulate (test mode only).
- Paid / expired / cancelled: one centred card (Seal or a muted X), scrolled into view when it appears.

## Motion
Transform/opacity only, plus `stroke-dashoffset` for the ring and Motion `pathLength` for the Seal. Reduced motion:
no fill/rider transitions, no fan movement, no lift; the Seal and the ring show their end state.
