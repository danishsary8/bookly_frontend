import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";
import { staggerDelay, transitions } from "@/lib/motion";

/*
 * Staggered entrance for grids and lists (MASTER §5: 60ms steps; items past the
 * 8th share the 8th's delay). Plays once when the list scrolls into view. Wrap
 * each child in <StaggerItem index={i}>. Reduced motion: shown in place.
 */

const container: Variants = { hidden: {}, visible: {} };

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({ opacity: 1, y: 0, transition: { ...transitions.enter, delay: staggerDelay(index) } }),
};

type StaggerProps = { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" };

export function Stagger({ children, className, as = "div" }: StaggerProps) {
  const Component = motion[as];
  return (
    <Component className={className} variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
      {children}
    </Component>
  );
}

type StaggerItemProps = { children: ReactNode; index: number; className?: string; as?: "div" | "li" };

export function StaggerItem({ children, index, className, as = "div" }: StaggerItemProps) {
  const Component = motion[as];
  return (
    <Component className={className} variants={item} custom={index}>
      {children}
    </Component>
  );
}
