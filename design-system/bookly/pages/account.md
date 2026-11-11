# Account area and reader — deviations from MASTER

> Overrides `design-system/bookly/MASTER.md` for /account/* (inside `AccountLayout`) and the ebook reader (/read/*).
> Added 2026-11-10 (redesign phase 3, branch `design/account-pages`). Builds on `pages/shopping.md`.
> The invoice (`/account/orders/:id/invoice`) keeps `pages/print.md` unchanged.

## 1. Frame (`src/features/account/AccountLayout.tsx`)
- The account area sits on the warm paper (SiteShell adds `/account` to the paper routes).
- Laptops: the navigation is one sidebar card (`.shop-card`, radius 2xl, 12px padding). On top, a "library card":
  a lapis panel (`bg-lapis` / `text-on-lapis`, fixed in both themes so the gold stays legible at night) with the
  first initial on a gold disc, the eyebrow in gold, the name and who is signed in. The active link has a lapis tint
  and a 3px lapis rule on its left. Sign out sits under a hairline.
- Phones: unchanged link strip with the edge fades; the eyebrow and "Signed in as" stay above it.

## 2. Sheets
Every account card uses `.shop-card` + radius 2xl (one rule replaced the old `rounded-xl` cards). `SpotlightCard`
(wishlist cards) now defaults to the card surface: it still carried its template's `bg-neutral-900`, which made the
wishlist dark with unreadable titles.

## 3. Pages
- Overview: orders / saved books / addresses as real figures in one strip (Gloock 2rem, icon discs; a skeleton until
  each request answers), then the four tiles (lift 2px), store credit, stock alerts, recent orders with an arrow.
- Orders: under each order a five-segment meter (pending → paid → processing → shipped → delivered; green when
  delivered; none for cancelled/returned). Decorative (`aria-hidden`): the status badge says it in words.
- Order, returns, reviews, ebooks, profile, security, addresses, gift cards, referrals, support: the new frame and sheets;
  structure unchanged.

## 4. Reader (/read/:id, /read/:id/preview)
- Dark surround in the shop's night colours (`#070B22` page, `#0E1433` bars, `#252D63` hairlines) instead of zinc;
  light and sepia unchanged.
- Ghost controls (back, zoom, page buttons) take the bar's own ink per theme: they used the site's lapis text and
  were nearly invisible on the dark bar. Previous/next page buttons are labelled for screen readers on phones.
