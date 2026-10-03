# Frontend V2 — worklog

## Phase 0 — Groundwork (branch `chore/v2-groundwork`)
Audit of V1: React 19 + TypeScript + Vite 7 + Tailwind 4, ~14k lines, 13 storefront and 9 admin pages, design system "Lapis & Vermilion" (WCAG-measured, light/dark). Every API call targeted the old PHP API (`/customers/login`, `/invoices`, refresh tokens, `{status, data}` envelopes), so the data layer is replaced in phase 1. Baseline: `tsc` and build passed, 70 ESLint errors, 557 kB main chunk, no tests, no CI.

- [x] Removed 12 outdated summary/checklist docs and 15 unused components/helpers (verified not imported anywhere).
- [x] Lint: 70 errors → 0 (and 18 more from the new `react-hooks/refs` rule in plugin 7.1 after the update, all in V1 forms rewritten later). Shared components fixed properly (typed carousel motion props, quantity stepper syncs without an effect, unused prop). V1 pages/services that later phases rewrite are listed in `eslint.config.js` as temporary exceptions. Fast-refresh hints are warnings.
- [x] Dependencies updated within current majors (React 19.3, React Router 7.18, Tailwind 4.3, Vite 7.3.6, axios 1.20); `npm audit`: 0 vulnerabilities. Majors (Vite 8, Motion 13, lucide 1, TypeScript 7, ESLint 10) deferred to their own changes.
- [x] Vitest + Testing Library (jsdom); first tests for the price helpers. Scripts: `typecheck`, `test`, `test:watch`.
- [x] CI (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build on pushes and pull requests.
- [x] `.env` and `.env.production` were tracked (no secrets, but they pointed at the old API) → untracked; `.env.example` added.
- [x] `docs/V2_PLAN.md`: owner decisions, 11 phases, full page → endpoint inventory. `CLAUDE.md` updated for V2.

## Phase 1 — API layer (branch `feature/api-layer`)
- [x] Checked the backend's OpenAPI spec against real responses (local API + demo data): core shapes matched, 11 responses had no schema. Fixed at the source in the backend (`docs/openapi-response-schemas`): new schemas + `ApiContractTest` that fails when a response and its schema drift.
- [x] `npm run api:types` generates `src/api/schema.d.ts` (openapi-typescript) from the live spec or `OPENAPI_SOURCE`; `src/api/types.ts` names the types (BookCard, Cart, Order, ...).
- [x] `src/api/client.ts`: one axios client, Bearer token chosen by route (`/staff/*` → staff session), 70 s timeout for the sleeping free host, typed helpers, `newIdempotencyKey()`.
- [x] `src/api/errors.ts`: `ApiError` with `kind` (network, unauthenticated, email_unverified, two_factor_setup_required, forbidden, not_found, conflict, validation, rate_limited, server, unexpected), field messages, Retry-After, request id; 5xx never shows server text.
- [x] `src/api/session.ts`: separate customer and staff sessions in localStorage, expiry-aware, synced across tabs, `useSession()`. A 401 on a request that sent a token clears that session and fires `bookly:session-expired`.
- [x] Endpoint modules (`src/api/endpoints/`): catalogue, auth, account (profile, password, addresses, wishlist), cart + checkout (preview, coupon, idempotent order), orders, returns, reviews, each read with TanStack Query options and key factories.
- [x] TanStack Query provider: retries network/5xx only, never mutations; devtools in development only (checked: not in the production bundle).
- [x] USD/KHR preference (`src/stores/currency.ts`), formatted from the API's own usd/khr values.
- [x] Tests: 27 unit tests (errors, sessions, token selection, 401 handling, idempotency key, currency, query params) + `src/api/live.test.ts` (opt-in `LIVE_API=1`): catalogue, typed errors and login → cart → preview → order → same key returns same order → cancel → logout, against the local API from origin `http://localhost:5173` (CORS ok). All pass.
- Note: the main bundle is 631 kB (was 557) with TanStack Query; V1 code removal in phases 3-9 and code splitting in phase 10 bring it down.
- Backend gap found: full-text search covers book title + description only, so "Sherlock" or an author's name finds nothing unless the description mentions it. Needs a backend change (search authors and series too) — to discuss with the owner before phase 3.

## Phase 2 — UI kit + motion (branch `feature/ui-kit-motion`)
- [x] Backend search gap from phase 1 is fixed in the backend (search matches titles, descriptions, authors, series and categories; prefix matching), merged before this phase.
- [x] GSAP removed. Only `AnimatedContent` used it; rebuilt on Motion with the same props (owner's choice), so V1 Home, Browse and the footer keep their reveals. Checked in a browser: blocks fade in on scroll, reduced motion shows them in place.
- [x] Motion tokens in one place: `src/lib/motion.ts` (durations, easings, stagger, shared variants) mirrored by CSS `--dur-*` / `--ease-*`.
- [x] Design system v3 (`design-system/bookly/MASTER.md`): same colours and fonts; new tokens for semantic tints (`--success-tint`, `--warning-tint`, `--destructive-tint`, contrast measured: 5.2–8.1), overlay scrim, layering (`--z-header` … `--z-toast`), header height and the `.container-shell` page container; specs for select, checkbox/radio/switch, tabs, dialog, drawer, cart drawer, live search, currency switch, error states and page transitions (§4, §5, §6.14–6.22).
- [x] UI kit (`src/components/ui/`): Button (+ `loading`, `on-lapis`), Select / NativeSelect / `SelectField`, Checkbox, RadioGroup, Switch, Badge (tone × shape) + CountBadge, Dialog + ConfirmDialog, Drawer (right/left/bottom), Tabs (sliding indicator), Pagination (+ `pageRange`, `rangeSummary`), Skeleton / SkeletonGroup / SkeletonRow, Toaster + `toast` store (replaces SweetAlert toasts for V2 code), ErrorState / InlineError, `RouteErrorBoundary`. Radix underneath for focus, keyboard and ARIA; Motion for enter/exit.
- [x] Motion: `PageTransition` (360 ms in / 150 ms out, scroll to top on new pages but kept on Back/Forward, focus moved to the new page's `h1`) and `Stagger` for grids. Existing React Bits pieces (BlurText, CountUp, Carousel, SpotlightCard, GlareHover) were already GSAP-free.
- [x] New site shell (`src/components/shell/`), on the V2 API layer only: sticky header (nav, live search, USD/KHR switch, theme, cart count, account menu or Sign in), mobile menu drawer, cart drawer (signed out / loading / error / empty / read-only lines + subtotal; editing comes in phase 6), footer, skip link, toasts. V1 `Header.tsx` and `Footer.tsx` deleted.
- [x] Live search: `/books?q=&sort=relevance&per_page=6`, 250 ms debounce, 2+ characters, matched words in bold, ↑/↓/Enter/Esc, `/` focuses it, "See all results" → `/search?q=`.
- [x] Stopped calling V1's `/storefront/settings` on every page (no such endpoint in v2; it logged a 404 each time). V1 pages use the same built-in defaults as before.
- [x] `/ui-kit` (development builds only, not in the production bundle): every component in its states for review by eye and keyboard. V2 pages live in `src/pages/` (V1 stays in `src/page/` until replaced).
- [x] Tests: 22 new (UI kit, shell, toast store, pagination and highlight helpers, nav). Totals: 63 pass, 3 live-API tests skipped by default.
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with demo data at 1366/1024/900/375 px, both themes, reduced motion: dialog focus trap + return focus, confirm dialog busy state, drawer scrim close, select and tabs by keyboard, pagination, toasts (error persists), KHR prices, live search results and keyboard, signed-in header ("Cart, 2 items"), cart drawer lines, account menu, mobile menu closes on navigation, no horizontal scroll at 375 px.
- Known until later phases: header and footer links to `/books`, `/authors`, `/series`, `/search`, `/account/*` and content pages show the 404 page until those pages are built (phase 3 onward). Sign-in state comes from the V2 session, which the V1 login page doesn't write; phase 4 rebuilds login. Main bundle 668 kB (code splitting in phase 10).

## Phase 3 — Storefront catalogue (branch `feature/storefront-catalog`)
- [x] Helpers: `src/lib/catalog.ts` (filters ⇄ URL, sort and format labels; malformed values are dropped before reaching the API), recently viewed store (last 12 books in localStorage, synced across tabs), `useDocumentTitle`.
- [x] Catalogue components (`src/components/catalog/`): `BookCover` (titled placeholder when there's no image), V2 `BookCard` (MASTER §6.12, compact rating, "from" price, New / Out of stock badges), `BookGrid`, `BookShelf` (scroll-snap row with prev/next), `PageHeader`, `CatalogFilters`, `ActiveFilters`, `CatalogBrowser`, `FormatPicker`, `ReviewsSection`, `AuthorAvatar`, `NotFoundState`, cover morph helper.
- [x] Add to cart and wishlist work from every card and the book page (`useCatalogActions`). Cards add the cheapest format in stock; the wishlist updates optimistically. Signed out → a toast with Sign in (`/login?next=…`).
- [x] Pages (`src/pages/`): Home (hero with BlurText, CountUp stats and cover slideshow, service promises, new arrivals, categories, best rated, series spotlight, authors, recently viewed), `/books` (filters in a sidebar or a phone bottom sheet, chips, sort, pagination, all in the URL), `/search`, `/books/:id` (format picker, price per format, quantity, add to cart, wishlist, description/details/reviews tabs, series and author shelves, recently viewed, sticky purchase bar on phones, not-found state), `/authors`, `/authors/:id`, `/series`, `/series/:id` (reading order), `/categories/:slug`, `/publishers/:id`.
- [x] Removed V1 Home, Browse and BookDetail, and the components only they used (sample book list, combobox and its inputs, `@base-ui/react`). `/browse?search=x` → `/search?q=x`, `/browse` → `/books`.
- [x] Fixes found in the browser pass:
  - The page fading out of a route transition re-rendered with the new URL, so the next page existed twice for 150 ms (two h1s, double requests). `FrozenOutlet` keeps each layer on its own route.
  - The leaving page's title cleanup overwrote the new title.
  - StrictMode's double effects focused the landing page's h1 (now compared by pathname, which also stops filter changes from scrolling to the top).
  - The sticky purchase bar missed fast scrolls (scroll check instead of IntersectionObserver) and covered the footer.
  - A redirect inside the animated layout re-ran with the new URL.
  - Mobile toolbar overflow; truncated sort select; serif footer headings.
- [x] Tests: 85 pass (new: catalogue filters/URL, recently viewed, book meta, BooksPage filters/empty/sign-in prompt, book page format and cart flow and not-found, /browse redirect).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with demo data at 1366 and 375 px and in dark mode. Covered: filters, sort, Back/Forward, page past the end, search, add to cart (signed out and in, including the API's out-of-stock message), wishlist toggle, format switch, tabs, reviews, shelves, recently viewed, every not-found state, the Home hero keyboard controls, no horizontal scroll.
- Known:
  - Covers come from picsum.photos in the demo data, which this sandbox can't reach, so screenshots show the placeholder cover.
  - Quantity isn't capped by stock (the API exposes only in/out of stock); the API's "Only 1 left" message is shown instead.
  - `npm audit` reports a new moderate advisory in Vitest 3 (dev-only test runner, also on main); fixing needs Vitest 5, left for a separate chore.
  - Main bundle 673 kB (code splitting in phase 10).

## Phase 4 — Customer auth (branch `feature/customer-auth`)
- [x] React Hook Form 7 + Zod 4 (+ resolvers). Schemas in `src/features/auth/schemas.ts` mirror the API: name ≤ 150, email ≤ 190, password ≥ 8 with a letter and a number, matching confirmation, 6-digit codes. `applyApiErrors` puts 422 field messages on their fields and returns the rest for a form alert; `safeNext` accepts only same-site paths (blocks `//evil.com`, other origins, `javascript:`, loops back to auth pages).
- [x] Pages (`src/pages/auth/`, framed by the existing AuthShell with its lapis quote panel): sign in (API message on 401, password cleared, `?next=`), create account (live password checklist, duplicate-email error on the field), verify email (6-cell code, wrong code on the cells, resend with cooldown, "sign out and start again"), forgot password, reset password (email kept across a refresh in sessionStorage, resend, success → sign in with a notice). Google/Facebook buttons are shown disabled as "coming soon".
- [x] After sign-in: unverified accounts go to `/verify-email?next=…` (the API blocks cart, wishlist and checkout until then); others return to `next`. Cached cart and account data from a previous visitor is dropped.
- [x] Guards (`src/routes/guards.tsx`): `RequireCustomer` (→ `/login?next=`), `RequireVerified` (→ `/verify-email?next=`), `GuestOnly` (signed in → `next`). V1's `/checkout`, `/profile`, `/orders` now use the V2 session guard. `/verify-otp` (V1 reset link) → `/reset-password`.
- [x] Session expiry: `SessionWatcher` reacts to the API client's `bookly:session-expired`, clears the customer's cached data and shows one "You've been signed out" toast with a Sign in link back to the page; guarded pages redirect by themselves.
- [x] Unverified customers: add to cart and the wishlist heart explain "Verify your email first" with a link instead of failing with a 403; the cart drawer shows a verify state and no cart request is made.
- [x] Toaster moved to the app root (auth pages sit outside the shop layout) and its list is now a persistent `aria-live` region, which also keeps toasts announced while a drawer or dialog is open (Radix hides everything else from assistive tech, but leaves live regions).
- [x] Shared fields merge an extra `aria-describedby` (e.g. the password checklist) with their own error/hint instead of replacing it.
- [x] Removed V1 sign in / sign up / OTP / forgot / reset pages, the customer login and register forms, `lib/customer.ts`, `lib/passwordReset.ts`, the V1 customer route guard and one lint exception. V1 admin sign-in stays until phase 9.
- [x] Tests: 115 pass (new: schemas, forms helpers, cooldown, and an integration suite for sign-in, sign-up, verification, reset, guards and session expiry).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API reading real codes from the mail log:
  - register (from a book page) → verify (wrong code, then the right one) → back on the book;
  - sign out → forgot → reset → sign in with the new password;
  - guest-only redirect and an unsafe `next` ignored;
  - expired token → toast and the protected page redirects;
  - unverified account → no 403s;
  - 375 px with no horizontal scroll, and dark mode.

## Phase 5 — Account (branch `feature/account`)
- [x] Account area at `/account/*` behind `RequireVerified`, with its own layout:
  - side navigation at ≥ 1024px;
  - on phones, a scrolling link strip that keeps the current section in view;
  - a Sign out button;
  - a frozen nested outlet, so a page fading out keeps its own section.
- [x] Overview: greeting, verified status, "member since", tiles for profile / addresses / wishlist / password, and the three latest orders with the new V2 `OrderStatusBadge` (MASTER §6.3a: icon + fill style + text).
- [x] Profile: name and phone (`PATCH /me`). The email is shown read-only. Save is enabled only after a change, with "Discard changes". A saved name updates the session, so the header greets you by the new name straight away.
- [x] Password (`PUT /me/password`):
  - A wrong current password shows on that field.
  - Accounts without a password (social sign-up) get "Set a password" without the current-password field.
  - The page says that other devices are signed out; this session stays.
- [x] Address book:
  - List with the default marked; add and edit in a dialog, prefilled with the customer's name and phone.
  - Make default; delete with confirmation, explaining that another address becomes the default.
  - The API's limit of 10 is enforced.
  - The fields are free text (owner decision), with Cambodia as the starting country.
  - `AddressForm` and `AddressCard` are reusable for checkout.
  - The frontend payload type allows `null` to clear optional fields; the API accepts it, the OpenAPI schema doesn't say so.
- [x] Wishlist page: saved books as catalogue cards with pagination in the URL. The heart removes a book with Undo in the toast; the bag adds to cart. Empty state when nothing is saved.
- [x] `/profile` → `/account/profile` and `/favorites` → `/account/wishlist` (both outside the animated layout). Removed V1 Profile and Favorites plus the V1 book card, quick-view modal, cover morph and local favourites, which nothing used any more (and one lint exception).
- [x] Tests: 127 pass (new: account schemas; profile save, wrong current password, social "set a password", address list/add/delete/limit, account guard).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with the demo account:
  - sign-in redirect to the account; profile save updates the header;
  - wrong and right current password;
  - address add (validation) → make default → edit → delete the default (another becomes default);
  - wishlist save → remove → undo;
  - 375 px with no horizontal scroll (fixed a 115 px overflow from the phone nav strip);
  - earlier phases' browser scripts re-run clean.
- Known: "Orders" isn't in the account navigation yet, and recent orders don't link to details; both arrive with phase 7.

## Phase 6 — Cart and checkout (branch `feature/cart-checkout`)
- [x] Cart helpers (`src/features/cart/`): the API's blocking issues (unavailable, out of stock, not enough stock; a price change is only information), 10 per line, ebooks and audiobooks one per order, and the stock left when it's short.
- [x] `useCartMutations`: quantity changes are optimistic and roll back with the API's reason (e.g. "Only 1 left in stock."); remove shows an Undo toast; every change updates the cart cache, so the header count and drawer follow at once.
- [x] Editable cart drawer and the `/cart` page (8/4 layout) share one `CartLineItem` and one sign-in / verify-email gate. Digital lines have no stepper. "Empty cart" asks first. "Continue to checkout" is disabled while a line blocks it.
- [x] Coupon: checked with `POST /cart/coupon/check`, kept for the visit in sessionStorage and re-checked whenever the cart changes. A coupon that stops fitting (e.g. under its minimum after a removal) is dropped with the API's reason instead of being sent silently.
- [x] `/checkout` (behind `RequireVerified`):
  - 1) delivery address: saved addresses as radio cards with the default preselected; "Add a new address" opens the Phase 5 `AddressForm` and selects the new one (inline when there are none);
  - 2) payment: cash on delivery; card and Bakong KHQR shown disabled "coming soon";
  - 3) review: the lines, with totals (subtotal, discount, shipping, tax, total) from `POST /checkout/preview`. A coupon the preview rejects is removed with a toast.
  - An address is always required: the API asks for `address_id` even for ebook-only carts.
- [x] Placing the order is safe to retry. One idempotency key per attempt:
  - an answer from the API (stock changed, coupon no longer valid) gets a fresh key and a refreshed cart and preview;
  - a lost response keeps the same key and keeps the page in place, even though the cart is now empty on the server ("We couldn't confirm your order"); trying again returns the order already created (checked: two POSTs, one order).
- [x] `/checkout/success/:id`: thank-you header, order number and status, items, totals (USD, total also in riel), delivery address, "what happens next", links. It uses the checkout response straight away and reloads from `GET /orders/{id}`, so a refresh works. The coupon and cart cache are cleared after the order.
- [x] Removed V1 `Cart.tsx` and `Checkout.tsx`; nothing else became unused (the V1 order pages still use the old helpers until phase 7).
- [x] Tests: 137 pass (new: cart rules, coupon store, cart page coupon + blocked line, checkout default address / COD / place order, key reuse after a lost response and a new key after a refusal, empty cart → cart, confirmation on a fresh visit).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with the demo account:
  - stock-limit rollback, digital line, bad and good coupons, coupon dropped after a removal, undo, empty cart;
  - checkout: empty cart → /cart, default address, COD only, WELCOME10 totals, new address from checkout;
  - dropped response on place order → retry → one order, confirmation, reload;
  - 375 px dark and desktop light: fixed an 8 px overflow on `/cart` (grid min-content, same fix as earlier phases).
- Known: coupons are one use per customer (cancelling the order gives the use back), so test runs must cancel their orders.

## Phase 7 — Orders, returns and reviews (branch `feature/orders-returns-reviews`)
- [x] Account navigation gains Orders, Returns and Reviews. The overview's recent orders link to their detail (plus "See all orders"); the checkout confirmation links to "View your order".
- [x] `/account/orders`: order cards (number, status badge, first titles, date, item count, total), a status filter and page number in the URL, and an empty state for no orders or no orders with that status.
- [x] `/account/orders/:id`:
  - lines and totals, shared with the confirmation page (`OrderItemsCard`, `DeliveryAddressCard`); delivery address; payment (cash on delivery and its status);
  - a timeline of status changes with the shop's notes, latest marked as current;
  - Cancel while pending (`can_cancel`), in a dialog with an optional reason that lands in the timeline;
  - once delivered: "Request a return" with the last day (14-day window), or the API's reason it isn't possible (window closed, a return already in progress, nothing left), and "Review this book" on each line.
- [x] `/account/orders/:id/return`: tick the books (physical formats only, up to the quantity still returnable), quantity, an optional note per book and a required reason; the API's refusals (window, quantities, one open return per order) are shown above the form.
- [x] `/account/returns` and `/account/returns/:id`: status badge (requested / approved / not accepted / refunded, icon + fill + text like order statuses), books, the customer's reason, estimated or final refund, the shop's note, what happens next, and Withdraw while it's still requested.
- [x] Reviews:
  - on the book page, a "Your review" panel at the top of the Reviews tab: the customer's review with Edit / Delete (and a note if the shop hid it); "Write a review" once an order with the book has been delivered; otherwise when that becomes possible. Signed out: "Sign in to review it", which comes back to the panel.
  - star rating input (native radios, arrow keys, spoken labels, hover preview) and an optional comment up to 2000 characters; saving refreshes the public list, the count and the book's rating.
  - `/books/:id#your-review` opens the Reviews tab and scrolls to the panel.
  - `/account/reviews`: all the customer's reviews with Edit (on the book page) and Delete.
- [x] V1 `/orders` and `/orders/:id` (and `/invoices`) redirect to the account pages, outside the animated layout.
- [x] Removed V1 `Orders.tsx`, `OrderDetail.tsx`, and what only they used: the old order status component, `lib/alerts`, `lib/cart`, `lib/receipt`, `customer.service` and the unused storefront settings context (one lint warning fewer).
- [x] Tests: 149 pass (new: order list filter, cancel with reason, return entry and its refusal reason, old links, return form validation + payload + API refusal, withdraw, review post / existing / not yet / signed out, delete from the account list).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass against the local API with the demo account:
  - list, filter, detail, cancel a fresh order with a reason, old link redirect, unknown order;
  - return request → detail → list → order shows "in progress" → withdraw;
  - review: sign in from the panel, rating required, post, edit, unbought book note, delete from the account;
  - 375 px dark: no horizontal scroll on any new page, active account link kept in view; phase 6 cart and checkout scripts re-run clean.
- Known: `sweetalert2` is no longer used by any page (its CSS and styles are still loaded, and the V1 admin modal checks for it); drop it with the V1 admin in phase 9.

## Phase 8 — Content pages (branch `feature/content-pages`)
- [x] Owner decisions (asked first): contact details and delivery areas/times are **placeholders** for now; `/contact` has **no form** (direct links); Privacy and Terms are **plain-language drafts marked for review**.
- [x] `src/content/shop.ts`: one place for the facts the pages quote. `policy` mirrors the API's config ($2.00 flat fee, 14-day return window); `contact` and `delivery` are placeholders with `confirmed: false`, which shows a "To be confirmed" badge next to them; `legal.reviewed: false` shows a draft notice. Replace the values and flip the flags before launch.
- [x] Design (`design-system/bookly/pages/content.md`, listed in MASTER §9): every help page opens with a **bookplate**, a centred lapis "ex libris" plate (the hero surface, a double gold hairline frame with diamond corners) holding the title and the house rules people come to check, as a `<dl>` in Gloock gold. Below it, a reading layout: sticky "On this page" contents with the section in view marked (folds into a button on phones) beside a 68ch article at 17px. Legal pages number their clauses.
- [x] Pages: `/shipping`, `/returns-policy` (refund rule and a worked example matching the API's calculation), `/faq` (five topics, accordion, every answer linkable, e.g. `/faq#cancel-order`), `/about` (what the shop sells and how buying works, the newest books, one vermilion "Browse the shelves"), `/contact` (Telegram, phone and email as tap-to-contact links, opening hours and address, and the self-serve answers people usually write in for), `/privacy` and `/terms` (checked against what the app and API really store and enforce: no trackers, error reports carry only an account id, reviews show a short name, no self-serve deletion yet).
- [x] 404: "This page is out of print" on the bookplate, with a search that goes to `/search` and links back into the shop. Replaces V1 `NotFound`.
- [x] Offline: a slim bar under the header while the connection is gone and a "Back online" toast when it returns. A page whose code can't be downloaded now shows "You're offline" (not "Something went wrong"), and Try again reloads, since `React.lazy` keeps a failed import.
- [x] Fixed on the way: FAQ questions used Gloock with faux-bold (headings default to Gloock), the 404 search shared the header search's label, long contact details were cut off on phones.
- [x] Tests: 159 pass (new: fee and window come from the config, contents links, FAQ deep link opens one answer, contact links and placeholder badges, legal draft notice and numbering, 404 search, offline banner).
- [x] Verified: lint (0 errors), typecheck, tests, build; browser pass: every footer link reaches a real page; all eight pages at 375 px dark and 1366 px light with no horizontal scroll or console errors; offline → banner → unloaded page shows the offline state → back online; phase 6–7 scripts re-run clean.
- Known: the contact details, delivery areas/times and legal text need the owner's real values and a review before launch (`src/content/shop.ts`). Local runs need `VITE_API_BASE_URL=http://localhost:8000/api/v1` when starting Vite, or the app talks to the live API.
