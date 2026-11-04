# Overnight work prompt for Gemini (Bookly)

You are working **alone overnight** on Bookly, an online bookshop for Cambodia. The owner, Danish, is asleep.
**Do not stop, do not ask questions, make reasonable decisions yourself, and write down every decision.**
When something is blocked, note it in PROGRESS.md and move to the next task. Never wait.

---

## 1. Project context

**Repos**
- Backend: `danishsary8/bookly_backend_v2`: Laravel 13, PHP 8.4, PostgreSQL, Sanctum tokens, REST API under
  `/api/v1`, OpenAPI spec in `public/openapi.yaml` (a contract test compares responses with it), docs in `docs/API.md`.
  Hosted on Render (free plan, no scheduler: jobs run via `App\Support\MaintenanceTasks` + `DueMaintenance`).
- Frontend: `danishsary8/bookly_frontend`: React 19, Vite 7, TypeScript 5.9, TanStack Query 5, React Router 7,
  Tailwind CSS 4, shadcn-style components in `src/components/ui`, Zod 4, Vitest, Playwright. Hosted on Vercel.
  API types are generated: `OPENAPI_SOURCE=../bookly_backend_v2/public/openapi.yaml npm run api:types`.
- i18n: `src/i18n/en.ts` and `src/i18n/km.ts` (Khmer). Backend text in `lang/en/*.php` and `lang/km/*.php`.

**Read first:** both repos' `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`, the frontend `GEMINI_ROADMAP.md`,
`design-system/bookly/MASTER.md` (frontend design rules), and the backend branch `docs/handoff-notes`
(`docs/WORKLOG.md`, `docs/OWNER_TODO.md`, `docs/superpowers/specs/2026-11-05-bookly-v3-roadmap-design.md`).

**What is done:** see `GEMINI_ROADMAP.md` ✅. The latest merged feature is the category tree (backend
`App\Support\StarterCategories`, `GET /categories?tree=1`, book fields `age_min`, `age_max`, `school_grade`, `level`,
catalog filters/facets; frontend `src/components/catalog/CatalogFilters.tsx`, `src/lib/catalog.ts`).

---

## 2. Rules (follow all of them)

1. **Never stop and never ask.** Decide, write the decision and the reason in PROGRESS.md, continue.
2. **Never touch anything marked ⚠️ HUMAN ONLY** in `GEMINI_ROADMAP.md`. In particular:
   - never merge, never push to `main`, never force-push;
   - never touch Render, Vercel, Neon, Google Cloud, Meta, Bakong, email or Telegram settings;
   - never write, print or commit secrets, tokens, passwords or connection strings;
   - never run anything against production; never call the live API to change data.
3. **One branch per task**, made from the latest `origin/main`, with the branch name given below. Push it with
   `git push -u origin <branch>`. Do not open pull requests (Danish does).
4. **Branch names and commit messages are human-style.** Never put "gemini", "antigravity", "claude", "AI" or any
   tool name in them. No `Co-Authored-By` or tool attribution lines.
5. **Do not change existing migrations.** A new migration is allowed only where a task below says so (none tonight).
6. **Do not start phases 2–11 code.** They need Danish's design approval first. Task G5 only drafts documents.
7. **Keep the code style:** small focused files, comments that explain *why*, tests for every behaviour change,
   follow existing patterns (look at a similar file first). Backend: run `vendor/bin/pint` before committing.
