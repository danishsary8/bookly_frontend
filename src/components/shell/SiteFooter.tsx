import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Wordmark } from "./SiteHeader";
import { footerNav, legalNav } from "./nav";

/*
 * MASTER §6.13: Daylight --lapis-tint background, Night --card with a top
 * hairline. Brand column + 3 link columns → one column on mobile.
 */

const linkClass =
  "inline-flex min-h-11 items-center rounded-sm text-[15px] text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9";

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={cn("mt-24 bg-lapis-tint dark:border-t dark:border-border dark:bg-card", className)}>
      <div className="container-shell grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
        <div className="grid content-start gap-4">
          <Wordmark />
          <p className="max-w-xs text-[15px] leading-6 text-muted-foreground">
            New and loved books, delivered across Cambodia. Prices in US dollars or riel, cash on delivery.
          </p>
        </div>
        {footerNav.map((column) => (
          <nav key={column.title} aria-labelledby={`footer-${column.title}`}>
            <h2 id={`footer-${column.title}`} className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {column.title}
            </h2>
            <ul className="mt-3 grid gap-0.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-shell flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Bookly. All rights reserved.</p>
          <ul className="flex gap-6">
            {legalNav.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
