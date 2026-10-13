# Next step: finish Phase 2, then Phase 3 (admin dashboard)

State on 2026-10-12: Phase 1 (sign-in) is done and live, including the free Bookly Telegram bot. In Phase 2 these are done:
nightly encrypted database backup (first run green, restore drill passed, backup failure alert via Bookly Alerts bot, alert error reason in logs), uptime monitors (email alerts), `/health` also reports the Telegram bot,
preview-deployment CORS, Sentry release tag and verified source maps, quiet unit tests, backend `docs/DEPLOYMENT.md` restore steps fix, backend `docs/NEXT_STEP.md` pointer restored,
backend dependency updates (13 packages updated inside constraints, 0 majors, platform pinned to 8.3.0), and rate-limit review (docs/RATE_LIMITS.md audit). **Everything still to do, in order, is in `docs/ROADMAP.md`.**

Also done on 2026-10-12 (all merged except the last one): backend housekeeping now runs from the 5-minute uptime ping
(`RUN_MAINTENANCE_ON_REQUEST=true` on Render), customer emails for every order change and return step, owner Telegram
alert for each new order and low stock (Bookly Alerts bot; live test received), frontend CI `actions/setup-node` pinned to
the v7.1.0 commit (branch `chore/setup-node-v7`, CI green, waiting for the owner to merge).

