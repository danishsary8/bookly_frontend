import { useDeferredValue, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, DollarSign, Gift, Layers, Info, Percent, Search, Snail, Sparkles, Tag, TrendingDown, X } from "lucide-react";
import { catalogQueries } from "@/api/endpoints/catalog";
import { staffApi } from "@/api/endpoints/staff";
import { opsApi, type Offer, type OfferInput, type OfferTargetType } from "@/api/endpoints/staffOps";
import { inventoryApi } from "@/api/endpoints/reports";
import { ApiError } from "@/api/errors";
import { SaleBadge } from "@/components/BookBadge";
import { SelectField, TextField } from "@/components/form/Field";
import { giftsApi } from "@/api/endpoints/gifts";
import { useT } from "@/i18n";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/features/admin/listKit";
import { orderDate } from "@/features/orders/format";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

/*
 * The offer editor as a page (owner 2026-11-17: a page instead of the dialog, clean sections, book search that filters
 * by category, and slow books suggested for a promotion). Used by /admin/offers/new and /admin/offers/:id.
 */

/** A titled card on the offer page. */
function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid min-w-0 grid-cols-1 content-start gap-4 desk-card rounded-xl border border-border bg-card p-5 sm:p-6">
      <header className="grid gap-0.5">
        <h2 id={id} className="font-sans text-[1.0625rem] font-semibold tracking-normal">
          {title}
        </h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

const pct = (percent: string | number) => String(Number(percent));

const TYPE_LABEL: Record<OfferTargetType, string> = { book: "Book", category: "Category", series: "Series" };

/** The sentence customers see on a book page (the shop writes the same words in en.ts `offers.bookLine`). */
const customerSentence = ({
  type,
  n,
  percent,
  amount,
  label,
  endsAt,
}: {
  type: "buy_n_percent" | "buy_n_amount" | "gift" | "bundle_price";
  n: number;
  percent: string;
  amount: string;
  label: string | null;
  endsAt: string | null;
}) => {
  const endsText = endsAt ? ` Ends ${orderDate(endsAt)}.` : "";
  if (type === "bundle_price") {
    const price = Number(amount) > 0 ? `$${Number(amount).toFixed(Number(amount) % 1 === 0 ? 0 : 2)}` : "$0";
    return `${label ? `Pick any ${n} from ${label} for ${price}.` : `Pick any ${n} books in this offer for ${price}.`} Mix and match: they don't have to be the same book.${endsText}`;
  }
  if (type === "buy_n_amount") {
    const formatted = Number(amount) > 0 ? `$${Number(amount).toFixed(2)}` : "$0.00";
    if (n === 1) {
      return label ? `Buy any book from ${label}, save ${formatted}.${endsText}` : `Save ${formatted} on this book.${endsText}`;
    }
    return `${label ? `Buy any ${n} from ${label}, save ${formatted}.` : `Buy any ${n} or more books in this offer, save ${formatted} off your order.`} Mix and match: they don't have to be the same book.${endsText}`;
  }
  if (type === "gift") {
    return `Get a free gift with qualifying orders.${endsText}`;
  }
  if (n === 1) {
    return label ? `Buy any book from ${label}, save ${percent}%.${endsText}` : `Save ${percent}% on this book.${endsText}`;
  }
  return `${label ? `Buy any ${n} from ${label}, save ${percent}%.` : `Buy any ${n} or more books in this offer, save ${percent}% on each.`} Mix and match: they don't have to be the same book.${endsText}`;
};

const toLocalInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

type Pick = { type: OfferTargetType; id: number; label: string };

const TABS: Array<{ type: OfferTargetType; label: string; plural: string }> = [
  { type: "book", label: "Books", plural: "books" },
  { type: "category", label: "Categories", plural: "categories" },
  { type: "series", label: "Series", plural: "series" },
];

/**
 * Choosing what an offer covers (owner 2026-11-16: easy to find, as many as needed). Three tabs (Books, Categories,
 * Series) each show a list straight away (books A–Z, every category, every series); the search box narrows the open
 * tab. Tick rows to add or remove them; "Select all shown" adds the whole visible list. Everything chosen stays above
 * the list as chips, grouped by kind, with a count and "Clear all". A short "How it works" note says that any mix of
 * the covered books counts towards the number (the shop's rule, OfferCalculator::evaluate).
 */
