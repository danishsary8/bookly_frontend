# Next step — owner decides on the sign-in plan, then build it PR by PR

Read `docs/AUTH_PLAN.md` and answer the checklist at its end. The first PR (unfinished sign-ups) needs no accounts or keys, so it can start as soon as the order and the clean-up time are decided.

## Next session (after the owner answers)
Build PR 1 from `docs/AUTH_PLAN.md`: "Unfinished sign-ups".
- Backend (`bookly_backend_v2`, branch `feature/unverified-signups`): signing up again over an account that was never verified replaces it (new code, old sessions and codes cancelled); command `customers:prune-unverified` (unverified, older than the owner's chosen hours, no orders/addresses/reviews, force delete) run on sign-up and from the staff customer list at most hourly; staff list defaults to verified with a count of unverified. Tests for each.
- Frontend (branch `feature/unverified-signups`): admin Customers gets tabs "Verified (n)" / "Not verified yet (n)" with a "Removed in …" badge; register page handles the re-sign-up answer.
- Then move to PR 2 (Turnstile) with click-by-click steps for the owner's Cloudflare account.

## Later
- Phone performance above 90 would need pre-rendered HTML for the public pages (bigger change; decide later). Optional: per-book link previews, custom domain + shop email, analytics, Google Search Console with the sitemap.
- Let preview deployments call the API (CORS pattern for `bookly-frontend-*.vercel.app`; small backend change, owner decides).
- Card and KHQR stay "coming soon" until the owner gives payment API keys. Chore: Vitest 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on; secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia). Frontend V2: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live at https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md, docs/AUTH_PLAN.md (frontend), design-system/bookly/MASTER.md, and the backend's docs/WORKLOG.md and docs/API.md.
My answers to the AUTH_PLAN checklist: [paste your answers here].
Task: build the PRs from docs/AUTH_PLAN.md in the order I chose, starting with the first one, one PR per branch, both repos where needed. Keep the UI to MASTER v3 and the plan's screens (use /anthropic-skills:frontend-design for UI work). When a step needs an account or key from me, stop and give me short click-by-click steps.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); new migrations only with my OK and never edit old ones; don't change existing feature code beyond what the plan says without asking; I merge the PRs myself; never ask me to paste secrets in chat. Verify with lint, typecheck, tests, build and a browser pass before pushing (backend: php artisan test + pint). Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me short step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
