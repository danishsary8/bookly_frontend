import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: LucideIcon;
  color?: string;
  trend?: number[];
}

export function StatCard({ label, value, change, isPositive = true, icon: Icon, color = "text-primary", trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="rounded-lg border border-border/50 bg-card shadow-sm p-6 overflow-hidden relative"
    >
      {/* Background gradient accent */}
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative z-10 space-y-4">
        {/* Header with icon and label */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-foreground/70 font-medium">{label}</p>
          </div>
          {Icon && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ${color}`}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
          )}
        </div>

        {/* Main value */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-3xl md:text-4xl font-bold text-foreground">{value}</p>
        </motion.div>

        {/* Change indicator and trend */}
        {change && (
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isPositive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isPositive ? "↑" : "↓"} {change}
            </motion.div>
          </div>
        )}

        {/* Simple trend sparkline */}
        {trend && (
          <svg
            className="w-full h-10 mt-2"
            viewBox="0 0 100 30"
            preserveAspectRatio="none"
          >
            <polyline
              points={trend.map((val, i) => `${(i / (trend.length - 1)) * 100},${30 - (val / 100) * 30}`).join(" ")}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>
    </motion.div>
  );
}
