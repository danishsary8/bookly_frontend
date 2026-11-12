import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { cn } from "@/lib/utils";

/*
 * Top of a buying page (cart, checkout): breadcrumb, the page's only h1 and an `aside` on the right (the checkout
 * progress rail). Catalogue pages use CatalogueHeader instead.
 */
export function PageHeader({ crumbs, title, aside, className }: { crumbs?: Crumb[]; title: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <header className={cn("grid gap-3 pb-8 pt-6 sm:pt-8", className)}>
      {crumbs ? <Breadcrumb items={crumbs} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-3xl font-display text-[2.441rem] leading-[1.1] text-foreground sm:text-[3.052rem]">{title}</h1>
        {aside}
      </div>
    </header>
  );
}
