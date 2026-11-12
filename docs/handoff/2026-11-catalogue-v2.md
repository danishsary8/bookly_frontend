# Handoff: catalogue v2 (2026-11-12)

Branch `design/catalogue-v2` (from `main` at ae392ec), one commit, not merged.

## Per page
- /books: compact `CatalogueHeader` (lead beside the title and no eyebrow/fan on screens under 820px tall, so the first
  row of books fits 1366×768); 5 columns beside the filters at ≥1280px; search-within moved into the filter card.
  Toolbar: live count and sort; on phones it is sticky under the header with the Filters sheet button.
  Removable chips include a chosen sort ("Sorted: Best selling" from Home's See all).
- /search: one field beside the title; "Did you mean …?" built from the returned titles (the API only flags
  typo_tolerant); ISBN line and ISBN no-match text; empty hub: recent searches (44px, labelled remove),
  popular searches, ISBN tip, top-level categories linking to /categories/:slug, popular books.
- /categories/:slug: entity sheet with parent in the breadcrumb and sub-category / sibling pills (+ "All {parent}");
  grade and level as one-tap chips inside a category (Education); best-sellers shelf under the grid (replaces
  CatalogRows, which gave every row the same title).
- /authors: bio snippet on cards, search field follows Back/Forward, live count, "Search books for …" on no match.
- /authors/:id: portrait, bio with Read more, book count, All authors; "Readers also like" shelf.
- /series: spine colours as CSS tokens (`.series-spine[data-cloth]`), volume count, live count.
- /series/:id: author links, volumes, All series; set offer / Complete the set opens the cart drawer; numbered
  volumes via the shared grid; "More by {author}" shelf.
- /publishers/:id, /collections/:slug, /lists/:slug: entity sheet, Books in the breadcrumb, shared grid
  (list notes under their book), "More books like these"; list 404 shows a not-found state.
- 404: bookplate kept; All books link, top-level category pills, popular books shelf.
- Shared: no-results card (remove one filter, clear all, browse all + popular shelf), pre-order / ebook-only line on
  listing cards, Add to cart from listings opens the cart drawer, Back restores the scroll position
  (`useScrollMemory`), category chips show counts for the current filters.

## New files
CatalogueHeader, RelatedShelf, NoResults, QuickFacets, SearchNotices, SortSelect, filterChips.ts,
hooks/useScrollMemory.ts, catalogue-v2.test.tsx, lib/analyticsEvent.ts (lint warning fix).

## Deleted
- Files: components/catalog/CatalogRows.tsx and its test.
- Unused: BookGridSkeleton; PageHeader's catalogue-only props (covers, panel, media, meta, eyebrow, lead; cart and
  checkout keep it).
- i18n keys (en + km): catalog.noBooksFound, search.noResults, pages.seriesEyebrow, categorySubNav.backToParent,
  collections.pageEyebrow, readingLists.loading.

## New keys needing Khmer
`catalogue.*` (km.ts has English text under `// TODO(antigravity)`). `browse.searchWithin` changed its text.

## Other fixes
- index.css: the stash's merge had dropped the reader styles (.reader-dark/light/sepia, .reader-chrome). Restored from
  main; the file now differs from main only by the catalogue toolbar and series spine rules, with no duplicate rules.
- Lint warning (VisitorAnalytics fast refresh) and the build's 500 kB chunk warning are fixed (Radix in its own chunk).

## Checks
lint (0 errors, 0 warnings), typecheck, tests (669 passed, 3 skipped), build (no warnings).
Browser (Vite + a local catalogue mock, light, English, reduced motion): all 11 routes plus search states at
1440×900 and 390×844 with axe: 0 violations, no console errors, no sideways scroll. Earlier pass: 1366×768 fit,
Khmer and dark at 1366/390, and Home → See all → filter → book → Back (filters + scroll) → add to cart → drawer.

## Not checked
The real API; 1920×1080 and dark/Khmer in this final pass; touch devices. Editor Tailwind class hints in
AccountLayout were left alone (account was out of scope).
API proposal: series ids on BookCard and an author's series list, for "other series by this author".
