# Book detail — deviations from MASTER

- **Cover stage** (`src/components/catalog/BookStage.tsx`): rounded panel; the cover itself, blurred (blur-3xl, 45%, saturate 150%), bleeds in as a growing circle (1.4 s) behind the book; vignette to `--surface-2`. The book rests at rotateY(−14°), tilts towards the pointer (±8° Y, ±5° X, 500 ms ease), has a page-block edge, spine hinge + gloss, and a floor shadow. Sticky on desktop.
- **Title block**: category, h1, authors and rating each rise through their own mask (`.rise`, 900 ms, 75 ms stagger).
- **Description**: 65ch measure, drop cap in the display face and primary colour.
- Reduced motion: no bleed, no rise, no tilt (book faces front).

## Reading room redesign (2026-11-11)

Direction: premium editorial retail, retaining Bookly's Gloock headings, lapis ink, restrained surfaces and one vermilion purchase action. The UI UX Pro Max editorial-grid guidance informs hierarchy and whitespace; the existing brand tokens remain the source of truth.

- Product composition: 5/7 desktop grid with a framed 3D cover stage, edition label and language/page facts on the left; category pills, balanced title, authors, rating/series and a unified purchase card on the right. Collapse naturally to one column on smaller screens.
- Physical book: separate front/back covers, a 22px page block, bottom page edge, hinge highlights and contact shadow. Rest at -12deg Y / 3deg X; mouse position adds gentle tilt and 4px lift. Decorative orbit and cover-derived ambient color stay behind the book. Reduced motion presents a static front-facing book.
- Purchase: show price and availability first, then accessible native-radio edition cards with format icons and selected checks, quantity, cart, wishlist/share, reading-list controls and delivery/returns notes. Preserve all digital, preorder, backorder, stock-alert and owned-ebook behavior. On mobile the quantity control has its own row above cart/save/share; retain the existing sticky purchase bar below the main action.
- Taxonomy: show leaf-category trails without separately repeating their parent. Translate valid language codes through Intl.DisplayNames; preserve non-code language names as supplied.
- Content: one rounded tab panel for description, specifications and reviews. Description has a readable main column and a compact bibliographic note. Specifications wrap long values. Reviews use a sticky score summary and individual cards with reader initials and verification/date metadata. Series volumes and related shelves share the same borders and spacing rhythm.
- Motion: subtle tab-panel entrance, format-card lift, volume hover and book tilt. Disable movement under reduced motion; keep visible keyboard focus and native tab/radio navigation.
- Loading/error: retain API retry and missing-book states. Skeleton mirrors the cover stage, title and expanded purchase panel; BookCover retains its per-image loading and error treatment.

Implementation is scoped in `src/pages/catalog/book-detail.css`. Verified responsive widths: 320, 390, 768, 1024 and 1440px, light/dark themes, tab interactions and the mobile purchase bar. Existing catalog/preorder/series/share tests pass; axe finds no violations in the product page.

## Exposed-book refinement (2026-11-11, current direction)

This revision replaces the framed reading-room presentation above.
- Remove the rounded cover panel, orbit, decorative heading and sticky language/page strip. Present the physical book directly over a faint masked cover-color aura. Use a stronger resting perspective (-24deg Y, -2deg Z), back cover, striped page block and soft contact shadow. Reduced motion retains a fixed perspective without pointer movement. Favorite is one accessible circular control at the cover area's top right.
- Remove Add to list and the wishlist button from the purchase controls. Keep sharing beside cart. Move the quiet series link above the title, without its former badge. Leaf category links use a restrained overline.
- Purchase is open on the page with a top rule, price/availability on one line, compact format rows, quantity/cart/share and a quiet services row. A single format avoids repeating price/stock already shown above it. Multiple formats retain their own prices and availability, native radio semantics and keyboard focus.
- Replace the large information card with pill tabs above an editorial two-column description: section title at left, readable prose and a compact facts row at right. Remove the duplicate title/metadata card and oversized drop cap. Details use a wrapping two-column specification grid on desktop and one column on mobile. Preserve review cards and all purchase, preview, stock-alert and series behavior.
- No cover/facts overlap: facts now appear within the information section, not in a separately sticky sibling under the book.

## Laptop fit and straight cover (2026-11-11, current)
- Cover is front-facing and stationary at every breakpoint, including hover. Remove pointer-tilt handlers and 3D side planes. A narrow left hinge highlight, slight right paper edge and soft shadow provide physical depth without rotating the cover.
- On desktop, cover width follows viewport height, capped at 310px. Tighten breadcrumb, title and purchase spacing on screens shorter than 820px so the cover and primary purchase controls remain visible on common laptop viewports (verified at 1366×768 and 1280×650).
- Series and category links share one readable context row above the title. Single-format control is 224px wide and 64px tall; main cart control is 240px wide and at least 54px tall on desktop. Mobile retains a flexible cart width. Multiple formats wrap naturally.
- Remove the standalone Cash on delivery or Bakong KHQR sentence from the price group. Keep the existing delivery/returns services below the controls.

## Favorite below cover (2026-11-11)
- Replace the floating heart icon with a centered outlined pill below the edition caption: heart + Add to favourites, changing to a filled heart + Saved to favourites when selected. Keep aria-pressed and a book-specific accessible label. Translate both labels in English and Khmer.
- Use a soft lapis hover tint, a 2px lift and a subtle heart scale; disable movement under reduced motion. Reserve additional vertical room in laptop cover sizing so the button remains visible.

## Cover and favourite as one block (2026-11-12, current — supersedes cover sizing and the favourite pill above)
- Cover and Add to favourites share one column; the button is exactly as wide as the cover, sits 1.1rem below it, 48px tall with a 0.7rem radius (matching the cart controls). The edition caption between them is removed — the format picker already names the edition.
- Desktop (≥1024px): the cover column stretches to the info column's height, so the cover top lines up with the series/category row and the button bottom lines up with the delivery promises. Cover height = column height − button − gap, width from 2:3, capped at 40rem tall overall; column min height 28rem. Centred in its 5/12 column; no longer sticky.
- Mobile: column is min(78%, 270px), centred.
- Hover: a lapis ink fill sweeps in from the left (scaleX, 420ms ease-out-expo), text turns primary-foreground, 2px lift with a soft lapis shadow, heart does one beat. Press settles to scale .98. Reduced motion: no sweep, lift or beat.
