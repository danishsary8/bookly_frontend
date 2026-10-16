# Next step

**Everything still to do, in order, is in `docs/ROADMAP.md`** (including the "Known limits and small follow-ups" items).

## State on 2026-10-16: Overnight batch complete (waiting for owner merge)

All 11 tasks implemented, tested locally, and verified green on GitHub Actions CI.

### Merge order table (paired backend -> frontend)

| # | Branch | Repo | Starts from | What | CI Run |
|---|---|---|---|---|---|
| 1 | `feature/stock-history-restock` | backend | `main` | Stock history, restock dialog, running balance | 38781501413 |
| 2 | `feature/stock-history-restock` | frontend | `main` | Stock UI, restock modal, movement ledger | 38785172957 |
| 3 | `feature/refund-records` | backend | `feature/stock-history-restock` | Refund records, store credit coupons, balances | 38787355711 |
| 4 | `feature/refund-records` | frontend | `feature/stock-history-restock` | Refund modal, store credit card, customer view | 38789338825 |
| 5 | `feature/customer-notes-tags` | backend | `feature/refund-records` | Customer notes, tags, admin spend, resend verify | 38791250933 |
| 6 | `feature/customer-notes-tags` | frontend | `feature/refund-records` | CRM notes, tags UI, admin spend visibility | 38793512735 |
| 7 | `feature/book-publishing-bulk-csv` | backend | `feature/customer-notes-tags` | Draft/scheduled/live books, bulk actions, CSV | 38797002359 |
| 8 | `feature/book-publishing-bulk-csv` | frontend | `feature/customer-notes-tags` | Book publishing status, bulk toolbar, CSV preview | 38798474247 |
| 9 | `feature/khmer-emails-api` | backend | `feature/book-publishing-bulk-csv` | Khmer customer mailables, API localization | 38801068980 |
| 10 | `feature/khmer-emails-api` | frontend | `feature/book-publishing-bulk-csv` | Accept-Language header, locale profile sync | 38802897424 |
| 11 | `feature/back-in-stock-also-bought` | backend | `feature/khmer-emails-api` | Stock alerts, capped marketing outbox, also-bought | 38806032521 |
| 12 | `feature/back-in-stock-also-bought` | frontend | `feature/khmer-emails-api` | Stock alerts, recently viewed shelf, also bought | 38808521718 |
| 13 | `feature/khmer-search` | backend | `feature/back-in-stock-also-bought` | Trigram indexes, Khmer substring & ZWSP strip | 38809792242 |
| 14 | `feature/khmer-search` | frontend | `feature/back-in-stock-also-bought` | Khmer highlight, ZWSP strip, listbox a11y | 38810978216 |
| 15 | `feature/newsletter` | backend | `feature/khmer-search` | Newsletter subscription, confirm, unsubscribe, campaigns | 38812962321 |
| 16 | `feature/newsletter` | frontend | `feature/khmer-search` | Newsletter sign-up, confirm/unsub pages, admin campaigns | 38815769579 |
| 17 | `fix/security-leftovers` | backend | `feature/newsletter` | Public health status-only, admin health, passwordless close | 38818126862 |
| 18 | `fix/security-leftovers` | frontend | `feature/newsletter` | Health card, Sentry tunnel hardening, passwordless close | 38819141003 |
| 19 | `feature/strict-delete-trash` | backend | `fix/security-leftovers` | Strict delete with 2FA/password/title, 30-day trash | 38820479741 |
| 20 | `feature/strict-delete-trash` | frontend | `fix/security-leftovers` | Strict delete dialog, trash retention UI & restore | 38821762292 |
| 21 | `feature/staff-permissions-sessions` | backend | `feature/strict-delete-trash` | Granular staff permissions, active sessions, login log | 38840141886 |
| 22 | `feature/staff-permissions-sessions` | frontend | `feature/strict-delete-trash` | Staff security page, session controls, permissions UI | 38841418085 |
| 23 | `docs/overnight-batch` | backend | `feature/staff-permissions-sessions` | Final worklog, docs update, full verification | this branch |
| 24 | `docs/overnight-batch` | frontend | `feature/staff-permissions-sessions` | Final worklog, roadmap ticks, merge sequence | this branch |

## Owner steps after merging
1. In Render / production env, optionally set `MARKETING_DAILY_LIMIT=100` (defaults to 100).
2. Run database migrations: `php artisan migrate --force`.
3. Ensure cron/scheduler triggers `php artisan marketing:send-outbox` and `php artisan books:purge-trash` daily.
4. Native-speaker review of new Khmer strings added to `src/i18n/km.ts`.

## Next (pick one)
1. **Phase 5: Found on Google, fast, legal** (pre-rendered HTML for public pages, custom domain with SPF/DKIM/DMARC, Google Search Console sitemap).
2. **Payments: ABA PayWay / Bakong KHQR / Stripe / PayPal** (when API keys are provided by the owner).
3. **Phase 7: Frontend redesign** (full storefront redesign starting with landing page).
