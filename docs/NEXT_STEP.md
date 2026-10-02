# Next step — Phase 4: customer auth

Branch: `feature/customer-auth` (from `main` after `feature/storefront-catalog` is merged).

## Goal
Customers can create an account, verify their email, sign in and out, and reset a forgotten password on API v2, so the header, cart drawer, add-to-cart and wishlist (already built on the V2 session) light up.

| Route | Page | API |
| --- | --- | --- |
| `/register` | Sign up (name, email, password + confirm, optional phone) | `POST /auth/register` |
| `/verify-email` | 6-digit code (OtpInput), resend with cooldown | `POST /auth/verify-email`, `/auth/resend-verification` |
| `/login` | Email + password, `?next=` return path, social buttons shown as "coming soon" | `POST /auth/login` |
| `/forgot-password`, `/reset-password` | Code by email, then new password | `POST /auth/forgot-password`, `/auth/reset-password` |
| — | Protected-route wrapper for `/account/*`, `/checkout` (redirect to `/login?next=`) | session |
| — | Session expiry: on `bookly:session-expired`, toast + sign-in prompt | client event |

## Notes
- React Hook Form + Zod (owner decision); rules mirror the API (see `bookly_backend_v2` validation); 422 field errors map onto fields (`ApiError.field()`), 429 shows Retry-After.
- `authApi` in `src/api/endpoints/auth.ts` already stores the session; reuse `AuthShell` styling but rebuild the V1 auth pages (`src/page/client/Authentication.tsx`, `OtpVerification`, `ForgotPassword`, `ResetPassword`, `src/components/Authentication/**`) and delete them with their `eslint.config.js` entries, plus V1 `lib/session.ts`/`services` pieces nothing else uses.
- Respect `?next=` (only same-site paths) after login and registration. The catalogue already sends signed-out visitors to `/login?next=…`.
- Unverified accounts: the API returns `email_unverified` on some actions; route them to `/verify-email`.
- Separate chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3).
Status: Phases 0-3 merged (groundwork, typed API layer, UI kit + motion + site shell, storefront catalogue: Home, /books, /search, book page, authors, series, categories, publishers, recently viewed). /ui-kit in dev shows every component.
Next: Phase 4 customer auth on branch feature/customer-auth, as listed in docs/NEXT_STEP.md: register, verify email, login (with ?next=), logout, forgot/reset password, protected routes, session-expiry handling, with React Hook Form + Zod. Rebuild and then delete the V1 auth pages. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider or social-login work (buttons say "coming soon"); don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
