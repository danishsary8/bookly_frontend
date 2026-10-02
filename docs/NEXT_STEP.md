# Next step — Phase 7: orders, returns and reviews

Branch: `feature/orders-returns-reviews` (from `main` after `feature/cart-checkout` is merged).

## Goal
A customer can follow their orders, cancel one that hasn't shipped, ask to return books, and write, edit and delete reviews.

| Route | Page | API |
| --- | --- | --- |
| `/account/orders` | Order list with status badge, date, item count, total; paginated in the URL; empty state | `GET /orders` |
| `/account/orders/:id` | Detail: items, totals, delivery address, status timeline (`status_history`), Cancel (when `can_cancel`, with confirmation), "Request a return" (delivered orders) | `GET /orders/{id}`, `POST /orders/{id}/cancel` |
| return request | Pick returnable lines and quantities plus a reason; submit | `GET /orders/{id}/returnable-items`, `POST /orders/{id}/returns` |
| `/account/returns` (+ `/:id`) | Return list and detail with status; withdraw a pending one | `GET /returns`, `GET /returns/{id}`, `DELETE /returns/{id}` |
| reviews | Write / edit / delete on the book page (only for books the customer bought, per the API); "My reviews" list in the account | `POST /books/{id}/reviews`, `PATCH/DELETE /reviews/{id}`, `GET /reviews` |

## Notes
- Add "Orders", "Returns" and "Reviews" to the account navigation; link the overview's recent orders and the checkout confirmation to the order detail.
- Reuse the V2 `OrderStatusBadge` (Phase 5) and `ordersApi`/`orderQueries` (Phase 1). Orders are in USD per line; the total also has riel.
- Reviews are rate-limited (10/min); show the API's 422 messages on their fields with `applyApiErrors`.
- `/orders` and `/orders/:id` (V1) become redirects to `/account/orders…` outside the animated layout. Then delete V1 `Orders.tsx`, `OrderDetail.tsx` and whatever `orphans` shows as unused (V1 cart lib/services, order helpers), with their lint exceptions.
- Separate chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3).
Status: Phases 0-6 merged (groundwork, typed API layer, UI kit + motion + site shell, storefront catalogue, customer auth, account area, cart + checkout with coupon, cash on delivery, idempotent place order and confirmation).
Next: Phase 7 orders, returns and reviews on branch feature/orders-returns-reviews, as listed in docs/NEXT_STEP.md: account order list and detail with timeline and cancel, return requests, returns list, write/edit/delete reviews, account nav entries. Rebuild and then delete the V1 Orders and OrderDetail pages. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
