# Next step — Phase 10: launch

Branch: `feature/launch` (from `main` after `feature/admin-operations` is merged).

## Goal
Make the finished V2 ready for real visitors and put it online (V2_PLAN phase 10).

| Area | Work |
| --- | --- |
| Accessibility | Keyboard-only and screen-reader pass over the main flows (browse → book → cart → checkout → order; sign in / register; account; admin sign-in → order status change); focus order and visible focus; headings and landmarks; colour contrast in light and dark; reduced motion. Fix what's found. |
| SEO | Titles and meta descriptions on every public page (most titles exist), Open Graph / Twitter tags (book pages use the cover), canonical URLs, `robots.txt` (block `/admin`, `/account`, `/checkout`), `sitemap.xml` (static pages plus books, authors, series, categories from the API, generated at build time). |
| Performance | The main chunk is about 670 KB minified: split vendor code (React, router, TanStack Query, Radix, Motion) and keep the admin out of the storefront bundle; check images (sizes, lazy loading, `width`/`height`); fonts (preload, `font-display`); Lighthouse on home, catalogue and book page (phone). |
| Smoke tests | Playwright tests in the repo (not just local scripts): home → book → add to cart → checkout (cash) → order page; sign in; admin sign-in with a TOTP code → change an order status. Run against a local API in CI or as a manual script, whichever fits the CI time. |
| Deploy | Vercel project for the frontend (`vercel.json` rewrites already exist), `VITE_API_BASE_URL` pointing at the live API, preview deploys per branch. |
| API | `CORS_ALLOWED_ORIGINS` on the live API set to the Vercel URL(s) (an environment setting on Render, no code change). |
| README | What Bookly is, stack, local setup (API + Vite env), scripts, tests, deploy, screenshots (storefront and admin, light and dark). |

## Notes
- Card and KHQR stay "coming soon"; no payment-provider work.
- Contact details, delivery facts and legal pages are still placeholders / drafts marked for review (`src/content/shop.ts`); launching for real needs the owner's text, so ask before removing the markers.
- Chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff are `admin@bookly.test` / `staff@bookly.test` with a known local test password and 2FA on (secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgraded in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data, Vite started with VITE_API_BASE_URL=http://localhost:8000/api/v1; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3) and design-system/bookly/pages/*.md.
Status: Phases 0-9 merged (storefront, customer account, checkout with cash on delivery, orders/returns/reviews, content pages, full staff admin; the V1 admin and sweetalert2 are gone).
Next: Phase 10 launch on branch feature/launch, as listed in docs/NEXT_STEP.md: accessibility pass, SEO (meta, Open Graph, robots, sitemap), performance and bundle split, Playwright smoke tests in the repo, Vercel deploy, CORS on the live API, README with screenshots. Ask me before any decision not covered by V2_PLAN or MASTER, and before anything that needs my accounts (Vercel, Render) or real shop details.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
