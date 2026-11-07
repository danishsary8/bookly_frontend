# Home — deviations from MASTER

## Hero: 3D bookshelf (`src/components/home/ShelfHero.tsx`)
- Full-bleed warm paper band (`.home-paper`, faint grain) under the header.
- Row tabs (Best sellers / New arrivals / Coming soon / Ebooks under $5) from `/catalog/rows`; only rows with 3+ books show.
- Endless shelf: up to 12 books, 3 copies, spine-out (cloth colours, gold rules, vertical title). The middle book turns 90° in CSS 3D to show its cover, leans −3.5°, comes 18% of H forward; the rest recede in an arc (`depth = −|r|^1.35 · 0.11H`).
- Motion: one rAF loop, spring k = 5.2 (18 while dragging); hover lifts a spine 5% of H; the open cover tilts toward the cursor (±9° Y, ±6° X); drifts to the next book every 4.5 s until touched.
- Caption (title, author, price, View book, View all) rolls through a mask on change (650 ms, `cubic-bezier(.2,.8,.2,1)`); direction follows travel.
- Inputs: click a spine, arrows, ←/→ with focus, Enter opens, drag (touch-action pan-y). Reduced motion: snap, no drift, no tilt, no roll.
- Fallback (no rows / API down): cloth boards titled "Bookly" and the shop tagline.
