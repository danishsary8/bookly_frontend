# Next step: Phase 2 (reliability)

Phase 1 (sign-in) is built. The paid Telegram Gateway is replaced by the free Bookly Telegram bot (2026-10-08):
phone numbers are proven with one tap on "Share my phone number"; "Continue with Telegram" signs in.
Railway was removed from the plan by the owner. **Everything still to do, in order, is in `docs/ROADMAP.md`.**

## Owner
1. Merge, in order: backend `docs/shelve-railway` → `feature/telegram-bot` → `feature/phone-by-telegram-bot`,
   then frontend `docs/remove-railway` → `feature/telegram-bot-sign-in`.
2. Create the bot: Telegram → @BotFather → /newbot → name `Bookly` → a username ending in `bot` → copy the token.
3. Render → bookly API → Environment → add `TELEGRAM_BOT_TOKEN` (the token), delete `TELEGRAM_GATEWAY_TOKEN` →
   Save, rebuild and deploy. The deploy log should say "Telegram bot @… now sends its messages to …".
4. Test on the live site: Register → Telegram → Open Telegram → Start → Share my phone number.

## Next session: ROADMAP Phase 2 in order
Neon backups + one restore drill, uptime monitor with Telegram alerts (also keeps the Render API awake),
Telegram bot health, Sentry source maps, preview-deployment CORS, chores.

## Local testing
Demo staff `admin@bookly.test` / `staff@bookly.test` (2FA on); customer `demo@bookly.test`. API:
`QUEUE_CONNECTION=sync php artisan serve --port=8000`; website: `VITE_API_BASE_URL=http://localhost:8000/api/v1 npx vite`.
Telegram bot without a real one: start the API with `TELEGRAM_BOT_TOKEN=123:fake TELEGRAM_BOT_USERNAME=BooklyBot`, then
play Telegram by posting `{"message":{"chat":{"id":1,"type":"private"},"from":{"id":1},"text":"/start <code>"}}` and then
`…"contact":{"phone_number":"85512345678","user_id":1}` to `/api/v1/telegram/webhook` with the header
`X-Telegram-Bot-Api-Secret-Token` (= `app(App\Services\Telegram\TelegramBot::class)->webhookSecret()` in tinker). E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia; my portfolio/CV project, production grade). Frontend: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts; free Bookly Telegram bot for phone sign-in/confirmation).
Read first: both CLAUDE.md files, frontend README.md, docs/ROADMAP.md, docs/NEXT_STEP.md, docs/WORKLOG.md, design-system/bookly/MASTER.md; backend docs/WORKLOG.md, docs/API.md, docs/DEPLOYMENT.md.
Status: ROADMAP Phase 1 (sign-in) is done; the paid Telegram Gateway was replaced by our free Bookly Telegram bot ("Share my phone number"). Railway is removed from the plan (we stay on Render).
Task: first check the live Telegram bot works (sign-up, Continue with Telegram); then ROADMAP Phase 2 in order: Neon backups + restore drill, uptime monitor with Telegram alerts (also keeps Render awake), Telegram bot health, Sentry source maps, preview CORS, chores. Stop and give me click-by-click steps whenever my accounts are needed.
Rules: important things first, follow ROADMAP order, tick items, never drop one unless I say so, add new gaps to the right phase. If unclear, ask me first (question tool with a recommended option). Small commits, human-style messages, no AI/tool names in git, commit as "danishsary" <187593185+danishsary8@users.noreply.github.com>, no Co-Authored-By or session trailers. One branch per piece of work (stack when needed); I merge — give me compare links, backend first. Never edit old migrations; ask before new ones. Don't change existing feature code beyond the plan without asking. No payment-provider work. Never ask me to paste secrets. Verify before every push: frontend lint, npx tsc -b, npx vitest run, build, Playwright browser pass (Chromium at /opt/pw-browsers/chromium); backend php artisan test + vendor/bin/pint. Check CI with the GitHub tools and fix failures. Update docs/WORKLOG.md, docs/ROADMAP.md, docs/NEXT_STEP.md. Keep answers short and step by step; end with "what was done / what's next" and the next session's prompt in chat.
```
