# Next step — Phase 9: admin panel

Branch: `feature/admin-panel` (from `main` after `feature/content-pages` is merged).

## Goal
Staff run the shop from `/admin` on API v2: sign in with two-factor authentication, see how the shop is doing, and manage the catalogue, orders, returns, reviews, coupons, customers, staff, exchange rates and the audit log. Every screen in docs/V2_PLAN.md "Staff / admin" is rebuilt, then the V1 admin (`src/page/admin/*`, `AdminLayout`, the old services and `sweetalert2`) is deleted.

## Suggested split (decide at the start of the session)
Phase 9 has 14 screens plus staff auth, more than any earlier phase. Two branches keep each PR reviewable:
- **9a `feature/admin-core`**: staff sign-in, 2FA setup and challenge, forgot/reset password, the admin shell (sidebar, header bell for low-stock notifications, role-aware navigation), dashboard (summary + sales chart), books with formats and stock, and the lookups (authors, categories, publishers, series).
- **9b `feature/admin-operations`**: orders (status changes, CSV export), returns (approve, reject, refund), reviews (hide/show), coupons, customers (stats, deactivate), staff members (invite, roles, deactivate, reset 2FA), exchange rates, audit log; then delete the V1 admin and `sweetalert2`.

## Notes
- API: `/staff/*` (see the route list in bookly_backend_v2/routes/api.php). Staff tokens are separate from customer tokens (`setSession("staff", …)` in the Phase 1 session store).
- Roles: check what the API allows per role and hide what a member can't do (the API still enforces it).
- Design: admin is dense and quiet: tables, filters in the URL, the same tokens and components as the shop; no bookplates or hero surfaces. Charts follow MASTER (lapis series, gold only on lapis). Write `design-system/bookly/pages/admin.md` for any admin-specific deviation.
- Destructive actions (delete book, deactivate, reject, refund) always confirm and name the thing.
- Before launch (not this phase): replace the placeholders in `src/content/shop.ts` and have the Privacy/Terms drafts reviewed.
- Local runs: start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`, otherwise it uses the live API from `.env`.
- Chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data, Vite started with VITE_API_BASE_URL=http://localhost:8000/api/v1; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3) and design-system/bookly/pages/*.md.
Status: Phases 0-8 merged (groundwork, typed API layer, UI kit + motion + site shell, storefront catalogue, customer auth, account area, cart + checkout, orders/returns/reviews, content pages with the bookplate design, 404 and offline states).
Next: Phase 9 admin panel, as listed in docs/NEXT_STEP.md and the "Staff / admin" table in docs/V2_PLAN.md. First ask me whether to split it into 9a (staff auth with 2FA, admin shell, dashboard, books, lookups) and 9b (orders, returns, reviews, coupons, customers, staff, exchange rates, audit log, delete V1 admin). Rebuild and then delete the V1 admin pages. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
