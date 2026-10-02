# Next step — Phase 8: content pages

Branch: `feature/content-pages` (from `main` after `feature/orders-returns-reviews` is merged).

## Goal
Every link in the footer and header leads to a real, on-brand page, and errors are handled gracefully.

| Route | Page |
| --- | --- |
| `/about` | Who Bookly is, what it sells, why (short, editorial) |
| `/faq` | Accordion of common questions (orders, cash on delivery, delivery, returns, accounts, reviews) |
| `/shipping` | Delivery areas and times, the flat fee (API: `SHIPPING_FLAT_FEE`, $2.00), digital books need no delivery |
| `/returns-policy` | 14-day window after delivery (API: `RETURN_WINDOW_DAYS`), physical books only, how to request one in the account |
| `/privacy`, `/terms` | Legal pages with a last-updated date |
| `/contact` | How to reach the shop |
| 404 | V2 not-found page (replaces V1 `src/page/NotFound.tsx`) |
| 500 / offline | Friendly error page for crashes (error boundary) and a "you're offline" state |

## Notes
- Questions to ask the owner before writing: the real contact details (email, phone, Telegram, address, opening hours); whether `/contact` should have a form (the API has no contact endpoint, so a form would need backend work or a `mailto:`); delivery areas and times; and whether to draft the privacy/terms text as placeholders marked for legal review.
- Facts that the API enforces (fee, window, physical-only returns, one review per book after delivery) must match the backend config; don't invent policies.
- Content pages share one layout (MASTER typography, max reading width, table of contents on long pages). Use `PageHeader` and set page titles.
- Delete V1 `NotFound` and anything `orphans` then shows as unused.
- Chores when convenient: drop `sweetalert2` with the V1 admin (phase 9); upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3).
Status: Phases 0-7 merged (groundwork, typed API layer, UI kit + motion + site shell, storefront catalogue, customer auth, account area, cart + checkout, orders with timeline and cancel, returns, reviews).
Next: Phase 8 content pages on branch feature/content-pages, as listed in docs/NEXT_STEP.md: about, FAQ, shipping & delivery, returns policy, privacy, terms, contact, and V2 404 / 500 / offline pages. Ask me first for the contact details, delivery areas and times, whether contact needs a form, and how to handle the legal text. Rebuild and then delete the V1 NotFound page. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
