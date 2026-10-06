# Next step — plan the sign-in and account upgrades (planning only)

The site is live at https://bookly-frontend-five.vercel.app with the real shop details, per-area delivery fees and a 3-day return window (after the owner merges `chore/shop-details` here and `feature/delivery-areas` in the backend). Error reporting (Sentry → Telegram) and sign-up email (Brevo) work.

## Owner, after merging both PRs (5 minutes)
1. Merge the **backend** PR first (`bookly_backend_v2`, `feature/delivery-areas`), then the frontend PR (`chore/shop-details`). Either order works, but backend first means checkout shows the area label straight away.
2. Render → API service → **Environment**: if `SHIPPING_FLAT_FEE` or `RETURN_WINDOW_DAYS` are there, delete them (the new defaults are $1.50 / $3.00 and 3 days). Optional: `SHIPPING_FEE_PHNOM_PENH`, `SHIPPING_FEE_PROVINCES` to change the fees later without code. Save, rebuild and deploy.
3. Check: on the live site, open Contact (your details, "Online only"), Shipping ($1.50 / $3.00), then go to checkout with a Phnom Penh address ($1.50) and a provinces address ($3.00).
4. When the shop has its own email, change `contact.email` in `src/content/shop.ts` (and the Brevo sender).

## Next session: analyse and plan, no code
The owner wants these, and will decide the order after seeing a plan:
- Verification by email **or** a 6-digit code by phone / Telegram.
- Customers who haven't verified don't appear in the admin's customer list (and are cleaned up after a while).
- Sign in with Google and Facebook (the buttons already exist in the UI as "coming soon"; the backend has `GOOGLE_CLIENT_*` / `FACEBOOK_CLIENT_*` settings).
- Cloudflare protection for sign-in and sign-up (e.g. Turnstile against bots).
- More to come from the owner.

For each: what it needs (accounts, keys, costs: SMS and Telegram gateways, Cloudflare), backend vs frontend work, risks (account takeover, linking a Google account to an existing email, phone numbers in Cambodia), and a suggested order in small PRs. Write it as `docs/AUTH_PLAN.md` in the frontend repo and ask the owner to choose.

## Later
- Phone performance above 90 would need pre-rendered HTML for the public pages (bigger change; decide later). Optional: per-book link previews, custom domain + shop email, analytics, Google Search Console with the sitemap.
- Let preview deployments call the API (CORS pattern for `bookly-frontend-*.vercel.app`; small backend change, owner decides).
- Card and KHQR stay "coming soon" until the owner gives payment API keys. Chore: Vitest 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff `admin@bookly.test` / `staff@bookly.test` (local test password, 2FA on; secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: README → Testing.

## Paste this into the next session
```
Project: Bookly (online bookshop, Cambodia). Frontend V2: React 19 + TS + Vite + Tailwind 4, repo danishsary8/bookly_frontend, live at https://bookly-frontend-five.vercel.app. Backend: Laravel API v2, repo danishsary8/bookly_backend_v2, live at https://bookly-api-zasc.onrender.com/api/v1 (Render free + Neon Postgres; email via Brevo SMTP; Sentry → Telegram alerts).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md (frontend), and the backend's docs/WORKLOG.md and docs/API.md.
Status: shop details, per-area delivery fees ($1.50 Phnom Penh / $3.00 provinces) and the 3-day return window are merged and live.
Task (planning only, no code): act as a senior engineer and analyse how to add (1) verification by email OR a 6-digit code by phone/Telegram, (2) unverified customers kept out of the admin customer list and cleaned up, (3) sign in with Google and Facebook, (4) Cloudflare protection (Turnstile) on sign-in/sign-up. Read the current auth code in both repos first. For each: what I must set up (accounts, keys, monthly cost), backend and frontend changes, security risks, and a suggested order as small PRs. Write it to docs/AUTH_PLAN.md on branch docs/auth-plan, push, and give me a short summary with the decisions I need to make (as a checklist). I may add more features to the list.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PRs myself; never ask me to paste secrets in chat. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me short step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
