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
- Top rated: No. 1 panel (cover + mirror, gold "No. 1" crown chip, score in big type beside the stars, price, Add to cart) beside a 2×2 grid of rank cards (outlined numeral behind, cover, title, author, a hairline footer with stars and price). No score bars (owner 2026-11-10). Cards rise in with a short stagger.
- Coming soon: on wide screens a release timeline sits above the tickets: one stop centred over each ticket, labelled with its countdown ("In 3 days"), the line runs only from the first stop to the last and draws in, the nearest stop pulses, a short stem drops to the ticket. Tickets: cover stage on its own colour wash with a perforated date stub (month, day), title, author, Pre-order / Announced; below `lg` the countdown is a chip inside the ticket.
- Add to cart, everywhere: the cover morphs into the header cart (copy lifts, arcs, rounds into a chip, the cart button bounces). The header comes back if it was tucked away. Reduced motion: no flight.
- Performance: the shelf's animation loop and the hero slideshow stop while they are off screen (and the shelf while the tab is hidden). Home sections use Motion's `m` components (LazyMotion), not `motion`, so the full Motion bundle stays out of the main chunk.

## Hero v3 (2026-11-10)
- Left (5/12): eyebrow, headline (max 3.4rem, two lines on desktop), subtitle, search, three popular categories as quiet underlined links, Browse catalogue (the one vermilion CTA, 48px). The New releases link left the hero (the header has New arrivals).
- Right (7/12): a book card. A deck of covers: current in front on a glossy floor with a mirror image; the next two fanned out behind it to the right (darker, rotated 4° / 8°); the cover leaving slides off to the left. Beside it, left-aligned: "Popular books · n of N", title (2 lines max), author, short description (3 lines), a gold price chip and View book, then prev / timer line / next / pause.
- Descriptions that only repeat the title and author (fewer than about eight other words) are hidden.
- Calmer surface: even left-to-right lapis overlay instead of the dark corner vignette, spine texture at 3%.
- Height: 84% of the screen under the header (540–740px), so the next section's heading shows below on a typical laptop.

## Hero v4 (2026-11-10, owner preferred the centred layout)
- Right side back to the centred stack: current cover in front on a glossy floor, neighbours peeking at ±44% (scale 0.8, turned 12° away, dimmed); up to 300px wide, sized from the screen height so the hero fits under the header.
- Caption centred: "Popular books · n of N", title, author with a gold price chip, then one fixed-height slot (vertically centred): the short description, or — when the book has none or it only repeats title and author — up to three fact chips (formats, year, pages). The controls never move between slides.
- Controls: prev, View book (outlined; the gold slide timer runs along its bottom edge), next, pause.
- Left side keeps the v3 changes (one CTA, three quiet category links, calmer background); the two columns are now equal.

## Hero v5 + Shelf v2 (2026-11-10)
- Hero: no fact chips; a description shows only when the book has one (two lines). Cover up to 330px, sized from the screen height; it leans toward the mouse (±6° Y, ±4° X) and lifts on hover.
- Shelf: books stand on an oak board (a 3D floor that runs back plus a front lip drawn flat on top) with a soft contact shadow each; no reflections. Every book is a closed box with its own height (86–100%) and thickness (84–100%) from its id, bottoms aligned on the board. Spines take their cover's colour (canvas average, deepened 18%; covers without CORS keep a cloth colour) with ink chosen by luminance, the full title (two columns when long) and the author's surname instead of the "B" mark.
- Caption: one card row — prev, title and author, rating and price, Add to cart (the open cover flies to the cart), View book, next; stacks on phones. "See all <row>" sits right of the tabs; the how-to hint is for screen readers and shows only while the shelf has keyboard focus.
- Motion: slower pull (spring 4.2), a new row slides in from the side, autoplay 3.2 s.
- Size: book height = (screen height − 405) / 1.12, 190–380px, so heading, tabs, shelf and caption fit one laptop screen (checked 1366×768, 1440×900, 1920×928).

