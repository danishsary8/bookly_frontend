import type { ReactNode } from "react";
import { m } from "motion/react";

/*
 * Wrapper that carries the shared layoutId for the cover morph. It wraps
 * BookCoverImage (which owns the image fallback + cache-busting) rather than
 * replacing it with a bare motion.img. MASTER §5 timing: ease-out, 450ms.
 *
 * Keyed by layoutId: motion registers a shared-layout element when it mounts, so a
 * card that *becomes* the morph source (layoutId: undefined → "book-cover-7") must
 * remount to join the shared-layout stack before navigation snapshots it.
 */
export const MorphCover = ({ layoutId, className, children }: { layoutId?: string; className?: string; children: ReactNode }) => (
  <m.div key={layoutId ?? "static"} layoutId={layoutId} className={className} transition={{ layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}>
    {children}
  </m.div>
);
