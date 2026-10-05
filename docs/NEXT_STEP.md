# Next step — Phase 9b: admin operations

Branch: `feature/admin-operations` (from `main` after `feature/admin-core` is merged).

## Goal
The rest of the staff screens on API v2, then the V1 admin is deleted.

| Route | Screen | API |
| --- | --- | --- |
| `/admin/orders`, `/:id` | Orders with filters (status, date, search), detail with timeline, status changes with a note, CSV export (admin) | `/staff/orders*`, `/staff/orders/{id}/status`, `/staff/orders/export` |
| `/admin/returns`, `/:id` | Approve, reject (with note), refund (amount) | `/staff/returns*` |
| `/admin/reviews` | Hide / show reviews | `/staff/reviews*` |
| `/admin/coupons` | Coupon list, create, edit | `/staff/coupons*` |
| `/admin/customers`, `/:id` | Lookup, order stats, deactivate / activate | `/staff/customers*` |
| `/admin/staff` (admin) | Invite, roles, deactivate / activate, reset 2FA, resend invitation | `/staff/members*` |
| `/admin/exchange-rates` (admin) | USD → KHR rate | `/staff/exchange-rates` |
| `/admin/audit-log` (admin) | Change history | `/staff/audit-logs` |

## Notes
- Reuse the 9a pieces: `AdminPage`, the table pattern (relative scroll box), `staffApi` / `staffKeys`, `RequireAdminRole` (already in `src/routes/adminGuards.tsx`) and `adminNav` (add the Sales and Admin groups with `roles: ["admin"]` where the API needs it).
- Order and return status badges already exist (`OrderStatusBadge`, `ReturnStatusBadge`); allowed status changes come from the API (show only valid next steps).
- Every destructive or customer-facing action (reject, refund, deactivate, reset 2FA) confirms and names the thing.
- Then delete the V1 admin: `src/page/admin/*`, `AdminLayout`, `ProtectedRoute`, `PublicRoute`, the V1 `api/axios.ts` refresh logic and services/types only they use (run `orphans`), `sweetalert2` (package, CSS import and styles) and the V1 `modal.tsx` if unused; redirect `/superadmin*` to `/admin`.
- Local testing: demo staff are `admin@bookly.test` / `staff@bookly.test`; their passwords were reset locally to a known test value and 2FA is on (secrets in the session scratchpad). Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
- Chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data, Vite started with VITE_API_BASE_URL=http://localhost:8000/api/v1; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3) and design-system/bookly/pages/*.md (admin.md for the staff area).
Status: Phases 0-8 and 9a merged (storefront complete; staff sign-in with 2FA, admin shell, dashboard with sales chart, books with formats and stock, authors/categories/publishers/series).
Next: Phase 9b admin operations on branch feature/admin-operations, as listed in docs/NEXT_STEP.md: orders (status changes, CSV export), returns (approve/reject/refund), reviews (hide/show), coupons, customers, staff members, exchange rates, audit log; then delete the V1 admin and sweetalert2 and redirect /superadmin to /admin. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
