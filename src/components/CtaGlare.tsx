import type { ReactNode } from "react";
import GlareHover from "./GlareHover";
import { cn } from "@/lib/utils";

/*
 * MASTER §5 GlareHover preset: only ever wraps the single vermilion CTA in a view.
 * White sweep at −30°, 35% opacity, 700ms. Under reduced motion the global CSS guard
 * collapses the sweep's transition to ~0ms, so no glare is visible.
 */
export const CtaGlare = ({ children, block = false, className }: { children: ReactNode; block?: boolean; className?: string }) => (
  <GlareHover
    width={block ? "100%" : "auto"}
    height="auto"
    background="transparent"
    borderColor="transparent"
    borderRadius="var(--radius-lg)"
    glareColor="#FFFFFF"
    glareOpacity={0.35}
    glareAngle={-30}
    transitionDuration={700}
    className={cn("border-0", block && "w-full", className)}
  >
    {children}
  </GlareHover>
);
