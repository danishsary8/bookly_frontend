import { motion } from "motion/react";
import { forwardRef } from "react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-ring";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-sm hover:shadow-md",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-95 shadow-sm",
  outline: "border border-border/50 text-foreground hover:bg-background/80 active:scale-95",
  ghost: "text-foreground hover:bg-background/60 active:scale-95",
  danger: "bg-destructive text-white hover:bg-destructive/90 active:scale-95 shadow-sm hover:shadow-md",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      icon,
      iconPosition = "left",
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...(props as any)}
      >
        {iconPosition === "left" && icon && (
          <motion.div
            animate={loading ? { rotate: 360 } : {}}
            transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            {icon}
          </motion.div>
        )}
        {children}
        {iconPosition === "right" && icon && (
          <motion.div
            animate={loading ? { rotate: 360 } : {}}
            transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            {icon}
          </motion.div>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
