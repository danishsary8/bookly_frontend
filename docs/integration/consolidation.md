# Frontend consolidation — 2026-11-16

Review branch: `review/frontend-complete-updates`, targeting `main`.
Backend companion: `danishsary8/bookly_backend_v2`, branch `review/backend-complete-updates`.

This branch combines the outstanding remote and local branch histories with the previously uncommitted admin work. `branch-manifest.json` records the exact incoming tips. `historical-branch-notes.md` preserves worklog additions without replacing the current worklog or reviving obsolete roadmap states. The original branches remain available. Local recovery commit: `28bd085`.

## Conflict and overlap decisions

| Incoming work | Resolution |
| --- | --- |
| `admin-polish` | Keep the newer admin shell, working live book search and filters, chart motion and dashboard. The earlier search API, list helpers and search tests already match the current code. |
| `docs/overnight-batch` | Keep the current strict-delete dialog, trash, permissions, staff sessions, security pages, API types and routes. The incoming alternate implementations predate subsequent fixes. Preserve its historical notes. |
| `design/catalogue-pages-v2` | Keep the subsequent catalogue redesign and its discovery/search/filter flows. Do not restore deleted, superseded catalogue components. |
| `design/splash-screen` | Keep the current splash/auth designs and the later small-screen sign-in fixes. |
| `chore/deps-and-setup-node`, `chore/pin-setup-node` | Keep the current lockfile and CI. Its setup-node pin already is v7.1.0. |
| `design/font-preview` | Archive comparison screenshots and notes. Keep Gloock and the current design-system typography; the optional Newsreader preview was not approved as a global redesign. |
| `design/shopping-pages` | Record already-equivalent shopping branch ancestry. Keep current shopping, checkout, returns-policy and account work. |
| `docs/overnight-plan`, `docs/worklog-notes` | Retain historical planning documents and worklog additions. Historical prompts do not authorize new work. |
| `tmp/sentry-test-error` | Keep the explicit diagnostic page and unit tests, register it only in development, and retain its robots exclusion. Production builds exclude the intentional-error page. |

## Current admin work included

- Dashboard spacing, readable hierarchy, truthful small charts, hover/touch/keyboard inspection, smooth period changes and reduced-motion support.
- Customer care and Marketing workspaces, shared responsive staff form dialogs, books Details/Edit actions, author photo upload and parent/sub-category management.
- All six Admin navigation pages, including searchable activity across audit/inventory/order history, campaign search/pagination and safer credit confirmations.
- Production-proxy-safe browser fixtures and regression coverage. Generated screenshots, logs and browser reports remain local.

## Merge and deployment

Merge the backend companion first, then this frontend PR. Use **Create a merge commit** to preserve the consolidated branch ancestry and allow Git to recognize the older branch tips as merged. Neither consolidation publishes to production or enables feature flags. Deployment completion must be checked separately after the owner merges.

Verification results for the combined branch are recorded in `docs/WORKLOG.md`.
