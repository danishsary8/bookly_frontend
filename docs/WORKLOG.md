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
