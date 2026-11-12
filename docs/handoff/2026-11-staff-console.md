# Staff console redesign — November 2026
Branch: staff-area-redesign. Rules: design-system/bookly/pages/admin.md, "Console redesign".
Changed: adminNav (regrouped, unique icons, group tones, groupFor), AdminShell (navy rail, drawer), AdminPage
(coloured section chip), admin.css (rewritten: rail, tones, cards, tables, controls), StaffDashboard (new),
RecentOrders (shared table cells, primary action buttons, View all orders), en/km `staffHome`.
Bugs fixed: four menu items shared one icon (and Gifts/Stock, Gift cards/Coupons, Referrals/Customers); 14-item
"Sales" group; recent orders table cramped and unaligned; mixed display/sans headings on the dashboard; phone top bar
sideways scroll.
Every other staff page picks up the new look through AdminShell/AdminPage/listKit/reportKit/admin.css; their
layouts are unchanged. No API or backend changes. No new packages.
