import { Banknote, QrCode, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Wordmark } from "./SiteHeader";
import { footerNav, legalNav } from "./nav";
import { useT } from "@/i18n";
import { NewsletterSignup } from "./NewsletterSignup";
import { StoreRatingBadge } from "@/components/ratings/StoreRatingBadge";

/*
 * MASTER §6.13 footer, refined: a newsletter band on a card at the top, then the brand column (wordmark, tagline,
 * store rating, how you can pay) beside three link columns, then a slim legal bar.
 * Daylight --lapis-tint background, Night --card with a top hairline. One column on mobile.
 */

const linkClass =
  "group inline-flex min-h-11 items-center rounded-sm text-[15px] text-foreground/80 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9";

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  const { dict } = useT();
  const f = dict.footer;
  return (
    <footer className={cn("mt-16 bg-lapis-tint dark:border-t dark:border-border dark:bg-card", className)}>
      <div className="container-shell pt-14">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_18px_40px_-30px_rgb(20_32_122/0.35)] sm:p-8">
          <NewsletterSignup wide />
        </div>
      </div>

      <div className="container-shell grid gap-12 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)] md:gap-8">
        <div className="grid content-start gap-4">
          <Wordmark />
          <p className="max-w-xs text-[15px] leading-6 text-muted-foreground">{f.tagline}</p>
          <StoreRatingBadge />
          <div className="mt-1 grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{f.weAccept}</p>
            <ul className="flex flex-wrap gap-2">
              {[
                { Icon: Banknote, label: f.cod },
                { Icon: QrCode, label: f.khqr },
                { Icon: Truck, label: f.allProvinces },
              ].map(({ Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                  <Icon className="size-3.5 text-primary" aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {footerNav.map((column) => (
          <nav key={column.title} aria-labelledby={`footer-${column.title}`}>
            <h2 id={`footer-${column.title}`} className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {dict.navLinks[column.title]}
            </h2>
            <ul className="mt-4 grid gap-0.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    <span className="h-px w-0 bg-primary transition-[width,margin] duration-300 group-hover:mr-1.5 group-hover:w-3" aria-hidden="true" />
                    {dict.navLinks[link.label]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-shell flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Bookly. {f.rights}</p>
          <ul className="flex gap-6">
            {legalNav.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">
                  {dict.navLinks[link.label]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
