# Bookly roadmap: everything left, most important first

The owner's master list. Nothing here is dropped: when an item is done, tick it and note the branch.
New ideas go into the right phase, not the bottom. The redesign stays last.

Order rule: first what blocks real customers or loses money/data, then what the shop needs to run
every day, then growth, then looks.

## Phase 1 · Sign-in (now)
- [x] AUTH_PLAN PR 5 (`feature/telegram-codes`, both repos): phone `+855` on the account (new migration), Telegram Gateway codes (option A), resend by channel, verify phone, limits (3/hour, 10/day per number), Turnstile on every send.
- [x] Owner's rule (2026-10-07): new **Facebook** sign-ups give a phone number; email optional (`/sign-up/facebook`).
- [x] AUTH_PLAN PR 6: library-card sign-up/verify screens with the gold "Member" stamp, "Send it by email instead", account **Sign-in & security** (verify/change phone, connected Google/Facebook, password).
- [x] Self-service **delete my account** (`feature/delete-account`): password or Google/Facebook to confirm, type DELETE, open orders block it, details erased after 30 days.
- [ ] Owner: Telegram Gateway account, $5 balance, `TELEGRAM_GATEWAY_TOKEN` on Render (steps in NEXT_STEP.md).
- [ ] Connect / disconnect Google and Facebook from Sign-in & security (block removing the last way in: "Add a password first").
- [ ] Add or change the email from the account (code to the new address), so phone-only Facebook customers can add one.
- [ ] Sign in with phone number + Telegram code (today phone-only accounts sign in with Facebook only).
- [ ] Admin: see closed accounts and reopen one within its 30 days (with an audit entry).

## Phase 2 · Reliability (before real customers)
- [ ] Move the API from Render to **Railway** (owner's free credit): no sleeping, so no 30–50 s first load. Add a scheduler (unfinished sign-up clean-up, `customers:erase-closed`, low-stock checks) and a **queue worker** so emails and Telegram sends never slow a request. Keep Render until Railway passes a full check, then switch the website's API address.
- [ ] Database: confirm Neon backups / point-in-time restore, and do one restore drill.
- [ ] Uptime check on the API and website (free monitor) with Telegram alerts.
- [ ] Sentry source maps (owner adds `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel) and a backend release tag, so every alert shows real file names.
- [ ] Preview deployments may call the API (CORS for `bookly-frontend-*.vercel.app`).
- [ ] Chores: unit tests stub `GET /auth/options` once (quiet test output); Vitest 5 (`@vitest/mocker` advisory), dependency updates in both repos, re-check rate limits on every public endpoint.

## Phase 3 · Admin dashboard, production grade (real data)
- [ ] Dashboard: revenue, orders and average order for today / 7 / 30 days / custom range, compared with the period before; orders by status; top books and categories; low stock; new verified customers; charts.
- [ ] Orders: full workflow (confirm → packed → shipped → delivered / cancelled) with a timeline, print **invoice and packing slip**, delivery notes, bulk status changes, filters and CSV export.
- [ ] Stock: stock history per book (who changed what), low-stock threshold per book, restock entries, "out of stock" handling.
- [ ] Books: CSV import/export, bulk price/stock/category edits, image upload checks, drafts and scheduled publishing.
- [ ] Customers: notes, tags, lifetime value, order history, deactivate/reactivate, resend verification.
- [ ] Coupons and returns: usage reports, refund records.
- [ ] Staff: granular permissions per role, active sessions with "sign out everywhere", login history.
- [ ] **Strict delete security** (owner's rule) for anything that deletes: admin only; re-enter password **and** a 2FA code; type the item's name to confirm; soft delete into a **Trash** with 30-day restore; full audit entry with before/after values; a Telegram message to the owner on every delete.
- [ ] Telegram notice to the owner for each new order and for low stock.

## Phase 4 · Shop completeness
- [ ] Customer emails for every order change (confirmed, shipped with tracking note, delivered, cancelled, refund), not only "order placed".
- [ ] **Khmer language** (Khmer / English switch) on the storefront and emails.
- [ ] Delivery: fees per province, estimated delivery date, free-delivery threshold.
- [ ] Payments: card and KHQR stay "coming soon" until the owner gives the provider keys (ABA PayWay / Bakong); then a separate plan.
- [ ] "Tell me when it's back" for out-of-stock books; recently viewed; "customers also bought".
- [ ] Newsletter sign-up (with unsubscribe) for new arrivals.

## Phase 5 · Found on Google, fast, legal
- [ ] Pre-rendered HTML for public pages (phone performance above 90, link previews per book).
- [ ] Custom domain + shop email (SPF, DKIM, DMARC so codes don't land in spam); update Google, Facebook, Turnstile and CORS to the new domain.
- [ ] Google Search Console with the sitemap; privacy-friendly analytics.
- [ ] Accessibility audit (keyboard, screen reader, contrast) on every page.
- [ ] Legal pages reviewed: terms, returns/refunds, delivery, cookies notice if analytics needs one.

## Phase 6 · Confidence
- [ ] End-to-end tests in CI for the money paths: sign-up → verify → cart → checkout → admin ships → return.
- [ ] Security review of both repos (OWASP list, file uploads, staff routes, secrets).
- [ ] Load test the busiest pages on the new host.

## Phase 7 · Redesign (last)
- [ ] Full frontend redesign, starting from the landing page, then every page; keep all tests passing.

## Never
- No payment-provider work without the owner's keys and OK. Never edit old migrations. No secrets in chat.
