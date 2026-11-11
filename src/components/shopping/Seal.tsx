import { m } from "motion/react";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* A success seal whose ring and check draw themselves in (Motion `m`; reduced motion shows it finished). pages/shopping.md. */
export function Seal({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-16 shrink-0 place-items-center rounded-full bg-success-tint text-success", className)} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="size-full">
        <m.circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.7, ease: ease.out }} />
        <m.path d="M15 24.5l6 6 12-13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.55, ease: ease.out }} />
      </svg>
    </span>
  );
}
