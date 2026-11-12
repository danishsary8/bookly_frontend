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


## Redesign 2026-11-11 (phase 5, branch `design/admin-panel`)
Calmer and denser than the shop, same tokens. No warm paper and no showpieces here: the staff area stays on the cool
work canvas.
- Sheets: `.desk-card` (index.css) = hairline + a faint lift (`0 1px 2px` + `0 12px 24px -22px`, navy 4–30%), radius
  stays 10px (MASTER §4). Used by `Panel` (reportKit), the list table wrapper (listKit) and every plain admin card.
  Print pages unchanged (print.md).
- Frame: the "Staff" tag is a solid lapis chip (`bg-lapis` / `text-on-lapis`); menu group labels carry a 16px rule; the
  active link keeps the lapis tint, turns 600 and gets a 3px lapis rule on its left (same as the customer account).
- `AdminPage`: a hairline under the title block (16px below it) separates the header from the work.
- Staff sign-in / two-step setup / reset: the card opens with a lapis band (wordmark in on-lapis, a gold-outlined
  Staff tag, a faint periwinkle glow), the form below on the card. The security note stays under the card.


## Workspace redesign ? 2026-11-12
This revision supersedes the earlier frame, table, sign-in and no-transition rules above.
- Retain MASTER's cool neutral surfaces, lapis accent, Hanken UI and Gloock page titles. No new palette or packages.
- Sidebar: 16rem expanded / 5rem collapsed at laptop widths; persist the user's choice. Below 1024px, use the existing accessible sheet.
- Top bar: 64px, command search, assistant, theme switch, notifications and identity with visible role. Compact wordmark on phones.
- Page: maximum 1440px, section eyebrow, title, descriptive lead, responsive actions and a separating hairline.
- Panels: 10px radius, hairline borders, sans section headings. Shared panel headers separate content from controls.
- Tables: neutral sticky headers, uppercase column labels, generous row spacing, no zebra fill; wide tables scroll within their card.
- Segmented filters: card-surface active option on a neutral track; 44px controls, roving focus, arrows/Home/End.
- Motion: `m.*` only, shared motion tokens; 8px page/auth entrances and short staff task stagger. Reduced motion renders the final state.
- Charts: existing Recharts, lapis area/line comparison, dashed previous series and data-table alternatives. No invented statistics.
- KPI links align to the card bottom; result summaries explicitly describe loaded rows, never whole-shop totals.
- Long book forms have a sticky save bar. Print toolbar follows workspace styling while document sheets retain A4 layout.
- Admin sales queries remain inside AdminDashboard; StaffDashboard uses only existing staff-safe counts and recent orders.
- Existing checks remain; promotion and knowledge deletion controls are also hidden from staff, as required by the admin-only deletion policy.
