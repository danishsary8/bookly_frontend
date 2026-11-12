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

## 3b. Cart v2 (2026-11-12)
Replaces the summary and drawer parts of §3; the lines themselves are unchanged.
- **Summary as a receipt**: one `.shop-card`, `overflow-hidden`. Head in solid lapis (`text-on-lapis`): title, item
  count (`on-lapis-muted`), CoverStack sm. Body: free gift, offer nudge, delivery estimate + free-delivery bar, the
  coupon behind a "Have a coupon code?" link (opens the field and focuses it; a saved coupon shows the field straight
  away), the sums (shipping reads "Free" in green when the offer gives free delivery). Then `.receipt-tear`: a 2px
  dashed line with two notches cut into the card's sides in the paper colour (light and dark mixes match
  `.home-paper`). Under it: "Total before shipping" with a "You save $X" chip, the total in Gloock 2.25rem, the one
  vermilion CTA, a "nothing is charged now" note (shield icon), TrustRow.
- **Lines card**: a green "You're saving $X on this order" strip under the header when a discount applies, the live
  PromoReminder, and a footer (surface-1) with "Keep shopping" and the subtotal.
- **Laptops**: the general gaps are 12px. Under 820px tall (`short:`) gaps drop to 8px, the total to 1.85rem, the tear
  tightens, and the chip, pay note and TrustRow hide. Measured checkout button bottom (mock cart, 4 items, offer +
  nudge): 1366×768 → 735px (Khmer 764px), 1440×900 → 869px (Khmer 893px), 1920×1080 → 869px. A blocked cart (alert
  above the button) can push the disabled button below the fold; the alert says why.
- **Phones (< lg)**: a fixed bar (total, item count, Checkout) slides up while the summary's own button is below the
  screen (IntersectionObserver) and hides once it shows. It writes its height to `--bottom-bar` on `<html>`; the page
  adds that as bottom padding, `html { scroll-padding-bottom }` keeps focused/scrolled-to items above it, and the toast
  stack (and SupportBubble, when mounted) move up by it. Hidden bar = `inert` + `aria-hidden`.
- **Drawer**: the free-delivery bar and offer nudge sit above the lines; empty = a fan of popular covers (same
  recommendations query as the cart), Gloock title, Browse books. Footer: PromoReminder, the offer's saving in a green
  row, the total in Gloock 1.75rem, one full-width Checkout (lg), and View cart as a quiet ghost link.
- Motion: the bar uses `translate-y` (`--dur-toggle`), none under reduced motion.

## 3c. Rewards and KHQR (2026-11-12)
- **Cart lines card**: a quiet `surface-1` box under the saving strip with two lines: the next-order reward ("Add 1
  more book to get 10% off your next order (up to $5.00)" / "This order earns …" + when the code comes) with a gift
  icon, and "Pay by KHQR at checkout and save 3%" with a QR icon. Either line hides when the API sends nothing.
- **Cart summary**: when the customer has a usable reward coupon and none is applied, a slim green line (left rule,
  no box, same height as the "Have a coupon code?" link) "Your 10% off: CODE · Apply" replaces the link. The CTA still
  fits at 1366×768 (727px; Khmer 756px) and 1440×900 (869px; Khmer 893px).
- **Checkout payment tiles**: KHQR carries a green "Save $X" pill (right on sm+, under the title on phones). Over the
  cash on delivery limit the COD tile is disabled with the reason in its detail line and KHQR is chosen for the
  customer. The summary shows "KHQR discount (3%)" as its own green row, apart from the offer/coupon row.
- **Order page / confirmation**: a card with a gift disc, "10% off your next order", the code in a dashed green
  ticket, Copy code (status announced), cap and end date; struck through when used or switched off.
- **Account → My coupons**: two-column cards, status chip (Ready to use / Used / Expired / No longer valid), "Use in
  cart" for usable ones; an empty state with a heading and Find your next book.
- **Admin → Sales → Rewards & payments**: a settings card (KHQR %, COD limit; read-only for non-admins) and the rules
  table (earned with, gives, coupons made, used, on switch, "In use" badge on the rule the shop uses).

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
