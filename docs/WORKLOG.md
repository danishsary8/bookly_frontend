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
