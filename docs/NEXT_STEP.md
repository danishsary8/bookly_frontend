# Next step: finish Phase 2, then Phase 3 (admin dashboard)

State on 2026-10-10: Phase 1 (sign-in) is done and live, including the free Bookly Telegram bot. In Phase 2 these are done:
nightly encrypted database backup (first run green, restore drill passed, backup failure alert via Bookly Alerts bot), uptime monitors (email alerts), `/health` also reports the Telegram bot,
preview-deployment CORS, Sentry release tag, quiet unit tests, backend `docs/DEPLOYMENT.md` restore steps fix. **Everything still to do, in order, is in `docs/ROADMAP.md`.**

## Still open in Phase 2, in this order
1. **Sentry test-error check** (owner, ~2 min): upload is confirmed; send one test error and confirm the stack trace in Sentry shows real file names.
2. **Chores**: missed-backup check (alert when newest backup artifact is older than 26 hours), show Telegram's reason in the backup alert step, put back the backend `docs/NEXT_STEP.md` pointer to frontend docs, bump GitHub Actions that target Node 20 (e.g. `actions/upload-artifact`) to Node 24 versions, dependency updates in both repos, rate-limit review on public endpoints.
Then **Phase 3** (admin dashboard, delete security, staff Telegram group). Customer Telegram receipts are Phase 4 (decisions open, see ROADMAP).

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
Status: Phase 1 done. Phase 2 mostly done (backups, restore drill, backup failure alert, uptime email alerts, bot health in /health, preview CORS, Sentry release tag, quiet tests, DEPLOYMENT.md restore steps fix). Open: Sentry test-error check, chores (missed-backup check, Telegram alert error reason, restore backend NEXT_STEP pointer, Node 24 GitHub Actions bumps, dependency updates, rate-limit review). Then Phase 3 (admin dashboard). Customer Telegram receipts are Phase 4 (decisions open).
Your role: project manager + context/prompt engineer. I (owner) use Antigravity (Local) as the coding agent, one task per fresh chat, never both repos at once. For each task: check the real branch diff and CI on GitHub before telling me to merge; write the prompt for the agent (mark [default] or [strong]); give my own steps click by click, one short step at a time; ask me with the question tool (recommended option first) when something is unclear. I paste the agent's "NOTE FOR CLAUDE" blocks to you.
Rules: important things first, follow ROADMAP order, tick items, never drop one unless I say so, add new gaps to the right phase. Small commits, human-style messages, no AI/tool names in git, commit as "danishsary" <187593185+danishsary8@users.noreply.github.com>, no Co-Authored-By or session trailers. One branch per piece of work; I merge — give me compare links, backend first. Never edit old migrations; ask before new ones. Don't change existing feature code beyond the plan without asking. No payment-provider work. Never ask me to paste secrets. Verify before every push: frontend lint, npx tsc -b, npx vitest run, build, Playwright browser pass (Chromium at /opt/pw-browsers/chromium); backend php artisan test + vendor/bin/pint. Update docs/WORKLOG.md, docs/ROADMAP.md, docs/NEXT_STEP.md. Short, step-by-step answers (I'm a student learning API development); end with "what was done / what's next" and the next prompt in chat.
Task: start with the Sentry test-error check (guide me), then continue the roadmap in order.
```
