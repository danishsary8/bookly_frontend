import { MotionGlobalConfig } from "motion/react";

/*
 * MASTER §5: `prefers-reduced-motion: reduce` means no animation at all.
 * Components that handle it themselves (BlurText, CountUp, Carousel, AnimatedContent,
 * ClientLayout) still do; this is the app-wide safety net for every other `motion`
 * element: with skipAnimations on, motion jumps straight to each animation's final
 * value. It follows the OS setting live, so flipping it mid-session takes effect at once.
 * CSS animations/transitions are covered separately in index.css.
 */
export const syncReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return;

  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => {
    MotionGlobalConfig.skipAnimations = query.matches;
  };

  apply();
  query.addEventListener("change", apply);
};
