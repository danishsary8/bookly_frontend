import { motion } from "motion/react";
import React, { forwardRef } from "react";
import { cn } from "../lib/utils";

interface SmoothInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <motion.div className="w-full">
        {label && (
          <motion.label
            className="block text-sm font-medium text-foreground mb-2"
            animate={{
              color: isFocused ? "var(--primary)" : "var(--foreground)",
            }}
          >
            {label}
          </motion.label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <motion.input
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg",
              "bg-input border border-border",
              "text-foreground placeholder-muted-foreground",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              error && "border-destructive focus:ring-destructive",
              icon && "pl-10",
              className
            )}
            animate={{
              borderColor: isFocused
                ? "transparent"
                : error
                  ? "var(--destructive)"
                  : "var(--border)",
              boxShadow: isFocused
                ? "0 0 0 3px var(--primary-foreground), 0 0 0 5px var(--primary)"
                : "none",
            }}
            transition={{ duration: 0.2 }}
            {...(props as any)}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    );
  }
);

SmoothInput.displayName = "SmoothInput";
