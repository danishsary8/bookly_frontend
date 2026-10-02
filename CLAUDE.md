# Bookly Frontend — working rules

## Verification before reporting (standing rule)

Never report a phase/batch as complete until tsc, the build, and a runtime verification pass have actually been run — not just written and assumed correct. If a report is given before verification is finished (e.g. mid-phase status check), explicitly say "not yet verified" rather than implying it's done.

In this repo that means:
1. `npm run lint`, `npm run typecheck`, `npm test` — no errors.
2. `npm run build` — succeeds.
3. Runtime pass against the running app (Vite dev server on :5173, Bookly API v2 — local Laravel on :8000 or the live API), e.g. headless Chrome / Playwright: load each changed route, exercise the changed interactions, and read back DOM/computed state or screenshots. State in the report what was exercised and what was not.

## V2 upgrade

The app is being upgraded from the old PHP API to Bookly API v2. Read `docs/V2_PLAN.md` (decisions, phases, page → endpoint map) and `docs/WORKLOG.md` (progress) first. Git: one branch per phase, human-style branch names and commit messages, no tool names; the owner merges.

## Design system

`design-system/bookly/MASTER.md` is the source of truth for colours, type, spacing, motion and component specs (storefront and admin). Page-specific deviations go in `design-system/bookly/pages/<page>.md`.
