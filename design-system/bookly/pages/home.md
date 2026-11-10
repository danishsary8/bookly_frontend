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

## Final pass (2026-11)
- Order: hero → shelf → continue → Shop by category → New arrivals → Top rated → Coming soon → staff picks / seasonal → promises. Authors and series left the home page (they have their own pages).
- Accent: section eyebrows and card format lines are muted; orange is kept for the hero's one CTA.
- Hero right side: a cover stack (front cover, neighbours at ±48% / 0.8 scale / dimmed, click to bring forward), centred caption, View book + Add to cart, 4 s per slide with a gold timer line. Skeleton mirrors the layout.
- Shelf: a framed row of about 13 spines beside the open book (width follows the spine size), edges fade into the paper.
- Shop by category: six tiles (name, sub-genres, count) with three real covers fanned on the right that spread on hover; the rest behind "View all categories".
- New arrivals: one row of cards. Top rated: a ranked chart (No. 1 feature panel + Nos. 2–5 rows); needs a rating. Coming soon: ticket cards with the release date, or a dashed placeholder panel when there are none.
- Ratings on cards (`ReaderScore`): customer reviews if any; else the shop's Reader rating as "★ 4.3 · Source" (API fields `reader_rating`, `reader_rating_source`); else nothing.
- Header: utility strip (delivery line, Track order, Help), Best sellers link (≥1280px), wishlist heart for everyone, and a search button on the home page while the hero search is on screen.

## Home v2 polish (2026-11-10)
- One page colour: the whole home page sits on the warm paper of the first shelf version (`.home-paper`), with no separate band.
- Hero (right side): the View book / Add to cart buttons are gone. Under the caption: a short description of the current book (first two sentences, read from GET /books/{id}, cached), then quiet controls: prev, a gold slide-timer line, next, pause (WCAG 2.2.2). The front cover is larger (up to 320px). Clicking it opens the book. Left side: Browse catalogue stays the one vermilion CTA; New releases became a quiet text link.
- Covers stand on a glossy floor: a short mirror image (flipped cover, 55% → 0 within ~17% of its height, slight blur) under the hero stack, Top rated No. 1 and Coming soon covers, plus a faint floor line in the hero.
- Shelf: every book is a full box (spine, front cover on its right side, back cover on its left side), so books on both sides of the open one read the same in 3D; faces carry a `-webkit-box-reflect` mirror (Chromium/Safari; no reflection elsewhere).
- Top rated: No. 1 panel (cover + mirror, gold "No. 1" crown chip, score in big type with a meter, price, Add to cart) beside a 2×2 grid of rank cards (outlined numeral behind, cover, title, author, score meter that fills on view, price). Cards rise in with a short stagger.
- Coming soon: a release timeline (hairline draws in, one node per book, nearest pulses) above up to 4 tickets: a cover stage on its own colour wash with a perforated date stub (month, day), title, author, "In N days" countdown, Pre-order / Announced.
- Add to cart, everywhere: the cover morphs into the header cart (copy lifts, arcs, rounds into a chip, the cart button bounces). The header comes back if it was tucked away. Reduced motion: no flight.
