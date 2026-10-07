# Next step — merge, switch on Telegram codes, then finish Phase 1

Built: AUTH_PLAN PRs 5–6 (Telegram codes, library card, Facebook phone step, Sign-in & security) and "Delete my account".
**Everything still to do, in order, is in `docs/ROADMAP.md`.** Keep it updated; nothing on it may be dropped.

## Owner: merge, in this order (each branch builds on the one before)
1. Backend `bookly_backend_v2`: `feature/telegram-codes`, then `feature/delete-account`. Render runs the new migration by itself.
2. Frontend: `feature/telegram-codes`, then `feature/delete-account`.
Until the Telegram token is set, sign-up works exactly as before (email codes; no Telegram choice shown).

## Owner: switch on Telegram codes (10 min, ~$0.01 per code; never paste the token in chat)
1. Open https://gateway.telegram.org → **Log in** with your Telegram phone number.
2. Add a small balance (e.g. $5 ≈ 500 codes).
3. Open the **API** page → copy the **token**.
4. Render → bookly API → **Environment** → add `TELEGRAM_GATEWAY_TOKEN` = the token → Save, rebuild and deploy.
5. Check: https://bookly-api-zasc.onrender.com/api/v1/auth/options shows `"telegram_codes":true`, then sign up on the site with "Telegram" and your number: the code arrives in Telegram's **Verification Codes** chat.

## Next session: the rest of ROADMAP Phase 1
- Connect / disconnect Google and Facebook in Sign-in & security (never remove the last way in).
- Add or change the email from the account (code to the new address).
- Sign in with phone number + Telegram code.
- Admin: list closed accounts and reopen one within its 30 days (audit-logged).
Then Phase 2 starts with the Railway move.

## Later
See `docs/ROADMAP.md` (phases 1–7, redesign last). Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia; portfolio project). Frontend V2: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live at https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md, docs/ROADMAP.md, docs/AUTH_PLAN.md (frontend), design-system/bookly/MASTER.md, and the backend's docs/WORKLOG.md and docs/API.md.
Status: AUTH_PLAN PRs 1–6 and "Delete my account" are merged (Turnstile, Google sign-in, Telegram codes, library card, Facebook phone step, Sign-in & security); Telegram token [set / not set yet]. docs/ROADMAP.md is my full ordered to-do list: follow its order, important things first, tick items as they're done, never drop one, and add any new small gap you find to the right phase.
My rules for sign-in: Google/Facebook never sign in to an email that already has a verified account; new Facebook sign-ups give a +855 phone number and the email is optional; +855 only; no SMS for now.
Task: finish ROADMAP Phase 1 in both repos, one small branch per item: (1) connect / disconnect Google and Facebook in Sign-in & security (never remove the last way in), (2) add or change the email from the account with a code to the new address, (3) sign in with phone number + Telegram code, (4) admin: list closed accounts and reopen one within its 30 days (audit-logged). Then start Phase 2 by planning the Railway move (stop and give me click-by-click steps when you need my accounts). Use /anthropic-skills:frontend-design for UI and keep to MASTER v3.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>, no Co-Authored-By or session trailers); no payment-provider work (card and KHQR stay "coming soon"); never edit old migrations, and ask before any new one; don't change existing feature code beyond the plan without asking; if anything is unclear, ask me first; I merge the PRs myself (give me compare links); never ask me to paste secrets in chat. Verify with lint, typecheck, tests, build and a browser pass before pushing (backend: php artisan test + pint). Update docs/WORKLOG.md and docs/ROADMAP.md as you go and docs/NEXT_STEP.md at the end. Keep answers short; if something needs me, give short step-by-step instructions.
Output: short "what was done / what's next" summary plus the next session's prompt, written in chat.
```