function TargetPicker({ value, onChange, error, n, percent }: { value: Pick[]; onChange: (next: Pick[]) => void; error?: string; n: number; percent: string }) {
  const [tab, setTab] = useState<OfferTargetType>("book");
  const [text, setText] = useState("");
  const q = useDeferredValue(text.trim());
  const needle = q.toLowerCase();
  const categories = useQuery(catalogQueries.categories());
  const series = useQuery(catalogQueries.seriesList({ per_page: 100 }));
  // Books tab: narrow by category, and a "Good for a promotion" view (owner 2026-11-17): slow movers (in stock, no
  // order for 90 days, from the inventory report) followed by slow sellers (fewest copies sold, still in stock).
  const [category, setCategory] = useState("");
  const [promo, setPromo] = useState(false);
  const books = useQuery({
    queryKey: ["staff", "offers", "book-pick", q.length >= 2 ? q : "", category, promo],
    queryFn: () =>
      staffApi.books({
        ...(q.length >= 2 ? { q } : {}),
        ...(category ? { category_id: Number(category) } : {}),
        ...(promo ? { sort: "least_sold" as const, stock: "in" as const } : { sort: "title" as const }),
        per_page: 40,
      }),
    enabled: tab === "book",
    placeholderData: (previous) => previous,
  });
  const slow = useQuery({ queryKey: ["staff", "offers", "slow-movers"], queryFn: () => inventoryApi.get(90), enabled: tab === "book" && promo, staleTime: 300_000, retry: false });
  const key = (p: Pick) => `${p.type}:${p.id}`;
  const chosen = new Set(value.map(key));
  const rows: Array<Pick & { detail?: string; tag?: "slow_mover" | "slow_seller" }> =
    tab === "book"
      ? promo
        ? promoRows(slow.data?.not_selling ?? [], books.data?.data ?? [], needle, category ? new Set((books.data?.data ?? []).map((b) => b.id)) : null)
        : (books.data?.data ?? []).map((b) => ({ type: "book" as const, id: b.id, label: b.title, detail: b.authors?.map((au) => au.name).join(", ") }))
      : tab === "category"
        ? (categories.data ?? []).filter((c) => !needle || c.name?.toLowerCase().includes(needle)).map((c) => ({ type: "category" as const, id: c.id!, label: c.name ?? "" }))
        : (series.data?.data ?? []).filter((x) => !needle || x.name?.toLowerCase().includes(needle)).map((x) => ({ type: "series" as const, id: x.id!, label: x.name ?? "" }));
  const loading = tab === "book" ? books.isPending || (promo && slow.isPending) : tab === "category" ? categories.isPending : series.isPending;
  const toggle = (p: Pick) => onChange(chosen.has(key(p)) ? value.filter((v) => key(v) !== key(p)) : [...value, { type: p.type, id: p.id, label: p.label }]);
  const unchosenShown = rows.filter((r) => !chosen.has(key(r)));
  const count = (type: OfferTargetType) => value.filter((v) => v.type === type).length;
  const tabInfo = TABS.find((x) => x.type === tab)!;

  return (
    <div className="grid gap-3" role="group" aria-labelledby="offer-target-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id="offer-target-title" className="text-sm font-semibold">Books in this offer</p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {value.length ? `${value.length} chosen` : "Nothing chosen yet"}
          {value.length ? (
            <button type="button" onClick={() => onChange([])} className="ml-3 font-semibold text-primary underline-offset-4 hover:underline">
              Clear all
            </button>
          ) : null}
        </p>
      </div>

      {/* How the rule works, in the admin's own numbers. */}
      <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] p-3.5 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="font-semibold">How it works</p>
          <p className="text-muted-foreground">
            Customers can <strong className="font-semibold text-foreground">mix any books in this offer</strong>. &ldquo;Buy {n || "N"}&rdquo; means any {n || "N"} copies from the books, categories and series below; they don&rsquo;t have to be the same book.
            Once the cart has {n || "N"} or more, every one of those books gets {percent ? `${pct(percent)}%` : "the discount"} off.
          </p>
        </div>
      </div>

      {value.length ? (
        <ul className="flex max-h-32 flex-wrap gap-2 overflow-y-auto" aria-label="Chosen">
          {value.map((p) => (
            <li key={key(p)} className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.06] py-1 pl-3 pr-1 text-sm">
              <span className="text-muted-foreground">{TYPE_LABEL[p.type]}:</span> {p.label}
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${p.label}`} onClick={() => toggle(p)}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div role="tablist" aria-label="What to choose" className="grid grid-cols-3 border-b border-border bg-surface-1 p-1">
          {TABS.map((x) => (
            <button
              key={x.type}
              type="button"
              role="tab"
              aria-selected={tab === x.type}
              onClick={() => {
                setTab(x.type);
                setText("");
              }}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                tab === x.type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {x.label}
              {count(x.type) ? <span className="rounded-full bg-primary px-1.5 text-[11px] leading-[18px] text-primary-foreground tabular-nums">{count(x.type)}</span> : null}
            </button>
          ))}
        </div>
        <div className="grid gap-2 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="offer-target-search"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tab === "book" ? "Search titles or authors (2+ letters)" : `Filter ${tabInfo.plural}`}
              aria-label={`Search ${tabInfo.plural}`}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "offer-target-error" : undefined}
              className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
            />
          </div>
          {tab === "book" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="offer-book-category">Category</label>
              <select
                id="offer-book-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `— ${c.name}` : c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-pressed={promo}
                onClick={() => setPromo((on) => !on)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  promo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-surface-2",
                )}
              >
                <TrendingDown className="size-4" aria-hidden="true" /> Good for a promotion
              </button>
            </div>
          ) : null}
          {tab === "book" && promo ? (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
              <Snail className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
              Slow movers first (in stock, no order for 90 days), then slow sellers (fewest copies sold, still in stock).
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{loading ? "Loading…" : `${rows.length} ${tabInfo.plural} shown${tab === "book" && q.length < 2 && !promo ? " (A–Z, first 40)" : ""}`}</span>
            {unchosenShown.length > 1 ? (
              <button type="button" onClick={() => onChange([...value, ...unchosenShown.map(({ type, id, label }) => ({ type, id, label }))])} className="min-h-8 font-semibold text-primary underline-offset-4 hover:underline">
                Select all shown
              </button>
            ) : null}
          </div>
          <ul className="grid max-h-64 gap-0.5 overflow-y-auto overscroll-contain" aria-label={`${tabInfo.label} to choose from`}>
            {rows.map((r) => {
              const on = chosen.has(key(r));
              return (
                <li key={key(r)}>
                  <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors", on ? "bg-primary/[0.07]" : "hover:bg-surface-2")}>
                    <input type="checkbox" checked={on} onChange={() => toggle(r)} className="size-4 shrink-0 accent-[var(--primary)]" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate", on && "font-semibold")}>{r.label}</span>
                      {r.detail ? <span className="block truncate text-xs text-muted-foreground">{r.detail}</span> : null}
                    </span>
                    {r.tag ? (
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", r.tag === "slow_mover" ? "bg-destructive-tint text-destructive" : "bg-warning-tint text-foreground")}>
                        {r.tag === "slow_mover" ? "Not selling" : "Slow seller"}
                      </span>
                    ) : null}
                    {on ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                  </label>
                </li>
              );
            })}
            {!loading && rows.length === 0 ? <li className="px-2.5 py-3 text-sm text-muted-foreground">Nothing found{q ? ` for “${q}”` : ""}.</li> : null}
          </ul>
        </div>
      </div>
      {error ? (
        <p id="offer-target-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type StaffBookRow = { id: number; title: string; authors?: Array<{ name: string }>; sold_recent?: number; variants?: Array<{ stock_quantity?: number }> };

/** Slow movers (dedupe by book) then slow sellers; search and category narrow both. */
function promoRows(
  dead: Array<{ book_id: number; title: string; stock_quantity: number; last_sold_at: string | null }>,
  least: StaffBookRow[],
  needle: string,
  inCategory: Set<number> | null,
): Array<Pick & { detail?: string; tag?: "slow_mover" | "slow_seller" }> {
  const seen = new Set<number>();
  const out: Array<Pick & { detail?: string; tag?: "slow_mover" | "slow_seller" }> = [];
  for (const d of dead) {
    if (seen.has(d.book_id) || (needle && !d.title.toLowerCase().includes(needle)) || (inCategory && !inCategory.has(d.book_id))) continue;
    seen.add(d.book_id);
    out.push({ type: "book", id: d.book_id, label: d.title, tag: "slow_mover", detail: `${d.stock_quantity} in stock · ${d.last_sold_at ? `last sold ${orderDate(d.last_sold_at)}` : "never sold"}` });
  }
  for (const b of least) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    const stock = (b.variants ?? []).reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);
    out.push({ type: "book", id: b.id, label: b.title, tag: "slow_seller", detail: `${b.sold_recent ?? 0} sold in 90 days · ${stock} in stock` });
  }
  return out;
}

type Values = {
  type: "buy_n_percent" | "buy_n_amount" | "gift" | "bundle_price";
  gift_id: string;
  gift_quantity: string;
  min_subtotal: string;
  amount_off: string;
  bundle_price: string;
  whole_series: boolean;
  free_delivery: boolean;
  name: string;
  applies_to: "all" | "selected";
  min_quantity: string;
  percent_off: string;
  starts_at: string;
  ends_at: string;
  max_orders: string;
  is_active: boolean;
  targets: Pick[];
};
type Errors = Partial<Record<keyof Values | "form", string>>;

export function OfferForm({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const { dict } = useT();
  const t = dict.shopExtras;
  const queryClient = useQueryClient();
  const [v, setV] = useState<Values>({
    type: offer?.type ?? "buy_n_percent",
    gift_id: String(offer?.gift_id ?? ""),
    gift_quantity: String(offer?.gift_quantity ?? 1),
    min_subtotal: offer?.min_subtotal ?? "",
    amount_off: offer?.amount_off ? String(Number(offer.amount_off)) : "3.00",
    bundle_price: offer?.bundle_price ? String(Number(offer.bundle_price)) : "20",
    whole_series: offer?.whole_series ?? false,
    free_delivery: offer?.free_delivery ?? false,
    name: offer?.name ?? "",
    applies_to: offer?.applies_to ?? "selected",
    min_quantity: String(offer?.min_quantity ?? 2),
    percent_off: offer ? pct(offer.percent_off) : "10",
    starts_at: toLocalInput(offer?.starts_at ?? null),
    ends_at: toLocalInput(offer?.ends_at ?? null),
    max_orders: offer?.max_orders ? String(offer.max_orders) : "",
    is_active: offer?.is_active ?? false, // new offers start paused: turn them on from the list once checked
    targets: (offer?.targets ?? []).filter((t) => !t.in_trash).map((t) => ({ type: t.type, id: t.id, label: t.label ?? `#${t.id}` })),
  });
  const [errors, setErrors] = useState<Errors>({});
  const gifts = useQuery({ queryKey: ["staff", "gifts"], queryFn: giftsApi.list, enabled: v.type === "gift" });
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));

  const save = useMutation({
    mutationFn: (input: OfferInput) => (offer ? opsApi.updateOffer(offer.id, input) : opsApi.createOffer(input)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "offers"] });
      toast.success(offer ? `${saved.name} saved` : `${saved.name} created`);
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      const next: Errors = {};
      for (const f of ["name", "applies_to", "min_quantity", "percent_off", "amount_off", "bundle_price", "starts_at", "ends_at", "max_orders", "targets", "gift_id", "gift_quantity", "min_subtotal", "type", "whole_series"] as const) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
    },
  });

  const n = Number(v.min_quantity);
  const percentOk = /^\d+(\.\d{1,2})?$/.test(v.percent_off.trim()) && Number(v.percent_off) > 0 && Number(v.percent_off) <= 50;
  const amountOk = /^\d+(\.\d{1,2})?$/.test(v.amount_off.trim()) && Number(v.amount_off) > 0 && Number(v.amount_off) <= 5000;
  const bundleOk = /^\d+(\.\d{1,2})?$/.test(v.bundle_price.trim()) && Number(v.bundle_price) > 0 && Number(v.bundle_price) <= 5000;
  const bundle = v.type === "bundle_price";
  const single = v.targets.length === 1 && v.targets[0].type !== "book" ? v.targets[0].label : null;
  const set_ = v.type === "buy_n_percent" && v.whole_series; // a set offer: every volume of the chosen series
  const previewOk =
    v.type === "gift"
      ? Boolean(v.gift_id)
      : bundle
        ? Number.isInteger(n) && n >= 2 && n <= 20 && bundleOk
        : (set_ || (Number.isInteger(n) && n >= 1 && n <= 20)) &&
          (v.type === "buy_n_amount" ? amountOk : percentOk);

  const money = (x: string) => (Number(x) > 0 ? `$${Number(x).toFixed(Number(x) % 1 === 0 ? 0 : 2)}` : "$0");
  const badgeLabel = () => {
    if (bundle) return `Any ${n} for ${money(v.bundle_price)}`;
    if (v.type === "buy_n_amount") {
      const amt = Number(v.amount_off) > 0 ? `$${Number(v.amount_off).toFixed(Number(v.amount_off) % 1 === 0 ? 0 : 2)}` : "$0";
      return n === 1 ? `Save ${amt}` : `Buy ${n}, save ${amt}`;
    }
    if (v.type === "gift") {
      return "Free gift";
    }
    if (set_) return `Full set: save ${pct(v.percent_off)}%`;
    return n === 1 ? `Save ${pct(v.percent_off)}%` : `Buy ${n}, save ${pct(v.percent_off)}%`;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    if (!v.name.trim()) e.name = "Give the offer a name (only staff see it).";
    if (bundle && !(Number.isInteger(n) && n >= 2 && n <= 20)) {
      e.min_quantity = "A bundle has 2 to 20 books.";
    } else if (!set_ && !(Number.isInteger(n) && n >= 1 && n <= 20)) {
      e.min_quantity = "Enter a whole number from 1 to 20.";
    }
    if (bundle && !bundleOk) e.bundle_price = "Enter the bundle price above $0, like 20 or 19.90.";
    if (v.type === "buy_n_percent" && !percentOk) {
      e.percent_off = "Enter a percent above 0 and at most 50, like 10 or 15.";
    }
    if (v.type === "buy_n_amount" && !amountOk) {
      e.amount_off = "Enter an amount above $0 (e.g. 3.00 for $3 off).";
    }
    if (v.type === "gift" && !v.gift_id) e.gift_id = t.giftType;
    if (v.max_orders.trim() && !(/^\d+$/.test(v.max_orders.trim()) && Number(v.max_orders) >= 1)) e.max_orders = "Enter a whole number, 1 or more.";
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) e.ends_at = "The end must be after the start.";
    if (v.applies_to === "selected" && v.targets.length === 0) e.targets = "Choose at least one book, category or series.";
    if (set_ && (v.applies_to !== "selected" || v.targets.some((target) => target.type !== "series"))) e.whole_series = "A full-set offer is for chosen series only: remove single books and categories.";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      name: v.name.trim(),
      applies_to: v.applies_to,
      ...(set_ ? {} : { min_quantity: n }),
      whole_series: bundle ? false : v.whole_series,
      free_delivery: v.free_delivery,
      percent_off: v.type === "buy_n_percent" ? v.percent_off.trim() : "0.00",
      ...(v.type === "buy_n_amount" ? { type: "buy_n_amount" as const, amount_off: v.amount_off.trim() } : {}),
      ...(bundle ? { type: "bundle_price" as const, bundle_price: v.bundle_price.trim() } : {}),
      ...(v.type === "gift" ? { type: "gift" as const, gift_id: Number(v.gift_id), gift_quantity: Number(v.gift_quantity), min_subtotal: v.min_subtotal || null } : {}),
      starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
      ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
      max_orders: v.max_orders.trim() ? Number(v.max_orders) : null,
      is_active: v.is_active,
      ...(v.applies_to === "selected" ? { targets: v.targets.map(({ type, id }) => ({ type, id })) } : {}),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="offer-form grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <div className="grid min-w-0 grid-cols-1 gap-6">
        {errors.form ? <FormAlert title={errors.form} /> : null}

        {/* Quick promotion templates */}
        <div className="rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/[0.08] via-card to-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 mb-3 border-b border-border/50">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-text flex items-center gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Quick Promotion Templates
            </span>
            <span className="text-xs text-muted-foreground">Click a preset to quickly fill the offer</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set({
                type: "buy_n_percent",
                min_quantity: "1",
                percent_off: "15",
                name: "Clearance: 15% off single book",
                applies_to: "selected",
              })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent-text transition-colors shadow-2xs"
            >
              <Snail className="size-3 text-warning" />
              Clearance (Buy 1, save 15%)
            </button>
            <button
              type="button"
              onClick={() => set({
                type: "buy_n_amount",
                min_quantity: "2",
                amount_off: "3.00",
                name: "Bundle Deal: Buy 2, save $3",
              })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent-text transition-colors shadow-2xs"
            >
              <DollarSign className="size-3 text-accent" />
              Bundle Deal (Buy 2, save $3)
            </button>
            <button
              type="button"
              onClick={() => set({
                type: "bundle_price",
                min_quantity: "5",
                bundle_price: "20",
                whole_series: false,
                name: "Any 5 books for $20",
                applies_to: "selected",
              })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent-text transition-colors shadow-2xs"
            >
              <Layers className="size-3 text-primary" />
              Book bundle (Any 5 for $20)
            </button>
            <button
              type="button"
              onClick={() => set({
                type: "buy_n_percent",
                min_quantity: "3",
                percent_off: "20",
                name: "Volume Saver: Buy 3, save 20%",
              })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent-text transition-colors shadow-2xs"
            >
              <Percent className="size-3 text-emerald-500" />
              Multi-Buy (Buy 3, save 20%)
            </button>
          </div>
        </div>

        <Section id="offer-basics" title="Offer Details" hint="Customers receive this discount automatically at checkout when their cart matches. It does not stack with coupon codes (the best discount wins).">
          <TextField label="Name" hint="Only staff see this name (in admin lists and analytics reports)." value={v.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} maxLength={100} />

          <div className="grid gap-3">
            <SelectField
              label={t.offerType}
              value={v.type}
              onChange={(e) => set({ type: e.target.value as "buy_n_percent" | "buy_n_amount" | "gift" | "bundle_price" })}
            >
              <option value="buy_n_percent">{t.percentType}</option>
              <option value="buy_n_amount">{t.amountType}</option>
              <option value="bundle_price">Bundle price</option>
              <option value="gift">{t.giftType}</option>
            </SelectField>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-4">
              <button
                type="button"
                onClick={() => set({ type: "buy_n_percent" })}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  v.type === "buy_n_percent"
                    ? "border-accent bg-accent/[0.08] ring-2 ring-accent/30 shadow-2xs"
                    : "border-border bg-card hover:bg-surface-2/60"
                )}
              >
                <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", v.type === "buy_n_percent" ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground")}>
                  <Percent className="size-4" />
                </div>
                <div className="grid gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{t.percentType}</span>
                  <span className="text-xs text-muted-foreground">Save % on books</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => set({ type: "buy_n_amount" })}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  v.type === "buy_n_amount"
                    ? "border-accent bg-accent/[0.08] ring-2 ring-accent/30 shadow-2xs"
                    : "border-border bg-card hover:bg-surface-2/60"
                )}
              >
                <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", v.type === "buy_n_amount" ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground")}>
                  <DollarSign className="size-4" />
                </div>
                <div className="grid gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{t.amountType}</span>
                  <span className="text-xs text-muted-foreground">Save fixed $ off</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => set({ type: "bundle_price", whole_series: false, ...(Number(v.min_quantity) < 2 ? { min_quantity: "5" } : {}) })}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  bundle
                    ? "border-accent bg-accent/[0.08] ring-2 ring-accent/30 shadow-2xs"
                    : "border-border bg-card hover:bg-surface-2/60"
                )}
              >
                <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", bundle ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground")}>
                  <Layers className="size-4" />
                </div>
                <div className="grid gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground">Bundle price</span>
                  <span className="text-xs text-muted-foreground">Any 5 for $20</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => set({ type: "gift" })}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  v.type === "gift"
                    ? "border-accent bg-accent/[0.08] ring-2 ring-accent/30 shadow-2xs"
                    : "border-border bg-card hover:bg-surface-2/60"
                )}
              >
                <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", v.type === "gift" ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground")}>
                  <Gift className="size-4" />
                </div>
                <div className="grid gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{t.giftType}</span>
                  <span className="text-xs text-muted-foreground">Free physical item</span>
                </div>
              </button>
            </div>
          </div>
        </Section>

        <Section id="offer-discount" title="Discount Rules">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {set_ ? null : (
              <TextField
                label={bundle ? "Books in the bundle" : "Buy at least (books)"}
                inputMode="numeric"
                value={v.min_quantity}
                onChange={(e) => set({ min_quantity: e.target.value })}
                error={errors.min_quantity}
                hint={bundle ? "2 to 20. Customers pick any of the chosen books." : v.min_quantity === "1" ? "1 book (Single-book clearance deal)" : "1 to 20 books (enter 1 to discount single books)"}
              />
            )}
            {v.type === "buy_n_percent" ? (
              <TextField
                label="Percent off each book (%)"
                inputMode="decimal"
                value={v.percent_off}
                onChange={(e) => set({ percent_off: e.target.value })}
                error={errors.percent_off}
                hint="Up to 50%"
              />
            ) : bundle ? (
              <TextField
                label="Bundle price ($)"
                inputMode="decimal"
                value={v.bundle_price}
                onChange={(e) => set({ bundle_price: e.target.value })}
                error={errors.bundle_price}
                hint={`What ${Number.isInteger(n) && n >= 2 ? n : "the"} books cost together. A bundle never raises a price.`}
              />
            ) : v.type === "buy_n_amount" ? (
              <TextField
                label={t.amountOff}
                inputMode="decimal"
                value={v.amount_off}
                onChange={(e) => set({ amount_off: e.target.value })}
                error={errors.amount_off}
                hint={t.amountOffHint}
              />
            ) : null}
          </div>

          {v.type === "gift" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label={t.giftType} value={v.gift_id} onChange={(e) => set({ gift_id: e.target.value })} error={errors.gift_id} containerClassName="sm:col-span-2">
                <option value="">—</option>
                {gifts.data?.map((gift) => (
                  <option key={gift.id} value={gift.id}>
                    {gift.name_en} ({gift.stock})
                  </option>
                ))}
              </SelectField>
              <TextField label={t.giftQuantity} type="number" min={1} max={100} value={v.gift_quantity} onChange={(e) => set({ gift_quantity: e.target.value })} error={errors.gift_quantity} />
              <TextField label={t.minSubtotal} inputMode="decimal" value={v.min_subtotal} onChange={(e) => set({ min_subtotal: e.target.value })} error={errors.min_subtotal} />
            </div>
          ) : (
            <div className="grid gap-2.5 pt-2">
              {v.type === "buy_n_percent" ? (
                <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border p-3 text-[15px] has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.05] transition-colors">
                  <input type="checkbox" className="mt-1 size-4" checked={v.whole_series} onChange={(e) => set({ whole_series: e.target.checked, ...(e.target.checked ? { applies_to: "selected" as const } : {}) })} />
                  <span>
                    Full set offer
                    <span className="block text-sm text-muted-foreground">The discount applies only when every volume of a chosen series is in one order. Choose series below.</span>
                  </span>
                </label>
              ) : null}
              {errors.whole_series ? <p className="text-sm text-destructive">{errors.whole_series}</p> : null}
              <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border p-3 text-[15px] has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.05] transition-colors">
                <input type="checkbox" className="mt-1 size-4" checked={v.free_delivery} onChange={(e) => set({ free_delivery: e.target.checked })} />
                <span>
                  Free delivery
                  <span className="block text-sm text-muted-foreground">Orders that receive this offer pay zero delivery fee.</span>
                </span>
              </label>
            </div>
          )}
        </Section>

        <Section id="offer-books" title="Which Books">
          <Segmented
            label="Which books"
            value={v.applies_to}
            options={[
              { value: "selected", label: "Chosen books" },
              { value: "all", label: "All books" },
            ]}
            onChange={(val) => set({ applies_to: val })}
          />
          {v.applies_to === "selected" ? <TargetPicker value={v.targets} onChange={(targets) => set({ targets })} error={errors.targets} n={set_ ? 0 : Number(v.min_quantity) || 0} percent={v.percent_off} /> : null}
        </Section>

        <Section id="offer-when" title="Scheduling & Limits">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Starts" optional type="datetime-local" value={v.starts_at} onChange={(e) => set({ starts_at: e.target.value })} error={errors.starts_at} />
            <TextField label="Ends" optional type="datetime-local" value={v.ends_at} onChange={(e) => set({ ends_at: e.target.value })} error={errors.ends_at} />
            <TextField label="Max orders allowed" optional inputMode="numeric" hint="Leave empty for unlimited orders." value={v.max_orders} onChange={(e) => set({ max_orders: e.target.value })} error={errors.max_orders} />
          </div>
        </Section>
      </div>

      {/* Right Column: Adjusted Orange Preview Card & Status */}
      <aside className="grid min-w-0 grid-cols-1 gap-4 xl:sticky xl:top-24">
        <section aria-labelledby="offer-preview" className="grid gap-3.5 desk-card rounded-2xl border border-accent/30 bg-gradient-to-b from-accent/[0.04] to-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
            <h2 id="offer-preview" className="font-sans text-[0.9375rem] font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              What customers see
            </h2>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold tracking-wider text-accent-text uppercase">
              Live Preview
            </span>
          </div>

          {previewOk ? (
            <div className="grid gap-3.5">
              {/* Notched Sale Badge */}
              <div className="flex items-center">
                <SaleBadge label={badgeLabel()} />
              </div>

              {/* Customer marketing line */}
              <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5 text-[14px] leading-relaxed text-accent-text">
                <p className="flex items-start gap-2.5 font-medium">
                  <Tag className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    {set_
                      ? `Buy all volumes of ${single ?? "the series"} together, save ${pct(v.percent_off)}%.`
                      : customerSentence({
                          type: v.type,
                          n,
                          percent: pct(v.percent_off),
                          amount: bundle ? v.bundle_price : v.amount_off,
                          label: v.applies_to === "selected" ? single : null,
                          endsAt: v.ends_at ? new Date(v.ends_at).toISOString() : null,
                        })}
                    {v.free_delivery ? " + free delivery." : null}
                  </span>
                </p>
              </div>

              {/* Price Example Simulation Box */}
              <div className="rounded-xl border border-border/70 bg-surface-2/60 p-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground pb-1 border-b border-border/40">
                  <span>Cart example</span>
                  <span className="font-mono">{n === 1 ? "1 book ($15.00)" : `${n} books ($${bundle ? "6.00" : "15.00"} each)`}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 font-medium">
                  <span className="text-muted-foreground">Discount applied:</span>
                  <span className="font-bold text-accent-text tabular-nums">
                    {bundle
                      ? Number(v.bundle_price) < 6 * n
                        ? `$${(6 * n).toFixed(2)} → $${Number(v.bundle_price).toFixed(2)} (−$${(6 * n - Number(v.bundle_price)).toFixed(2)})`
                        : "None: the books already cost less"
                      : v.type === "buy_n_amount"
                      ? `−$${Number(v.amount_off || 0).toFixed(2)}`
                      : `−$${((15 * n * Number(v.percent_off || 0)) / 100).toFixed(2)} (${pct(v.percent_off)}%)`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Fill in the number of books and discount to see the customer preview.
            </div>
          )}

          <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {v.applies_to === "all"
                ? "Applies to every book in the store."
                : v.targets.length
                  ? `Applies to ${v.targets.length} chosen ${v.targets.length === 1 ? "item" : "items"}.`
                  : "No target books chosen yet."}
            </span>
          </div>
        </section>

        {/* Status On/Off Card */}
        <label className="flex min-h-12 items-center justify-between gap-4 desk-card rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border/80">
          <div className="grid">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Status</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                v.is_active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-800 dark:text-amber-400"
              )}>
                {v.is_active ? "Active" : "Paused"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">
              {v.is_active ? "Live in store for matching orders." : "Paused — new orders won't receive it."}
            </span>
          </div>
          <Switch checked={v.is_active} onCheckedChange={(checked) => set({ is_active: checked })} />
        </label>
      </aside>

      <div className="admin-form-actions flex flex-wrap items-center justify-end gap-3 xl:col-span-2">
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {offer ? "Save offer" : "Create offer"}
        </Button>
      </div>
    </form>
  );
}
