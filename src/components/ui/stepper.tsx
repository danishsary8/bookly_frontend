import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Numbered step discs + sliding panel (the React Bits "Stepper" idea, rebuilt on our tokens).
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
      {/* React Bits "Stepper" look: numbered discs joined by rules that fill as you go; the current step is named under it. */}
      <ol aria-label={label} className="flex items-start">
        {steps.map((title, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={title} aria-current={active ? "step" : undefined} className={cn("flex min-w-0 items-start", i < steps.length - 1 && "flex-1")}>
              <span className="grid min-w-0 justify-items-center gap-1.5">
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1 : 0.9 }}
                  transition={{ duration: 0.35, ease }}
                  className={cn(
                    "relative grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-300",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
                    !done && !active && "border border-border bg-card text-muted-foreground",
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.25, ease }}>
                        <Check className="size-4" strokeWidth={2.75} aria-hidden="true" />
                      </motion.span>
                    ) : (
                      <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                <span className={cn("max-w-[7rem] truncate text-xs font-semibold leading-4", active ? "text-foreground" : "text-muted-foreground")}>{title}</span>
              </span>
              {i < steps.length - 1 ? (
                <span className="relative mx-2 mt-[15px] h-0.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
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
