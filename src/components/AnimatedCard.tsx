import { motion } from "framer-motion";
import type { MotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface AnimatedCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "lift" | "scale" | "slide";
}

const variants = {
  lift: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    whileHover: { y: -4, transition: { duration: 0.2 } },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  },
  slide: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    whileHover: { x: 4, transition: { duration: 0.2 } },
  },
};

export function AnimatedCard({
  children,
  className,
  delay = 0,
  variant = "lift",
  ...motionProps
}: AnimatedCardProps) {
  const selectedVariant = variants[variant];

  return (
    <motion.div
      initial={selectedVariant.initial}
      animate={selectedVariant.animate}
      whileHover={selectedVariant.whileHover}
      transition={{ duration: 0.4, delay: delay * 0.05 }}
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
