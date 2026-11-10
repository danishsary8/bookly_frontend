# Book detail — deviations from MASTER

- **Cover stage** (`src/components/catalog/BookStage.tsx`): rounded panel; the cover itself, blurred (blur-3xl, 45%, saturate 150%), bleeds in as a growing circle (1.4 s) behind the book; vignette to `--surface-2`. The book rests at rotateY(−14°), tilts towards the pointer (±8° Y, ±5° X, 500 ms ease), has a page-block edge, spine hinge + gloss, and a floor shadow. Sticky on desktop.
- **Title block**: category, h1, authors and rating each rise through their own mask (`.rise`, 900 ms, 75 ms stagger).
- **Description**: 65ch measure, drop cap in the display face and primary colour.
- Reduced motion: no bleed, no rise, no tilt (book faces front).
