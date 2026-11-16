import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/*
 * A figure that glides from its old value to the new one when the data changes (e.g. 30 days → 7 days), instead of
 * jumping. The first value shows as is; frames write straight to the text node, so counting never re-renders React.
 * Reduced motion: the new value shows at once.
 */
export function AnimatedNumber({ value, format, duration = 0.8, className }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(value);
  const formatRef = useRef(format);
  const reduce = useReducedMotion();
  const [initial] = useState(() => format(value));
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
    const controls = animate(start, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        from.current = latest;
        node.textContent = formatRef.current(latest);
      },
      onComplete: () => { from.current = value; },
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
