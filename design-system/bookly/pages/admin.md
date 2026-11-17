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


## Console redesign — 2026-11-12 (branch `staff-area-redesign`)
Supersedes the frame, colour and dashboard rules above. Fonts, lapis, gold and component library stay MASTER's.
- Rail: deep navy in both themes (`--rail-bg` #0B1030 / dark #060920, slight top gradient), light text (#D3D7F0,
  ≥ 11:1), group labels #8F97C6. Current page: white text, 11% white fill, 3px gold marker. Counts are gold chips.
  Same styling in the phone sheet (`.admin-rail-sheet`).
- Navigation regrouped by job: Overview · Orders (orders, returns, customers) · Customer care (support, reviews,
  ratings, assistant knowledge) · Marketing · Catalogue · Admin. Every page has its own icon.
- Area colours (`data-tone`, admin.css): blue, teal, violet, amber, rose, green, slate. Each has `ink` (text/icons,
  ≥ 4.5:1 on its tint and the card, light and dark) and `tint` (fills). Used for group dots, rail icons, page eyebrow
  chip, task cards, quick actions and metric side bars. Colour never carries meaning alone (labels + icons).
- Cards: 14px radius, soft two-layer shadow; canvas has a faint blue glow at the top.
- Staff dashboard: greeting lead; a lapis→violet "Today" band with the date, a live summary ("2 tasks need you
  today" / all clear) and a Start working button to the first busy queue; three task cards (orders blue, returns
  amber, stock rose) with Needs action / All clear chip, big figure, hint, Open link; recent orders with direct
  next-step buttons beside Quick actions. Copy in `staffHome` (en + km).

## Admin dashboard redesign — 2026-11-12 (branch `admin-dashboard-redesign`)
Bento layout, read top to bottom: performance → sales → books → customers & payments → operations.
- Net revenue leads on the lapis→violet band (white text, white trend area, white "View sales report" button,
  change chip in light green/rose); KPI tiles beside it, each with its own tone (orders blue, average violet,
  customers teal, books amber, ebooks rose, ratings amber), tinted icon, 4px top colour bar and a trend line in
  that colour. 2 columns at laptop widths, 3 from 1536px.
