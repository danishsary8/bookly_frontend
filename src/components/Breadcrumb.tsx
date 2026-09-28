import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

/*
 * MASTER §6.9: full trail on desktop; below 640px it collapses to a single
 * "← Back to {parent}" link. The current page is plain text with aria-current.
 */

export interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumb = ({ items }: { items: Crumb[] }) => {
  const parent = [...items].reverse().find((item) => item.to);

  return (
    <nav aria-label="Breadcrumb">
      <ol className="hidden flex-wrap items-center gap-x-2 text-sm font-medium sm:flex">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {item.to && !isLast ? (
                <Link to={item.to} className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="max-w-[24ch] truncate text-foreground">
                  {item.label}
                </span>
              )}
              {!isLast ? <span aria-hidden="true" className="text-muted-foreground">/</span> : null}
            </li>
          );
        })}
      </ol>
      {parent?.to ? (
        <Link to={parent.to} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline sm:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {parent.label}
        </Link>
      ) : null}
    </nav>
  );
};
