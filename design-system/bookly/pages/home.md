# Home — deviations from MASTER

## Page order
Search-first hero (staff picks carousel, fits one screen) → 3D shelf → "Continue where you left off" (returning visitors only) → Shop by category → Staff picks → seasonal collections (when live) → New arrivals → Series spotlight → Authors → delivery promises + store rating.
On `/` the header search hides (fade) while the hero search is on screen, and returns once it scrolls away.

## Hero: 3D bookshelf (`src/components/home/ShelfHero.tsx`)
- Full-bleed warm paper band (`.home-paper`, faint grain) under the header.
- Row tabs (Best sellers / New arrivals / Coming soon / Ebooks under $5) from `/catalog/rows`; only rows with 3+ books show.
- Endless shelf: up to 12 books, 3 copies, spine-out (cloth colours, gold rules, vertical title). The middle book turns 90° in CSS 3D to show its cover, leans −3.5°, comes 18% of H forward; the rest recede in an arc (`depth = −|r|^1.35 · 0.11H`).
- Motion: one rAF loop, spring k = 5.2 (18 while dragging); hover lifts a spine 5% of H; the open cover tilts toward the cursor (±9° Y, ±6° X); drifts to the next book every 4.5 s until touched.
- Caption (title, author, price, View book, View all) rolls through a mask on change (650 ms, `cubic-bezier(.2,.8,.2,1)`); direction follows travel.
- Inputs: click a spine, arrows, ←/→ with focus, Enter opens, drag (touch-action pan-y). Reduced motion: snap, no drift, no tilt, no roll.
- Fallback (no rows / API down): cloth boards titled "Bookly" and the shop tagline.

## Polish (2026-11)
- Hero carousel: 15 books (staff picks first, then best selling), 3.5 s per slide with a gold timer bar; caption text slides in per book; cover up to 360px wide, sized from the screen height.
- Shelf: height from the screen (`innerHeight − 620`, 190–380px) so the section fits one screen; copies of the list scale with the screen width; drifts every 3 s; keyboard focus is shown on the hint line, not as a ring.
- Shop by category: typographic index of top-level categories (number, name, sub-genres, count), 2 columns, hairlines; hover slides the name, draws a blue rule and brings in an arrow; first 8 + "Show all".
- Book rows (`BookShelf`): 2.2 / 3.2 / 4.3 / 5.3 cards across so the next card peeks; the far edge fades; a thin track under the row follows the scroll. `rows={2}` (New arrivals) stacks two rows that page together.
- The floating Support button is off for now.
