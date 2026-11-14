# Account area and reader — deviations from MASTER

> Overrides `design-system/bookly/MASTER.md` for /account/* (inside `AccountLayout`) and the ebook reader (/read/*).
> Added 2026-11-10 (redesign phase 3, branch `design/account-pages`). Builds on `pages/shopping.md`.
> The invoice (`/account/orders/:id/invoice`) keeps `pages/print.md` unchanged.

## 1. Account frame (updated 2026-11-14)
- An editorial account workspace that retains Bookly's lapis, paper surfaces, Gloock headings and Hanken Grotesk UI text.
- Scoped in `src/features/account/account.css`; public storefront, print and checkout styles are unchanged.
- Desktop uses a 238px sticky navigation card. A book-shaped initial mark identifies the reader; semantic navigation groups, filled active links and a Browse books link keep destinations clear.
- Compact screens use the existing accessible disclosure navigation. Links retain 44px targets and visible focus.

## 2. Shared page language
- AccountSection provides a unique heading ID, real Lucide section icon, account eyebrow, concise lead and optional aligned action. Coupons and support use this shared header too.
- Restrained 14px panel corners, hairline borders, no heavy resting shadows, consistent 24px panel spacing and token-driven colours in both themes.
- Empty states use smaller icon tiles, a readable text measure and a clear action. Lists, addresses, rewards, ebooks and reading lists inherit the same presentation.
- Reduced-motion mode removes decorative account transitions. Brand marks use SVG Google/Facebook icons, not letter approximations.

## 3. Primary customer flows
- Profile: personal details form and a separate preference panel. Newsletter, price drops, cart reminders and Telegram settings keep their own labels, descriptions and controls.
- Security: sign-in methods and password side by side on wide screens; devices span the full row; data export and account closure stay separate below. On narrower screens the same DOM order becomes one column.
- Overview: compact greeting and verification details, a latest-order panel with a next action, three library/reward shortcuts, recent orders and existing account utilities.
- Orders retain URL-based filtering, status labels, progress meters, accessible actions and the previous functional fixes.
- Return-policy behaviour is maintained by the separate returns work; this redesign only applies shared account presentation.

## 4. Reader (/read/:id, /read/:id/preview)
- Dark surround in the shop's night colours (`#070B22` page, `#0E1433` bars, `#252D63` hairlines) instead of zinc;
  light and sepia unchanged.
- Ghost controls (back, zoom, page buttons) take the bar's own ink per theme: they used the site's lapis text and
  were nearly invisible on the dark bar. Previous/next page buttons are labelled for screen readers on phones.
