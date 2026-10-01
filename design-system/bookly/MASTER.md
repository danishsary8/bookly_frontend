# Bookly — Design System MASTER (v2 · Lapis & Vermilion)

> **Source of truth for every page, storefront and admin.** No page may introduce its own colors, fonts, spacing, radii, shadows or motion values. If a page genuinely needs a deviation, write it to `design-system/bookly/pages/<page>.md`; that file overrides this one for that page only.
>
> **Provenance:** hand-authored. v2.1 (2026-09-24) added hero depth (§2.1a). v2.2 widened the gradient at the user's request, tightened the hero's vertical rhythm, and lightened the on-lapis vermilion (`#FF8A6E` → `#FFA088` → `#FFB09A`) so it keeps passing on the brighter glow. v1 ("Ink & Brass") was written 2026-09-23 and replaced the same day by this v2 at the user's direction. The ui-ux-pro-max skill's search scripts and database were not installed on this machine, so no palette or font here came from a database match. Every contrast ratio below was measured (WCAG 2.1 relative luminance).
>
> Dials: **variance 7** (bold, asymmetric) · **motion 6** (standard scroll/stagger + one hero slideshow) · **density 5** (balanced catalogue).
>
> **Applies to the admin panel too.** One design system, no exceptions.

---

## 1. Concept — "Lapis & Vermilion"

A modern gallery in ultramarine with one red-hot mark. Lapis is the house colour, vermilion is the single call to action, and gold appears only on lapis surfaces. Headings use Gloock, a sharp, high-contrast serif.

| Principle | What it means in practice |
|---|---|
| **Light is first-class** | **Daylight** (light) is the default theme and is designed on its own, not inverted from dark. In Daylight, lapis is *contained*: the header is white with a lapis wordmark, the hero is an **inset lapis panel** (`rounded-xl`, inside the page gutter), and the footer is a pale lapis tint. That keeps the blue confident without drowning a bright page. |
| **Night is immersive** | **Lapis Night** (dark) runs the hero as a **full-bleed lapis band** glowing against a near-black navy page. The header and footer sit on night surfaces separated by hairlines. |
| **One vermilion per view** | Vermilion (`#FF4F2E`) fills are reserved for the single primary purchase or discovery action on screen (Browse, Add to cart on detail, Place order), plus the Sale badge. Everything else uses lapis or neutrals. |
| **Gold lives on lapis** | Gold `#F2C84B` is for prices, stats, active dots and focus rings **on lapis surfaces only**. On light paper it fails contrast, and star ratings use the darker `--star` instead. |
| **Covers are the imagery** | No stock photos or illustrations. Book covers supply the colour; the UI stays disciplined. |
| **Hairlines over shadows** | 1px rules define structure; a shadow appears only on hover and overlays. |

**Not this:** full-bleed lapis on every section in light mode, vermilion text blocks, gradient text, decorative gradients outside the hero (§2.1a), glassmorphism, emoji icons, radius > 10px on cards, faux-bold Gloock, shadows on every card at rest, anything cream, beige or sage.

---

## 2. Color tokens

Implemented as CSS variables in `src/index.css`, mapped onto the existing shadcn token names so current components inherit them.

### 2.1 Daylight — light, default (`:root`)

| Token | shadcn alias | Hex | Use |
|---|---|---|---|
| `--background` | background | `#F6F7FB` | Page canvas (cool paper) |
| `--card` / `--popover` | card | `#FFFFFF` | Cards, header, panels, modals |
| `--surface-2` | secondary, muted | `#ECEEF7` | Fills, table stripes, skeleton base |
| `--lapis-tint` | — | `#E6E9F8` | Footer, info toasts, selected rows |
| `--foreground` | foreground | `#0E1335` | Body & headings |
| `--muted-foreground` | muted-foreground | `#4C5378` | Meta, helper text |
| `--primary` | primary | `#14207A` | Lapis: primary buttons, links, wordmark, hero panel |
| `--primary-foreground` | primary-foreground | `#F6F7FB` | Text on lapis |
| `--accent` | accent | `#FF4F2E` | Vermilion **fill** (one CTA per view, Sale badge) |
| `--accent-foreground` | accent-foreground | `#0E1335` | Text on vermilion. **Never white** (3.3:1 fails). |
| `--accent-text` | — | `#C0361A` | Vermilion as text/icon on light (prices on sale, links in promos) |
| `--star` | — | `#B7791F` | Rating stars on light |
| `--success` | success | `#1B6E4B` | In stock, delivered, success toast |
| `--warning` | — | `#8A5300` | Low stock, pending |
| `--destructive` | destructive | `#A3123A` | Errors, remove. Crimson, a distinct hue from vermilion, always paired with an icon. |
| `--border` | border | `#D9DDEC` | Decorative hairlines |
| `--input` | input | `#7A82A6` | Form control borders (≥ 3:1) |
| `--ring` | ring | `#14207A` | Focus ring on paper |

