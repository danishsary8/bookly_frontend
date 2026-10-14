# Next step

**Everything still to do, in order, is in `docs/ROADMAP.md`** (including the "Known limits and small follow-ups" items).

## State on 2026-10-13
- Phase 1 (sign-in) is done and live, including the free Bookly Telegram bot.
- Phase 2 is mostly done: nightly encrypted backup + restore drill + failure alert, uptime monitors, `/health` with the
  Telegram bot, preview CORS, Sentry source maps, quiet tests, backend dependency updates, rate limits (owner's "looser"
  set) + password security email, Telegram webhook self-repair.
- Merged on 2026-10-12/13: customer emails for every order and return step, owner Telegram alerts (new order, low stock,
  1-2 star review), welcome email, dashboard numbers with KHR/comparison/top categories, better search (author, series,
  category, as you type; old backend PR #10 closed), invoice and packing slip (print one or up to 50 at once; customers
  print their own invoice).

## Now: waiting for the owner's merge (built 2026-10-14 while the owner was away)
| Branch | Repo | What | Merge order |
| --- | --- | --- | --- |
| `feature/delivery-notes` | backend | Customer delivery note & staff note columns, endpoints, audit, alert | 1 (backend) |
| `feature/delivery-notes` | frontend | Checkout delivery note with counter, customer & admin note view/edit, packing slip | 2 (after backend) |
| `feature/admin-close-account` | backend | Admin-only customer account closure (2FA + password + typed email, 30d restore window, audit, alert) | 3 (backend) |
| `feature/admin-close-account` | frontend | Admin customer page Danger zone with Close account dialog & error handling | 4 (after backend) |
| `feature/e2e-money-path` | frontend | Playwright CI workflow (`e2e.yml`) testing full money path in < 2m | 5 (frontend) |
| `feature/khmer-language` | frontend | Khmer storefront slice (English/ភាសាខ្មែរ switch, typography, header, catalog, cart, checkout, login) | 6 (frontend) |
| `docs/batch-2026-10-14` | backend | Worklog and documentation updates | last (backend) |
| `docs/batch-2026-10-14` | frontend | Worklog, roadmap, and next step updates | last (frontend) |

## Next: the owner picks one
Recommended order: (1) Telegram order updates for customers (opt-in via bot), (2) Delivery fees per province and estimated delivery dates, (3) Expanding Khmer translations to full storefront & customer emails, (4) Pre-rendered HTML / SEO for public catalog.
Other backlog: data retention · exchange-rate refresh · security review of both repos · load testing.

## Still open in Phase 2, in this order
1. **Frontend dependency updates**: a plain `npm update` rewrote the whole lockfile and broke `npm ci` in CI; update with the CI's npm (10.9.9) and verify with `npm ci`, or one package at a time.
2. **Raise the minimum PHP to 8.4** (production runs 8.4) to allow Symfony 8 / PHPUnit 13; then remove `config.platform.php` 8.3.0.
3. **Chores**: run the backend Tests workflow on `chore/**` and `docs/**` pushes too; Vitest 5 (`@vitest/mocker` advisory).
4. **Missed-backup check** (postponed 2026-10-10): an outside check-in service such as Healthchecks.io, or a workflow checking the newest artifact's age.

## How we work
- The assistant is planner, reviewer and hands-on builder: reads the docs first, asks the owner before any design
  decision (options with a recommendation first), builds one task per branch in each repo, verifies, pushes, checks CI,
  then gives compare links (backend first). The owner merges.
- Before each task: `git fetch origin` and branch from fresh `origin/main`. Human-style branch names and commit messages,
  author `danishsary <187593185+danishsary8@users.noreply.github.com>`, no tool names anywhere, no co-author trailers.
- Verify before every push: backend `php artisan test` + `vendor/bin/pint --test` (local throwaway Postgres only);
  frontend `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build`, and a real browser pass (Playwright,
  Chromium at `/opt/pw-browsers/chromium`) for UI changes. New tests must fail without the change. Say "not yet
  verified" for anything not checked.
