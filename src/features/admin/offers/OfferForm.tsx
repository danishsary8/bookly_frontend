import { useDeferredValue, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info, Search, Snail, Tag, TrendingDown, X } from "lucide-react";
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
const customerSentence = (n: number, percent: string, label: string | null, endsAt: string | null) =>
  `${label ? `Buy any ${n} from ${label}, save ${percent}%.` : `Buy any ${n} or more books in this offer, save ${percent}% on each.`} Mix and match: they don't have to be the same book.${endsAt ? ` Ends ${orderDate(endsAt)}.` : ""}`;

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
  type: "buy_n_percent" | "gift";
  gift_id: string;
  gift_quantity: string;
  min_subtotal: string;
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
      for (const f of ["name", "applies_to", "min_quantity", "percent_off", "starts_at", "ends_at", "max_orders", "targets", "gift_id", "gift_quantity", "min_subtotal", "type", "whole_series"] as const) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
    },
  });

  const n = Number(v.min_quantity);
  const percentOk = /^\d+(\.\d{1,2})?$/.test(v.percent_off.trim()) && Number(v.percent_off) > 0 && Number(v.percent_off) <= 50;
  const single = v.targets.length === 1 && v.targets[0].type !== "book" ? v.targets[0].label : null;
  const set_ = v.type !== "gift" && v.whole_series; // a set offer: every volume of the chosen series
  const previewOk = v.type !== "gift" && (set_ || (Number.isInteger(n) && n >= 2 && n <= 20)) && percentOk;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    if (!v.name.trim()) e.name = "Give the offer a name (only staff see it).";
    if (!set_ && !(Number.isInteger(n) && n >= (v.type === "gift" ? 1 : 2) && n <= 20)) e.min_quantity = v.type === "gift" ? t.quantityRange : "Enter a whole number from 2 to 20.";
    if (v.type !== "gift" && !percentOk) e.percent_off = "Enter a percent above 0 and at most 50, like 10 or 12.5.";
    if (v.type === "gift" && !v.gift_id) e.gift_id = t.giftType;
    if (v.max_orders.trim() && !(/^\d+$/.test(v.max_orders.trim()) && Number(v.max_orders) >= 1)) e.max_orders = "Enter a whole number, 1 or more.";
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) e.ends_at = "The end must be after the start.";
    if (v.applies_to === "selected" && v.targets.length === 0) e.targets = "Choose at least one book, category or series.";
    if (set_ && (v.applies_to !== "selected" || v.targets.some((target) => target.type !== "series"))) e.whole_series = "A full-set offer is for chosen series only: remove single books and categories.";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      ...(v.type === "gift" || offer?.type === "gift" ? { type: v.type } : {}),
      ...(v.type === "gift" ? { gift_id: Number(v.gift_id), gift_quantity: Number(v.gift_quantity), min_subtotal: v.min_subtotal || null } : {}),
      name: v.name.trim(),
      applies_to: v.applies_to,
      ...(set_ ? {} : { min_quantity: n }),
      ...(v.type !== "gift" ? { whole_series: v.whole_series, free_delivery: v.free_delivery } : {}),
      percent_off: v.type === "gift" ? "0.00" : v.percent_off.trim(),
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
        <Section id="offer-basics" title="Offer" hint="Customers get it by themselves when the cart has enough books from it. It never adds up with a coupon: the customer gets the bigger one.">
          <TextField label="Name" hint="Only staff see it (lists and reports)." value={v.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} maxLength={100} />
          <SelectField label={t.offerType} value={v.type} onChange={(e) => set({ type: e.target.value as Values["type"] })}>
            <option value="buy_n_percent">{t.percentType}</option>
            <option value="gift">{t.giftType}</option>
          </SelectField>
        </Section>

        <Section id="offer-discount" title="Discount">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {set_ ? null : <TextField label="Buy at least (books)" inputMode="numeric" value={v.min_quantity} onChange={(e) => set({ min_quantity: e.target.value })} error={errors.min_quantity} hint={v.type === "gift" ? "1 to 20" : "2 to 20"} />}
            {v.type !== "gift" ? <TextField label="Percent off each book" inputMode="decimal" value={v.percent_off} onChange={(e) => set({ percent_off: e.target.value })} error={errors.percent_off} hint="Up to 50" /> : null}
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
            <div className="grid gap-2">
              <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-[15px] has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.05]">
                <input type="checkbox" className="mt-1 size-4" checked={v.whole_series} onChange={(e) => set({ whole_series: e.target.checked, ...(e.target.checked ? { applies_to: "selected" as const } : {}) })} />
                <span>
                  Full set offer
                  <span className="block text-sm text-muted-foreground">The discount applies only when every volume of a chosen series is in one order. Choose series below.</span>
                </span>
              </label>
              {errors.whole_series ? <p className="text-sm text-destructive">{errors.whole_series}</p> : null}
              <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-[15px] has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.05]">
                <input type="checkbox" className="mt-1 size-4" checked={v.free_delivery} onChange={(e) => set({ free_delivery: e.target.checked })} />
                <span>
                  Free delivery
                  <span className="block text-sm text-muted-foreground">Orders that get this offer pay no delivery fee.</span>
                </span>
              </label>
            </div>
          )}
        </Section>

        <Section id="offer-books" title="Which books">
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

        <Section id="offer-when" title="When and how many">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Starts" optional type="datetime-local" value={v.starts_at} onChange={(e) => set({ starts_at: e.target.value })} error={errors.starts_at} />
            <TextField label="Ends" optional type="datetime-local" value={v.ends_at} onChange={(e) => set({ ends_at: e.target.value })} error={errors.ends_at} />
            <TextField label="Orders allowed" optional inputMode="numeric" hint="Empty for no limit." value={v.max_orders} onChange={(e) => set({ max_orders: e.target.value })} error={errors.max_orders} />
          </div>
        </Section>
      </div>

      <aside className="grid min-w-0 grid-cols-1 gap-4 xl:sticky xl:top-24">
        <section aria-labelledby="offer-preview" className="grid gap-3 desk-card rounded-xl border border-border bg-card p-5">
          <h2 id="offer-preview" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
            What customers see
          </h2>
          {previewOk ? (
            <>
              <div>
                <SaleBadge label={set_ ? `Full set: save ${pct(v.percent_off)}%` : `Buy ${n}, save ${pct(v.percent_off)}%`} />
              </div>
              <p className="flex items-start gap-2 text-[15px] font-medium text-accent-text">
                <Tag className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {set_
                  ? `Buy all volumes of ${single ?? "the series"} together, save ${pct(v.percent_off)}%.`
                  : customerSentence(n, pct(v.percent_off), v.applies_to === "selected" ? single : null, v.ends_at ? new Date(v.ends_at).toISOString() : null)}
                {v.free_delivery ? " + free delivery." : null}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Fill in the number of books and the percent to see the preview.</p>
          )}
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            {v.applies_to === "all" ? "Covers every book in the shop." : v.targets.length ? `Covers ${v.targets.length} chosen ${v.targets.length === 1 ? "item" : "items"}.` : "No books chosen yet."}
          </p>
        </section>
        <label className="flex min-h-11 items-center justify-between gap-4 desk-card rounded-xl border border-border bg-card px-5 py-3">
          <span className="grid">
            <span className="font-semibold">On</span>
            <span className="text-sm text-muted-foreground">Off stops new orders getting it; orders that got it keep their discount.</span>
          </span>
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