Tints for badges and toasts on light: success `#E1F1E9`, warning `#FBEFD9`, destructive `#F6E3E8`, info = `--lapis-tint`.

**Lapis surfaces in Daylight** (hero panel, active pills): text `#F6F7FB`, muted `#B9C0EA`, gold `#F2C84B`, vermilion-as-text `#FFB09A`, focus ring gold `#F2C84B`.

### 2.1a Hero surface (both themes)
Hero depth is added on purpose. It is the one place a gradient is allowed, plus **full-page error and empty states** such as the 404 page (amended 2026-09-25 at the user's direction), which reuse `.hero-lapis` unchanged.
- **Radial glow:** `radial-gradient(110% 100% at 62% 40%, #26399E 0%, #14207A 45%, #0A102E 100%)` over a `#14207A` base colour. The centre sits behind the slideshow. The centre-to-edge luminance ratio is 1.92:1 (it was 1.54 in v2.1, which read as flat).
- **Book-spine texture:** an `::before` overlay at `opacity: 0.05` tiling an inline SVG (184×8px) of irregular 1–2px white verticals, grouped in pairs like shelved spines. It is static and never animated.
- **Night only:** a 1px `--border` rule on the hero's bottom edge, because the gradient's deep edge (`#0A102E`) is only 1.04:1 against the page (`#070B22`).
- **Vertical rhythm:** 16px within a group and 32px between groups. Copy group: eyebrow → 16 → display → 16 → lead. Then 32 → CTAs → 32 → stats (hairline + 16 padding). Carousel: the stage is sized to the cover (2:3, max 280px wide) so there's no dead space inside it, then 32 → controls → 8 → status. Hero padding-block is 48px (64px at ≥1024px), with a 64px column gap at ≥1024px.
- Every colour placed on the hero must pass against the **worst case**, `#3143A3` (the glow with a spine line on top), not just flat lapis. See §2.3.

### 2.2 Lapis Night — dark (`.dark`)

| Token | Hex | Notes |
|---|---|---|
| `--background` | `#070B22` | Near-black navy |
| `--card` / `--popover` | `#0E1433` | |
| `--surface-2` | `#172050` | |
| `--foreground` | `#F1F2FA` | |
| `--muted-foreground` | `#A9B0D6` | |
| `--primary` | `#9AA6FF` | Periwinkle: lapis is too dark for buttons on navy |
| `--primary-foreground` | `#070B22` | |
| `--accent` / `--accent-foreground` | `#FF4F2E` / `#0E1335` | Same vermilion CTA in both themes |
| `--accent-text` | `#FF7A5C` | |
| `--star` / `--warning` | `#F2C84B` | Gold works directly on night surfaces |
| `--success` | `#5CC592` | |
| `--destructive` | `#FF8FB0` | Rose-crimson: stays distinct from vermilion-orange |
| `--border` | `#252D63` | |
| `--input` | `#6D78B8` | |
| `--ring` | `#F2C84B` | |
| Hero band | `#14207A` | Full-bleed; lighter than the page, so it glows. Text `#F1F2FA`, muted `#B9C0EA`. |

Tints on dark: `color-mix(in oklab, <semantic> 16%, var(--card))`.

### 2.3 Measured contrast (WCAG 2.1)

| Pair | Daylight | Night | Needs |
|---|---|---|---|
| foreground on background | 16.86 | 17.43 | 4.5 ✅ |
| foreground on card | 18.05 | 16.13 | 4.5 ✅ |
| muted on card | 7.46 | 8.46 | 4.5 ✅ |
| muted on surface-2 | 6.44 | 7.26 | 4.5 ✅ |
| lapis text on card | 13.84 | — | 4.5 ✅ |
| primary button label | 12.93 | 8.59 | 4.5 ✅ |
| vermilion CTA label (ink on vermilion) | 5.51 | 5.51 | 4.5 ✅ |
| accent-text on card | 5.55 | 7.02 | 4.5 ✅ |
| accent-text on background | 5.18 | 7.58 | 4.5 ✅ |
| success on card | 6.22 | 8.45 | 4.5 ✅ |
| warning on card | 6.33 | 11.26 | 4.5 ✅ |
| destructive on card | 7.76 | 8.41 | 4.5 ✅ |
| success on its tint | 5.32 | — | 4.5 ✅ |
| warning on its tint | 5.56 | — | 4.5 ✅ |
| destructive on its tint | 6.31 | — | 4.5 ✅ |
| lapis on lapis-tint (footer, info) | 11.45 | — | 4.5 ✅ |
| muted on lapis-tint | 6.17 | — | 4.5 ✅ |
| text on lapis hero | 12.93 | 12.40 | 4.5 ✅ |
| muted `#B9C0EA` on lapis | 7.77 | 7.77 | 4.5 ✅ |
| gold on lapis | 8.66 | 8.66 | 4.5 ✅ |
| light vermilion `#FFB09A` on flat lapis | 7.86 | 7.86 | 4.5 ✅ |
| hero text at brightest point `#3143A3` | 7.97 | 7.97 | 4.5 ✅ |
| hero muted at brightest point | 4.79 | 4.79 | 4.5 ✅ |
| hero gold at brightest point | 5.34 | 5.34 | 4.5 ✅ |
| light vermilion at brightest point | 4.84 | 4.84 | 4.5 ✅ |
| star on card (graphic) | 3.64 | 11.26 | 3.0 ✅ |
| input border on card | 3.77 | 4.31 | 3.0 ✅ |
| focus ring on background | 12.93 | 12.17 | 3.0 ✅ |

**Forbidden pairs:** white on vermilion (3.28), gold on light paper (≈1.6), vermilion `#FF4F2E` as text on light (3.06), vermilion text on vermilion tint (4.70, too tight; the Sale badge uses a solid fill instead).

---

## 3. Typography

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display / headings | **Gloock** | 400 only | Sharp wedge serifs, heavy verticals. Set `font-weight: 400` and `font-synthesis: none`: **never faux-bold, never faux-italic.** Emphasis comes from colour or size. Only ≥ 20px. |
| UI / body | **Hanken Grotesk** | 400, 500, 600, 700 | Unchanged from v1. |
| Khmer fallback | **Kantumruy Pro** | 400, 600 | Appended to both stacks. |

```css
--font-display: "Gloock", "Kantumruy Pro", Georgia, serif;
--font-sans: "Hanken Grotesk", "Kantumruy Pro", system-ui, sans-serif;
```
Google Fonts: `https://fonts.googleapis.com/css2?family=Gloock&family=Hanken+Grotesk:wght@400;500;600;700&family=Kantumruy+Pro:wght@400;600&display=swap`

### Type scale (major third 1.25, base 16px)
| Token | Size / line-height | Family | Use |
|---|---|---|---|
| `display` | `clamp(2.75rem, 5.5vw, 4.75rem)` / 1.02, −0.02em | Gloock | Home hero only |
| `h1` | `clamp(2.25rem, 4vw, 3.05rem)` / 1.08 | Gloock | Page titles |
| `h2` | `clamp(1.75rem, 3vw, 2.45rem)` / 1.12 | Gloock | Section titles |
| `h3` | 1.563rem / 1.2 | Gloock | Group titles, modal titles, empty-state titles |
| `h4` | 1.25rem / 1.3 | Hanken 600 | Sub-sections, form groups |
| `lead` | 1.125rem / 1.6 | Hanken 400 | Intros |
| `body` | 1rem / 1.6 | Hanken 400 | Default; never below 16px for paragraphs |
| `small` | 0.875rem / 1.5 | Hanken 500 | Meta, helper |
| `eyebrow` | 0.75rem / 1.2, caps, +0.18em | Hanken 600 | Section labels, colour `--accent-text` (light) / gold (on lapis) |
| `price` | inherit, `tabular-nums` | Hanken 600 | Money, counts, ratings |

Book titles on cards: Gloock 1.125rem, 2-line clamp.

---

## 4. Spacing, layout, radius, elevation

Unchanged from v1:
- **Spacing:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (Tailwind `1 2 3 4 6 8 12 16`). Sections `py-16` / `py-24` at ≥ lg.
- **Container:** `max-w-[1280px]`, gutters 16/24/32. 12-col grid, `gap-6`. Asymmetric splits: hero `7/5`, detail `5/7`, cart `8/4`.
- **Catalogue:** 2 / 3 / 4 columns at <640 / ≥768 / ≥1280. Covers fixed at **2:3**.
- **Radius** (`--radius: 0.375rem`): covers 2px · inputs, badges 4px · buttons 6px · cards, modals, hero panel 10px (max).
- **Elevation:** 0 = hairline; 1 lift `0 18px 40px -24px rgb(7 11 34 / 0.35)`; 2 overlay `0 32px 64px -32px rgb(7 11 34 / 0.55)`.
- **Ornament:** a 1px × 48px rule in `--accent-text` (light) or gold (on lapis) before eyebrows. It's the only decorative device.

---

## 5. Motion (dial 6)

Unchanged timing: 150ms hover/focus · 220ms toggles · 320ms drawers/modals (exits at 70%) · 700ms section reveal · 60ms stagger (max 8). Ease-out `cubic-bezier(0.16,1,0.3,1)`, standard `cubic-bezier(0.2,0,0,1)`. Transform and opacity only (plus `filter` for BlurText). **`prefers-reduced-motion` is mandatory:** static text, final numbers, no autoplay, no glare, no shimmer, colour-only hovers.

### React Bits restyle
| Component | Where | Settings (v2) |
|---|---|---|
| **BlurText** | Home hero display; Sign In / Create Account `h1` | words, delay 60ms, from `blur(8px) y:24`, Gloock |
| **CountUp** | Hero stat strip, order summary | 1.2s, tabular, gold on lapis / `--primary` on light |
| **SpotlightCard** | Book cards, featured tiles | `rgba(20, 32, 122, 0.08)` Daylight / `rgba(154, 166, 255, 0.14)` Night |
| **Carousel** | Home hero slideshow; auth side panel. ("More in this category" on Book Detail is a scroll-snap shelf with prev/next buttons instead, since several covers are visible at once and a one-slide carousel hid them.) | Fluid, loop, 5.5s autoplay, pause/play button, ←/→ keys, pauses on hover and focus, rotateY ±24°, gold active dot 24×8 on lapis |
| **GlareHover** | The vermilion CTA only (one per view) | `glareColor #FFFFFF`, opacity 0.35, angle −30°, 700ms |
| **AnimatedContent** | Below-the-fold sections, footer | distance 32, 0.7s, `power3.out`, threshold 0.15 |

---

## 6. Components

### 6.1 Buttons (min 44px tall; icon buttons 44×44)
| Variant | Daylight | Night | Use |
|---|---|---|---|
| `cta` | vermilion bg, ink text | same | The one purchase or discovery action per view (GlareHover) |
| `primary` | lapis bg, paper text | periwinkle bg, navy text | Default action |
| `outline` | 1px `--input`, fg text | same | Secondary |
| `ghost` | transparent, surface-2 hover | same | Tertiary, toolbars |
| `link` | `--primary`, underline on hover (offset 4) | `--primary` | Inline |
| `on-lapis` | transparent, 1px `#B9C0EA`, paper text | same | Secondary actions inside the hero |
Sizes: md h-11 px-5 · lg h-12 px-6 · icon 44. Weight 600. Loading: spinner + verb change ("Placing order…"), `aria-busy`, disabled.

### 6.2 Form fields
Visible label above (14px/600) · control h-12, radius 4, 1px `--input`, card bg, 16px text · focus ring 2px `--ring`, offset 2 · error: destructive border, icon + message below via `aria-describedby`, `aria-invalid` · helper text 14px muted · password show/hide 44×44 · OTP: 6 cells 48×56, `inputmode="numeric"`, `autocomplete="one-time-code"`, paste fills all cells.

### 6.3 Status badges: distinct by form, not only colour
All share: height 24px, radius 4, 12px caps 700, +0.12em, a leading 14px icon, and the status is always written out as text.
| Badge | Form | Colours | Icon · text |
|---|---|---|---|
| **Sale** | Solid fill with a **notched left edge** (tag shape via `clip-path`) | vermilion bg, ink text (5.51) | tag icon · "Sale −20%" |
| **New** | Solid, square corners | lapis bg / paper text (Night: periwinkle / navy) | sparkle icon · "New" |
| **Low stock** | Tinted fill + **3-segment meter** (1 filled) | warning on warning tint | meter · "Only 3 left" |
| **Out of stock** | **Dashed** 1.5px outline, no fill | muted text, muted border | circle-slash · "Out of stock" |
On a card that's out of stock: cover at 50% saturation with a `--card` 30% veil, price muted, and "Add to cart" replaced by an outline "Notify me".

### 6.3a Order & return status badges
Same 28px chip frame as §6.3; each status has its own icon **and** fill style, plus the written label:
| Status | Icon | Style |
|---|---|---|
| pending | clock | `--warning` on warning tint |
| paid | wallet | `--primary` on lapis tint |
| processing | package-check | `--primary` on lapis tint |
| shipped | truck | solid `--primary`, `--primary-foreground` text |
| delivered | check-circle | `--success` on success tint |
| cancelled | x-circle | dashed 1.5px `--muted-foreground` outline |
Returns: requested (clock, warning tint) · approved (badge-check, lapis tint) · received (rotate-ccw, solid lapis) · refunded (check-circle, success tint) · rejected (x-circle, dashed `--destructive`).
Order timeline: 5 steps (pending → delivered) as an ordered list. Reached steps are filled lapis circles, the current one has `aria-current="step"` and a "Current" tag, and future steps are outlined. Cancelled replaces the steps with a single dashed-outline notice.

### 6.4 Star rating (display)
- 5 stars, 16px (cards) / 20px (detail), 2px gap, `--star` fill; empty stars are an outline in `--input`.
- Fractional values are clipped to the nearest half: full / half (left half filled via `clipPath`) / empty.
- Always followed by the numeric value and count as text: "4.5 · 128 reviews". The star group is `role="img"` with `aria-label="Rated 4.5 out of 5"`.
- Zero reviews: no stars; show "No reviews yet" in muted text.

### 6.5 Toasts
- Position: bottom-right on desktop (24px inset), bottom-center on mobile (16px inset, above the safe area). Max 3 stacked, newest on top.
- Card bg, 1px border, overlay elevation, radius 10, padding 16, max-width 400.
- Layout: 32px icon chip (semantic tint + icon) · title (15px/600) + body (14px muted) · 44×44 close button.
- Variants: **success** (check icon, success colours), **error** (alert icon, destructive colours; stays until dismissed), **info** (info icon, lapis on lapis-tint).
- Optional action link ("View cart"). `role="status"` (success/info) or `role="alert"` (error). Auto-dismiss after 5s (success/info), paused on hover or focus. Enters 320ms rising 16px; exits at 220ms.

### 6.6 Empty states
Centered block, max-width 28rem, padding 48px: 48px line icon in `--primary` on a 96px `--lapis-tint` circle · Gloock h3 · one sentence (muted) · one primary action (+ optional link).
| State | Title | Body | Action |
|---|---|---|---|
| Empty cart | "Your cart is empty" | "Books you add will wait here until you're ready to check out." | Browse books |
| No search results | "No books match "{query}"" | "Try a shorter title, an author's surname, or clear a filter." | Clear filters · link: Browse all |
| Empty wishlist | "Nothing saved yet" | "Tap the heart on any book to keep it here for later." | Discover books |

### 6.7 Quantity stepper
`[−] [ 2 ] [+]`: one joined control, 1px `--input` border, radius 6, height 44. The buttons are 44×44 with `aria-label="Decrease quantity"` / `"Increase quantity"`. The input is 56px wide, centered, `inputmode="numeric"`, tabular, and has a visually hidden label ("Quantity for {title}"). − is disabled at 1 and + at stock (disabled = 40% opacity + `disabled`). Out-of-range typing clamps on blur, with a helper "Only 5 in stock".

### 6.8 Pagination
`nav aria-label="Pagination"`. Prev / Next are outline buttons with a chevron and text; page numbers are 44×44 ghost buttons. The current page is solid `--primary` with `aria-current="page"`. Ellipsis after 1 and before the last page when there are more than 7 pages. Below 640px, only Prev · "Page 3 of 12" · Next shows. Summary text above: "Showing 25–48 of 286 books".

### 6.9 Breadcrumb
`nav aria-label="Breadcrumb"` > `ol`. 14px/500, links in muted with underline on hover, "/" separators (`aria-hidden`), current page in fg with `aria-current="page"`, truncating with an ellipsis at 24ch. On mobile, collapse to "← Back to {parent}".

### 6.10 Header & mobile navigation drawer
- **Header:** 72px (64px mobile), sticky. Daylight: white with a bottom hairline and a lapis Gloock wordmark. Night: `--background` with a hairline. Nav links 15px/500 muted → fg; the active link gets a 2px `--primary` underline. The cart icon has a count badge (vermilion bg, ink text, `aria-label="Cart, 3 items"`).
- **Below 900px:** the nav collapses behind a 44×44 menu button (`aria-expanded`, `aria-controls`).
- **Drawer:** slides from the right, `min(88vw, 360px)` wide, full height, card bg, overlay elevation over a 50% navy scrim. `role="dialog"` + `aria-modal="true"` + labelled "Menu". Focus moves to the close button on open, is trapped inside, and Esc or a scrim click closes and returns focus to the menu button. Contents, top to bottom: search field → nav links (48px rows, Gloock 1.25rem, active one in `--primary` with a 2px leading rule) → divider → Account, Orders, Wishlist → theme toggle → Sign in (primary, full width) or Sign out. Enters at 320ms, exits at 220ms; reduced motion snaps open.

### 6.11 Loading skeletons
- Base `--surface-2`; a highlight sweep (`--card` at 60%) runs every 1.4s left to right. It's replaced by a static fill under reduced motion.
- **Book card skeleton:** the card shell with a 2:3 cover block (radius 2), then 3 lines at 30% / 90% / 60% width (12px, 18px, 14px tall), then a price bar (40%) and a 44×44 circle.
- **Page-level:** a breadcrumb line, an h1 bar at 40%, a lead bar at 70%, then a grid of 8 card skeletons.
- The container has `aria-busy="true"` and a visually hidden "Loading books…". Show the skeleton only after 150ms (so fast loads don't flash) and for at least 400ms.

### 6.12 Book card
SpotlightCard shell, radius 10, 1px border, padding 12 → cover 2:3 (radius 2, lift + translateY −4px on hover) with badges top-left (max 2) and a 44×44 wishlist heart top-right (`aria-pressed`, filled with `--accent-text` when active) → eyebrow category → Gloock title → author (small muted) → star rating → price row (tabular; sale shows the new price in `--accent-text` + the old price struck in muted) + 44×44 add-to-cart icon button. The whole card links to `/books/:id`; the inner buttons stop propagation.

### 6.13 Footer
Daylight: `--lapis-tint` bg, lapis wordmark, fg links. Night: `--card` bg with a top hairline. 4 columns → 1 on mobile. The newsletter field uses the standard field spec.

---

## 7. Accessibility — non-negotiable (every page)

- [ ] Colour pairs only from §2.3; measure any new pair before use.
- [ ] Hit areas ≥ 44×44 and ≥ 8px apart.
- [ ] A visible focus ring everywhere (lapis on paper, gold on lapis/night).
- [ ] A "Skip to content" link as the first focusable element; logical tab order.
- [ ] Icon-only buttons labelled; toggles use `aria-pressed` / `aria-expanded`.
- [ ] Status never by colour alone (badges have icon + text; errors have icon + text).
- [ ] Images: alt = "{title} cover"; decorative images `alt=""`.
- [ ] Forms: labels, `autocomplete`, inline errors via `aria-describedby`, an error summary focused on failed submit.
- [ ] Dialogs and drawers: focus trap, Esc, return focus, `aria-modal`.
- [ ] Carousels: pause control, arrow keys, "n of N" slide labels, pause on hover and focus.
- [ ] Toasts: `role="status"`/`alert`, pausable, errors persist.
- [ ] `prefers-reduced-motion` honoured (§5).
- [ ] One `h1` per page; no skipped heading levels.
- [ ] Works at 360px and at 200% zoom with no horizontal scroll.
- [ ] `lang="en"`; Khmer runs wrapped in `lang="km"`.

## 8. Anti-patterns (reject in review)

Full-bleed lapis everywhere in Daylight · more than one vermilion CTA per view · white text on vermilion · gold on light paper · faux-bold or faux-italic Gloock · status shown by colour alone · placeholder-only inputs · paragraphs under 16px · emoji as icons · autoplay without pause · animating layout properties · shadows at rest · radius > 10px · hard-coded hex in components.

## 9. Page overrides
None yet.
