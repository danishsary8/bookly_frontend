# Next step — set up error reporting, then real shop details

The site is live at https://bookly-frontend-five.vercel.app. The code for friendly errors and reporting is done; the owner connects the accounts below. Next code branch: `chore/shop-details` (from `main`).

## Owner setup for error reporting (after merging both PRs)
Merge the backend PR (`bookly_backend_v2`, `fix/signup-email`) and the frontend PR (`feature/error-reporting`). Never paste keys or tokens in chat.

**1. Sentry (free)**
1. Sign up at sentry.io → create a project, platform **React**, name `bookly-frontend`. Copy its **DSN**.
2. Create a second project, platform **Laravel**, name `bookly-api`. Copy its DSN.
3. Vercel → bookly-frontend → Settings → Environment Variables: `VITE_SENTRY_DSN` = the React DSN (Production).
4. Render → API service → Environment: `SENTRY_LARAVEL_DSN` = the Laravel DSN.
5. Optional (readable stack traces): Sentry → Settings → Auth Tokens → create one with release and source-map rights; in Vercel add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` (your org slug), `SENTRY_PROJECT` = `bookly-frontend`.

**2. Telegram bot**
1. In Telegram, message **@BotFather** → `/newbot` → follow the steps → copy the **bot token**.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` in the browser and copy `"chat":{"id": …}` (your chat id).
3. Vercel → Environment Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

**3. Connect Sentry to the Telegram function**
1. Sentry → Settings → Developer Settings → **Custom Integrations → Create New Integration → Internal Integration**, name `Telegram`.
2. Webhook URL: `https://bookly-frontend-five.vercel.app/api/sentry-alert`; turn on **Alert Rule Action**; under Webhooks tick **issue**; permissions: Issue & Event = Read. Save, then copy the **Client Secret**.
3. Vercel → Environment Variables: `SENTRY_WEBHOOK_SECRET` = that client secret. Redeploy the frontend.
4. Sentry → Alerts → create an issue alert for each project: "A new issue is created" → action "Send a notification via Telegram (integration)".

**4. Email (if not done)** Render → Environment → Brevo SMTP as in the backend's DEPLOYMENT.md ("Email on Render"), then redeploy.

**Check:** register with a new email (the code arrives); open `https://bookly-frontend-five.vercel.app/books/999999999` while the API is up: nothing technical on screen. To test the alert, trigger a test error from Sentry's project settings or wait for a real one; a Telegram message should arrive within a minute.

## Later
- Real contact details, delivery fees and areas, reviewed privacy / terms in `src/content/shop.ts`; then remove the placeholder and draft markers.
- Phone performance above 90 would need pre-rendered HTML for the public pages (bigger change; decide later). Optional: per-book link previews, custom domain, analytics, Google Search Console with the sitemap.
- Let preview deployments call the API (CORS pattern for `bookly-frontend-*.vercel.app`; small backend change, owner decides).
- Card and KHQR stay "coming soon" until the owner gives payment API keys. Chore: Vitest 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on; secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app on the Laravel API v2 (repo danishsary8/bookly_backend_v2; live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve with DemoSeeder data, Vite with VITE_API_BASE_URL=http://localhost:8000/api/v1).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md.
Status: V2 is live; friendly errors + Sentry/Telegram reporting merged; I did the owner setup in docs/NEXT_STEP.md (tell me if anything there looks unconnected).
Next: on branch chore/shop-details, put in the real shop details I send you (contact, delivery fees and areas, reviewed privacy/terms in src/content/shop.ts) and remove the placeholder and draft markers. If I haven't sent them yet, ask me for them first, as a short checklist.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PRs myself; never ask me to paste secrets in chat. Verify with lint, typecheck, tests, build and a browser pass before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me short step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
