# Next step — finish going live

Branch: `chore/go-live-checks` (from `main` after `chore/go-live` is merged). The code is ready; three owner steps come first, then a session checks the live site.

## Owner steps (in this order)

**1. Vercel: set the variables and redeploy** (project `bookly-frontend` already exists)
1. Open vercel.com → project **bookly-frontend** → **Settings → Environment Variables**.
2. Add `VITE_API_BASE_URL` = `https://bookly-api-zasc.onrender.com/api/v1` (Production and Preview).
3. Open **Settings → Domains** and copy the production address (for example `https://bookly-frontend.vercel.app`).
4. Add `VITE_SITE_URL` = that address, no trailing slash (Production only).
5. **Settings → Git**: check the connected repository is `danishsary8/bookly_frontend` and the production branch is `main`.
6. **Deployments** → newest `main` deployment → **⋯ → Redeploy** (variables only apply to new builds).

**2. Render: allow the site to call the API**
1. Open dashboard.render.com → the API service → **Environment**.
2. Set `CORS_ALLOWED_ORIGINS` to the Vercel address from step 1.3 (comma-separate more than one; keep `http://localhost:5173` for local work), e.g. `https://bookly-frontend.vercel.app,http://localhost:5173`.
3. **Save, rebuild, and deploy**, wait until it's live, then open the site: books should load.

**3. Let the next session reach the live site**
1. In the Claude Code session, open the cloud environment menu in the title bar → **Edit** → **Network access**.
2. Choose **Custom**, keep the default package-manager list, and add `bookly-frontend.vercel.app` (your domain from step 1.3) and `bookly-api-zasc.onrender.com` under Allowed domains.
3. Optional: in Claude settings → Connectors → Vercel, reconnect and allow the **danishs-projects** team, so a session can read deployments and set variables itself.

## Then the session checks (go-live checks)
- `robots.txt`, `sitemap.xml` (books, authors, series… listed), share card (`og:image` absolute), security and cache headers.
- `E2E_BASE_URL=<site> E2E_API_URL=<live API> npx playwright test e2e/a11y.spec.ts` (the smoke spec only with test accounts on the live API).
- Lighthouse (phone) on home, catalogue and a book page; fix anything below 90.
- Sign in, cart, checkout on the live site by hand once.

## Later
- Owner's plan (do later): friendlier failure screens and error reporting. Customers never see technical wording (no "API server is unavailable"); they see a calm, familiar message such as "Something went wrong on our side. Please try again in a moment." with Try again, and the shop keeps working where it can. Developers get the details instead: errors from the browser (and the API) are sent with the page, request, status, request id and stack to a place they watch (e.g. Sentry, or a Telegram bot for alerts), so they know what broke and where to fix it.
- Real contact details, delivery fees and areas, reviewed privacy / terms in `src/content/shop.ts`; then remove the placeholder and draft markers.
- Optional: per-book link previews (pre-render or an edge function), custom domain, analytics, Google Search Console with the sitemap.
- Card and KHQR stay "coming soon" until the owner gives payment API keys. Chore: Vitest 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, on the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data, Vite with VITE_API_BASE_URL=http://localhost:8000/api/v1).
Read first: CLAUDE.md, README.md, docs/WORKLOG.md, docs/NEXT_STEP.md.
Status: everything through go-live code is merged. I have done the owner steps in docs/NEXT_STEP.md (Vercel variables + redeploy, Render CORS, network access for the live hosts). Live site: <PASTE YOUR VERCEL ADDRESS>.
Next: go-live checks on branch chore/go-live-checks, as listed in docs/NEXT_STEP.md: robots/sitemap/share card/headers, e2e a11y against the live site, Lighthouse on phone for home, catalogue and a book page (fix anything under 90), one manual sign-in → cart → checkout. Then, when I send them, put the real shop details in. Ask me before using my Vercel or Render accounts and before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>); no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end. If something needs me, give me step-by-step instructions.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
