# Handoff: buying, account and reader pages (2026-11-12)

- Branch: `design/buying-account-reader` (from `main` at f81f07d). Not merged; the owner merges.
- Commit: the single commit on this branch (`git log -1 design/buying-account-reader`; a commit can't hold its own hash).

## Per page
- Account frame (`features/account/AccountLayout.tsx`): the sidebar groups its links (Orders & shopping, Your library,
  Settings, Help). Phones get a compact menu: one button names the current section and opens the same grouped links
  (it replaces the sideways link strip). Raw hex is gone (gold / ink tokens).
- Overview: now a dashboard. It leads with the latest order and its one next step (Pay now in vermilion for an unpaid
  KHQR order, Write a review once delivered, otherwise View order). Then three live tiles: coupons ready (`/me/coupons`),
  price drops on saved books (`priceDropSince`), Continue reading (`/me/ebooks`, a progress bar). Then quick links
  (phones only; the sidebar has them on laptops), store credit, stock alerts and the older orders.
- Reading lists, gift cards, referrals: the shared `AccountSection` header and sheets, plus empty states with a next step.
  The reading lists page gets a one-line create form; each list shows its book count.
- Orders, order detail, returns, return request/detail, ebooks, reviews, profile, security, addresses, wishlist,
  support, coupons: the new frame only. Their pages already had sheets and empty states with actions; checked, not
  restyled.
- Cart, drawer, checkout, KHQR pay, invoice: unchanged (redesigned 2026-11-12, `pages/shopping.md` §3b–3c); checked
  at 1440/390, axe clean.
- Confirmation: Keep browsing, View your order and Print receipt moved into the thank-you panel, so they are on the
  first screen. The duplicate button row at the bottom is gone.
- Reader (`pages/reader/ReaderPage.tsx`): the bars float over the page and fade out after 3 s without input. They come
  back on pointer movement, tap, key or focus, and stay while the panel is open, on the last preview page and on an
  error. A progress hairline runs along the top edge, the page counter shows %, and a "Go to page" panel offers a
  number field plus Start, 25/50/75%, Last page. Controls are 44px, the theme buttons are a labelled `aria-pressed`
  group, theme colours moved to CSS variables (`.reader-dark|light|sepia` in index.css), and the end-of-preview CTA is
  the one vermilion button. Page images, page turns, keys, progress saving and the copy/print blocking are unchanged.

## Deleted
- i18n (en + km): `account.addPhone`, `savedCount`, `savedBooks`, `securityDone`, `securityTodo` (old overview tiles);
  `credit.empty`, `credit.noReferrals` (replaced by empty states).
- No files deleted.

## New keys needing Khmer (English placeholder in km.ts, marked `// TODO(antigravity)`)
`accountNav.*` (menu, groups.*), `dashboard.*`, `accountEmpty.*`, `readerUi.*` (goToPage, pageNumber, go, jumpStart,
jumpEnd, readingTheme, noChapters).

## Checks
- `npm run lint` (0 errors, 1 old warning in VisitorAnalytics), `npm run typecheck`, `npm test` (657 passed, 3 skipped),
  `npm run build`: all exit 0.
- Browser: Vite and a local Node mock API (outside the repo). 21 routes at 1440×900 and 390×844 with reduced motion,
  each screenshot looked at. axe (WCAG 2.2 AA) at 1440 on every page: 0 violations. No sideways scroll.
- Reader: bars hide after 3 s and return on mouse move; arrow keys and Go to page change pages (checked in Chromium).

## Not checked
- The real API (mock data only). The mock has no `/orders/{id}/rating`, so that card wasn't seen on the order page.
- Dark site theme and Khmer layout on these pages; 1366×768 and 1920 widths; touch devices; real KHQR payment and
  printing.
- API proposal: chapter titles/pages on `GET /reader/{id}` would let "Go to page" become a real table of contents.

## Also note
- The unfinished catalogue v2 redesign (from the earlier request) is kept in `git stash` as
  "catalogue v2 redesign (built, checks interrupted, not committed)". It is not part of this branch.
