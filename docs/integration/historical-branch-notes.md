# Historical branch worklog additions

These notes describe their original branch state, not current deployment status. Current checks and decisions are in docs/WORKLOG.md and consolidation.md.

## origin/admin-polish

Historical branch notes, retained as originally written; deployment and merge claims are not reverified.


### 2026-11-14 — Admin polish (branch `admin-polish`; backend `feature/staff-book-filters`)
Live search on every admin list; Books filters (category, format, stock, sort) using the new backend query options;
light sidebar; dashboard figures/charts animate between periods without reloading; ink chart tooltip with change.
Sweep of 37 admin routes (admin) + 24 (staff) at 1440 and 390 with a mocked API: no sideways scroll, no crashes
except four pages that crash only on wrongly shaped mock data. Test: src/pages/admin/books-search.test.tsx.

## origin/docs/overnight-batch

Historical branch notes, retained as originally written; deployment and merge claims are not reverified.

- [x] Stock overview, restock dialog and movement history (2026-10-16, branch `feature/stock-history-restock`, commits `5ee305a`, `f0da8a9`): added `/admin/stock` inventory management page with restock modal, movements audit history dialog, running balances, and admin-only unit cost visibility. Tests: `src/features/stock/stock.test.tsx` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38785172957 green.
- [x] Refund records, store credit card and customer credit balance (2026-10-16, branch `feature/refund-records`, commit `e1d9950`): added refund modal on returns management, customer store credit card in Account view with active coupons and expiry countdown, and order refunds history list. Tests: `src/features/returns/refund-records.test.tsx` (4 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38789338825 green.
- [x] Customer notes, tags, resend verification button and admin spend visibility (2026-10-16, branch `feature/customer-notes-tags`, commit `44a9b9a`): added CRM customer notes card, tag badges with add/remove dialog, resend verification email button, and restricted customer lifetime spend metrics to admins only. Tests: `src/features/customers/customer-notes-tags.test.tsx` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38793512735 green.
- [x] Book publishing status, bulk actions toolbar, and CSV import/export (2026-10-16, branch `feature/book-publishing-bulk-csv`, commit `4ef7271`): added Draft / Scheduled / Live publishing status badges and form controls, bulk status change toolbar on catalog table, and CSV import/export page with validation preview and atomic commit. Tests: `src/features/books/book-publishing-bulk-csv.test.tsx` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38798474247 green.
- [x] Accept-Language header, locale profile sync and Khmer notifications support (2026-10-16, branch `feature/khmer-emails-api`, commit `0097646`): added `Accept-Language` header to API client requests matching current i18n state (`en` or `km`), synced customer profile locale on language switch, and added localized toast notifications. Tests: `src/i18n/khmer-emails-api.test.tsx` (4 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38802897424 green.
- [x] Back in stock alerts, recently viewed shelf, and also bought recommendations (2026-10-16, branch `feature/back-in-stock-also-bought`, commit `5752715`): added "Notify me when available" modal on out-of-stock books, local storage powered recently viewed books shelf, and "Customers also bought" dynamic recommendation grid. Tests: `src/features/catalog/back-in-stock-also-bought.test.tsx` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38808521718 green.
- [x] Khmer search highlight, zero-width space stripping, and accessible listbox (2026-10-16, branch `feature/khmer-search`, commit `408eae9`): added zero-width space stripping in search bar input and autocomplete highlights, fixed search dropdown listbox keyboard navigation and ARIA roles for screen readers in light/dark themes. Tests: `src/features/catalog/khmer-search.test.tsx` (4 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38810978216 green.
- [x] Newsletter sign-up, confirmation, unsubscribe and admin campaigns (2026-10-16, branch `feature/newsletter`, commits `0e279ef`, `33e0a5b`): added footer newsletter subscription card, email confirmation landing page, one-click unsubscribe route, and `/admin/newsletter` campaign broadcast manager with recipient counts. Tests: `src/features/newsletter/newsletter.test.tsx` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38815769579 green.
- [x] System health dashboard card, hardened Sentry tunnel, and passwordless account closure (2026-10-16, branch `fix/security-leftovers`, commit `0d6f280`): added admin-only system health card with database and Redis latency diagnostics, restricted `/api/report` rate limiting and 200 KB size limit, and enabled passwordless/Telegram accounts to close their account with recent token verification. Tests: `src/features/account/CloseAccount.test.tsx` and `tests/api/report.test.ts` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38819141003 green.
- [x] Strict delete dialog and 30-day trash retention UI for books (2026-10-16, branch `feature/strict-delete-trash`, commits `c9795e7`, `169b383`): added strict deletion modal requiring book title confirmation, admin password, and TOTP 2FA code with 5-attempt rate limit protection; added 30-day trash view with remaining days badge and one-click restore. Tests: `src/features/books/strict-delete-trash.test.tsx` (5 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38821762292 green.
- [x] Staff security page, active session controls, and granular permissions management (2026-10-16, branch `feature/staff-permissions-sessions`, commits `8616809`, `dc9484a`): added `/admin/security` active sessions viewer with device type, IP, and location; "Sign out other sessions" and "Sign out everywhere" actions; staff login audit log modal; granular permissions editor checkboxes for staff roles. Tests: `src/features/staff/staff-security.test.tsx` (6 tests). Proved failing first: yes. Verified: lint, typecheck, tests passed, build clean. CI run 38841418085 green.


## origin/docs/worklog-notes

Historical branch notes, retained as originally written; deployment and merge claims are not reverified.

- [x] Book cover on New book (2026-11-02, branch `feature/book-cover-on-create`; owner chose "On New book page"). Covers
  stay per format in the API (no backend change): a Cover box on New book (kept in this tab until the first format),
  after Create the book page opens "Add format" with that cover; a Cover panel on the book page changes the cover of
  every format that shows the main cover or has none (a format with its own cover keeps it); new formats start with the
  main cover. `ImageUploadField`: label linked to the file input, drag and drop now works, long addresses no longer widen
  the page. lint, typecheck, 509 tests (3 new), build. Browser + axe (local API, real PNG upload): 1280 light and 390
  dark: New book -> upload -> Create -> Add format prefilled -> save; stored URL loads (200); axe 0; no overflow.
  Note: covers are only kept for good on the live site once R2 is set up (backend DEPLOYMENT.md F6b).
- [x] Auto refresh (2026-11-02, branch `feature/auto-refresh`; owner chose "Admin + customer orders"). `autoRefresh.ts`:
  every 30 s (tab visible) and on coming back to the tab, admin data on screen is fetched again (`["staff", …]`, newsletter,
  admin lookup; not search boxes; old data stays until the answer). Skipped while a dialog is open, a field has focus, or
  a page has unsaved changes (`usePauseAutoRefresh`: book form, staff note). "Updates by itself · 20 s ago · Refresh now"
  in every admin header. Customers: order/return queries ask again every 60 s and on tab focus while not finished
  (orders pending/paid/processing/shipped; returns requested/approved). lint, typecheck, 516 tests (7 new), build.
  Browser (local API on `main`): status changed through the API while pages were open: admin showed Shipped after 30 s
  and the customer after 56 s with no reload; while typing a staff note nothing reloaded and the text was kept, then it
  updated in 23 s; axe 0 (1280 light, 390 dark), no overflow, no console errors.

## 2026-11-02: Site quality check (`fix/site-check-polish`)

- Checked 65 routes (shop, account, admin) with Playwright + axe (wcag2a/2aa/21a/21aa) in en/km, light/dark, at 320,
  360, 390 and 1280 px: sideways overflow, console/page errors, API errors, h1 count. Plus 13 dialogs at 390x640,
  scrolled to the end.
- Fixes: admin header gaps/padding on phones and the STAFF tag sr-only below 360 px; `grid-cols-1` on grids that set
  columns only from a breakpoint (dashboard, reports, report panels, insights, collections, offers, coupons, newsletter,
  orders filters, book edit, return, exchange rates, security, account overview); `TableCard label` makes a table with
  no focusable content a focusable named region (sign-in history, active sessions, exchange rates, stock movements).
- After: 0 overflow and axe 0 on all checked pages at 320/390/1280; lint, typecheck, 518 tests, build pass.
- Not bugs: picsum images blocked by the sandbox proxy; 429s only when two runs shared one staff token (120/min/user).

## 2026-11-03: README refresh (`docs/readme-refresh`) and Khmer title fix (`fix/khmer-hero-wrap`)

- README: new screenshots (home, book, collection, KHQR pay, admin dashboard dark, phone Khmer dark/light, admin
  phone), current features, a two-minute tour, quality section, stack table with reasons, architecture diagram.
  Every claim checked against the code (no demo button on the site, so the tour uses email or Telegram sign-in).
  Backend README updated the same day (KHQR, offers, collections, Telegram, 761 tests, 39 tables).
- Fix: `BlurText` reduced-motion branch rendered plain text, so Khmer line breaking split ទូទាំង at 320/390 px.
  It now uses the same nowrap word spans as the animated branch (sr-only full text). New `BlurText.test.tsx`;
  browser-checked reduce and no-preference at 320/390/1280, en/km: same lines, no overflow, axe 0. 519 tests, build ok.

## 2026-11-03: Speed check (`perf/speed-check`)

- Measured with Lighthouse 12 (mobile, simulated slow 4G + 4x CPU), local preview build + local API, median of 3.
  Before → after: home 74 → 76 (LCP 4.3 → 4.1 s), /books 71 → 69 (noise, same work), book page 64 → 71
  (LCP 6.0 → 4.9 s, CLS 0 → 0.001; a mid-change build showed CLS 0.54, fixed below). Local numbers have
  no compression and no Render wake-up, so the live site's scores differ; compare like with like.
- Fonts self-hosted with Fontsource (owner choice): `src/fonts.ts`, Kantumruy Pro only the Khmer subset, no
  font inlined (`assetsInlineLimit`), CSP without Google Fonts. No external request other than covers.
- `experimentalMinChunkSize: 2_000`: 223 → 184 JS files. 10 kB was tried and rejected: it pulled staff code
  (staffOps, autoRefresh) into the main file. First load stays 236 KB gzip (was 235).
- Book page: lower shelves are `hidden` until the book arrives (their skeletons sat at the top of the empty
  page). New test fails without the fix.
- Tried and dropped: `content-visibility: auto` on home sections (paint halved, score unchanged, and "Back"
  could restore to the wrong place because heights are guesses); loading the Khmer dictionary on demand
  (~12 KB gzip less for English, but an extra round trip for Khmer visitors).
- Bigger remaining cost: main JS (~118 KB gzip: tailwind-merge, motion, both dictionaries, Radix). Shrinking it
  is a larger refactor, not started.
- Checks: lint, typecheck, 520 tests, build; browser with the real CSP: / and /books/20, en/km, light/dark,
  1280/390: axe 0, no overflow, 0 CSP errors, fonts load from our site.

## 2026-11-03: Price-drop email switch (`feature/price-drop-alerts`)

- Account → Profile: `PriceDropToggle` (Switch, label + description, disabled until the email is confirmed), saved
  through `updateProfile({ price_drop_alerts })`. Shown only when the API returns the field, so the branch works
  before the backend deploys. en/km strings in `priceDrop`; API types regenerated.
- Browser checks also found that E2E already runs on every PR (15 tests, green); the owner chose to leave it.
- Checks: lint, typecheck, 524 tests (4 new), build; browser: profile page en/km, light/dark, 1280/390, axe 0,
  no overflow, switch on → toast and saved; full email path checked against the local API.

## 2026-11-03: Smaller main file (`perf/smaller-main-file`)

- Measured first-load gzip on the built site (my earlier "118 KB" was a different measuring method; same method
  before/after now): main file 105 → 101 KB, first load 236 → 233 KB.
- Zod: `z.config({ jitless })` lived in main.tsx and pulled Zod core into the main file. Schema files now import
  `z` from `@/lib/zodConfig`; lint rule `no-restricted-imports` blocks direct "zod" imports.
- Tried and reverted: `motion/react-m` namespace import (+2 KB: it imports every element eagerly).
- Asked and kept (owner): Khmer dictionary stays in the main file (26 KB gzip; lazy loading would cost Khmer
  visitors a round trip). Other big parts: tailwind-merge ~9.5 KB, Radix header switches, motion core.
- Checks: lint, typecheck, 524 tests, build; browser with the real CSP: /login, /register, /admin/books/new show
  validation (en/km, 1280/390), 0 CSP errors, axe 0, home loads no Zod.

## 2026-11-03: Excel report button (`feature/excel-sales-export`)

- Admin → Reports: "Excel, all reports" next to Export CSV (`reportsApi.excel`, blob download
  `bookly-report-{from}-to-{to}.xlsx`); 404 → "not available yet" toast. 2 tests; 526 pass; build ok; browser
  download checked and file opened; axe 0 at 1280/390 light/dark.

## 2026-11-03: Facebook SDK version (`fix/facebook-sdk-version`)

- `FACEBOOK_VERSION` v21.0 → v25.0 (Meta changelog: v21.0 expires 21 Jan 2027; v25.0 released Feb 2026, available to
  ~Jul 2028). lint, typecheck, 526 tests, build. Browser with a test app ID: "Continue with Facebook" shows (en/km),
  click requests connect.facebook.net SDK, axe 0. Real login not testable here (Facebook blocked by the sandbox).
  Owner setup guide in the backend notes (OWNER_TODO → Facebook sign-in setup).

## 2026-11-03: Facebook testers-only note (`feature/facebook-testing-note`)

- Facebook app is unpublished (Meta business verification refuses vercel.app). `facebookTestersOnly()` (on unless
  `VITE_FACEBOOK_PUBLIC=true`): note under the button (aria-describedby) and an alert when FB.login returns no
  token (sign-in page; toast/dialog in Account → connect). en/km. 2 tests (528 pass), lint, typecheck, build.
  Browser with a stubbed non-tester FB: note + alert in en/km, light/dark, 1280/390, axe 0, no overflow.

## 2026-11-04: Dev-tool warnings (`chore/dev-tool-updates`) and dashboard browser check

- npm audit: site packages 0 warnings (before and after). Dev-only: 2 high (shadcn 3 CLI + its zod 3) fixed by
  shadcn 3.8.5 → 4.23.0. `shadcn/tailwind.css` first 95 lines identical; 4.x adds optional scroll-fade/shimmer
  utilities: built CSS keeps every existing rule, +0.9 kB unused @property. Left (moderate/low, no safe fix):
  minimatch (eslint/typescript-eslint), glob (Sentry build plugin), @redocly (openapi-typescript), deepmerge (no
  patch exists). Backend composer audit: clean. lint, typecheck, 528 tests, build pass.
- Dashboard (roadmap "never checked in a real browser"): Today / 7 days / 30 days / Custom (Oct) on local data, light
  and dark, 1280 and 390: numbers shown, 2 charts, no errors, axe 0, no overflow; 7-day $23.97 and October $198.46
  match ReportsService. Note: rapid switching hits `admin-analytics` 30/min (3 requests per view); my script did,
  a person normally won't. No code change.

## 2026-11-04: visitor stats, signed-in devices, wishlist price-drop badge (frontend)

- `feature/visitor-analytics`: @vercel/analytics, lazy, only when VERCEL=1 at build (VITE_ON_VERCEL); beforeSend
  strips ?query/#hash and drops /admin. Browser (stubbed script, real CSP): script from /_vercel/insights, filter
  registered, URL cleaned, admin dropped, 0 CSP errors. 3 tests.
- `feature/customer-sessions`: SignedInDevices on Account → Sign-in & security (this device first, per-device sign
  out, sign out all others; hidden on 404). Browser vs local API: list + "sign out all others" (other token → 401,
  this one 200), en/km light/dark 1280/390, axe 0. Khmer test: groups marked `// TODO(antigravity)` in km.ts are
  skipped (test reads km.ts?raw); a second test fails once a marked group is translated (remove the marker).
- `feature/wishlist-price-badge`: priceDropSince() (≥1%), "Price dropped N%" + "was $X" in USD only (saved price is
  USD; no client conversion). Browser: USD/KHR, en/km, light/dark, 1280/390, axe 0. Texts moved next to `offers`
  so it merges cleanly with customer-sessions (checked: merge + i18n tests + typecheck green).
- All: lint, typecheck, 532 tests, build.

## 2026-11-04: Delivery map pin (`feature/delivery-map-pin`)

- `src/features/maps/googleMaps.ts` loads Maps JS on demand (`loading=async`, `region=KH`); `MapPinPicker` dialog:
  map limited to Cambodia, fixed centre pin, "Use my location", "Use this spot". AddressForm gets an optional
  "Delivery spot on the map" section (hidden without `VITE_GOOGLE_MAPS_KEY`); edit can remove the pin (sends null).
- `DeliveryAddressCard` (customer + admin order pages) shows "Open in Google Maps" (plain link, no key).
- vercel.json CSP: maps.googleapis.com / maps.gstatic.com scripts + connect, Google Fonts, frame www.google.com,
  worker-src blob:. Schema types regenerated from the backend branch. km `mapPin` = English, TODO(antigravity).
- Checks: lint (0 errors), typecheck, 543 tests (5 new), build OK. Browser (stubbed Maps script, real CSP): pick → save
  → API has lat/lng; en light 1280 + km dark 390: axe 0, no overflow, 0 CSP errors; script not loaded before the
  picker opens; order + admin order pages show the link, axe 0. Real Google tiles not checked (googleapis blocked here).

## 2026-11-05: Cart reminder emails + gift note (frontend)

- `feature/cart-reminder`: CartReminderToggle on Account → Profile (shown when the API sends `cart_reminders`; on
  unless false; needs a verified email). /email/cart-reminders/stop?customer=&token= (no sign-in) calls
  POST /cart-reminders/stop; links home + to the profile. i18n `cartReminder` (km English, TODO(antigravity)).
- `feature/gift-note`: GiftOption in checkout step 1 (checkbox + message ≤200, counter; COD note suggests KHQR when
  enabled); payload is_gift/gift_message only when ticked. Order detail "Gift" card; admin "Gift order" box; packing
  slip stamp + dashed cut-out GiftCard (no prices); invoice stamp "keep this invoice out of the box". i18n `gift`.
- Checks: lint (0 errors), typecheck, 552 tests on the merge of both, build. Browser vs local API (both backend
  branches merged, migrated), real CSP: profile switch off/on (API follows), stop link → API false, gift checkout →
  order 32/33 is_gift + message, order page, admin box, packing slip card + stamp; en light 1280 + km dark 390: axe 0,
  no overflow, 0 CSP errors. Fixed: gift counter wrapped at 390 (nowrap). Not checked: the real email in an inbox.

## chore/deps-and-setup-node

Historical branch notes, retained as originally written; deployment and merge claims are not reverified.


## Setup-node pin & safe dependency updates (2026-10-11; branch `chore/deps-and-setup-node`)
- [x] GitHub Actions: pinned `actions/setup-node` in `.github/workflows/ci.yml` from `v5` tag to `949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` (resolved via `git ls-remote --tags https://github.com/actions/setup-node.git`, confirmed `runs.using: 'node24'` in action.yml; release notes reviewed).
- [x] Dependencies: ran `npm update` to apply updates within existing semver ranges (updated `@sentry/react` 11.4.0 -> 11.6.0, `@tanstack/react-query` 5.104.0 -> 5.104.1, `postcss` 8.5.28 -> 8.5.29, `radix-ui` 1.6.7 -> 1.7.0, `@sentry/vite-plugin` 5.4.0 -> 5.4.1, `@tanstack/react-query-devtools` 5.104.0 -> 5.104.1, `@types/node` 24.19.1 -> 24.19.2, `typescript-eslint` 8.71.0 -> 8.71.1, `vite` 7.3.6 -> 7.3.7). Skipped all major upgrades.
- [x] Audit: `npm audit --omit=dev` reports 0 vulnerabilities. Dev audit reports 9 vulnerabilities (1 moderate `@vitest/mocker` via vitest, 6 high `braces` via shadcn/fast-glob/micromatch, 2 critical `tinypool` via vitest).
- [x] Verification: `npm run lint` passed (0 errors, 5 existing warnings), `npx tsc -b` passed (0 errors), `npx vitest run` passed (37 files passed, 1 skipped; 260 tests passed, 3 skipped), `npm run build` passed.
- [x] Runtime pass: Playwright headless Chromium against local Vite dev server with `VITE_API_BASE_URL=https://bookly-api-zasc.onrender.com/api/v1` exercised `/`, `/books`, `/books/20`, `/cart`, `/login`. 0 console errors, 0 failed requests.
- [x] Docs: updated `docs/ROADMAP.md` (ticked backend Tests workflow chore and backend NEXT_STEP cleanup done in backend `chore/ci-node24-and-docs`, updated Node 24 chore text, ticked frontend dependency updates, added unticked major upgrades list), `docs/NEXT_STEP.md`, and added dated worklog entry.
- Lockfile desync: earlier commit e1bc3d0 broke CI npm ci due to generator npm version mismatch and hoisting conflicts.
- Cause: running npm update (even with npm 10.9.9) produced a ~2,443-line diff with 13 downgrades (notably ajv 8.20.0 -> 6.15.0).
- Fix: restored package-lock.json exactly from main and deferred dependency bumps so npm ci remains fully synchronized with CI.

## chore/pin-setup-node

Historical branch notes, retained as originally written; deployment and merge claims are not reverified.


## Pin actions/setup-node to v7.1.0 (2026-10-12; branch `chore/pin-setup-node`)
- [x] Pinned `actions/setup-node` in `.github/workflows/ci.yml` from `@v5` to `@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` (Node 24 runtime verified from `action.yml` primary source; SHA verified via `git ls-remote --tags`).
- [x] Updated `docs/ROADMAP.md` Phase 2 chores to reflect completed Node 24 bumps across both repositories.