8. **Checks before pushing each branch** (all must pass; if one can't run on this machine, say so in PROGRESS.md):
   - Backend: `php artisan test` (PostgreSQL needed, see the backend README) and `vendor/bin/pint --test`.
   - Frontend: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
   - If the OpenAPI spec changes: validate the YAML, run the contract test, regenerate frontend types.
9. **New user-facing text:** English in `en.ts`; in `km.ts` add Khmer. (Tonight you are allowed to write Khmer
   yourself. Keep placeholders and brand names; reuse existing Khmer terms; remove any `// TODO(antigravity)`
   marker line once that group is fully translated, because a test checks it.)
10. **Progress log:** after **each** task, append to `PROGRESS.md` and push it (see section 4).
11. If a task turns out much bigger than described or needs a product decision you can't make safely, do the safe
    part, write "NEEDS DANISH: <question>" in PROGRESS.md, and move on.

---

## 3. Tonight's tasks (do them in this order)

### G1 — Khmer for the catalogue filters (frontend) · branch `i18n/khmer-catalog-filters`
- In `src/i18n/km.ts`, translate the `catalogFilters` group (its English is in `en.ts`), keep the function
  parameters and `${...}` exactly, and delete the `// TODO(antigravity)` line above it.
- Check: `grep -n "TODO(antigravity)" src/i18n/km.ts` returns nothing; `npm test` (the Khmer tests must pass).

### G2 — Book CSV + bulk edit: audience fields (backend, maybe frontend) · branch `feature/book-csv-audience-fields`
- Backend `app/Http/Controllers/Api/V1/Staff/Catalog/BookCsvController.php` (and its services) and
  `BookBulkController.php`: add `age_min`, `age_max` (0–18, max ≥ min), `school_grade` (1–12), `level` (A1–C2,
  `App\Models\Book::LEVELS`) to the CSV export, the template, the import preview/confirm validation, and bulk edit
  if bulk edit already supports similar optional fields. Empty cell = null.
- Tests next to the existing CSV/bulk tests (`tests/Feature/Admin/BookPublishingBulkCsvTest.php`).
- Update `docs/API.md` and `public/openapi.yaml` if the documented columns/fields change.
- Frontend only if the admin CSV page lists the columns in its help text: add the new columns there.

### G3 — Sample catalogue seeder (backend) · branch `feature/sample-catalog`
- New `database/seeders/SampleCatalogSeeder.php`: **at least 120 books** spread over every starter category in
  `App\Support\StarterCategories` (call `StarterCategories::install()` first). Use real, well-known titles and authors
  (classics, self-help, business, manga/Marvel volumes, English coursebooks such as English File levels, Khmer
  literature and Khmer school books Grade 7–12 with Khmer titles), sensible prices in USD ($3–$40), paperback and/or
  hardcover with stock 10–60, an ebook format for about a third, and `school_grade`, `level`, `age_min`/`age_max`
  where they fit. Publishers/authors/series created with `firstOrCreate`. No cover images (null).
- **Idempotent:** skip a book whose title + first author already exists. **Never runs on its own:** not called by
  `DatabaseSeeder`, and refuses in production unless `--force`-style opt-in like `DemoSeeder` does (copy that guard).
- Document how to run it in the backend README (`php artisan db:seed --class=SampleCatalogSeeder`), marked
  "Danish runs this; not for production unless he decides".
- Test: runs on an empty DB, creates ≥ 120 visible books across ≥ 10 top-level categories, running twice adds nothing.

### G4 — Category page shows its sub-categories (frontend) · branch `feature/category-page-subcategories`
- `src/pages/catalog/CategoryPage.tsx`: when the category is top-level and has children in
  `catalogQueries.categoryTree()`, show the children as a row of links/chips ("Fantasy 12") above the book grid,
  linking to their category pages. Hidden when there are none. Use existing components and design tokens
  (MASTER.md); keyboard and screen-reader friendly; Khmer text added in both `en.ts` and `km.ts`.
- Test in `src/pages/catalog/catalog-pages.test.tsx` style (mock `catalogApi.categoryTree`).

### G5 — Draft designs for phases 2, 3, 4 (backend docs only) · branch `docs/phase-2-4-drafts`
- Create `docs/superpowers/specs/2026-11-06-ebooks-design-DRAFT.md`, `...-series-volumes-design-DRAFT.md`,
  `...-preorder-backorder-design-DRAFT.md`, following the approved v3 roadmap (backend `docs/handoff-notes` branch).
- Each draft: goal, user flows, data model (new tables/columns, **proposed only**), API endpoints, security,
  free-hosting limits (Render free + R2 storage), tests to write, and a clear **"Questions for Danish"** list with
  your recommended answer for each.
- Ebooks must respect: browser-only reading, encrypted short-lived page chunks, watermark (buyer email + order),
  copy/print blocked, max 3 devices, no refunds except broken files, Khmer font support, preview ~10%.
- No code in this branch.

### G6 — Health check report (both repos, no branch)
- On fresh `main` of both repos run every check from rule 8, plus `composer audit` and `npm audit --omit=dev`.
- Write the results (pass/fail, counts, any warning worth fixing) in PROGRESS.md. Fix nothing on `main`; if
  something fails, describe it under "NEEDS DANISH".

---

## 4. PROGRESS.md

Keep one file `PROGRESS.md` on the frontend branch `docs/overnight-progress` (create it from `origin/main` the
first time). After each task append:

```
## G<n> — <title> — DONE | PARTLY DONE | BLOCKED
- Branch: <name> (pushed: yes/no) — PR link: https://github.com/danishsary8/<repo>/pull/new/<branch>
- What changed: <2-5 short lines>
- Checks: <commands and results, e.g. "php artisan test: 830 passed">
- Decisions I made: <list, with the reason>
- NEEDS DANISH: <questions, or "none">
```

End the night with a short "Summary for Danish" section at the top: what to merge, in which order (backend before
frontend when both changed), and what he must check.
