# Bookly Frontend V2 — plan

V2 upgrades this app (V1, written for the old PHP API) to the Laravel **Bookly API v2**
(`https://bookly-api-zasc.onrender.com/api/v1`, reference at `/docs`, source: `bookly_backend_v2`).

## Decisions (owner, 2026-10-02)

| Topic | Decision |
| --- | --- |
| Approach | Upgrade V1 in place in this repo; keep what is good, rebuild every page against V2 |
| Design | Keep **Lapis & Vermilion** (`design-system/bookly/MASTER.md`), refine spacing and motion |
| Data | TanStack Query + TypeScript types generated from the API's `openapi.yaml` |
| Forms | React Hook Form + Zod (rules mirror the API's validation) |
| Motion | Motion (Framer) + copy-in reactbits.dev components, used sparingly; GSAP removed |
| Extras | USD / KHR price toggle · slide-out cart drawer · recently viewed books |
| Admin | Full staff/admin panel in the same app under `/admin`, built after the storefront |
| Hosting | Vercel (free); `CORS_ALLOWED_ORIGINS` on the API set to the Vercel URL |
| Tests | Vitest (unit) + Playwright smoke flows in CI |
| Later | Google/Facebook login and online payments (Stripe, PayPal, Bakong) when keys exist; buttons appear as "coming soon" |
| Workflow | One phase per branch and pull request; the owner merges before the next phase starts |

## Phases

| # | Branch | Scope |
| --- | --- | --- |
| 0 | `chore/v2-groundwork` | Remove dead code and old docs, lint clean, dependency updates, Vitest, CI, `.env.example`, this plan |
| 1 | `feature/api-layer` | Axios client for V2 (Bearer token, 401/403/422/429 handling, `X-Request-Id`), generated API types, TanStack Query, auth store for customers and staff, currency store, error mapping |
| 2 | `feature/ui-kit-motion` | Design system v3 refinements, UI kit (buttons, inputs, select, dialog, drawer, tabs, badges, pagination, skeletons, toasts, empty/error states), motion presets, page transitions, reactbits effects, error boundary, layout shell (header, mega menu, search, footer, mobile nav) |
| 3 | `feature/storefront-catalog` | Home, catalogue, search, book detail, author, series, categories, publishers, recently viewed |
| 4 | `feature/customer-auth` | Register, verify email, login, logout, forgot and reset password, protected routes |
| 5 | `feature/account` | Account overview, profile, password, addresses, wishlist |
| 6 | `feature/cart-checkout` | Cart page and drawer, coupon, checkout (address, cash on delivery, review), order confirmation |
| 7 | `feature/orders-returns-reviews` | Orders, order detail with timeline, cancel, returns, write/edit/delete reviews |
| 8 | `feature/content-pages` | About, FAQ, Shipping & delivery, Returns policy, Privacy, Terms, Contact, 404, 500, offline |
| 9 | `feature/admin-panel` | Staff auth with 2FA and every staff/admin screen (see below) |
| 10 | `feature/launch` | Accessibility pass, SEO (titles, meta, Open Graph, sitemap, robots), performance and bundle split, Playwright smoke tests, Vercel deploy, CORS on the API, README with screenshots |

Remaining V1-only files are listed in `eslint.config.js` (temporary lint exceptions). Each phase deletes the
V1 files it replaces and their entries there.

## Page inventory → API

### Storefront (public)
| Route | Page | API |
| --- | --- | --- |
| `/` | Home: hero, new arrivals, best rated, categories, series spotlight, authors, recently viewed | `GET /books` (sort newest, rating), `/categories`, `/series`, `/authors` |
| `/books` | Catalogue with filters (category, author, series, publisher, format, language, price, in stock), sort, pagination, URL-synced | `GET /books`, `/categories`, `/publishers` |
| `/search?q=` | Search results (full-text, relevance) + header live search | `GET /books?q=&sort=relevance` |
| `/books/:id` | Detail: format picker, price USD/KHR, stock, add to cart, wishlist, description, details, series, reviews with rating summary, related books | `GET /books/{id}`, `/books/{id}/reviews`, `/books?author_id=`, `/series/{id}` |
| `/authors`, `/authors/:id` | Authors index, author page with books | `GET /authors`, `/authors/{id}`, `/books?author_id=` |
| `/series`, `/series/:id` | Series index, series in reading order | `GET /series`, `/series/{id}` |
| `/categories/:slug` | Category landing | `GET /categories`, `/books?category_id=` |
| `/publishers/:id` | Publisher landing | `GET /publishers`, `/books?publisher_id=` |

### Customer
| Route | Page | API |
| --- | --- | --- |
| `/register` | Sign up | `POST /auth/register` |
| `/verify-email` | 6-digit code, resend | `POST /auth/verify-email`, `/auth/resend-verification` |
| `/login` | Log in (social buttons "coming soon") | `POST /auth/login` |
| `/forgot-password`, `/reset-password` | Code by email, new password | `POST /auth/forgot-password`, `/auth/reset-password` |
| `/account` | Overview | `GET /me`, `/orders` |
| `/account/profile`, `/account/security` | Name/phone, change password | `PATCH /me`, `PUT /me/password` |
| `/account/addresses` | Address book (max 10, default) | `GET/POST/PATCH/DELETE /addresses` |
| `/account/wishlist` | Saved books | `GET/POST/DELETE /wishlist` |
| `/account/orders`, `/account/orders/:id` | History, detail, timeline, cancel, return | `GET /orders`, `/orders/{id}`, `POST /orders/{id}/cancel`, `GET /orders/{id}/returnable-items`, `POST /orders/{id}/returns` |
| `/account/returns`, `/account/returns/:id` | Returns, withdraw | `GET /returns`, `/returns/{id}`, `DELETE /returns/{id}` |
| `/account/reviews` | My reviews, edit, delete | `GET /reviews`, `PATCH/DELETE /reviews/{id}`, `POST /books/{id}/reviews` |
| `/cart` + drawer | Lines, issues, quantity, remove, coupon check | `GET/DELETE /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/{id}`, `POST /cart/coupon/check` |
| `/checkout` | Address, delivery, payment (COD; others "coming soon"), review, totals | `POST /checkout/preview`, `POST /checkout` (Idempotency-Key) |
| `/checkout/success/:id` | Confirmation | `GET /orders/{id}` |

### Staff / admin (`/admin`)
| Route | Page | API |
| --- | --- | --- |
| `/admin/login`, 2FA setup, 2FA challenge, forgot/reset | Staff auth | `/staff/auth/*` |
| `/admin` | Dashboard: revenue, orders, best sellers, low stock, sales chart | `/staff/dashboard/summary`, `/staff/dashboard/sales` |
| `/admin/books`, `/admin/books/:id` | Books list, create/edit, formats/stock, delete/restore | `/staff/books*`, `/staff/variants/{id}` |
| `/admin/authors`, `categories`, `publishers`, `series` | Lookup management | `/staff/authors`, `/staff/categories`, `/staff/publishers`, `/staff/series` |
| `/admin/orders`, `/admin/orders/:id` | Orders, status changes, CSV export | `/staff/orders*`, `/staff/orders/export` |
| `/admin/returns` | Approve, reject, refund | `/staff/returns*` |
| `/admin/reviews` | Hide / show | `/staff/reviews*` |
| `/admin/coupons` | Coupon CRUD | `/staff/coupons*` |
| `/admin/customers`, `/:id` | Lookup, stats, deactivate | `/staff/customers*` |
| `/admin/staff` | Invite, roles, deactivate, reset 2FA | `/staff/members*` |
| `/admin/exchange-rates` | USD→KHR rate | `/staff/exchange-rates` |
| `/admin/audit-log` | Change history | `/staff/audit-logs` |
| Header bell | Low-stock notifications | `/staff/notifications*` |

## Quality bar (every phase)
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass, plus a runtime check of the changed pages
in a browser against the API (see `CLAUDE.md`). WCAG AA contrast, keyboard access, visible focus, reduced-motion
support, no layout shift from loading states.
