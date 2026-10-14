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
- [x] Owner: Bookly bot created and `TELEGRAM_BOT_TOKEN` on Render; works live since 2026-10-08 after `fix/telegram-webhook-check` (backend: the API now checks Telegram delivers the bot's messages and fixes the address itself).
- [x] Connect / disconnect Google and Facebook from Sign-in & security (block removing the last way in: "Add a password first") (`feature/connect-social`, both repos).
- [x] Add or change the email from the account (code to the new address), so phone-only Facebook customers can add one (`feature/change-email`, both repos; new migration for the code kinds).
- [x] Sign in with phone number + Telegram code (today phone-only accounts sign in with Facebook only) (`feature/phone-sign-in`, both repos).
- [x] Admin: see closed accounts and reopen one within its 30 days (with an audit entry) (`feature/reopen-accounts`, both repos).
- [x] Owner's fixes (2026-10-08): phone sign-in says plainly when a number has no account or Telegram can't reach it (no more code page for a code that never comes); no cap on Telegram codes per number (a missing code is often our side; the cap stays available as `PHONE_CODES_PER_HOUR` / `PHONE_CODES_PER_DAY`); sign-up with Telegram needs no email (`fix/phone-sign-in-messages`, `fix/phone-code-limits` (backend), `feature/phone-only-sign-up`).

## Phase 2 · Reliability (before real customers)
- [x] Database backups, part 1 (2026-10-10): Neon's restore window is **6 hours** (free plan); a preview of production 1 hour back showed 12 customers and 13 orders (Backup & Restore → Preview data; nothing restored). Nightly encrypted backup built and run once by hand: backend `.github/workflows/db-backup.yml` (daily 02:00 Cambodia, AES-256, kept 30 days as a GitHub artifact; secrets `BACKUP_DATABASE_URL`, `BACKUP_PASSPHRASE`); first run green in 57 s with 1 artifact (`feature/nightly-db-backup`).
- [x] Database backups, part 2: restore drill of a nightly backup: download the artifact, `gpg -d`, `pg_restore` into a NEW Neon branch, compare row counts, delete the branch (steps in backend `docs/DEPLOYMENT.md` → "Nightly database backup"). Owner keeps the passphrase in two places. Restore drill passed 2026-10-10: downloaded the nightly artifact, decrypted it with gpg, restored it with pg_restore into a new Neon branch, row counts matched production except the temporary `cache` table (214 vs 212, it changes every minute); 12 customers and 13 orders matched; the branch and the unencrypted copy were deleted.
- [x] Backup failure alert: 2026-10-10, backend `feature/backup-failure-alert` (merged): when the nightly backup fails, or is skipped because BACKUP_DATABASE_URL is missing, GitHub Actions sends a Telegram message to the owner's private chat from a separate free bot, Bookly Alerts (repository secrets TELEGRAM_ALERT_BOT_TOKEN and TELEGRAM_ALERT_CHAT_ID). Failures only, no daily OK message (owner's choice). A manual run with the test_alert box ticked sends a test message without a backup; checked green on 2026-10-10.
- [x] Uptime monitors (2026-10-10, UptimeRobot free): API `/api/v1/health` (keyword `"status":"ok"`, so a degraded bot or stuck queue also alerts) and the website, every 5 minutes, alerts by email. UptimeRobot's Telegram alerts are paid, so they stay off; the 5-minute ping also keeps the Render API awake.
- [x] Sentry source maps: 2026-10-10: Vercel build logs say 'Successfully uploaded source maps to Sentry' and Sentry lists 358 files per release; a test error thrown from a Vercel preview build of the throwaway branch tmp/sentry-test-error (never merged, deleted) showed the real file and line in Sentry (src/pages/dev/SentryTestPage.tsx:5:9 in triggerSentryTestError). The three Sentry variables (SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN) now apply to Production and Preview.
- [x] Preview deployments may call the API: backend `CORS_ALLOWED_ORIGIN_PATTERNS` (merged); owner set it on Render for `bookly-frontend-*-danishs-projects-79a48970.vercel.app` (2026-10-09). Also done: backend Sentry release tag from `RENDER_GIT_COMMIT`.
- [x] Telegram bot health: `/health` now reports `checks.telegram_bot` (off / ok / degraded) and makes the overall status `degraded` when the webhook is missing or Telegram reports delivery errors; the uptime keyword monitor therefore alerts on a broken bot (backend `feature/health-telegram-bot`, merged).
- [x] Chores:
  - backend dependency updates (backend branch chore/backend-safe-updates: 13 packages updated inside constraints, 0 majors; composer.json config.platform.php pinned to 8.3.0 so the lockfile stays installable on the oldest supported PHP, because a first attempt moved Symfony 7.4 to 8.1 which needs PHP >=8.4.1 and broke the PHP 8.3 CI jobs);
  - rate-limit review (backend branch docs/rate-limit-audit, document docs/RATE_LIMITS.md, audit only, NO code changed);
  - unit tests no longer reach the network: done in `chore/quiet-tests`.
  Node 24 actions: done in both repos (backend `actions/upload-artifact` v7.0.2 in chore/ci-node24-and-docs; frontend `actions/setup-node` pinned to the v7.1.0 commit in chore/setup-node-v7, the only action that was not pinned). Still open in chores: Vitest 5 (`@vitest/mocker` advisory).
