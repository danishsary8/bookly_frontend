# Next step — Phase 5: account

Branch: `feature/account` (from `main` after `feature/customer-auth` is merged).

## Goal
The signed-in customer's own area, built on API v2 with the Phase 2 kit and Phase 4 forms.

| Route | Page | API |
| --- | --- | --- |
| `/account` | Overview: greeting, verified status, recent orders (3), quick links | `GET /me`, `GET /orders?per_page=3` |
| `/account/profile` | Name and phone (email shown, not editable) | `GET /me`, `PATCH /me` |
| `/account/security` | Change password (current + new + confirm); customers who signed up socially may have no password yet (`has_password`) | `PUT /me/password` |
| `/account/addresses` | Address book: list, add, edit, delete, set default; max 10 | `GET/POST/PATCH/DELETE /addresses` |
| `/account/wishlist` | Saved books grid, remove, add to cart | `GET /wishlist`, `DELETE /wishlist/{id}` |

## Notes
- Wrap the area in `RequireVerified` (signed in + verified) and give it a shared layout: side navigation on desktop, a tab strip on phones (`Tabs`), and the account links already in the header menu and footer.
- Forms: React Hook Form + Zod like Phase 4 (`applyApiErrors`, `FormAlert`, `TextField`, `SelectField`); mirror the backend rules in `bookly_backend_v2` (ProfileController, AddressController). Changing the password may revoke other tokens: check the API's response and keep this session working.
- Addresses: dialog form (`Dialog`), `ConfirmDialog` for delete, default badge, empty state; the same form is reused at checkout in Phase 6.
- After a profile change, refresh the stored session user (`updateSessionUser`) so the header greets the new name.
- Delete the V1 pages this replaces (`src/page/client/Profile.tsx`, `Favorites.tsx`) and redirect `/profile` → `/account/profile`, `/favorites` → `/account/wishlist`; remove their lint exceptions if nothing else needs them.
- Separate chore when convenient: upgrade Vitest to 5 for the `@vitest/mocker` advisory.

## Paste this into the next session
```
Project: Bookly Frontend V2 (React 19 + TS + Vite + Tailwind 4), repo danishsary8/bookly_frontend, upgrading V1 in place against the Laravel API v2 (live: https://bookly-api-zasc.onrender.com/api/v1; local: php artisan serve in bookly_backend_v2 with DemoSeeder data; local mail goes to storage/logs/laravel.log via the database queue).
Read first: CLAUDE.md, docs/V2_PLAN.md, docs/WORKLOG.md, docs/NEXT_STEP.md, design-system/bookly/MASTER.md (v3).
Status: Phases 0-4 merged (groundwork, typed API layer, UI kit + motion + site shell, storefront catalogue, customer auth: sign in/up with ?next=, email verification, password reset, route guards, session-expiry handling, React Hook Form + Zod).
Next: Phase 5 account on branch feature/account, as listed in docs/NEXT_STEP.md: account overview, profile, change password, address book, wishlist page, with a shared account layout behind RequireVerified. Rebuild and then delete the V1 Profile and Favorites pages. Ask me before any decision not covered by V2_PLAN or MASTER.
Rules: small commits, human-style messages, no AI/tool names anywhere in git; no payment-provider or social-login work; don't modify backend migrations or existing feature code without asking; I merge the PR myself. Verify with lint, typecheck, tests, build and a browser pass against the API before pushing. Update docs/WORKLOG.md as you go and docs/NEXT_STEP.md at the end.
Output: short "what was done / what's next" summary plus a paste-ready prompt for the next session.
```
