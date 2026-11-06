# Auth pages (sign in, create account) — deviations from MASTER

- **Fit the screen (≥1024px):** the page is `h-dvh`, no page scroll; only the form column scrolls if a step is ever taller. Below 820px of height the card and panel tighten their padding.
- **Cover panel:** `CoverWall` — three columns of real covers drifting slowly (46–64s per loop, middle column reversed), tilted −6°, masked into the lapis cloth top and bottom; tagline + pause button underneath. Reduced motion: still. Sign-up keeps its library-card panel.
- **Form:** React Bits "Stepper" pattern (`components/ui/stepper.tsx`): numbered discs (active disc has a 5px primary halo, done discs show a check), connector rules that fill on completion, a panel that slides ±40px and eases its height, footer row with a ghost **Back** and the CTA **Continue / Sign in / Create account**.
- Sign in = 2 steps (email → password). Create account = 3 steps (you → password → confirm).
