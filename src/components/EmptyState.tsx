import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * MASTER §6.6: a line icon on a lapis-tint halo, a Gloock title, one sentence,
 * one primary action (plus an optional secondary link).
 */

interface EmptyStateProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, secondaryAction, headingLevel = "h2", className }: EmptyStateProps) => {
  const Heading = headingLevel;
  return (
    <div className={cn("mx-auto grid max-w-md justify-items-center gap-3 px-4 py-12 text-center", className)}>
      <div className="mb-2 grid h-24 w-24 place-items-center rounded-full bg-lapis-tint text-primary">
        <Icon className="h-11 w-11" strokeWidth={1.5} aria-hidden={true} />
      </div>
      <Heading className="text-[1.563rem] leading-tight text-foreground">{title}</Heading>
      <p className="text-base text-muted-foreground">{description}</p>
      {action || secondaryAction ? (
        <div className="mt-3 grid justify-items-center gap-1">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
};
