import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * Book detail cover stage (pages/book.md): the cover's own colours, hugely blurred, bleed into the panel like ink on
 * paper; the book has a page-edge thickness and a floor shadow, and tilts gently towards the pointer (±8°).
 * Reduced motion: no bleed animation, no tilt.
 */
export function BookStage({ cover, children, className }: { cover?: string | null; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const book = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse" || !book.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    book.current.style.transform = `rotateY(${(-14 + x * 16).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (book.current) book.current.style.transform = "";
  };

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("relative isolate overflow-hidden rounded-2xl border border-border bg-surface-2 px-8 py-12 [perspective:1400px]", className)}
    >
      {cover ? (
        <img src={cover} alt="" aria-hidden="true" className="ink-bleed pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-45 blur-3xl saturate-150" />
      ) : null}
      <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_45%,transparent,var(--surface-2)_95%)]" aria-hidden="true" />

      <div ref={book} className="book-3d relative mx-auto w-full max-w-[290px] [transform-style:preserve-3d]">
        {children}
        {/* page block on the right edge, so the cover reads as a real, thick book */}
        <span
          aria-hidden="true"
          className="absolute right-0 top-[1.5%] h-[97%] w-[18px] origin-left [transform:rotateY(90deg)] bg-[repeating-linear-gradient(90deg,#f6f0e2_0_1px,#e6dcc6_1px_2px)] shadow-[inset_0_0_6px_rgb(0_0_0/0.15)]"
        />
      </div>
      <span className="pointer-events-none absolute bottom-7 left-1/2 h-8 w-3/5 -translate-x-1/2 rounded-[50%] bg-black/30 blur-xl" aria-hidden="true" />
    </div>
  );
}
