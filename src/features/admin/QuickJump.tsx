import { useDeferredValue, useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookCopy, CornerDownLeft, Package, Search, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { staffApi } from "@/api/endpoints/staff";
import { opsApi } from "@/api/endpoints/staffOps";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { navFor } from "./adminNav";
import { useStaff } from "./staffSession";

/*
 * "Search or jump to… Ctrl K" (BI design 2026-11-01, branch 3, owner's sample): one box for admin pages, orders (by
 * number or customer), books (by title) and customers (by name, email or phone). Ctrl K / Cmd K opens it anywhere in
 * the admin; arrow keys move, Enter opens, Esc closes. Pages filter at once; the API is asked from 2 letters, and only
 * for lists this staff member may see (customers need customers:view on the API; a 403 there just shows nothing).
 */

type Item = { key: string; group: "Pages" | "Orders" | "Books" | "Customers"; label: string; detail?: string; to: string; Icon: React.ComponentType<{ className?: string }> };

const EXTRA_PAGES = [{ to: "/admin/security", label: "Security & sessions" }, { to: "/admin/assistant", label: "Staff assistant" }];

export function QuickJump() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Search or jump to…</span>
        <span className="sr-only sm:hidden">Search or jump to</span>
        <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 font-sans text-xs sm:inline">Ctrl K</kbd>
      </button>
      {open ? <JumpDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function JumpDialog({ onClose }: { onClose: () => void }) {
  const session = useStaff();
  const navigate = useNavigate();
  const listId = useId();
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const q = useDeferredValue(text.trim());
  const search = q.length >= 2;

  const orders = useQuery({ queryKey: ["staff", "jump", "orders", q], queryFn: () => opsApi.orders({ q, per_page: 5 }), enabled: search, retry: false });
  const books = useQuery({ queryKey: ["staff", "jump", "books", q], queryFn: () => staffApi.books({ q, per_page: 5 }), enabled: search, retry: false });
  const customers = useQuery({ queryKey: ["staff", "jump", "customers", q], queryFn: () => opsApi.customers({ q, per_page: 5 }), enabled: search, retry: false });

  const items: Item[] = useMemo(() => {
    const needle = q.toLowerCase();
    const pages = [...navFor(session?.user.role).flatMap((g) => g.items), ...EXTRA_PAGES.map((p) => ({ ...p, Icon: Search }))]
      .filter((p) => !needle || p.label.toLowerCase().includes(needle))
      .slice(0, needle ? 6 : 8)
      .map((p) => ({ key: `page:${p.to}`, group: "Pages" as const, label: p.label, to: p.to, Icon: p.Icon }));
    if (!search) return pages;
    return [
      ...pages,
      ...(orders.data?.data ?? []).map((o) => ({
        key: `order:${o.id}`, group: "Orders" as const, label: o.order_number ?? `#${o.id}`, detail: o.customer?.name ?? o.customer?.email ?? undefined, to: `/admin/orders/${o.id}`, Icon: Package,
      })),
      ...(books.data?.data ?? []).map((b) => ({ key: `book:${b.id}`, group: "Books" as const, label: b.title, to: `/admin/books/${b.id}`, Icon: BookCopy })),
      ...(customers.data?.data ?? []).map((c) => ({
        key: `customer:${c.id}`, group: "Customers" as const, label: c.name, detail: c.email ?? c.phone ?? undefined, to: `/admin/customers/${c.id}`, Icon: UserRound,
      })),
    ];
  }, [q, search, session?.user.role, orders.data, books.data, customers.data]);

  const current = Math.min(active, Math.max(items.length - 1, 0));
  const go = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (items.length ? (Math.min(i, items.length - 1) + step + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[current]);
    }
  };
  const loading = search && (orders.isFetching || books.isFetching || customers.isFetching);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" hideClose className="gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search or jump to</DialogTitle>
        <DialogDescription className="sr-only">Type a page name, an order number, a book title or a customer. Arrow keys move, Enter opens.</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[current] ? `${listId}-${current}` : undefined}
            aria-label="Search or jump to"
            placeholder="Pages, order number, book or customer…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {loading ? <span className="text-xs text-muted-foreground">Searching…</span> : null}
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[22rem] overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{search && !loading ? `Nothing found for “${q}”.` : "Type to search."}</li>
          ) : (
            items.map((item, i) => (
              <li
                key={item.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === current}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[15px]", i === current && "bg-secondary")}
              >
                <item.Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  {item.label}
                  {item.detail ? <span className="ml-2 text-sm text-muted-foreground">{item.detail}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.group}</span>
                {i === current ? <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