## Home v6 (2026-11-10, laptop first)
- Hero: shorter (screen height − 8.5rem, 540–780px) so the page shows below it. The CTA is cream (#FBF6EC) with lapis text and the arrow in a lapis disc (the vermilion fill left the hero); popular categories are glass chips; two promises (cash on delivery, delivery across Cambodia) with gold icons sit beside the CTA. "Only N left" chip next to the price when stock is low.
- Shelf: every book the same height (only thickness varies), up to 15 spines, 1320px wide. Caption card: small cover, title, author and selling chips (#N in <row>, N sold, Only N left), the price in display type with the rating under it, Add to cart, View book; gold-to-lapis hairline on top.
- Continue where you left off: cards on a wash of their cover's colours, tilted cover that straightens on hover, price and a "Continue" pill; arrows scroll the row.
- Top 10 rated: left a showcase with `CircularCarousel` (src/components/CircularCarousel.tsx: covers on a turning cylinder, rise intro, drag to spin, front card clickable) over the front book's colour wash, its rank, score, price and Add to cart; right the ranked list 1–10 (gold numerals for 1–3, "Only N left"). Hover/focus a row and the cylinder spins to that book. The React Bits registry could not be fetched from the build machine, so the component was written to the same brief.
- Coming soon: sideways-scrolling "premiere posters" (dark lapis stage lit by the cover, Pre-order / Announced tag, big "N days to go" countdown with the date, light sweep on hover), arrows; the timeline is gone.
- Shop by category: tile design unchanged. With more than six categories every one shows: two rows of the same tiles scroll sideways (arrows in the heading row) instead of "View all categories".

## Home refresh (2026-11-11, branch `design/home-refresh`)
- Hero: front cover larger (up to 370px, `(100svh − header − 23rem) × 0.64`); the slide title wraps to two balanced lines
  (`line-clamp-2`, max 30ch) instead of being cut; the second promise beside the CTA is Bakong KHQR (QR icon, gold).
- Shelf: books are culled before the stage's faded ends (no stray faces at the edges); the pulled-out book's page block
  fades with `--o` so no beige top floats above its neighbours. The caption is a paper shelf label (`.shelf-label`):
  cream stock with grain, tucked under the board's lip (inset top shadow), two brass pins, warm hairline; arrows and
  View book in the same warm tones; card colours in dark mode.
- Top 10: always ten rows. Rated books first in the API's rating order; when fewer than ten have a rating, the next books
  from the same list fill the rows, marked "Not rated yet", and the heading becomes "Top 10 books" (EN/KM `topTenBooks`,
  `notRated`). The showcase's big score shows only for rated books.
- CircularCarousel rebuilt as a curved gallery (React Bits "Circular Gallery" spirit, CSS 3D): books along an arc
  (radius 7.2 × card width, 1.12 × width apart), tilted along the curve and turned ±16° per step, side books smaller and
  dimmer; each book has a cloth spine and a cream page block as real 3D sides, and a contact shadow. Steps one book at a
  time (pause, glide, settle centred); drag to move; click a side book to bring it to the middle. Same props.
- Promises: a lapis band (`.hero-lapis` + `.promise-frame`, the bookplate's double gold hairline without corners): gold
  label, "Why shop with Bookly" in display type, four promises (cash on delivery, Bakong KHQR, delivery across Cambodia,
  easy returns) with gold-ringed icons and gold hairline dividers.

## Home round 2 (2026-11-11, on `main`)
- Mixed genres (`useMixedPicks.ts`): the top-level categories with books (largest first, up to 6) each give 4 best
  sellers; `interleave()` deals one book per lane per round, without repeats. Cached, so hero and shelf share requests.
- Hero: 20 slides — staff picks + popular books as one lane, dealt in turns with the category lanes ("Popular in every
  genre"). No description; the cover is larger instead: `min(360px, 64%, (100svh − header − 22.5rem) × 0.6)`, the band
  `clamp(540px, 100svh − header − 7rem, 830px)`, floor 6:1 (horizon at 90%). Left column sits above the stack (z-10).
- Shelf: first tab "Every genre" (16 books from the category lanes); "All books" link for it. The caption is the shelf's
  front rail (`.shelf-rail`): a darker oak plank with grain under the board, brass knobs (`.shelf-knob`) for prev/next,
  a brass label holder (`.shelf-holder`) around a cream paper label (`.shelf-card`) with cover, title, author and stock:
  "Only N left" + a five-notch meter when low (`low_stock_remaining`, shown from `shop.low_stock_badge` = 5 copies down),
  else "In stock" / "Out of stock". No rank, no sold count. Price, rating and actions sit on the wood in cream.
- Top 10: scores without the review count (`showCount={false}` on `StarRating` / `ReaderScore`); showcase 21.5rem
  stage, 158px books, 10 tighter rows, so heading + showcase + list fit 1366×768 and 1440×900.
- Coming soon: an endless marquee of premiere tickets (stub with the cover on its own colours, a perforation with notches,
  body with Pre-order/Announced, date, title, author, day countdown). Pauses on hover, focus and with a pause button;
  repeats and the second loop are `aria-hidden` and out of the tab order; reduced motion: no movement, scroll by hand.

## Hero cover balance (2026-11-11)
- Prioritize the cover over the book caption: desktop cover width is capped at 340px and 60% of its column, with height based on the actual hero panel rather than the viewport alone. On mobile it uses 60% of the column, up to 300px, without a viewport-height constraint.
- Book titles use balanced wrapping at 20–24px, up to two lines. Author and price use a compact, wrapping row below. Keep room for the reflected cover and carousel controls.
- Desktop panel height is `min(920px, 100svh - header - 4rem)`, leaving a modest bottom gutter. The cover sizing reserves 14rem for its caption, reflection, controls and breathing room; the carousel sits 8px lower to balance it against the left copy. Short screens tighten the left headline and vertical gaps so the full hero remains visible. Mobile keeps its natural stacked height.
- Hero starts with Atomic Habits (catalog ID 408) and The 48 Laws of Power (409), then the genre mix, deduplicated and capped at 20 books. Use live catalog metadata and covers; unavailable selections simply fall back to the remaining mix.

## Shelf alignment (2026-11-11)
- The book stage and wooden information rail share the same calculated width, capped at 1440px with 16px side gutters. Their left and right edges align at every screen size.
- The cream label holds a fixed thumbnail, two-line title, author and stock. Clip each rolling text line inside its own wrapper so caption changes stay inside the label.
- Remove the rail's Add to cart action. Keep the price, View book link and brass previous/next controls. On smaller screens, stock sits below the title and price/View book share one row.
- Shelf tabs start with Best sellers; remove Every genre from this section. Best sellers loads 24 distinct catalog entries rather than the compact rows preview. Other rows keep their existing previews.
- Slimmer spines make room for more books across the wider shelf. Use subtle cloth grain and hinge shading, double head rules and a small foot ornament. Spine lettering uses the main title without its subtitle, with more line spacing; the cream label retains the full title.

## Category card colors (2026-11-11)
- Give cards soft cloth-inspired accents (burgundy, lapis, gold, forest, plum, teal), mixed into the theme's card surface. Keep existing foreground colors for readable titles and metadata in both themes.
- Hover deepens the tint and border, adds a colored shadow and lifts the card 4px; covers fan out and the arrow moves forward. Keyboard focus has the matching tint, cover movement and a visible ring. Reduced motion disables movement; touch links work without hover.

## Initial loading (2026-11-11)
- Show a complete structural skeleton on the first visit: lapis hero with text/search/cover-stack shapes, shelf spines and information rail, six category tiles, new arrivals, Top 10 and lower sections. Reuse existing surface tokens and shimmer with static placeholders under reduced motion.
- Keep real home sections mounted but hidden so their requests run in parallel without exposing partial content or focusable controls. Reveal after initial catalog queries settle and the first three hero covers load or fail; allow at most 8 seconds of additional image waiting.
- Once revealed, background refetches never replace the whole page with a skeleton. Catalog failure without available books shows a retry state; explicit retry returns to initial loading.
- Each BookCover independently keeps a shimmer until its image loads, fades the cover in, and falls back to its title on image failure. Reserve the 2:3 media ratio in all states.

## Top rated background transitions (2026-11-11)
- Keep cover-color wash images mounted and crossfade their opacity over 800ms. Decode the next selected cover before changing the visible wash; retain the previous color on loading failure and ignore stale loads after rapid selection changes. Reduced motion switches colors immediately. Do not reuse the hero wash entrance animation, which resets opacity to zero on every book change.
