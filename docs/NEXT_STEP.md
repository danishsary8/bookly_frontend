# Next step — Telegram codes and the library card (AUTH_PLAN PRs 5–6)

Live and working: unfinished sign-ups (48h clean-up), Cloudflare Turnstile, Google sign-in (Facebook keys optional), detailed Sentry → Telegram alerts.
**Everything still to do, in order, is in `docs/ROADMAP.md`.** Keep it updated; nothing on it may be dropped.

## Next session: AUTH_PLAN PRs 5–6 (owner approved: option A, migration OK, +855 only, no SMS)
- Backend `feature/telegram-codes`: new migration (`phone_e164` unique, `phone_verified_at`), libphonenumber, `OtpService` channels (email / Telegram Gateway `sendVerificationMessage` with our own code), register `verify_by`, resend by channel, `verify-phone`, limits (3/hour, 10/day per number), Turnstile on every send. Tests with the Gateway faked.
- Frontend `feature/telegram-codes`: the sign-up channel picker (email / Telegram radio cards), the **library card** on the verify step (lapis panel; name, where the code went, gold "Member" stamp on success; phone strip on small screens), "Send it by email instead", account **Sign-in & security** card (verify phone, connected Google/Facebook).
- Owner then: gateway.telegram.org → log in with Telegram → add balance ($5 ≈ 500 codes) → API token → Render `TELEGRAM_GATEWAY_TOKEN`.

## Later
See `docs/ROADMAP.md` (phases 1–7, redesign last). Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia). Frontend V2: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live at https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md, docs/ROADMAP.md, docs/AUTH_PLAN.md (frontend), design-system/bookly/MASTER.md, and the backend's docs/WORKLOG.md and docs/API.md.
Status: AUTH_PLAN PRs 1–4 are merged and live (unfinished sign-ups, Turnstile, Google sign-in); Sentry → Telegram alerts work. docs/ROADMAP.md is my full ordered to-do list: follow its order, tick items as they're done, never drop one.
My AUTH_PLAN decisions: keep the order; 48h clean-up; Telegram option A (email still required); the new phone migration is OK; +855 numbers only; no SMS for now; Facebook links by email; library-card design approved.
Task: build AUTH_PLAN PRs 5–6 on branch feature/telegram-codes in both repos: Telegram Gateway verification codes (option A) and the library-card sign-up/verify screens, plus the account "Sign-in & security" card and self-service "delete my account" (ROADMAP phase 1). Use /anthropic-skills:frontend-design for the UI and keep to MASTER v3. When you need the Telegram Gateway token, stop and give me click-by-click steps.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); never edit old migrations; don't change existing feature code beyond what the plan says without asking; I merge the PRs myself; never ask me to paste secrets in chat. Verify with lint, typecheck, tests, build and a browser pass before pushing (backend: php artisan test + pint). Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me short step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
