import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/*
 * A figure that glides from its old value to the new one when the data changes (e.g. 30 days → 7 days), instead of
 * jumping. The first value shows as is; frames write straight to the text node, so counting never re-renders React.
 * Reduced motion: the new value shows at once.
 * `countUp` (the admin dashboard's first open, owner 2026-11-16): the first value counts up from 0 instead of showing as is.
 */
export function AnimatedNumber({ value, format, duration = 0.8, className, countUp = false }: { value: number; format: (n: number) => string; duration?: number; className?: string; countUp?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(countUp ? 0 : value);
  const first = useRef(countUp);
  const formatRef = useRef(format);
  const reduce = useReducedMotion();
  const [initial] = useState(() => format(countUp ? 0 : value));
  const text = format(value);

  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const start = from.current;
    if (reduce || start === value || !Number.isFinite(start)) {
      from.current = value;
      node.textContent = formatRef.current(value);
      return;
    }
    const opening = first.current;
    first.current = false;
    const controls = animate(start, value, {
      duration: opening ? Math.max(duration, 1.3) : duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        from.current = latest;
        node.textContent = formatRef.current(latest);
      },
      // always end on the exact value (also when animations are skipped and no frame ran)
      onComplete: () => {
        from.current = value;
        node.textContent = formatRef.current(value);
      },
    });
    return () => controls.stop();
    // `text` also covers a format change (e.g. another currency) with the same number.
  }, [value, text, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}
