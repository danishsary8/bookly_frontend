# Header — page overrides

> Overrides `design-system/bookly/MASTER.md` for the storefront header only.
> Migrated to v2 "Lapis & Vermilion" on 2026-09-24.

## Deviations from MASTER

### 1. Header search field is `h-11`, not §6.2's `h-12`
§6.2 sets form controls at 48px. The header bar is 72px (64px mobile) and every
other control in it is a 44×44 icon button (§6.1). A 48px field next to 44px
buttons reads as misaligned, so the header's field is 44px. It keeps every other
part of the §6.2 spec: radius 4, 1px `--input`, card background, 16px text, and a
2px `--ring` focus ring at offset 2.

This applies **only** to the field inside the header bar. The field in the mobile
panel and every field elsewhere stays at `h-12`.

### 2. No elevation on scroll
The brief asked for "whatever elevation/shadow rule MASTER specifies for a raised
surface". MASTER does not treat a scrolled sticky header as raised: §1 says a
shadow appears "only on hover and overlays", and §8 lists "shadows at rest" as an
anti-pattern. The header therefore keeps its 1px `--border` bottom hairline at all
scroll positions and never gains `--shadow-lift`.

If a scroll shadow is wanted later, it is a deliberate deviation and belongs here.

### 3. Sign In is `primary`, not `cta`
Pre-migration the Sign In button used a vermilion-adjacent gradient wrapped in
GlareHover. §1 allows one vermilion fill per view and reserves it for "the single
primary purchase or discovery action" — on Home that is the hero's Browse button.
A persistent header CTA would put a second vermilion on every page, so Sign In
uses the lapis `primary` variant and GlareHover is dropped from this component.

## Notes, not deviations

- **Mobile nav is still the inline expanding panel**, not the right-side drawer
  that §6.10 specifies (`role="dialog"`, `aria-modal`, focus trap, Esc to close,
  scrim). This was a scoping decision, not a design one. **§6.10 is unmet here**
  and should be closed in the mobile pass.
- The cart badge is hidden whenever `cartCount` is 0, which includes every
  logged-out visitor — the cart requires a customer token, so a logged-out user
  has no cart to count. Expected, but it is why the badge can look "missing".
- `ClientLayout.tsx` still paints v1 orange/teal radial gradients behind the
  header (`rgba(251,146,60)`, `rgba(20,184,166)`). Those violate §8 and sit
  directly behind this component. Not fixed here — it is a layout-level change.
