# Frontend V2 — worklog

## Phase 0 — Groundwork (branch `chore/v2-groundwork`)
Audit of V1: React 19 + TypeScript + Vite 7 + Tailwind 4, ~14k lines, 13 storefront and 9 admin pages, design system "Lapis & Vermilion" (WCAG-measured, light/dark). Every API call targeted the old PHP API (`/customers/login`, `/invoices`, refresh tokens, `{status, data}` envelopes), so the data layer is replaced in phase 1. Baseline: `tsc` and build passed, 70 ESLint errors, 557 kB main chunk, no tests, no CI.

- [x] Removed 12 outdated summary/checklist docs and 15 unused components/helpers (verified not imported anywhere).
- [x] Lint: 70 errors → 0 (and 18 more from the new `react-hooks/refs` rule in plugin 7.1 after the update, all in V1 forms rewritten later). Shared components fixed properly (typed carousel motion props, quantity stepper syncs without an effect, unused prop). V1 pages/services that later phases rewrite are listed in `eslint.config.js` as temporary exceptions. Fast-refresh hints are warnings.
- [x] Dependencies updated within current majors (React 19.3, React Router 7.18, Tailwind 4.3, Vite 7.3.6, axios 1.20); `npm audit`: 0 vulnerabilities. Majors (Vite 8, Motion 13, lucide 1, TypeScript 7, ESLint 10) deferred to their own changes.
- [x] Vitest + Testing Library (jsdom); first tests for the price helpers. Scripts: `typecheck`, `test`, `test:watch`.
- [x] CI (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build on pushes and pull requests.
- [x] `.env` and `.env.production` were tracked (no secrets, but they pointed at the old API) → untracked; `.env.example` added.
- [x] `docs/V2_PLAN.md`: owner decisions, 11 phases, full page → endpoint inventory. `CLAUDE.md` updated for V2.

## Phase 1 — API layer (branch `feature/api-layer`)
- [x] Checked the backend's OpenAPI spec against real responses (local API + demo data): core shapes matched, 11 responses had no schema. Fixed at the source in the backend (`docs/openapi-response-schemas`): new schemas + `ApiContractTest` that fails when a response and its schema drift.
- [x] `npm run api:types` generates `src/api/schema.d.ts` (openapi-typescript) from the live spec or `OPENAPI_SOURCE`; `src/api/types.ts` names the types (BookCard, Cart, Order, ...).
- [x] `src/api/client.ts`: one axios client, Bearer token chosen by route (`/staff/*` → staff session), 70 s timeout for the sleeping free host, typed helpers, `newIdempotencyKey()`.
- [x] `src/api/errors.ts`: `ApiError` with `kind` (network, unauthenticated, email_unverified, two_factor_setup_required, forbidden, not_found, conflict, validation, rate_limited, server, unexpected), field messages, Retry-After, request id; 5xx never shows server text.
- [x] `src/api/session.ts`: separate customer and staff sessions in localStorage, expiry-aware, synced across tabs, `useSession()`. A 401 on a request that sent a token clears that session and fires `bookly:session-expired`.
- [x] Endpoint modules (`src/api/endpoints/`): catalogue, auth, account (profile, password, addresses, wishlist), cart + checkout (preview, coupon, idempotent order), orders, returns, reviews, each read with TanStack Query options and key factories.
- [x] TanStack Query provider: retries network/5xx only, never mutations; devtools in development only (checked: not in the production bundle).
- [x] USD/KHR preference (`src/stores/currency.ts`), formatted from the API's own usd/khr values.
- [x] Tests: 27 unit tests (errors, sessions, token selection, 401 handling, idempotency key, currency, query params) + `src/api/live.test.ts` (opt-in `LIVE_API=1`): catalogue, typed errors and login → cart → preview → order → same key returns same order → cancel → logout, against the local API from origin `http://localhost:5173` (CORS ok). All pass.
- Note: the main bundle is 631 kB (was 557) with TanStack Query; V1 code removal in phases 3-9 and code splitting in phase 10 bring it down.
- Backend gap found: full-text search covers book title + description only, so "Sherlock" or an author's name finds nothing unless the description mentions it. Needs a backend change (search authors and series too) — to discuss with the owner before phase 3.

## Phase 2 — UI kit + motion (branch `feature/ui-kit-motion`)
- [x] Backend search gap from phase 1 is fixed in the backend (search matches titles, descriptions, authors, series and categories; prefix matching), merged before this phase.
- [x] GSAP removed. Only `AnimatedContent` used it; rebuilt on Motion with the same props (owner's choice), so V1 Home, Browse and the footer keep their reveals. Checked in a browser: blocks fade in on scroll, reduced motion shows them in place.
- [x] Motion tokens in one place: `src/lib/motion.ts` (durations, easings, stagger, shared variants) mirrored by CSS `--dur-*` / `--ease-*`.
- [x] Design system v3 (`design-system/bookly/MASTER.md`): same colours and fonts; new tokens for semantic tints (`--success-tint`, `--warning-tint`, `--destructive-tint`, contrast measured: 5.2–8.1), overlay scrim, layering (`--z-header` … `--z-toast`), header height and the `.container-shell` page container; specs for select, checkbox/radio/switch, tabs, dialog, drawer, cart drawer, live search, currency switch, error states and page transitions (§4, §5, §6.14–6.22).
- [x] UI kit (`src/components/ui/`): Button (+ `loading`, `on-lapis`), Select / NativeSelect / `SelectField`, Checkbox, RadioGroup, Switch, Badge (tone × shape) + CountBadge, Dialog + ConfirmDialog, Drawer (right/left/bottom), Tabs (sliding indicator), Pagination (+ `pageRange`, `rangeSummary`), Skeleton / SkeletonGroup / SkeletonRow, Toaster + `toast` store (replaces SweetAlert toasts for V2 code), ErrorState / InlineError, `RouteErrorBoundary`. Radix underneath for focus, keyboard and ARIA; Motion for enter/exit.
- [x] Motion: `PageTransition` (360 ms in / 150 ms out, scroll to top on new pages but kept on Back/Forward, focus moved to the new page's `h1`) and `Stagger` for grids. Existing React Bits pieces (BlurText, CountUp, Carousel, SpotlightCard, GlareHover) were already GSAP-free.
- [x] New site shell (`src/components/shell/`), on the V2 API layer only: sticky header (nav, live search, USD/KHR switch, theme, cart count, account menu or Sign in), mobile menu drawer, cart drawer (signed out / loading / error / empty / read-only lines + subtotal; editing comes in phase 6), footer, skip link, toasts. V1 `Header.tsx` and `Footer.tsx` deleted.
- [x] Live search: `/books?q=&sort=relevance&per_page=6`, 250 ms debounce, 2+ characters, matched words in bold, ↑/↓/Enter/Esc, `/` focuses it, "See all results" → `/search?q=`.
- [x] Stopped calling V1's `/storefront/settings` on every page (no such endpoint in v2; it logged a 404 each time). V1 pages use the same built-in defaults as before.
- [x] `/ui-kit` (development builds only, not in the production bundle): every component in its states for review by eye and keyboard. V2 pages live in `src/pages/` (V1 stays in `src/page/` until replaced).
- [x] Tests: 22 new (UI kit, shell, toast store, pagination and highlight helpers, nav). Totals: 63 pass, 3 live-API tests skipped by default.
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with demo data at 1366/1024/900/375 px, both themes, reduced motion: dialog focus trap + return focus, confirm dialog busy state, drawer scrim close, select and tabs by keyboard, pagination, toasts (error persists), KHR prices, live search results and keyboard, signed-in header ("Cart, 2 items"), cart drawer lines, account menu, mobile menu closes on navigation, no horizontal scroll at 375 px.
- Known until later phases: header and footer links to `/books`, `/authors`, `/series`, `/search`, `/account/*` and content pages show the 404 page until those pages are built (phase 3 onward). Sign-in state comes from the V2 session, which the V1 login page doesn't write; phase 4 rebuilds login. Main bundle 668 kB (code splitting in phase 10).

## Phase 3 — Storefront catalogue (branch `feature/storefront-catalog`)
- [x] Helpers: `src/lib/catalog.ts` (filters ⇄ URL, sort and format labels; malformed values are dropped before reaching the API), recently viewed store (last 12 books in localStorage, synced across tabs), `useDocumentTitle`.
- [x] Catalogue components (`src/components/catalog/`): `BookCover` (titled placeholder when there's no image), V2 `BookCard` (MASTER §6.12, compact rating, "from" price, New / Out of stock badges), `BookGrid`, `BookShelf` (scroll-snap row with prev/next), `PageHeader`, `CatalogFilters`, `ActiveFilters`, `CatalogBrowser`, `FormatPicker`, `ReviewsSection`, `AuthorAvatar`, `NotFoundState`, cover morph helper.
- [x] Add to cart and wishlist work from every card and the book page (`useCatalogActions`). Cards add the cheapest format in stock; the wishlist updates optimistically. Signed out → a toast with Sign in (`/login?next=…`).
- [x] Pages (`src/pages/`): Home (hero with BlurText, CountUp stats and cover slideshow, service promises, new arrivals, categories, best rated, series spotlight, authors, recently viewed), `/books` (filters in a sidebar or a phone bottom sheet, chips, sort, pagination, all in the URL), `/search`, `/books/:id` (format picker, price per format, quantity, add to cart, wishlist, description/details/reviews tabs, series and author shelves, recently viewed, sticky purchase bar on phones, not-found state), `/authors`, `/authors/:id`, `/series`, `/series/:id` (reading order), `/categories/:slug`, `/publishers/:id`.
- [x] Removed V1 Home, Browse and BookDetail, and the components only they used (sample book list, combobox and its inputs, `@base-ui/react`). `/browse?search=x` → `/search?q=x`, `/browse` → `/books`.
- [x] Fixes found in the browser pass:
  - The page fading out of a route transition re-rendered with the new URL, so the next page existed twice for 150 ms (two h1s, double requests). `FrozenOutlet` keeps each layer on its own route.
  - The leaving page's title cleanup overwrote the new title.
  - StrictMode's double effects focused the landing page's h1 (now compared by pathname, which also stops filter changes from scrolling to the top).
  - The sticky purchase bar missed fast scrolls (scroll check instead of IntersectionObserver) and covered the footer.
  - A redirect inside the animated layout re-ran with the new URL.
  - Mobile toolbar overflow; truncated sort select; serif footer headings.
- [x] Tests: 85 pass (new: catalogue filters/URL, recently viewed, book meta, BooksPage filters/empty/sign-in prompt, book page format and cart flow and not-found, /browse redirect).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with demo data at 1366 and 375 px and in dark mode. Covered: filters, sort, Back/Forward, page past the end, search, add to cart (signed out and in, including the API's out-of-stock message), wishlist toggle, format switch, tabs, reviews, shelves, recently viewed, every not-found state, the Home hero keyboard controls, no horizontal scroll.
- Known:
  - Covers come from picsum.photos in the demo data, which this sandbox can't reach, so screenshots show the placeholder cover.
  - Quantity isn't capped by stock (the API exposes only in/out of stock); the API's "Only 1 left" message is shown instead.
  - `npm audit` reports a new moderate advisory in Vitest 3 (dev-only test runner, also on main); fixing needs Vitest 5, left for a separate chore.
  - Main bundle 673 kB (code splitting in phase 10).

## Phase 4 — Customer auth (branch `feature/customer-auth`)
- [x] React Hook Form 7 + Zod 4 (+ resolvers). Schemas in `src/features/auth/schemas.ts` mirror the API: name ≤ 150, email ≤ 190, password ≥ 8 with a letter and a number, matching confirmation, 6-digit codes. `applyApiErrors` puts 422 field messages on their fields and returns the rest for a form alert; `safeNext` accepts only same-site paths (blocks `//evil.com`, other origins, `javascript:`, loops back to auth pages).
- [x] Pages (`src/pages/auth/`, framed by the existing AuthShell with its lapis quote panel): sign in (API message on 401, password cleared, `?next=`), create account (live password checklist, duplicate-email error on the field), verify email (6-cell code, wrong code on the cells, resend with cooldown, "sign out and start again"), forgot password, reset password (email kept across a refresh in sessionStorage, resend, success → sign in with a notice). Google/Facebook buttons are shown disabled as "coming soon".
- [x] After sign-in: unverified accounts go to `/verify-email?next=…` (the API blocks cart, wishlist and checkout until then); others return to `next`. Cached cart and account data from a previous visitor is dropped.
- [x] Guards (`src/routes/guards.tsx`): `RequireCustomer` (→ `/login?next=`), `RequireVerified` (→ `/verify-email?next=`), `GuestOnly` (signed in → `next`). V1's `/checkout`, `/profile`, `/orders` now use the V2 session guard. `/verify-otp` (V1 reset link) → `/reset-password`.
- [x] Session expiry: `SessionWatcher` reacts to the API client's `bookly:session-expired`, clears the customer's cached data and shows one "You've been signed out" toast with a Sign in link back to the page; guarded pages redirect by themselves.
- [x] Unverified customers: add to cart and the wishlist heart explain "Verify your email first" with a link instead of failing with a 403; the cart drawer shows a verify state and no cart request is made.
- [x] Toaster moved to the app root (auth pages sit outside the shop layout) and its list is now a persistent `aria-live` region, which also keeps toasts announced while a drawer or dialog is open (Radix hides everything else from assistive tech, but leaves live regions).
- [x] Shared fields merge an extra `aria-describedby` (e.g. the password checklist) with their own error/hint instead of replacing it.
- [x] Removed V1 sign in / sign up / OTP / forgot / reset pages, the customer login and register forms, `lib/customer.ts`, `lib/passwordReset.ts`, the V1 customer route guard and one lint exception. V1 admin sign-in stays until phase 9.
- [x] Tests: 115 pass (new: schemas, forms helpers, cooldown, and an integration suite for sign-in, sign-up, verification, reset, guards and session expiry).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API reading real codes from the mail log:
  - register (from a book page) → verify (wrong code, then the right one) → back on the book;
  - sign out → forgot → reset → sign in with the new password;
  - guest-only redirect and an unsafe `next` ignored;
  - expired token → toast and the protected page redirects;
  - unverified account → no 403s;
  - 375 px with no horizontal scroll, and dark mode.
