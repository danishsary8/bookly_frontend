# Next step — Phase 6: cart and checkout

Branch: `feature/cart-checkout` (from `main` after `feature/account` is merged).

## Goal
A verified customer can review their cart, apply a coupon and place a cash-on-delivery order, end to end on API v2.

| Route | Page | API |
| --- | --- | --- |
| cart drawer | Make the Phase 2 drawer editable: quantity stepper, remove, issues per line (out of stock, price changed), subtotal | `GET /cart`, `PATCH/DELETE /cart/items/{id}` |
| `/cart` | Full cart: lines with cover, format, stepper, remove, line totals; issues banner; coupon field; summary; "Continue to checkout" | `GET/DELETE /cart`, `PATCH/DELETE /cart/items/{id}`, `POST /cart/coupon/check` |
| `/checkout` | 1) delivery address: saved addresses (default preselected) or a new one with the Phase 5 `AddressForm`; 2) payment: cash on delivery (card / KHQR shown "coming soon"); 3) review: lines, coupon, totals from the preview; place order | `GET /addresses`, `POST /checkout/preview`, `POST /checkout` (Idempotency-Key) |
| `/checkout/success/:id` | Confirmation: order number, items, totals, delivery address, what happens next | `GET /orders/{id}` |

## Notes
- Guard `/cart` (signed out sees the empty/sign-in state like the drawer) and `/checkout` with `RequireVerified`. Digital-only carts don't need an address (`requires_shipping` from the preview).
- Reuse `cartApi`/`cartQueries` (Phase 1); keep the cart query in sync after each mutation (`setQueryData`) so the header count and drawer update at once; optimistic quantity with rollback.
- Checkout must be safe to retry: one `newIdempotencyKey()` per checkout attempt, reused on retry after a timeout; disable the button while placing; handle `409`/`422` (stock changed, coupon invalid) by refreshing the preview and explaining.
- Prices: totals come from the API (USD and KHR); never compute money in the browser.
- Delete the V1 `src/page/client/Cart.tsx` and `Checkout.tsx` (and their lint exception entries if nothing else needs them); `/cart` and `/checkout` become V2.
- Separate chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3).
Status: Phases 0-5 merged (groundwork, typed API layer, UI kit + motion + site shell, storefront catalogue, customer auth, account area: overview, profile, password, address book with a reusable AddressForm, wishlist).
Next: Phase 6 cart and checkout on branch feature/cart-checkout, as listed in docs/NEXT_STEP.md: editable cart drawer, /cart with coupon, /checkout (address, cash on delivery, review, idempotent place order), order confirmation. Rebuild and then delete the V1 Cart and Checkout pages. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
