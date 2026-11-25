import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover } from "radix-ui";
import { ArrowRight, ChevronDown, Layers, Library, Star } from "lucide-react";
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
  const newest = ["newest", "best_selling"].includes(new URLSearchParams(location.search).get("sort") ?? "");
  const active = (location.pathname.startsWith("/books") && !newest) || location.pathname.startsWith("/categories") || location.pathname.startsWith("/series");

  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 120 : 180);
  };
  const close = () => setOpen(false);
  const quick = [
    { to: "/books", label: dict.navLinks.allBooks, Icon: Library },
    { to: "/books?sort=rating", label: dict.navLinks.bestRated, Icon: Star },
    { to: "/series", label: dict.navLinks.series, Icon: Layers },
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
              "nav-pop z-(--z-header) overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_28px_60px_-28px_rgb(20_32_122/0.4)] outline-none",
              showCategories ? "w-[min(54rem,calc(100vw-2rem))]" : "w-64",
            )}
          >
            <div className={cn("grid", showCategories && "sm:grid-cols-[minmax(0,1fr)_15rem]")}>
              {showCategories ? (
                <div className="px-7 pb-7 pt-6">
                  <p className="mb-5 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span className="h-px w-5 bg-accent-text" aria-hidden="true" />
                    {dict.nav.categories}
                  </p>
                  {tree.isLoading ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3" aria-hidden="true">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="grid gap-2">
                          <span className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                          <span className="h-3 w-4/5 animate-pulse rounded bg-muted/70" />
                          <span className="h-3 w-3/5 animate-pulse rounded bg-muted/70" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3">
                      {top.map((category) => (
                        <li key={category.id} className="min-w-0">
                          <Link
                            to={`/categories/${category.slug}`}
                            onClick={close}
                            className="group/c inline-flex max-w-full items-center gap-1.5 text-[15px] font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            <span className="truncate">{category.name}</span>
                            <ArrowRight className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/c:translate-x-0 group-hover/c:opacity-100" aria-hidden="true" />
                          </Link>
                          {category.children?.length ? (
                            <ul className="-mx-2 mt-2 grid gap-0.5">
                              {category.children.slice(0, 3).map((child) => (
                                <li key={child.id} className="min-w-0">
                                  <Link
                                    to={`/categories/${child.slug}`}
                                    onClick={close}
                                    title={child.name}
                                    className="block truncate rounded-md px-2 py-1 text-[13.5px] text-muted-foreground transition-colors hover:bg-lapis-tint/60 hover:text-primary"
                                  >
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
              <div className={cn("grid content-start gap-1.5 bg-lapis-tint/45 p-4", showCategories && "sm:border-l sm:border-border/70 sm:py-6")}>
                {quick.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={close}
                    className="group/q flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground transition-[background-color,box-shadow] duration-200 hover:bg-card hover:shadow-[0_6px_16px_-10px_rgb(20_32_122/0.45)]"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-primary ring-1 ring-border/70 transition-colors group-hover/q:bg-primary group-hover/q:text-primary-foreground" aria-hidden="true">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <ArrowRight className="size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover/q:translate-x-0 group-hover/q:opacity-100" aria-hidden="true" />
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
