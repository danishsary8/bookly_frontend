# Admin (staff) — page overrides

> Overrides `design-system/bookly/MASTER.md` for `/admin/*` only. Added 2026-10-03 (frontend V2, phase 9a).

The admin is a work tool: dense, quiet and fast. Same tokens, fonts and components as
the shop; none of the shop's showpieces.

## Deviations from MASTER

### 1. No page transitions, no hero surface, no vermilion
Staff move between screens many times an hour, so routes swap instantly (no §5 page
transition). No `.hero-lapis`, bookplates or React Bits effects. Vermilion (§1) is
not used for actions: primary actions are lapis; the only vermilion is the unread
count on the notifications bell, which is a status mark, not a CTA.

### 2. Frame
- Sidebar 15.5rem at ≥ 1024px (card surface, hairline right border), grouped
  navigation with caps group labels; a left drawer with the same links below 1024px.
- Top bar 64px: the notifications bell and the account menu (name, email, role
  badge, View the shop, Sign out). The wordmark carries a "Staff" tag everywhere.
- Content max width 1200px; `AdminPage` gives every screen one Gloock h1 and a
  one-line description; panels use a Hanken 600 heading at 17px instead of Gloock h2,
  so dense screens don't fill with display type.

### 3. Tables
Hairline-bordered card, `bg-surface-2` header row, 15px body, row hover tint. Wide
tables scroll inside their card on phones; the card is `relative` so visually hidden
text can't escape and widen the page.

### 4. Figures and the chart
- The dashboard leads with one hero figure (net revenue, Hanken 600, 52px), with
  supporting tiles at 28px.
- The sales chart follows the dataviz rules: one series in `--primary` (its own step
  in dark mode), columns ≤ 24px with a 4px rounded top, hairline grid, clean y ticks,
  the peak labelled, one tooltip driven by hover or the arrow keys, and a table view.

### 5. Staff sign-in
A centred card on the page canvas (no AuthShell lapis panel), the wordmark with a
"Staff" tag, and a one-line security note. The QR code for 2FA setup is drawn in
foreground ink on white.

## Roles
Delete actions (books, formats, lookups) and the admin-only screens are hidden from
the `staff` role; the API enforces the same rules.
