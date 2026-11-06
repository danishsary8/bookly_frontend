import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Segmented step progress + sliding panel (the React Bits "Stepper" idea, rebuilt on our tokens).
 * The parent owns `current` so it can validate a step before moving on; buttons live in the parent's form.
 * When the step changes, focus moves to the first field of the new step. Reduced motion: Motion's global
 * skip (src/lib/reducedMotion.ts) makes the slide instant.
 */
interface StepperProps {
  steps: string[];
  current: number;
  /** Accessible name for the step list, e.g. "Sign-up steps". */
  label: string;
  /** Screen-reader text for the current step, e.g. "Step 2 of 3: Password". */
  status: string;
  children: ReactNode;
  className?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function Stepper({ steps, current, label, status, children, className }: StepperProps) {
  const [shown, setShown] = useState(current);
  const [direction, setDirection] = useState(1);
  const [moved, setMoved] = useState(false);
  if (shown !== current) {
    setDirection(current > shown ? 1 : -1);
    setShown(current);
    setMoved(true);
  }

  return (
    <div className={className}>
      {/* Segmented progress: one bar per step that fills as you go, its name underneath. */}
      <ol aria-label={label} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((title, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={title} aria-current={active ? "step" : undefined} className="grid min-w-0 gap-2">
              <span className="relative h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-primary"
                  initial={false}
                  animate={{ scaleX: done || active ? 1 : 0, opacity: done ? 0.55 : 1 }}
                  transition={{ duration: 0.5, ease }}
                />
              </span>
              <span className={cn("flex min-w-0 items-center gap-1.5 py-0.5 text-xs font-semibold leading-5", active ? "text-foreground" : "text-muted-foreground")}>
                <span className="tabular-nums">{done ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : `${i + 1}.`}</span>
                <span className="truncate">{title}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{moved ? status : ""}</p>

      <div className="relative mt-5">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 28, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -28, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease }}
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
    </div>
  );
}
