import type { Transition, Variants } from "motion/react";

/*
 * Motion tokens from design-system/bookly/MASTER.md §5, for `motion` components.
 * CSS has the same values as --dur-* / --ease-* in index.css.
 */

export const duration = {
  hover: 0.15, // hover, focus, press
  toggle: 0.22, // switches, tabs, small reveals; also overlay exits
  overlay: 0.32, // drawers, dialogs, toasts entering
  page: 0.36, // route changes
  reveal: 0.7, // below-the-fold sections entering
} as const;

export const ease = {
  /** Fast start, long soft landing: entrances. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetric: moves and swaps. */
  standard: [0.2, 0, 0, 1],
  /** Accelerating: exits. */
  in: [0.55, 0.055, 0.675, 0.19],
} as const satisfies Record<string, [number, number, number, number]>;

export const stagger = { step: 0.06, max: 8 } as const;

/** Delay for the n-th item of a list; items past the 8th all share the last delay. */
export const staggerDelay = (index: number) => Math.min(index, stagger.max) * stagger.step;

export const transitions = {
  enter: { duration: duration.overlay, ease: ease.out },
  exit: { duration: duration.toggle, ease: ease.in },
  toggle: { duration: duration.toggle, ease: ease.standard },
  page: { duration: duration.page, ease: ease.out },
  reveal: { duration: duration.reveal, ease: ease.out },
} satisfies Record<string, Transition>;

/** Fade + rise, used for page content and toasts. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.enter },
  exit: { opacity: 0, y: 8, transition: transitions.exit },
};

/** Parent that staggers its children's `riseIn`. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: stagger.step } },
};
