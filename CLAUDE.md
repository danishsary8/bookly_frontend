# Bookly Frontend — working rules

## Verification before reporting (standing rule)

Never report a phase/batch as complete until tsc, the build, and a runtime verification pass have actually been run — not just written and assumed correct. If a report is given before verification is finished (e.g. mid-phase status check), explicitly say "not yet verified" rather than implying it's done.

In this repo that means:
1. `npx tsc -b` — no errors.
2. `npm run build` — succeeds.
3. Runtime pass against the running app (Vite dev server on :5173, PHP API on :8082), e.g. headless Chrome over the DevTools protocol: load each changed route, exercise the changed interactions, and read back DOM/computed state or screenshots. State in the report what was exercised and what was not.

## Design system

`design-system/bookly/MASTER.md` is the source of truth for colours, type, spacing, motion and component specs (storefront and admin). Page-specific deviations go in `design-system/bookly/pages/<page>.md`.