## Done since 2026-10-12
Merged: order and return emails, owner Telegram alert, setup-node pin, Telegram webhook self-repair (address from `APP_URL`), dashboard numbers (backend) and dashboard comparison/KHR/top categories (frontend). `.env.production` now points at the live Render API (it pointed at the old wasmer API; Vercel's own setting hid the problem).
Also merged on 2026-10-13: rate limits (owner's "looser" set, coupon lock after 5 unknown codes, webhook exempt with its secret) + password changed/reset security email; welcome email on first verification; owner Telegram alert for 1-2 star reviews; plans/audits docs.

## Now (2026-10-13): better search, waiting for the owner's merge
Backend `feature/catalog-name-search` (rebuilt fresh from main; replaces PR #10, which the owner can close) + frontend `feature/catalog-name-search` (author names bold in the live search suggestions). Customers find books by title, description, author, series or category name, every word as a prefix, while typing. One new migration, indexes only (owner approved 2026-10-13).

## Next: the owner picks one from this backlog
Admin orders: printable invoice/packing slip + bulk status · dashboard custom date range · staff Telegram group for new orders · data retention (old carts/audit log/cache; owner chooses the windows) · exchange-rate refresh · missed-backup check · Khmer language · delivery fees per province · SEO/pre-render · custom domain + shop email (SPF/DKIM/DMARC) · E2E tests · security review · redesign last.

## Still open in Phase 2, in this order
1. **Frontend dependency updates**: a plain `npm update` rewrote the whole lockfile and broke `npm ci` in CI; do updates with the CI's npm (10.9.9) and verify with `npm ci`, or one package at a time; majors still to decide are listed in 'Major upgrades to decide'.
2. **Raise the minimum PHP to 8.4**: production already runs 8.4, to allow Symfony 8 / PHPUnit 13; then remove config.platform.php 8.3.0.
3. **Remaining chores**:
   - Run the Tests workflow on pushes to `chore/**` and `docs/**` branches too (backend `.github/workflows/tests.yml` only runs on `main`, `feature/**`, `fix/**` and pull requests).
   - Vitest 5 (`@vitest/mocker` advisory).
4. **Missed-backup check**: postponed by the owner on 2026-10-10 (options discussed: free outside check-in service such as Healthchecks.io, or a second GitHub workflow checking artifact age).
Then **Phase 3** (admin dashboard, delete security, staff Telegram group). Customer Telegram receipts are Phase 4 (decisions open, see ROADMAP).

## Unattended runs (what worked)
Long runs use one branch per stage, a clean `main` start, a database guard (tests must never reach Neon), a private run log in `.git/RUN_LOG.md`, a hard rule 'STOP on any major version', and the reviewer (Claude) re-verifies every claim (versions with ls-remote/lock diffs, CI on the exact PHP/Node versions, doc claims against code). Lessons learned: the first backend dependency run wrongly reported 'no majors', and the frontend lockfile broke CI.

## How the three of us work (project manager + coding agent + owner)
- Claude is the project manager and reviewer: reads the real diffs on GitHub, writes the next prompt, never merges.
- A coding agent writes ONE small task per fresh chat. Codex is deactivated; the owner uses **Antigravity (Local, folder
  `bookly_backend_v2` or `bookly_frontend`, planning mode, terminal asks first)**. Model: Claude Opus 4.6 (Thinking), or Sonnet 4.6, when
  credits are out Gemini 3.8 Flash only for finishing/checking. Mark every prompt **[default]** or **[strong]** (strong for money, sign-in, security, data).
- One task at a time, never both repos at once. Before each task: `git checkout main && git pull origin main` (backend also `composer install`,
  frontend `npm ci`). Check the folder name before pasting a prompt. Prompts start with the briefing + hard rules (see the previous session's
  briefing: only that task, no migrations/secrets/merge/PR, commit as danishsary, no AI names, tests + lint before push, WORKLOG entry,
  push the branch, print `=== NOTE FOR CLAUDE ===`).
- The owner pastes the note; Claude checks the branch (diff + CI) before telling the owner to merge. Owner steps are click-by-click, one
  short step at a time; secrets are never pasted in chat.

## Local testing
Demo staff `admin@bookly.test` / `staff@bookly.test` (2FA on); customer `demo@bookly.test`. API:
`QUEUE_CONNECTION=sync php artisan serve --port=8000`; website: `VITE_API_BASE_URL=http://localhost:8000/api/v1 npx vite`.
Telegram bot without a real one: start the API with `TELEGRAM_BOT_TOKEN=123:fake TELEGRAM_BOT_USERNAME=BooklyBot`, then
play Telegram by posting `{"message":{"chat":{"id":1,"type":"private"},"from":{"id":1},"text":"/start <code>"}}` and then
`…"contact":{"phone_number":"85512345678","user_id":1}` to `/api/v1/telegram/webhook` with the header
`X-Telegram-Bot-Api-Secret-Token` (= `app(App\Services\Telegram\TelegramBot::class)->webhookSecret()` in tinker). E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia; my portfolio/CV project, production grade). Frontend: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry; free Bookly Telegram bot for phone sign-up/sign-in; nightly encrypted DB backup via GitHub Actions; UptimeRobot monitors).
Read first: both CLAUDE.md files, frontend README.md, docs/ROADMAP.md, docs/NEXT_STEP.md (it explains how we work), docs/WORKLOG.md, design-system/bookly/MASTER.md; backend docs/WORKLOG.md, docs/API.md, docs/DEPLOYMENT.md.
Status: Phase 1 done. Phase 2 mostly done (backups, restore drill, backup failure alert, alert error reason in logs, uptime email alerts, bot health in /health, preview CORS, Sentry release tag & source maps verified, quiet tests, DEPLOYMENT.md restore steps fix, backend NEXT_STEP pointer restored, backend dependency updates, rate-limit review). Open: apply rate-limit changes from backend docs/RATE_LIMITS.md, investigate Telegram webhook 'not set' recurrence, frontend dependency updates (via CI npm 10.9.9), raise minimum PHP to 8.4, remaining chores (Tests workflow on chore/** and docs/** pushes, backend NEXT_STEP cleanup, Node 24 GitHub Actions bumps, Vitest 5), postponed missed-backup check. Then Phase 3 (admin dashboard). Customer Telegram receipts are Phase 4 (decisions open).
Your role: project manager + context/prompt engineer. I (owner) use Antigravity (Local) as the coding agent, one task per fresh chat, never both repos at once. For each task: check the real branch diff and CI on GitHub before telling me to merge; write the prompt for the agent (mark [default] or [strong]); give my own steps click by click, one short step at a time; ask me with the question tool (recommended option first) when something is unclear. I paste the agent's "NOTE FOR CLAUDE" blocks to you.
Rules: important things first, follow ROADMAP order, tick items, never drop one unless I say so, add new gaps to the right phase. Small commits, human-style messages, no AI/tool names in git, commit as "danishsary" <187593185+danishsary8@users.noreply.github.com>, no Co-Authored-By or session trailers. One branch per piece of work; I merge — give me compare links, backend first. Never edit old migrations; ask before new ones. Don't change existing feature code beyond the plan without asking. No payment-provider work. Never ask me to paste secrets. Verify before every push: frontend lint, npx tsc -b, npx vitest run, build, Playwright browser pass (Chromium at /opt/pw-browsers/chromium); backend php artisan test + vendor/bin/pint. Update docs/WORKLOG.md, docs/ROADMAP.md, docs/NEXT_STEP.md. Short, step-by-step answers (I'm a student learning API development); end with "what was done / what's next" and the next prompt in chat.
Task: start with the first Phase 3 slice, the dashboard numbers, following backend docs/ADMIN_DASHBOARD_PLAN.md (backend task first, then the frontend page); first ask me to approve the rate-limit changes if I want them done earlier.
```
