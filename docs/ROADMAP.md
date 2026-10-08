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
- [x] Owner: Telegram Gateway account and `TELEGRAM_GATEWAY_TOKEN` on Render; codes work since 2026-10-08 (fixes: `gatewayapi.telegram.org` address, IP restriction lifted, clear alerts).
- [x] **Free Telegram bot instead of the paid Gateway** (owner 2026-10-08: the Gateway costs ~$0.01 a code and only reached the owner's own number with a $0 balance). Phone numbers are proven by tapping "Share my phone number" in our own Bookly bot: sign-up with Telegram (no number to type), **Continue with Telegram** on the sign-in page, Facebook sign-up (Telegram or an email), confirm/change the number in Sign-in & security. The Gateway code, `/login/phone` and the typed codes are removed (`feature/telegram-bot` → `feature/phone-by-telegram-bot` (backend), `feature/telegram-bot-sign-in`).
- [ ] Owner: create the Bookly bot in @BotFather and add `TELEGRAM_BOT_TOKEN` on Render (backend `docs/DEPLOYMENT.md` → "Telegram bot (free)"); delete `TELEGRAM_GATEWAY_TOKEN` there.
- [x] Connect / disconnect Google and Facebook from Sign-in & security (block removing the last way in: "Add a password first") (`feature/connect-social`, both repos).
- [x] Add or change the email from the account (code to the new address), so phone-only Facebook customers can add one (`feature/change-email`, both repos; new migration for the code kinds).
- [x] Sign in with phone number + Telegram code (today phone-only accounts sign in with Facebook only) (`feature/phone-sign-in`, both repos).
- [x] Admin: see closed accounts and reopen one within its 30 days (with an audit entry) (`feature/reopen-accounts`, both repos).
- [x] Owner's fixes (2026-10-08): phone sign-in says plainly when a number has no account or Telegram can't reach it (no more code page for a code that never comes); no cap on Telegram codes per number (a missing code is often our side; the cap stays available as `PHONE_CODES_PER_HOUR` / `PHONE_CODES_PER_DAY`); sign-up with Telegram needs no email (`fix/phone-sign-in-messages`, `fix/phone-code-limits` (backend), `feature/phone-only-sign-up`).

## Phase 2 · Reliability (before real customers)
- [ ] Database: confirm Neon backups / point-in-time restore, and do one restore drill.
- [ ] Uptime check on the API and website (free monitor) with Telegram alerts. A ping every few minutes also keeps the Render API from sleeping.
- [ ] Sentry source maps (owner adds `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel) and a backend release tag, so every alert shows real file names.
- [ ] Preview deployments may call the API (CORS for `bookly-frontend-*.vercel.app`).
- [ ] Telegram bot health: the API's start log says whether `telegram:webhook` worked; add the bot to the uptime check (Telegram's `getWebhookInfo` shows the last delivery error).
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
- [ ] Telegram notice to the owner **and staff** (a staff Telegram group, owner 2026-10-08) for each new order, with the order details and a link to it in the admin; also for low stock. The Bookly bot can post there (add it to the group).

## Phase 4 · Shop completeness
- [ ] **Order updates in Telegram for customers** (owner 2026-10-08): receipt, order details and every status change in Telegram, as well as (or instead of) email. Reuses the Bookly bot (Phase 1): the customer taps "Get order updates in Telegram" once (a `t.me/<bot>?start=<one-time link>`, same as phone confirmation) to connect their chat to the account (needs a small migration for the chat id, ask first), and can turn it off in their account.
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
- [ ] Load test the busiest pages.

## Phase 7 · Redesign (last)
- [ ] Full frontend redesign, starting from the landing page, then every page; keep all tests passing.

## Removed by the owner
- Paid Telegram Gateway codes and the "Gateway balance alert" item (removed 2026-10-08; replaced by the free Bookly bot).
- Moving the API from Render to Railway (removed 2026-10-08; the research stays in the backend's `docs/RAILWAY_PLAN.md`).

## Never
- No payment-provider work without the owner's keys and OK. Never edit old migrations. No secrets in chat.
