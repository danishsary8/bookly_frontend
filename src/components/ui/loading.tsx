import React from "react";
import { m } from "motion/react";
import { useT } from "@/i18n";

/**
 * Clean editorial loading state matching Bookly's Lapis & Vermilion design system.
 * Uses a brief entrance delay (120ms) so fast route loads don't flash, exposes proper
 * live-region status semantics, and respects prefers-reduced-motion.
 */
const Loading: React.FC<{ message?: string }> = ({ message }) => {
  const { dict } = useT();
  const label = message ?? dict.ui.loadingPage;

  return (
    <m.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[45vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center"
    >
      <div
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl border border-border bg-card shadow-card"
      >
        <svg viewBox="0 0 36 30" className="h-6 w-7" focusable="false">
          <path
            d="M18 25.5C14 22.8 8.5 22.2 3 23.5V5.5C8.5 4.2 14 4.8 18 7.5C22 4.8 27.5 4.2 33 5.5V23.5C27.5 22.2 22 22.8 18 25.5Z"
            className="fill-none stroke-primary"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 7.5V25.5"
            className="fill-none stroke-primary"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M21 5.6H24.6V17.4L22.8 15.8L21 17.4Z" className="fill-accent" />
        </svg>
      </div>

      <div
        aria-hidden="true"
        className="relative h-[3px] w-28 overflow-hidden rounded-full bg-lapis-tint dark:bg-surface-2"
      >
        <m.span
          className="absolute inset-y-0 left-0 w-[42%] rounded-full bg-primary motion-reduce:w-full motion-reduce:opacity-50"
          initial={{ x: "-110%" }}
          animate={{ x: "260%" }}
          transition={{ duration: 1.05, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </m.div>
  );
};

export default Loading;