- Small caps section labels with a hairline split the page. Panels can carry a tinted icon chip (`Panel icon tone`).
- Income chart: blue→violet gradient line and fill, dashed previous period, 288px tall. Donut with rounded segments.
- Best sellers / top categories: ranked rows (gold #1), tinted bars. Low stock: bordered rows with status chips.
- Payment methods: a stacked share bar above the table (colour per method; table repeats every value).
- Small figures (`Stat`) sit on the panel's tint. Activity: attention tiles with icons; activity as a timeline.
- Motion: tiles rise 10px with the shared stagger; reduced motion shows the final state.
- Interaction (polish pass): KPI and revenue trend lines show day + value on hover (guide line, moving dot);
  income chart tooltip lists both periods with colour keys and the % difference; donut slices and legend rows
  highlight each other and the centre shows the hovered status and share; payment bar segments show
  method · share · total on hover. Bars grow in (700ms, staggered), trend lines reveal left to right (1.1s),
  charts draw in (900ms); all off with reduced motion. Panels tint their border on hover.

## Admin polish — 2026-11-14 (branch `admin-polish`)
- Rail is now a light sheet (white → #F3F5FE, hairline right edge) so it belongs to the canvas; group dots and icons
  in their area's ink; the current page sits on its area's tint with a 3px bar in the same ink; counts in the area ink.
  Dark mode keeps a navy rail. Supersedes the "deep navy rail" rule above.
- Lists search as you type (350ms after the last key; Enter for at once; × clears); the URL stays the source of
  truth. Matches are marked in gold. Books add Category (with sub-shelves), Format, Stock and Sort dropdowns
  (`FilterSelect`, label above value, tinted when active) and Clear filters.
- Dashboard data changes in place: figures glide from old to new (`AnimatedNumber`, 0.8s, reduced motion = instant),
  charts morph, trend lines and bars ease to their new shape, a slim gradient bar runs while the next period loads.
  No skeleton after the first load. Chart tooltip: ink (#121633) in both themes, colour keys, change line.

## Dashboard v3 — 2026-11-15 (branch `admin-dashboard-v3`, owner's tour-trip sample)
Supersedes the bento/hero layout above. Warm paper canvas (#F6F2EC) for the whole workspace, white 18–20px cards.
- Data colours: coral #D35D45 (revenue, income chart, returns), saffron #E5B23F (orders, pending), sky #3B82C4
  (average order, processing), sea #2F8F83 (customers, delivered). Each has an `-ink` for text (≥ 4.5:1).
- Row 1: four KPI cards (label + round tinted icon, gliding number, change chip, smooth Catmull-Rom sparkline with
  gradient fill and hover tooltip, coloured "View …" link; pointer spotlight, lift on hover).
- Row 2: income report (coral line + fill, dashed previous period, ink tooltip, total + change chip) beside the
  status donut (sample palette, rounded segments, hover = centre figure).
- Row 3: "At a glance" — React Bits MagicBento (JS-CSS, kept as published in src/components/reactbits) with live
  tiles: books sold, ebooks sold, order ratings, needs attention, customers who ordered (2 wide), delivery areas
  (2 wide). columns 4, rowHeight 200, gap 12, radius 20, border glow, spotlight 300, click ripple; surfaces follow
  the workspace cards; drops to 2/1 columns by itself.
- Then best sellers / categories / low stock, payments / reminders, activity / recent orders, insights, health.

## Dashboard clarity — 2026-11-16 (branch `design/dashboard-clarity`)
Applies only to the admin sales dashboard at `/admin`, through `.dash-overview` and
`features/admin/dashboard/dashboard.css`. The sidebar, top bar, staff dashboard and other admin pages keep their styling.
- Retain v3's warm paper, Gloock title, Hanken UI, coral/saffron/sky/sea data palette, rounded white cards,
  sparklines, gliding figures, bento spotlight/ripple, tooltips and every existing section/action.
- Header: readable title/date/refresh block and the existing stock-purchase action. Put the six period choices
  in a separate, quiet toolbar; on phones all six are visible in a 3-by-2 grid. Custom dates expand below it.
- Show the shared comparison dates once in the toolbar. Each KPI retains its change badge and describes that
  shared period through `aria-describedby`; keep amounts, KHR, explanations, trends and destination links.
- KPI rhythm: consistent 14px labels, 32px values, 13px supporting metadata, smaller circular icons, aligned
  amount blocks and 44px footer links. Retain the existing hover light and use a restrained 2px lift.
- Place section rules closer to their content, with more separation from the preceding group. Use 16px panel
  titles and consistent explanatory text. Keep the status donut/legend compact; pair activity with recent orders
  at desktop widths. No data or sections are collapsed or removed.
- Layouts respond to the dashboard's available width as well as viewport breakpoints. Ranking and discount
  tables scroll within named, keyboard-focusable wrappers when needed. Metric grids and bento row heights can
  grow with enlarged text. Reduced motion retains the final state.

## Dashboard chart inspection — 2026-11-16
- Keep chart instances and previous observations visible while another period loads. Interpolate KPI paths across a fixed geometry; use actual observations for tooltip values. Suppress movement under reduced motion.
- Small charts support hover, focus with arrows/Home/End, touch inspection and Escape. Tooltips render above clipped cards and remain hoverable. Bento links preserve Enter navigation.
- Show all selected dates in copy charts (group long ranges); missing values are not zero. Label operational/customer/delivery bars and preserve unknown delivery areas as their own group.

## Customer care, Marketing and staff forms — 2026-11-16
- Keep warm workspace paper, Gloock page/form titles and Hanken controls. Customer care uses the existing teal group tint; Marketing uses violet. Sidebar, top bar, dashboard and storefront remain outside the page style scope.
- Use compact, labelled filter toolbars; readable feedback cards with real star icons, order/book links and a distinct moderation action. Support uses a conversation list beside the customer/message workspace, stacking on phones; preserve assignment/status, replies, internal notes and quick replies.
- Knowledge presents FAQs and unanswered questions side by side, with Add/Edit/Teach in the shared staff form dialog. Gifts and staff picks use compact cards with clear availability/selection states. Marketing summaries report loaded rows only; preserve tables, filters and every action.
- Staff create/edit dialogs use AdminFormDialogContent: a 46rem maximum surface with a bounded inner scroll, reachable corner close, sticky action footer, distinct header, rounded controls and grouped fields. On phones fields stack and the header scrolls to leave more room for content. Native date controls follow the dark theme. Retain Radix focus trapping/Escape/return focus and existing validation, pending state and request payloads. Storefront dialogs retain their existing component.

## Catalogue management — 2026-11-16
- Books keep a fixed-width table when there is room and reflow into labelled records on smaller containers. Details and Edit have visible icons and labels in every record; the detail dialog preserves the full title/authors, prices, stock and state, with a direct editor link. Keep selection, sort, filters, CSV and bulk actions visible. Avoid nested horizontal scrolling.
- Author rows show portraits or a neutral person icon, readable names and a short biography excerpt. The author form starts with an image upload/preview/replace/remove control; an uploaded URL is saved through the existing photo_url field. Prevent author submission/dismissal while its image upload is pending.
- Categories retain the API's two levels: parents and children. Indent and tint children, name their parent, show group counts, support parent-shelf filtering/search and Add sub-category on each parent. A parent with children stays top-level; a new child opens with the correct parent selected. Icon radios support arrow/Home/End navigation.
- Refine all shared staff forms with a quiet tinted introduction, stronger field grouping, readable controls and consistent action spacing. Bulk catalogue forms use the same surface. Preserve focus/dismissal, validation and existing payloads.
- At 320px the header uses the existing book mark with its accessible name and tighter spacing; every 44px action remains available. Wider header/sidebar layouts retain their styling.

## Administration workflows and activity — 2026-11-16
- Scope: the six pages in the Admin navigation group. Retain the Bookly workspace, serif page titles and existing slate group accent. Use consistent filter cards, compact record summaries and responsive tables that reflow into labelled records without horizontal scrolling.
- Audit: search and source choices lead; staff/system actor, record type, action, record ID and shop-day dates refine the result. Restock/order/return/adjustment shortcuts select real event types. Show staff changes, inventory movements and order history as distinct sources; identify records by (source,id). Preserve recorded snapshots and distinguish current SKU/title context. Source metadata drives choices, including future event codes; unsupported older APIs show a limited-capability explanation.
- Expand changed fields inline. Null-only values on one-sided events are omitted; a change to null remains visible. Stock delta, SKU and related book/order links remain readable. The audit log stays read-only.
- Newsletter: URL search/status/pagination; draft test/send/edit/delete actions and read-only content viewing for sent/sending campaigns. Label actual sending progress correctly. Gift cards/referrals have recipient/customer/order links and in-app confirmations, including visible failure feedback; feature-off screens explain availability without exposing hosting variables or enabling features.
- Staff actions link to sign-in history and the actor's audit history. Exchange rates keep append-only history, explicit immediate/scheduled starts and a link to their audit history. Native calendar controls follow dark mode.

## Offer picker, dashboard entrance — 2026-11-16 (branch `admin-offer-picker`)
- Offer editor "Books in this offer": tabs Books / Categories / Series (each with a count of what is chosen), a list
  shown straight away (books A–Z, first 40; every category; every series), a search box that narrows the open tab,
  tick rows to add/remove, "Select all shown", chosen items as chips above with "Clear all".
- A "How it works" note in the admin's own numbers: any mix of the covered books counts towards "Buy N" (they do not
  have to be the same book; OfferCalculator::evaluate); once reached, every covered copy gets the percent.
- Customer sentence (en/km `offers.bookLine`) and the editor preview now read "Buy any N … Mix and match: they don't
  have to be the same book."
- Collections book picker: the list shows A–Z without typing; typing searches.
- Dashboard first open: KPI cards rise from 26 px with a slight scale; figures count up from 0 (`AnimatedNumber
  countUp`, also the goal and profit panels); sparklines draw in from the left; each section fades in (no movement, so charts stay
  pointable) when it first scrolls into view (`Reveal`). Reduced motion: no movement, final values at once.
