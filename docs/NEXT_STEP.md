# Next step — friendly error screens and error reporting

Branch: `feature/error-reporting` (from `main` after `chore/go-live-checks` is merged). The site is live at https://bookly-frontend-five.vercel.app.

## Owner checks on the live site (5 minutes, after merging)
Vercel deploys `main` by itself now. Once the new deployment says **Ready**:
1. Open https://bookly-frontend-five.vercel.app/robots.txt: it should end with `Sitemap: https://bookly-frontend-five.vercel.app/sitemap.xml`.
2. Open that sitemap link: it should list `/books/…`, `/authors/…`, `/series/…` pages from the live catalogue.
3. Paste the site address into a Telegram or Facebook chat: the preview card should show the blue "Books delivered across Cambodia" image.
4. Sign in as a customer, add a book to the cart and place a cash-on-delivery order, then open it in the admin and move it to Processing.
5. Optional: Chrome DevTools → Lighthouse → Mobile → Analyze on the home page (expect about 75–80 on phone, about 100 on desktop; this session measured those on a production build).

## Goal (owner's plan)
Customers never see technical wording; developers get the details.
- **Customers**: calm, familiar messages wherever a request fails, e.g. "Something went wrong on our side. Please try again in a moment." with **Try again**; "You're offline" stays; pages keep working where they can (e.g. the cart still opens). Review every error state and toast for leftover technical text.
- **Developers**: browser errors and failed API calls (5xx, network, crashes caught by the error boundary) are reported with page, action, request, status, the API's request id and the stack, so it's clear what broke and where.

## Decide first (ask the owner)
- Where reports go: **Sentry** (free plan; grouping, stack traces with source maps, alerts by email) or a **Telegram bot** (instant message to a chat; simple, but no grouping), or both (Sentry for details + Telegram alert for new issues). The API already has Sentry support (backend Phase 7), so Sentry on both sides is the natural fit.
- The owner creates the Sentry project / Telegram bot and puts the key or token in Vercel's environment variables; never in chat or in git.

## Later
- Real contact details, delivery fees and areas, reviewed privacy / terms in `src/content/shop.ts`; then remove the placeholder and draft markers.
- Phone performance above 90 would need pre-rendered HTML for the public pages (bigger change; decide later). Optional: per-book link previews, custom domain, analytics, Google Search Console with the sitemap.
- Let preview deployments call the API (CORS pattern for `bookly-frontend-*.vercel.app`; small backend change, owner decides).
- Card and KHQR stay "coming soon" until the owner gives payment API keys. Chore: Vitest 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on; secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app on the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data, Vite with VITE_API_BASE_URL=http://localhost:8000/api/v1).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md.
Status: V2 is complete and live (go-live checks merged).
Next: friendly error screens and error reporting on branch feature/error-reporting, as in docs/NEXT_STEP.md. First ask me where reports should go (Sentry, Telegram bot, or both) and give me step-by-step instructions for creating the account/bot and adding its key to Vercel; never ask me to paste secrets in chat. Then: customer-facing messages with no technical wording, and developer reports with page, request, status, request id and stack. Ask me before using my Vercel or Render accounts and before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me short step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
