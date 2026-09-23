import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rect" | "card";
}

export function Skeleton({ className = "", variant = "rect" }: SkeletonProps) {
  const baseClasses = "bg-muted rounded";

  const variantClasses: Record<string, string> = {
    text: "h-4 w-full rounded",
    circular: "h-10 w-10 rounded-full",
    rect: "h-16 w-full rounded-lg",
    card: "h-48 w-full rounded-lg",
  };

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-card p-6 shadow-sm">
      <Skeleton variant="text" className="h-6 w-2/3" />
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-5/6" />
      <div className="flex gap-2 pt-4">
        <Skeleton variant="rect" className="h-10 flex-1 rounded-lg" />
        <Skeleton variant="rect" className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
