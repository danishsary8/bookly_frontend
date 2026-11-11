# Catalogue pages — deviations from MASTER

> Overrides `design-system/bookly/MASTER.md` for /books, /search, /categories/:slug, /authors, /authors/:id,
> /publishers/:id, /series, /series/:id, /collections/:slug, /lists/:slug and the book page (/books/:id).
> Added 2026-11-10 (redesign phase 2, branch `design/catalogue-pages`). Builds on `pages/shopping.md`.

## 1. Paper and sheets
Every catalogue page sits on the home page's warm paper (SiteShell adds `.home-paper` to `<main>` for these routes and
drops the footer gap). Cards on it use `.shop-card` (see shopping.md §1).

## 2. Page header (`src/components/catalog/PageHeader.tsx`)
- `covers`: real covers from the page's own listing, fanned on the right (CoverStack md, 4) on index pages
  (All books, search results). The listing comes from `useCatalogListing` (`src/components/catalog/catalogListing.ts`),
  the same query as the grid below, so it is one request; no covers until it loads, none on search without a query.
- `variant="panel"`: one card for a single thing (category, publisher, author, series, collection, reading list):
  text on the left, CoverStack lg (5) on the right, a 20% blurred wash of the first cover behind it fading into the card
  from the left. `meta` adds a row under the lead (book count, Complete the set, list actions); `media` replaces the
  covers. Covers hide below 768px.

## 3. Listing pages
- Filters sit on a sticky card with a count badge when filters are on; the search-within field is a pill with a soft
  lift. Grid, sort, chips and pagination unchanged.
- Category: subcategory chips are white pills with a soft lift.
- Author: portrait (or initials) ringed in the card colour inside the title, bio clamped to 4 lines, "N books" in caps.
- Authors index: cards (radius 2xl) with a lapis-tint ring around the portrait; lift 4px on hover.
- Series index: each card shows decorative cloth spines, one per book (up to 7, heights from the id, a gold rule near
  the top), which rise in a short stagger on hover. The API has no covers for a series list, so nothing pretends to
  be a cover.
- Series: the panel header carries Complete the set; volumes are numbered with solid lapis discs ("1 · Book 1").
- Shared reading list: owner as the eyebrow, Add all / Share / Manage in the panel; each note is a small card with a
  pointer under its book, in italic muted text.

## 4. Book page (polish only)
BookStage unchanged. The purchase block is one buy box (card): format, price in display type, stock, offer, then
"Only N left" (`low_stock_remaining`) and "N sold in the last 90 days" (`sold_count`) side by side as chips, the trust
line, then quantity + Add to cart (the one vermilion CTA) + wishlist + share, then read now / preview, add to a reading
list, and the three promises as a dashed-rule row (no nested card). Add to cart now shows on a 1440×900 screen.

## 5. Shared fixes
- LowStockBadge uses the solid `--warning-tint` (MASTER §6.3 "tinted fill"), not 12% warning, which vanished on dark
  covers.
- `surface-1` / `surface-3` were used in a dozen components but never defined; now derived utility colours (MASTER §2).
- Grid items in series and reading-list grids get `min-w-0` so long card lines can't widen a phone screen.
