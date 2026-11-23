# Next step

**Everything still to do, in order, is in `docs/ROADMAP.md`.**

## Current state (2026-11-23)
- **Merged on `main`**: Full V2 storefront & admin migration, bilingual English/Khmer (`src/i18n/km.ts`), Bakong KHQR payment flow, Ebook Canvas Reader (`/read/:bookId` & `/read/:bookId/preview`), Store Credit & Referrals, Support Inbox & AI Assistant, Strict Delete & 30-day Trash, Staff Permissions & Sessions, Reports (including Profit & Inventory), and strict `/admin/*` vs `/staff/*` portal separation + printable Daily Sales & Settlement Register (`DailySalesPrintPage.tsx`).

## Owner's open steps
1. **Cloudflare R2 Private Bucket (Ebooks)**: Follow `DANISH_TODO.md` to configure `EBOOK_DISK=r2_private` on Render and smoke-test PDF upload + `/read/{bookId}`.
2. **Shop Contact & Custom Domain**: Update `src/content/shop.ts` (`contact.email`, `contact.telegram`) and `vercel.json` CSP `connect-src` once the custom domain is live.
3. **Khmer Copy Review**: Have a native Khmer speaker do a final pass on `src/i18n/km.ts`.

## Quality & Verification Bar
Before every push or PR:
1. Backend: `php artisan test` + `vendor/bin/pint --test`
2. Frontend: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
