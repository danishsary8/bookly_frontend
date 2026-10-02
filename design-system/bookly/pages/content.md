# Help and legal pages — page overrides

> Overrides `design-system/bookly/MASTER.md` for the content pages only: About, FAQ,
> Shipping & delivery, Returns policy, Privacy, Terms, Contact (`src/pages/content/`),
> and the 404 page. Added 2026-10-02 (frontend V2, phase 8).

## Signature: the bookplate

Every content page opens with a **bookplate**: the label pasted inside a book's front
cover ("ex libris"). It holds the page title and the two or three house rules a visitor
came to check: the $2.00 flat delivery fee, the 14-day return window, cash on delivery.
Those values come from `src/content/shop.ts`, which mirrors the API's config, so the
most memorable thing on the page is also the most useful.

- Surface: `.hero-lapis` unchanged (radial glow, book-spine texture), inside the page
  gutter, 8–12px padding around the frame.
- Frame: a 1px gold hairline at 45% plus a second at 18%, 5px inside it; radius 2px.
- Corners: 9px diamonds (lapis fill, 1px gold at 70%), centred on the frame's corners.
- Type: eyebrow in gold (§3), "Ex libris · Bookly" in on-lapis-muted caps at +0.28em
  (hidden below 640px, `aria-hidden`), title in Gloock on-lapis, lead on-lapis-muted.
- Facts: a `<dl>` under a gold hairline; values in Gloock 2rem gold `tabular-nums`,
  labels under them in on-lapis-muted. At most three.

## Deviations from MASTER

### 1. The hero surface on content pages
§2.1a allows the hero gradient on the home hero and full-page error/empty states. The
bookplate is the top of each content page, its hero, so it uses the same surface.
Contrast pairs are the ones §2.3 measured for the hero (on-lapis, on-lapis-muted, gold,
all against the worst case `#3143A3`). No new colour pairs.

### 2. A second ornament: the bookplate frame and corners
§4 makes the 1px eyebrow rule the only decorative device. The frame and its diamond
corners are allowed **only inside the bookplate**: they are what makes it read as a
bookplate rather than a banner. They never appear on cards, sections or elsewhere.

### 3. Reading measure and body size in articles
Article text is 17px / 1.75 at a 68ch measure (§3 body is 16px / 1.6). Long policy text
is read top to bottom, and the slightly larger size and looser leading suit that.
Lists use square lapis markers.

## Layout

```
breadcrumb
┌ bookplate (hero-lapis) ───────────────────────────────┐
│ ┌ gold frame ────────────────────────────────────────┐ │
│ │ ── EYEBROW                       EX LIBRIS · BOOKLY │ │
│ │ Title (Gloock)                                      │ │
│ │ lead                                                │ │
│ │ ───────────────── gold hairline ──────────────────  │ │
│ │ $2.00          Free            Cash                 │ │
│ │ label          label           label                │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
 On this page (3 cols, sticky)  │  article (8 cols, 68ch)
 ▌Current section               │  h2 Gloock
  Other section                 │  body 17px
```

- Below 1024px the contents fold into an "On this page" button above the article.
- Legal pages number their sections (clauses are cited by number); help pages don't.
- Placeholder values (contact, delivery areas and times) carry a "To be confirmed"
  outline badge until `confirmed: true` in `src/content/shop.ts`. Privacy and Terms show
  a draft notice until `legal.reviewed` is true.
- One vermilion CTA at most per page (About: "Browse the shelves"). Others use lapis.
- Motion: only the standard page transition; the contents' current-section marker
  changes colour instantly. No reveals on policy text.
