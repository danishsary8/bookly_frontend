# Printable sheets — page overrides

> Overrides `design-system/bookly/MASTER.md` for the invoice and packing slip
> (`/admin/print`, `/account/orders/:id/invoice`). Added 2026-10-13.

Paper, not screen: these pages are made to be printed on A4 (or saved as PDF from the
browser's print dialog) and read in a warehouse or by a courier.

## Deviations from MASTER

### 1. Paper colours in both themes
Sheets use `.paper`: Daylight ink on white (`#FFFFFF`, foreground `#0E1335`) even in
Lapis Night, so a sheet looks and prints the same whatever the theme. No fills that
waste ink: structure comes from 1px hairlines and one 1px foreground rule under the
heading and above the total. The lapis wordmark is the only colour.

### 2. Type
- Wordmark and sheet titles ("Invoice", "Packing slip") in Gloock (≥ 20px, 400).
- Everything else Hanken Grotesk; block labels ("Billed to", "Ship to") are the
  eyebrow style (12px caps, +0.18em) in muted ink, not vermilion.
- Body 15px on paper (print reads smaller than screen; still ≥ 9pt printed).
- The packing slip enlarges what a packer and courier need at arm's length: the
  recipient (20px), phone (18px), quantities (20px) and the amount to collect (20px).

### 3. States in words and frames
"Paid" and "Cancelled" are framed stamps (2px border, caps), never colour. The packing
slip's amount to collect sits in a 2px frame. Tick boxes for packing are empty 20px
squares with a 2px border.

### 4. Layout
- One A4 sheet per order: `break-after: page`; rows never split across pages.
- Screen: sheets on the surface-2 canvas, 210mm column, a sticky toolbar (back, count,
  Print) that never prints (`.print-hide`). Below 640px the sheet padding drops to
  20px/16px and the sheet fills the width (no horizontal scroll).
- Print: `@page { size: A4; margin: 0 }`, sheet padding 16mm × 15mm.

### 5. Content rules
- Dates in shop time (Asia/Phnom_Penh), "2 Oct 2026".
- Money in USD; KHR only as the total (and amount to collect) at the rate in force
  when the order was placed, with the rate and its date written out.
- The packing slip shows no prices, lists printed books only (digital ones are named
  as "Not packed"), and ends with "Packed by" and "Date" lines.
