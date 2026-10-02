import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { useAnimate, useReducedMotion } from "motion/react";
import { ease as easings } from "@/lib/motion";

/*
 * React Bits "Animated Content" (scroll reveal), rebuilt on Motion so the app no longer needs GSAP.
 * Same props as the GSAP version. The element enters once when its top crosses `threshold` of the
 * viewport from the bottom (GSAP's `start: "top 85%"` for threshold 0.15). Reduced motion: shown in place.
 */

type Ease = keyof typeof GSAP_EASES | [number, number, number, number];

// The GSAP ease names this component accepted, as cubic-bezier curves.
const GSAP_EASES = {
  "power3.out": easings.out,
  "power2.out": [0.33, 1, 0.68, 1],
  "power3.in": easings.in,
  "power2.in": [0.32, 0, 0.67, 0],
  "power3.inOut": [0.65, 0, 0.35, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, [number, number, number, number]>;

const toBezier = (value: Ease): [number, number, number, number] => (Array.isArray(value) ? value : [...GSAP_EASES[value]]);

interface AnimatedContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Scroll container to observe instead of the viewport (element or selector). */
  container?: Element | string | null;
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  /** Seconds. */
  duration?: number;
  ease?: Ease;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  /** Share of the viewport height from the bottom at which the element starts entering. */
  threshold?: number;
  /** Seconds. */
  delay?: number;
  /** Seconds after entering before it leaves again; 0 = stays. */
  disappearAfter?: number;
  disappearDuration?: number;
  disappearEase?: Ease;
  onComplete?: () => void;
  onDisappearanceComplete?: () => void;
}

const AnimatedContent = ({
  children,
  container,
  distance = 100,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  disappearAfter = 0,
  disappearDuration = 0.5,
  disappearEase = "power3.in",
  onComplete,
  onDisappearanceComplete,
  className = "",
  style,
  ...props
}: AnimatedContentProps) => {
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [inView, setInView] = useState(false);

  // Watch until the element's top passes `threshold` of the scroller's height, then stop.
  useEffect(() => {
    const element = scope.current;
    if (!element || reduceMotion) return;
    const root = typeof container === "string" ? document.querySelector(container) : (container ?? null);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { root, rootMargin: `0px 0px -${Math.round(threshold * 100)}% 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [container, threshold, reduceMotion, scope]);

  const axis = direction === "horizontal" ? "x" : "y";
  const offset = reverse ? -distance : distance;

  useEffect(() => {
    if (!inView || reduceMotion) return;
    let cancelled = false;

    const run = async () => {
      await animate(scope.current, { [axis]: 0, scale: 1, opacity: 1 }, { duration, delay, ease: toBezier(ease) });
      if (cancelled) return;
      onComplete?.();
      if (disappearAfter > 0) {
        await animate(
          scope.current,
          { [axis]: reverse ? distance : -distance, scale: 0.8, opacity: animateOpacity ? initialOpacity : 0 },
          { duration: disappearDuration, delay: disappearAfter, ease: toBezier(disappearEase) },
        );
        if (!cancelled) onDisappearanceComplete?.();
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
    // Runs once when the element comes into view; later prop changes do not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduceMotion]);

  const hidden = !reduceMotion && !inView;
  const initial = hidden
    ? {
        transform: `${axis === "x" ? `translateX(${offset}px)` : `translateY(${offset}px)`} scale(${scale})`,
        opacity: animateOpacity ? initialOpacity : 1,
      }
    : undefined;

  return (
    <div ref={scope} className={className} style={{ ...initial, ...style }} {...props}>
      {children}
    </div>
  );
};

export default AnimatedContent;