- [x] Apply the rate-limit changes from backend docs/RATE_LIMITS.md. **Done 2026-10-13** (backend `feature/rate-limits`, merged): the owner's "looser" set (checkout, coupon check + 15-minute lock after 5 unknown codes, Telegram status polling, `/books` search, dashboard), Telegram webhook exempt with its secret, security email when a password is changed or reset; frontend `fix/rate-limit-wait-message` says long waits in minutes.
- [x] Investigate why the Telegram webhook showed 'not set' on 2026-10-11 (the API repaired it itself when a sign-in started; watch /health; if it recurs, search the Render logs for 'webhook was'). **Done 2026-10-13:** Telegram had no address at all (removed from outside); `/health` now repairs it from `APP_URL` at most every 10 minutes, and the address never comes from the request (backend `fix/telegram-webhook-self-repair` + `fix/telegram-webhook-app-url`).
- [x] Frontend dependency updates: a plain `npm update` rewrote the whole lockfile and broke `npm ci` in CI; do updates with the CI's npm (10.9.9) and verify with `npm ci`, or one package at a time; majors still to decide are listed in 'Major upgrades to decide'. **Done 2026-10-14 for patch/minor** (`chore/frontend-safe-updates`: 12 packages with npm 10.9.9 one by one, 89 lockfile entries, 0 majors, `npm ci` and a browser smoke pass). Majors still to decide: eslint 10, @eslint/js 10, typescript 7, vite 8, @vitejs/plugin-react 6, vitest 5, jsdom 29, lucide-react 1.x, motion 14, globals 17, @testing-library/jest-dom 7, eslint-plugin-react-refresh 0.5, shadcn 4, @playwright/test 1.64, @types/node 26.
- [ ] Raise the minimum PHP to 8.4 (production already runs 8.4) to allow Symfony 8 / PHPUnit 13; then remove config.platform.php 8.3.0.
- [x] Run the Tests workflow on pushes to chore/** and docs/** branches too (backend .github/workflows/tests.yml only runs on main, feature/**, fix/** and pull requests). **Done**: backend already ran on chore/** and docs/**; frontend CI added docs/** on 2026-10-14 (`chore/lint-warnings`).
- [x] Backend docs/NEXT_STEP.md still lists the finished alert-bot steps (create bot, add secrets) as to-do; clean it up. (checked 2026-10-13: it already lists the alert bot and secrets as done and verified).
- [x] Fix backend docs/DEPLOYMENT.md restore steps (done in backend `feature/backup-failure-alert`): say restore into a NEW Neon branch with `pg_restore --clean --if-exists --no-owner --no-privileges`, note that a new branch already contains production tables, add the Windows notes (install Gpg4win or use gpg from Git for Windows; use `gpg -o bookly.dump -d bookly.dump.gpg` instead of `>` redirect in PowerShell; never paste the connection string or passphrase in chat or screenshots; delete the unencrypted dump afterwards).
- [x] Missed-backup check: the failure alert only fires when the workflow runs. If it never starts (for example GitHub pauses scheduled workflows after 60 days without repository activity in a public repo, or a schedule is skipped), nobody is told. Add a check (owner postponed it on 2026-10-10; options discussed: a free outside check-in service such as Healthchecks.io that expects a ping after each successful backup (recommended), or a second GitHub workflow that checks the newest backup artifact's age). **Built 2026-10-14** (backend `chore/missed-backup-check`): a check-in to Healthchecks.io after each successful backup; the owner creates the free check and the `BACKUP_HEALTHCHECK_URL` secret (backend DEPLOYMENT.md → Missed-backup check).
- [x] Show Telegram's reason in the backup alert step: `curl --fail` hides the reply, so a failure only says 'error 400'. Print Telegram's `description` (it is not secret) so the cause (e.g. 'chat not found') is visible in the log (backend chore/backup-alert-reason, merged; the test_alert run was green afterwards).
- [x] Backend docs/NEXT_STEP.md lost its one-line pointer to the frontend `docs/ROADMAP.md` and `docs/NEXT_STEP.md`; put it back (same backend branch).

- [x] Small chores found 2026-10-13: clear the 5 old frontend lint warnings (`Carousel.tsx`, `form/Field.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `ThemeContext.tsx` (an unused eslint-disable)); the demo seeder creates staff without 2FA although the staff area needs it (seed them with 2FA, or keep the note in NEXT_STEP → Local testing); the generated `src/api/schema.d.ts` had drifted from the API spec (regenerated in `feature/order-documents`): regenerate it in every task that changes `openapi.yaml`. **Lint warnings done 2026-10-14** (`chore/lint-warnings`: 0 warnings). The demo-seeder 2FA note stays in NEXT_STEP → Local testing (staff must set up 2FA on first sign-in by design).

## Phase 3 · Admin dashboard, production grade (real data)
- [ ] Dashboard: revenue, orders and average order for today / 7 / 30 days / custom range, compared with the period before; orders by status; top books and categories; low stock; new verified customers; charts.
  - Done 2026-10-13: backend `feature/dashboard-numbers` (merged) adds KHR, previous-period comparison and top categories; frontend `feature/dashboard-comparison` shows them (KHR under USD, green/red change arrows, "New" when the period before had nothing, Top categories panel). Custom date range done 2026-10-13 (`feature/dashboard-date-range`: Custom → From/To days in the URL, at most 366 days). Still open in this item: caching/indexes if it gets slow.
  - Plan written: backend docs/ADMIN_DASHBOARD_PLAN.md (branch docs/admin-dashboard-plan). Owner decisions 2026-10-12: revenue counts when an order is delivered (cash basis); refunds are subtracted on the refund date and the shipping fee is kept; money is shown as USD with KHR beside it; money numbers are admin only. Note: a first dashboard already exists (GET /staff/dashboard/summary and /sales, DashboardService); the work is to enhance it (previous-period comparison, KHR, charts).
- [ ] Orders: full workflow (confirm → packed → shipped → delivered / cancelled) with a timeline, print **invoice and packing slip**, delivery notes, bulk status changes, filters and CSV export.
  - Done 2026-10-13 (backend + frontend `feature/order-documents`): printable **invoice and packing slip** (A4, browser print / Save as PDF; order number = invoice number; USD + KHR at the order-date rate), print many at once from the orders list (tick up to 50), customers print their own invoice from My orders. Fix 2026-10-13 (`fix/returned-order-documents`, both repos): a fully returned order no longer says "Collect on delivery"; it shows a "Returned · refunded" stamp. Bulk status done 2026-10-13 (`feature/bulk-order-status`, both repos): tick up to 50 orders → Change status (processing, shipped or delivered; cancel stays one at a time), optional note for every timeline, each order changes on its own with the usual email; the ones that cannot move are listed with the reason and stay ticked. Delivery notes done 2026-10-14 (`feature/delivery-notes`, both repos). Still open in this item: a "packed" step (a new order status needs a migration: ask first).
- [ ] Stock: stock history per book (who changed what), low-stock threshold per book, restock entries, "out of stock" handling.
- [ ] Books: CSV import/export, bulk price/stock/category edits, image upload checks, drafts and scheduled publishing.
- [ ] Customers: notes, tags, lifetime value, order history, deactivate/reactivate, resend verification.
- [ ] Coupons and returns: usage reports, refund records.
- [ ] Staff: granular permissions per role, active sessions with "sign out everywhere", login history.
- [ ] **Strict delete security** (owner's rule) for anything that deletes: admin only; re-enter password **and** a 2FA code; type the item's name to confirm; soft delete into a **Trash** with 30-day restore; full audit entry with before/after values; a Telegram message to the owner on every delete. Admin account closing done 2026-10-14 (`feature/admin-close-account`, both repos).
- [ ] Telegram notice to the owner **and staff** (a staff Telegram group, owner 2026-10-08) for each new order, with the order details and a link to it in the admin; also for low stock. The Bookly bot can post there (add it to the group). The Bookly Alerts bot (Phase 2) can be reused for the staff group.
  - Owner part done 2026-10-12 (backend `feature/new-order-telegram-alert`): new order and low stock go to the owner via the Bookly Alerts bot. Staff group built 2026-10-13 (backend `feature/staff-order-alerts`, `OPS_STAFF_CHAT_ID` + optional `SHOP_URL` for Open links); the owner still creates the group and sets the variables (backend DEPLOYMENT.md → Staff Telegram group).

- [ ] Invoice and packing slip: known limits (2026-10-13)
  - [x] Order lines keep only the price at purchase time, not the title/format/SKU: renaming a book or changing a SKU changes its old invoices. **Done 2026-10-13** (backend `feature/order-line-snapshot`, owner-approved migration): lines store title, format, SKU, ISBN and authors at checkout; old lines were filled once from the books.
  - [x] The heading says "Invoice" even when the order is paid. **Done 2026-10-13** (`feature/receipt-heading`): "Receipt" once the cash is recorded (sheet, page title, customer button "Print receipt"); returned/cancelled stay "Invoice" with their stamp.
  - [ ] Riel is shown only for the total (and the amount to collect), not per line; no riel at all when no exchange rate existed when the order was placed.
  - [ ] Shop details on the sheets come from `src/content/shop.ts` (temporary personal email, "Phnom Penh, Cambodia" without a street address); update with the shop email and domain (Phase 5).
  - [x] Batch print reads the exchange rate once per order (at most 50 small queries); cache it per batch if printing gets slow. **Done 2026-10-14** (backend `chore/document-rate-lookup`: one query per request).
  - [ ] Not tested yet: a real printer (only Chromium's Save as PDF), Safari and Firefox print; print one slip and one invoice on the shop's printer.
  - [ ] Bulk status: the result list is shown once in the dialog and not kept (the order timelines and the audit log keep the history); a 50-order change runs in one request (each order is quick; watch the time on Render free).
  - [ ] Packing slips can be printed for delivered or returned orders too (harmless; hide the button there if staff find it confusing).

## Phase 4 · Shop completeness
- [x] **Better search** (2026-10-13, backend + frontend `feature/catalog-name-search`; replaces backend PR #10): find books by title, description, author, series or category name, every word as a prefix, results while typing ("conan doy", "austen emma"); author names bold in the suggestions. One migration, indexes only.
- [x] Welcome email on first verification and an owner Telegram alert for 1-2 star reviews (2026-10-13, backend `feature/welcome-and-review-alerts`, merged).
- [ ] **Order updates in Telegram for customers** (owner 2026-10-08): receipt, order details and every status change in Telegram, as well as (or instead of) email. Reuses the Bookly bot (Phase 1): the customer taps "Get order updates in Telegram" once (a `t.me/<bot>?start=<one-time link>`, same as phone confirmation) to connect their chat to the account (needs a small migration for the chat id, ask first), and can turn it off in their account. Discussed 2026-10-08, decisions still open: (1) messages: order confirmation at checkout + **receipt when the order is delivered** (cash on delivery; with card/KHQR later, when the payment succeeds); (2) customers who confirmed their phone in the bot get updates automatically (chat id saved then) or everyone opts in with a button; (3) a failed Telegram message never blocks an order; "View order" button; a blocked bot turns updates off; built like the order email so the staff group alert (Phase 3) reuses it. Owner: later, after Phase 2.
- [x] Customer emails for every order change (confirmed, shipped with tracking note, delivered, cancelled, refund), not only "order placed". **Done 2026-10-12** (backend `feature/order-status-emails`): processing, shipped with the staff note, delivered receipt, cancelled, and every return step; a mail failure never blocks the change.
- [ ] **Khmer language** (Khmer / English switch) on the storefront and emails. First storefront slice done 2026-10-14 (frontend `feature/khmer-language`: language switcher, typography, header, footer, home, catalog, book detail, cart, checkout, login). Still open: the other storefront pages (account, sign-up, order pages, help pages, the rest of checkout), emails, a native-speaker review of the draft Khmer.
- [ ] Delivery: fees per province, estimated delivery date, free-delivery threshold.
- [ ] Payments: card and KHQR stay "coming soon" until the owner gives the provider keys (ABA PayWay / Bakong); then a separate plan.
- [ ] "Tell me when it's back" for out-of-stock books; recently viewed; "customers also bought".
- [ ] Newsletter sign-up (with unsubscribe) for new arrivals.

- [ ] Search: known limits (2026-10-13)
  - [x] ISBN and SKU are not searchable in the shop search (customers may type an ISBN). **Done 2026-10-14** (backend `feature/search-isbn-sku`; search page hint in `feature/search-isbn-hint`).
  - [ ] Half-typed words match unstemmed only in titles; in descriptions and names a half-typed word can briefly match nothing ("runni" vs "run").
  - [ ] Khmer text has no spaces, so it matches only from the start of a phrase (handle with the Khmer language item).
  - [ ] The search limit is 60/min per IP for visitors who are not signed in; many phones behind one mobile-network IP share it: watch 429s in Sentry.
  - [ ] Not browser-checked: search in dark mode and the mobile-menu search field (same component).

## Phase 5 · Found on Google, fast, legal
- [ ] Pre-rendered HTML for public pages (phone performance above 90, link previews per book).
- [ ] Custom domain + shop email (SPF, DKIM, DMARC so codes don't land in spam); update Google, Facebook, Turnstile and CORS to the new domain.
- [ ] Google Search Console with the sitemap; privacy-friendly analytics.
- [ ] Accessibility audit (keyboard, screen reader, contrast) on every page.
- [ ] Legal pages reviewed: terms, returns/refunds, delivery, cookies notice if analytics needs one.

## Phase 6 · Confidence
- [ ] End-to-end tests in CI for the money paths: sign-up → verify → cart → checkout → admin ships → return. Money path done 2026-10-14 (frontend `feature/e2e-money-path`: GitHub Actions `e2e.yml` with real Postgres 16, Laravel API, and Vite server; smoke test covers full money path from checkout to delivered receipt in CI). Still open: sign-up + email verification, returns.
- [ ] Security review of both repos (OWASP list, file uploads, staff routes, secrets).
- [ ] Load test the busiest pages.

- [ ] Checks never done in a real browser so far (unit tests only): dashboard Today/30 days switch on real data and dark mode; the real Telegram app and Facebook sign-in (needs real accounts).

## Phase 7 · Redesign (last)
- [ ] Full frontend redesign, starting from the landing page, then every page; keep all tests passing.

## Removed by the owner
- Paid Telegram Gateway codes and the "Gateway balance alert" item (removed 2026-10-08; replaced by the free Bookly bot).
- Moving the API from Render to Railway (removed 2026-10-08; the research stays in the backend's `docs/RAILWAY_PLAN.md`).
- Rotating the Neon database owner password after the restore drill (owner decided to skip it on 2026-10-10, although it appeared in chat screenshots).
- Telegram alert for the uptime monitors (owner decided on 2026-10-10 that UptimeRobot's email alerts are enough).

## Never
- No payment-provider work without the owner's keys and OK. Never edit old migrations. No secrets in chat.
