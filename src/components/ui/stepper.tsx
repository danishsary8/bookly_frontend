import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * React Bits "Stepper", rebuilt on our tokens: numbered discs joined by rules that fill as you go, a content
 * panel that slides sideways and eases to its new height, and a footer row for Back / Continue.
 * The parent owns `current` (so it can validate a step first) and puts its own buttons in `footer`, which keeps
 * them inside the parent's <form>. When the step changes, focus moves to the first field of the new step.
 * Reduced motion: Motion's global skip (src/lib/reducedMotion.ts) makes every move instant.
 */
interface StepperProps {
  steps: string[];
  current: number;
  /** Accessible name for the step list, e.g. "Sign-up steps". */
  label: string;
  /** Screen-reader text for the current step, e.g. "Step 2 of 3: Password". */
  status: string;
  children: ReactNode;
  /** Back / Continue row under the panel. */
  footer?: ReactNode;
  className?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function Stepper({ steps, current, label, status, children, footer, className }: StepperProps) {
  const [shown, setShown] = useState(current);
  const [direction, setDirection] = useState(1);
  const [moved, setMoved] = useState(false);
  if (shown !== current) {
    setDirection(current > shown ? 1 : -1);
    setShown(current);
    setMoved(true);
  }

  // Follow the panel's real height so the card grows and shrinks smoothly between steps.
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("grid gap-5", className)}>
      <ol aria-label={label} className="flex items-center">
        {steps.map((title, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={title} aria-current={active ? "step" : undefined} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
              <span className="flex items-center gap-2">
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1 : 0.88 }}
                  transition={{ duration: 0.35, ease }}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-300",
                    done || active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground",
                    active && "shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_15%,transparent)]",
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={done ? "done" : "n"}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.2, ease }}
                    >
                      {done ? <Check className="size-4" strokeWidth={2.75} aria-hidden="true" /> : i + 1}
                    </motion.span>
                  </AnimatePresence>
                </motion.span>
                <span className={cn("whitespace-nowrap text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground max-sm:sr-only")}>{title}</span>
              </span>
              {i < steps.length - 1 ? (
                <span className="relative mx-3 h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-primary"
                    initial={false}
                    animate={{ scaleX: done ? 1 : 0 }}
                    transition={{ duration: 0.45, ease }}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{moved ? status : ""}</p>

      <motion.div initial={false} animate={{ height }} transition={{ duration: 0.35, ease }} className="relative -mx-1 overflow-hidden px-1">
        <div ref={inner} className="py-1">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease }}
              onAnimationComplete={(definition) => {
                if (!moved || definition !== "center") return;
                const panel = document.querySelector<HTMLElement>("[data-step-panel]");
                panel?.querySelector<HTMLElement>("input:not([type=hidden]):not([readonly]), select, textarea")?.focus();
              }}
              data-step-panel=""
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {footer ? <div className="flex items-center gap-3">{footer}</div> : null}
    </div>
  );
}
