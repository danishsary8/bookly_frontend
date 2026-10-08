# Next step: merge Phase 1, switch on Telegram, decide the Railway move

Built this session (all four remaining Phase 1 items): connect / disconnect Google and Facebook, add or change the email
with a code, sign in with a phone number + Telegram code, admin closed accounts + reopen. Phase 2 started with the
Railway plan. **Everything still to do, in order, is in `docs/ROADMAP.md`.**

## Owner: merge, in this order (each branch builds on the one before)
1. Backend `bookly_backend_v2`: `fix/phone-sign-in-messages` → `fix/phone-code-limits` → `feature/phone-only-sign-up`.
2. Frontend: `fix/phone-sign-in-messages` → `feature/phone-only-sign-up`.
No migration. Merge the backend first. After Render redeploys: `/login/phone` with an unknown number says so, codes can be
asked for again without the "3 codes in the last hour" stop, and sign-up with Telegram leaves the email optional.

## Owner: switch on Telegram codes (if not done yet; never paste the token in chat)
1. https://gateway.telegram.org → **Log in to Start** → your Telegram number → confirm in the Telegram app.
2. **Settings** (API) → **Copy Token**.
3. Render → bookly API → **Environment** → add `TELEGRAM_GATEWAY_TOKEN` → **Save, rebuild and deploy**.
4. Check https://bookly-api-zasc.onrender.com/api/v1/auth/options shows `"telegram_codes":true`; sign up on the site
   with "Telegram" and **your own** number (free); the code arrives in Telegram's **Verification Codes** chat.
5. For other people's numbers: Gateway → funding page → **Add Funds on Fragment** (paid in TON, e.g. with Telegram's
   Wallet; ~$5 ≈ 500 codes).
Phone sign-in (`/login/phone`) and the phone as a way into the account switch on with the same token.

## Owner: decide the Railway move
Read `docs/RAILWAY_PLAN.md` in the backend repo (short) and answer its 5 decisions. Suggested: Hobby plan, keep Neon,
web + jobs + Redis, Brevo HTTP API, code emails stay immediate.

## Local testing
Demo staff `admin@bookly.test` / `staff@bookly.test` (2FA on); customer `demo@bookly.test`. API:
`QUEUE_CONNECTION=sync php artisan serve --port=8000`; website: `VITE_API_BASE_URL=http://localhost:8000/api/v1 npx vite`.
Telegram without a real token: a stand-in `php -S 127.0.0.1:8099` script + `TELEGRAM_GATEWAY_TOKEN=fake
TELEGRAM_GATEWAY_URL=http://127.0.0.1:8099`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia; my portfolio/CV project, production grade). Frontend: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts).
Read first: both CLAUDE.md files, frontend README.md, docs/ROADMAP.md, docs/NEXT_STEP.md, docs/WORKLOG.md, design-system/bookly/MASTER.md; backend docs/WORKLOG.md, docs/API.md, docs/RAILWAY_PLAN.md, docs/DEPLOYMENT.md.
Status: ROADMAP Phase 1 is done and merged (connect/disconnect Google & Facebook, add/change email with a code, phone + Telegram code sign-in, admin closed accounts + reopen, and the 2026-10-08 fixes: clear phone sign-in messages, no per-number code cap, phone-only sign-up). Telegram token [set / not set]. Railway decisions: [paste my answers to the 5 decisions in docs/RAILWAY_PLAN.md].
Task: ROADMAP Phase 2 in order. First the Railway move from docs/RAILWAY_PLAN.md: branches feature/brevo-api-mail, feature/railway-jobs, chore/railway-config (backend), then stop and give me click-by-click steps for my Railway/Brevo accounts, then do the full check with me and the switch. Then the rest of Phase 2 (Neon backups + restore drill, uptime monitor, Sentry source maps, preview CORS, chores).
Rules: important things first, follow ROADMAP order, tick items, never drop one, add new gaps to the right phase. If unclear, ask me first (question tool with a recommended option). Small commits, human-style messages, no AI/tool names in git, commit as "danishsary" <187593185+danishsary8@users.noreply.github.com>, no Co-Authored-By or session trailers. One branch per piece of work (stack when needed); I merge — give me compare links, backend first. Never edit old migrations; ask before new ones. Don't change existing feature code beyond the plan without asking. No payment-provider work. Never ask me to paste secrets. Verify before every push: frontend lint, npx tsc -b, npx vitest run, build, Playwright browser pass (Chromium at /opt/pw-browsers/chromium); backend php artisan test + vendor/bin/pint. Check CI with the GitHub tools and fix failures. Update docs/WORKLOG.md, docs/ROADMAP.md, docs/NEXT_STEP.md. Keep answers short and step by step; end with "what was done / what's next" and the next session's prompt in chat.
```
