# Next step — turn on the new sign-in features, then Telegram codes and the library card

Built (each switched off until its keys exist, so merging changes nothing visible except the admin customer tabs):
AUTH_PLAN PR 1 unfinished sign-ups, PR 2 Cloudflare Turnstile, PRs 3–4 Google and Facebook sign-in.

## Owner: merge, in this order (each branch builds on the one before)
1. Backend `bookly_backend_v2`: `feature/unverified-signups`, then `feature/turnstile`.
2. Frontend: `feature/unverified-signups`, then `feature/turnstile`, then `feature/social-sign-in`.

## Owner: turn the features on (never paste keys in chat)
**A. Cloudflare Turnstile (10 min).** Set the Vercel key first: the website then sends tokens, and the API ignores them until it has its secret. Setting only the Render secret would block every sign-in.
1. dash.cloudflare.com → sign up / log in → **Turnstile** → **Add widget**.
2. Name `Bookly`; hostname `bookly-frontend-five.vercel.app`; widget mode **Managed**; pre-clearance **No** → Create.
3. Vercel → bookly-frontend → Settings → Environment Variables: `VITE_TURNSTILE_SITE_KEY` = the **Site key** → Redeploy.
4. Render → API → Environment: `TURNSTILE_SECRET_KEY` = the **Secret key** → Save, rebuild and deploy.
5. Check: sign in on the live site (usually nothing extra shows).

**B. Google (15 min).**
1. console.cloud.google.com → create project `Bookly`.
2. **Google Auth Platform** (or APIs & Services → OAuth consent screen) → Get started: app name `Bookly Shop`, support email = yours, audience **External**, contact email = yours → Create. If it asks for home page / privacy links and refuses the vercel.app address, leave them empty (not needed for name + email).
3. **Audience** → **Publish app**.
4. **Clients** → Create client → type **Web application**, name `Bookly website`; Authorised JavaScript origins: `https://bookly-frontend-five.vercel.app` and `http://localhost:5173` → Create → copy the **Client ID**.
5. Vercel: `VITE_GOOGLE_CLIENT_ID` = Client ID → Redeploy. Render: `GOOGLE_CLIENT_ID` = the same Client ID → deploy.

**C. Facebook (20 min).**
1. developers.facebook.com → My Apps → **Create app** → use case **Authenticate and request data from users with Facebook Login** → no business portfolio → name `Bookly Shop` → Create.
2. Use cases → Facebook Login → **Customize**: Permissions → add **email**; Settings → **Login with the JavaScript SDK: Yes**, Allowed domains for the JavaScript SDK: `https://bookly-frontend-five.vercel.app`.
3. App settings → **Basic**: Privacy policy URL `https://bookly-frontend-five.vercel.app/privacy`; Terms `…/terms`; **User data deletion** → Data deletion instructions URL `https://bookly-frontend-five.vercel.app/privacy#delete`; category Shopping; app icon 1024×1024 → Save. Copy **App ID** and **App secret** (Show).
4. Switch **App mode** to **Live** (top of the dashboard).
5. Vercel: `VITE_FACEBOOK_APP_ID` = App ID → Redeploy. Render: `FACEBOOK_CLIENT_ID` = App ID, `FACEBOOK_CLIENT_SECRET` = App secret → deploy.

**Check:** the sign-in page shows "Continue with Google / Facebook" above the email form; each signs you in. Admin → Customers shows the two tabs.

## Next session: AUTH_PLAN PRs 5–6 (owner approved: option A, migration OK, +855 only, no SMS)
- Backend `feature/telegram-codes`: new migration (`phone_e164` unique, `phone_verified_at`), libphonenumber, `OtpService` channels (email / Telegram Gateway `sendVerificationMessage` with our own code), register `verify_by`, resend by channel, `verify-phone`, limits (3/hour, 10/day per number), Turnstile on every send. Tests with the Gateway faked.
- Frontend `feature/telegram-codes`: the sign-up channel picker (email / Telegram radio cards), the **library card** on the verify step (lapis panel; name, where the code went, gold "Member" stamp on success; phone strip on small screens), "Send it by email instead", account **Sign-in & security** card (verify phone, connected Google/Facebook).
- Owner then: gateway.telegram.org → log in with Telegram → add balance ($5 ≈ 500 codes) → API token → Render `TELEGRAM_GATEWAY_TOKEN`.

## Later
- Owner's later list: a production-grade admin dashboard on real data (everything a real shop admin has), and stricter security around deleting anything (e.g. re-enter password / 2FA code, typed confirmation, admin-only, full audit trail).
- Owner's later list (after the important work): move the API from Render to **Railway** (owner has free credit there; no sleeping); and, as the very last project task, a full frontend redesign starting from the landing page.
- Phone performance above 90 would need pre-rendered HTML for the public pages (bigger change; decide later). Optional: per-book link previews, custom domain + shop email, analytics, Google Search Console with the sitemap.
- Let preview deployments call the API (CORS pattern for `bookly-frontend-*.vercel.app`; small backend change, owner decides).
- Card and KHQR stay "coming soon" until the owner gives payment API keys. Chore: Vitest 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on; secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia). Frontend V2: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live at https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md, docs/AUTH_PLAN.md (frontend), design-system/bookly/MASTER.md, and the backend's docs/WORKLOG.md and docs/API.md.
Status: AUTH_PLAN PRs 1–4 are merged (unfinished sign-ups, Turnstile, Google/Facebook sign-in); I've [done / not yet done] the key setup in docs/NEXT_STEP.md.
My AUTH_PLAN decisions: keep the order; 48h clean-up; Telegram option A (email still required); the new phone migration is OK; +855 numbers only; no SMS for now; Facebook links by email; library-card design approved.
Task: build AUTH_PLAN PRs 5–6 on branch feature/telegram-codes in both repos: Telegram Gateway verification codes (option A) and the library-card sign-up/verify screens, plus the account "Sign-in & security" card. Use /anthropic-skills:frontend-design for the UI and keep to MASTER v3. When you need the Telegram Gateway token, stop and give me click-by-click steps.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); never edit old migrations; don't change existing feature code beyond what the plan says without asking; I merge the PRs myself; never ask me to paste secrets in chat. Verify with lint, typecheck, tests, build and a browser pass before pushing (backend: php artisan test + pint). Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me short step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
