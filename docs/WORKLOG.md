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
