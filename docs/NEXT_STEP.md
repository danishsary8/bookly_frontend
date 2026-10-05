# Next step — go live

Branch: `chore/go-live` (from `main` after `feature/launch` is merged). Most of this needs the owner's accounts or decisions; the code is ready.

## Goal
Put Bookly online and replace the placeholders.

| Step | Who | Work |
| --- | --- | --- |
| Vercel | owner + session | Import `danishsary8/bookly_frontend` in Vercel (framework: Vite). Environment: `VITE_API_BASE_URL=https://bookly-api-zasc.onrender.com/api/v1`, `VITE_SITE_URL=<the Vercel or custom domain>`. Preview deploys per branch come for free. |
| CORS | owner (Render) | Add the Vercel domain (and the preview pattern if wanted) to `CORS_ALLOWED_ORIGINS` on the live API, then redeploy. No code change. |
| Check live | session | Run `npm run e2e` with `E2E_BASE_URL=<site>` and `E2E_API_URL=<live API>` (a11y spec; the smoke spec only with test accounts on the live API), Lighthouse on home, catalogue and a book page (phone), and confirm `robots.txt`, `sitemap.xml` and the share card. |
| Shop details | owner | Real contact details, delivery fees and areas, and reviewed privacy / terms in `src/content/shop.ts`; then remove the placeholder and draft markers. |
| Optional | owner decides | Per-book link previews (pre-render or a Vercel edge function for `/books/:id`); custom domain; analytics. |

## Notes
- Card and KHQR stay "coming soon"; no payment-provider work until the owner gives API keys.
- Chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.
- Local testing: demo staff are `admin@bookly.test` / `staff@bookly.test` with a known local test password and 2FA on (secrets in the session scratchpad); customer `demo@bookly.test`. Start Vite with `VITE_API_BASE_URL=http://localhost:8000/api/v1`. E2E: see README → Testing.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, on the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data, Vite with VITE_API_BASE_URL=http://localhost:8000/api/v1).
Read first: CLAUDE.md, README.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md.
Status: Phases 0-10 merged (storefront, account, cash-on-delivery checkout, orders/returns/reviews, content pages, full staff admin, performance, SEO, accessibility fixes, Playwright smoke + axe tests, README).
Next: go live on branch chore/go-live, as listed in docs/NEXT_STEP.md: Vercel project and env vars, CORS on the live API, checks against the live site (e2e a11y, Lighthouse, robots/sitemap/share card), then real shop details when I provide them. Ask me before using my Vercel or Render accounts and before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git (commit as git user "danishsary" <187593185+danishsary8@users.noreply.github.com>; GitHub rejects my private email); no payment-provider work (card and KHQR stay "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
