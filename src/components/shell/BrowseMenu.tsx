import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover } from "radix-ui";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Header "Browse ▾": a panel with the shop's top categories (from the API's category tree, a few sub-genres each)
 * and quick links (all books, best rated, series). Opens on click, or on hover after a short pause with a mouse;
 * closes on leave, Escape, or navigation. Motion: .nav-pop (fade + 6px drop), off with reduced motion.
 */
export function BrowseMenu({ className }: { className?: string }) {
  const { dict } = useT();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const tree = useQuery({ ...catalogQueries.categoryTree(), enabled: open });
  const top = (tree.data ?? []).filter((c) => c.slug).slice(0, 6);
  // If categories cannot load (or there are none), the panel shows just the quick links.
  const showCategories = !tree.isError && (tree.isLoading || top.length > 0);
  const newest = new URLSearchParams(location.search).get("sort") === "newest";
  const active = (location.pathname.startsWith("/books") && !newest) || location.pathname.startsWith("/categories") || location.pathname.startsWith("/series");

  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 120 : 180);
  };
  const close = () => setOpen(false);
  const quick = [
    { to: "/books", label: dict.navLinks.allBooks },
    { to: "/books?sort=rating", label: dict.navLinks.bestRated },
    { to: "/series", label: dict.navLinks.series },
  ];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div onPointerEnter={hover(true)} onPointerLeave={hover(false)} className={className}>
        <Popover.Trigger
          className={cn(
            "nav-link group inline-flex h-11 items-center gap-1 rounded-md px-3 text-[15px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
            active || open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          data-active={active || undefined}
        >
          {dict.navLinks.browse}
          <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={10}
            onPointerEnter={hover(true)}
            onPointerLeave={hover(false)}
            className={cn(
              "nav-pop z-(--z-header) rounded-2xl border border-border bg-card p-2 shadow-[0_24px_48px_-24px_rgb(20_32_122/0.35)] outline-none",
              showCategories ? "w-[min(44rem,calc(100vw-2rem))]" : "w-60",
            )}
          >
            <div className={cn("grid gap-2", showCategories && "sm:grid-cols-[1fr_13rem]")}>
              {showCategories ? (
              <div className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dict.nav.categories}</p>
                {tree.isLoading ? (
                  <div className="grid grid-cols-2 gap-3" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-5 animate-pulse rounded bg-muted" />)}
                  </div>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {top.map((category) => (
                      <li key={category.id}>
                        <Link to={`/categories/${category.slug}`} onClick={close} className="text-[15px] font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline">
                          {category.name}
                        </Link>
                        {category.children?.length ? (
                          <ul className="mt-1.5 grid gap-1">
                            {category.children.slice(0, 3).map((child) => (
                              <li key={child.id}>
                                <Link to={`/categories/${child.slug}`} onClick={close} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              ) : null}
              <div className="grid content-start gap-1 rounded-xl bg-muted/60 p-3">
                {quick.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className="group/q flex min-h-10 items-center justify-between rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
                  >
                    {item.label}
                    <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover/q:translate-x-0 group-hover/q:opacity-100" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}
