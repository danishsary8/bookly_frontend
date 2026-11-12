# Handoff: info and email-link pages (2026-11-12)

Branch `design/info-pages` (from `main` at ecb7ac9), one commit, not merged.

## Per page
- All info pages: eyebrow, `text-balance` Gloock title and lead; key facts as small cards; a sticky side menu
  with every info page (`aria-current="page"`) and "On this page" (section in view marked); phones get one menu button;
  reading sheet with 68ch sections; "Still need help?" at the foot (support chat, Telegram, contact) with Browse
  books and related pages.
- /shipping: "Delivery by area" cards from `delivery.areas` (fee and time per area), free-delivery and KHQR / cash lines.
- /returns-policy: three-step "How to return a book" with Start a return → /account/returns.
- /faq: live search over the questions (count announced, nothing found → Contact us); groups stay a radix accordion
  opened from the URL hash; "Contact us" beside the title.
- /about: Browse the shelves (the one vermilion CTA) beside the title; the new-books shelf after the story.
- /contact: moved onto the shared layout: Telegram / phone / email as cards, hours + online-only panel, self-serve
  links. Still no form (links only, as before).
- /privacy, /terms: numbered sections with Back to top after each; related policy links.
- /newsletter/confirm, /newsletter/unsubscribe, /email/cart-reminders/stop: one status card each. States: loading,
  success (the API's sentence when it sends one), expired/invalid (422 or missing token: how to fix), error (offline
  or server) with Try again. Next steps: new arrivals / browse + manage the newsletter in the profile / view cart + browse.

## Shared pieces
- `features/content/ContentPage.tsx`: layout, `Menu`, `FactCards`, `StillNeedHelp`; new props `action`, `highlight`,
  `children`, `related` (`plate` and the bookplate header are gone).
- `features/content/useEmailLink.ts`: runs the link's call once, maps 422/404 → invalid, other failures → error, retry.
- `components/StatusPanel.tsx`: `state` / `primary` / `quiet` / `onRetry` instead of `tone` / `actions`.
- `Bookplate` now serves only the 404 page (its facts layout was removed as unused).

## Deleted
- `PlateFact` type and the Bookplate facts layout. No files or i18n keys deleted.

## Keys needing Khmer (English in km.ts under `// TODO(antigravity)`)
`infoPages.*`, `emailLink.*`.

## Checks
lint, typecheck, test (669 passed, 3 skipped), build: all exit 0, no warnings. Screenshots of all 8 info pages and the
3 email pages (success + expired) at 1440×900 and 390×844, looked at and fixed; axe at 1440: 0 violations; no sideways scroll.

## Not checked
The real API, dark theme, Khmer, 1366×768, touch devices. The API answers a repeated click with the same success,
so "already done" has no separate screen (proposal: return `already: true`).
