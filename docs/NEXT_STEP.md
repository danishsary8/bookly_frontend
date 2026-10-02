# Next step — Phase 3: storefront catalogue

Branch: `feature/storefront-catalog` (from `main` after `feature/ui-kit-motion` is merged).

## Goal
Rebuild the browsing pages on the V2 API with the Phase 2 UI kit and shell, so every header and footer catalogue link works.

| Route | Page | API |
| --- | --- | --- |
| `/` | Home: hero, new arrivals, best rated, categories, series spotlight, authors, recently viewed | `GET /books` (sort newest, rating), `/categories`, `/series`, `/authors` |
| `/books` | Catalogue: filters (category, author, series, publisher, format, language, price, in stock), sort, pagination, all synced to the URL; filters in a bottom/side drawer on mobile | `GET /books`, `/categories`, `/publishers` |
| `/search?q=` | Results (relevance), "No books match" state, the header search keeps the query | `GET /books?q=&sort=relevance` |
| `/books/:id` | Detail: format picker, USD/KHR price, stock, add to cart (opens the cart drawer), wishlist, description/details/reviews tabs, rating summary, series, related books, cover morph | `GET /books/{id}`, `/books/{id}/reviews`, `/books?author_id=`, `/series/{id}` |
| `/authors`, `/authors/:id` | Index + author page with books | `GET /authors`, `/authors/{id}`, `/books?author_id=` |
| `/series`, `/series/:id` | Index + series in reading order | `GET /series`, `/series/{id}` |
| `/categories/:slug` | Category landing | `GET /categories`, `/books?category_id=` |
| `/publishers/:id` | Publisher landing | `GET /publishers`, `/books?publisher_id=` |
| — | Recently viewed (localStorage, last 12, shown on Home and detail) | — |

## Notes
- New pages go in `src/pages/`; delete the V1 pages they replace (`src/page/client/Home.tsx`, `Browse.tsx`, `BookDetail.tsx`, `BookDetailModal.tsx`, ...) and their `eslint.config.js` exceptions. Redirect `/browse` → `/books`.
- Use `catalogQueries` / `catalogApi` from `src/api/endpoints/catalog.ts`, prices with `formatMoney(usd, khr, useCurrency())`, `Pagination` with `hrefFor`, `Stagger` for grids, `BookCardSkeleton` + `useSkeletonVisible`, `ErrorState`, `EmptyState`.
- "Add to cart" needs a session: signed out → toast with "Sign in" action; full cart editing is phase 6. Wishlist toggling needs auth too (phase 5 builds the wishlist page).
- Rebuild `BookCard` on the V2 `BookCard` type (MASTER §6.12).
- Per-page `<title>` (Phase 10 adds meta/OG; a small `useDocumentTitle` now is fine).

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3).
Status: Phases 0-2 merged (groundwork, typed API layer with TanStack Query, UI kit + motion + new site shell). Open /ui-kit in dev to see every component.
Next: Phase 3 storefront catalogue on branch feature/storefront-catalog, as listed in docs/NEXT_STEP.md: Home, /books with URL-synced filters/sort/pagination, /search, /books/:id, authors, series, categories, publishers, recently viewed. Use the Phase 2 UI kit and shell; new pages in src/pages/, delete the V1 pages they replace. Ask me before any decision that isn't covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider work; don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
