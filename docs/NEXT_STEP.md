# Next step: Phase 2 (reliability)

Phase 1 (sign-in) is built and merged. Telegram codes work (2026-10-08) after three fixes: the API address
(`gatewayapi.telegram.org`), the Gateway token's IP restriction, and clear alerts. Railway was removed from the plan by the owner.
**Everything still to do, in order, is in `docs/ROADMAP.md`.**

## Owner
1. Optional merge: backend `fix/telegram-ip-hint` (clearer alert for an IP-restricted Gateway token).
2. Telegram Gateway balance is $0: codes only reach the account owner's own number. Before customers use it,
   add funds (gateway.telegram.org → Budget → Add Funds on Fragment, about $5 ≈ 500 codes), or remove
   `TELEGRAM_GATEWAY_TOKEN` on Render so sign-up only offers email codes until then.

## Next session: ROADMAP Phase 2 in order
Neon backups + one restore drill, uptime monitor with Telegram alerts (also keeps the Render API awake),
Telegram balance alert, Sentry source maps, preview-deployment CORS, chores.

## Local testing
Demo staff `admin@bookly.test` / `staff@bookly.test` (2FA on); customer `demo@bookly.test`. API:
`QUEUE_CONNECTION=sync php artisan serve --port=8000`; website: `VITE_API_BASE_URL=http://localhost:8000/api/v1 npx vite`.
Telegram without a real token: a stand-in `php -S 127.0.0.1:8099` script + `TELEGRAM_GATEWAY_TOKEN=fake
TELEGRAM_GATEWAY_URL=http://127.0.0.1:8099`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia; my portfolio/CV project, production grade). Frontend: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts; Telegram Gateway codes working).
Read first: both CLAUDE.md files, frontend README.md, docs/ROADMAP.md, docs/NEXT_STEP.md, docs/WORKLOG.md, design-system/bookly/MASTER.md; backend docs/WORKLOG.md, docs/API.md, docs/DEPLOYMENT.md.
Status: ROADMAP Phase 1 (sign-in) is done and merged. Railway is removed from the plan (we stay on Render).
Task: ROADMAP Phase 2 in order: Neon backups + restore drill, uptime monitor with Telegram alerts (also keeps Render awake), Telegram balance alert, Sentry source maps, preview CORS, chores. Stop and give me click-by-click steps whenever my accounts are needed.
Rules: important things first, follow ROADMAP order, tick items, never drop one unless I say so, add new gaps to the right phase. If unclear, ask me first (question tool with a recommended option). Small commits, human-style messages, no AI/tool names in git, commit as "danishsary" <187593185+danishsary8@users.noreply.github.com>, no Co-Authored-By or session trailers. One branch per piece of work (stack when needed); I merge — give me compare links, backend first. Never edit old migrations; ask before new ones. Don't change existing feature code beyond the plan without asking. No payment-provider work. Never ask me to paste secrets. Verify before every push: frontend lint, npx tsc -b, npx vitest run, build, Playwright browser pass (Chromium at /opt/pw-browsers/chromium); backend php artisan test + vendor/bin/pint. Check CI with the GitHub tools and fix failures. Update docs/WORKLOG.md, docs/ROADMAP.md, docs/NEXT_STEP.md. Keep answers short and step by step; end with "what was done / what's next" and the next session's prompt in chat.
```