- Log every finished task in `docs/WORKLOG.md` (both repos as relevant), tick `docs/ROADMAP.md`, update this file.

## Local testing
- Postgres 16 often stops between turns: `service postgresql start`. DBs `bookshop_v2_test` (tests) and `bookshop_v2`
  (local runs), user/password `bookshop`/`bookshop`; a fresh container needs the role and both DBs created first.
- Backend: `COMPOSER_DISCARD_CHANGES=true composer install --no-interaction`; demo data: `php artisan migrate:fresh --seed`
  then `php artisan db:seed --class=DemoSeeder` (20 books, 13 orders in every status, USD→KHR 4100).
- Demo staff `admin@bookly.test` / `staff@bookly.test` and customer `demo@bookly.test`. The demo staff come **without**
  2FA, and the staff area requires it: for a local browser check set `two_factor_enabled` (and a secret) on the local DB.
- API: `QUEUE_CONNECTION=sync php artisan serve --port=8000`; website: `VITE_API_BASE_URL=http://localhost:8000/api/v1 npx vite`.
  Sign in a browser check by putting `{token, expiresAt: null, user}` in localStorage `bookly.session.staff` /
  `bookly.session.customer` (token from tinker `createToken`, user from `/staff/auth/me` or `/me`).
- Stop servers by PID only (never kill by a command-line pattern: it can hit the shell that runs it).
- Telegram bot without a real one: start the API with `TELEGRAM_BOT_TOKEN=123:fake TELEGRAM_BOT_USERNAME=BooklyBot`, then
  post `{"message":{"chat":{"id":1,"type":"private"},"from":{"id":1},"text":"/start <code>"}}` and then
  `…"contact":{"phone_number":"85512345678","user_id":1}` to `/api/v1/telegram/webhook` with the header
  `X-Telegram-Bot-Api-Secret-Token` (= `app(App\Services\Telegram\TelegramBot::class)->webhookSecret()` in tinker).
- The live API can't be reached from the sandbox; ask the owner for a screenshot of `/api/v1/health` after a deploy.

## Paste this into the next session
```
You are the planner, reviewer and hands-on builder for my Bookly project (I'm the owner, a student learning API development). Repos (attached): backend danishsary8/bookly_backend_v2 (Laravel 13, PHP 8.3+, PostgreSQL/Neon, REST /api/v1, live https://bookly-api-zasc.onrender.com), frontend danishsary8/bookly_frontend (React 19 + Vite + TypeScript + Tailwind 4, live on Vercel).
Read first, in order: the instruction file at each repo root; backend docs/PROJECT_CONTEXT.md, docs/WORKLOG.md (last ~15 entries), docs/API.md as needed; frontend docs/ROADMAP.md, docs/NEXT_STEP.md (state, how we work, local testing), docs/WORKLOG.md (last ~10 entries), design-system/bookly/MASTER.md. Then give me a SHORT status (max 10 lines) and wait for my task.
How to talk to me: short, simple, step by step; options with a recommendation first (question tool); ask before any design decision. End replies with "What was done / Your steps / What's next"; my steps as exact clicks with full links (compare links backend first). Task checklist for multi-step work. At ~70% context write a handoff into the docs and give me a short prompt for a fresh chat.
Hard rules: never push to main, merge or open PRs unless I ask; one branch per task, human-style names and messages; commit as danishsary <187593185+danishsary8@users.noreply.github.com> with git -c; no AI/tool names anywhere, no co-author or session trailers. Never ask for or store secrets. Never edit old migrations; ask before a new one. No payment-provider work. Don't change features beyond the task without asking. Backend tests only on local throwaway Postgres. Verify before every push (backend tests + pint; frontend lint, typecheck, vitest, build, Playwright browser check for UI); prove new tests fail without the change; check CI green before saying ready; say "not yet verified" otherwise. Log every task in docs/WORKLOG.md and keep ROADMAP/NEXT_STEP current, including small limitations as checklist items.
```
