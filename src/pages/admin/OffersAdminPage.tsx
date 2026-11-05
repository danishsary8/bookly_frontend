import { useDeferredValue, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, Pencil, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { catalogQueries } from "@/api/endpoints/catalog";
import { staffApi } from "@/api/endpoints/staff";
import { opsApi, opsQueries, type Offer, type OfferInput, type OfferStatus, type OfferTargetType } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { SaleBadge } from "@/components/BookBadge";
import { SelectField, TextField } from "@/components/form/Field";
import { giftsApi } from "@/api/endpoints/gifts";
import { useT } from "@/i18n";
import { FormAlert } from "@/components/form/FormAlert";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

/*
 * /admin/offers: automatic offers ("Buy 2, save 15%"), backend spec docs/superpowers/specs/2026-10-31-offers-design.md.
 * Same shape as Coupons (owner 2026-11-01: 1A table + dialog, 2A one search box for books, categories and series,
 * 3A live preview, 4A on/off switch in each row with a confirm before turning ON, 5A next to Coupons).
 * Staff see the list; only admins create, change, pause or delete (the API enforces it too).
 */

const pct = (percent: string | number) => String(Number(percent));

const STATUS: Record<OfferStatus, { label: string; tone: "success" | "warning" | "neutral"; live?: boolean }> = {
  live: { label: "Live", tone: "success", live: true },
  scheduled: { label: "Scheduled", tone: "warning" },
  paused: { label: "Paused", tone: "neutral" },
  ended: { label: "Ended", tone: "neutral" },
  used_up: { label: "Used up", tone: "neutral" },
  no_books: { label: "No books", tone: "warning" },
};

const TYPE_LABEL: Record<OfferTargetType, string> = { book: "Book", category: "Category", series: "Series" };

/** "All books" or "Series: Sherlock Holmes, Book: Emma (+2 more)". */
const coverage = (o: Offer) => {
  if (o.applies_to === "all") return "All books";
  const names = o.targets.map((t) => `${TYPE_LABEL[t.type]}: ${t.label ?? `#${t.id}`}${t.in_trash ? " (in trash)" : ""}`);
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} (+${names.length - 2} more)` : names.join(", ") || "Nothing chosen";
};

/** The sentence customers see on a book page (the shop writes the same words in en.ts `offers.bookLine`). */
const customerSentence = (n: number, percent: string, label: string | null, endsAt: string | null) =>
  `${label ? `Buy ${n} from ${label}, save ${percent}%.` : `Buy ${n} or more books in this offer, save ${percent}% on each.`}${endsAt ? ` Ends ${orderDate(endsAt)}.` : ""}`;

const toLocalInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

type Pick = { type: OfferTargetType; id: number; label: string };

/** One search box for books, categories and series; picks are removable chips. */
function TargetPicker({ value, onChange, error }: { value: Pick[]; onChange: (next: Pick[]) => void; error?: string }) {
  const [text, setText] = useState("");
  const q = useDeferredValue(text.trim());
  const categories = useQuery(catalogQueries.categories());
  const series = useQuery(catalogQueries.seriesList({ per_page: 100 }));
  const books = useQuery({
    queryKey: ["staff", "offers", "book-search", q],
    queryFn: () => staffApi.books({ q, per_page: 8 }),
    enabled: q.length >= 2,
  });
  const has = (p: Pick) => value.some((v) => v.type === p.type && v.id === p.id);
  const needle = q.toLowerCase();
  const results: Pick[] =
    q.length < 2
      ? []
      : [
          ...(series.data?.data ?? []).filter((s) => s.name?.toLowerCase().includes(needle)).map((s) => ({ type: "series" as const, id: s.id!, label: s.name ?? "" })),
          ...(categories.data ?? []).filter((c) => c.name?.toLowerCase().includes(needle)).map((c) => ({ type: "category" as const, id: c.id!, label: c.name ?? "" })),
          ...(books.data?.data ?? []).map((b) => ({ type: "book" as const, id: b.id, label: b.title })),
        ]
          .filter((p) => !has(p))
          .slice(0, 12);

  return (
    <div className="grid gap-2">
      <label htmlFor="offer-target-search" className="text-sm font-semibold">
        Books, categories or series
      </label>
      {value.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen">
          {value.map((p) => (
            <li key={`${p.type}:${p.id}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 py-1 pl-3 pr-1 text-sm">
              <span className="text-muted-foreground">{TYPE_LABEL[p.type]}:</span> {p.label}
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${p.label}`} onClick={() => onChange(value.filter((v) => !(v.type === p.type && v.id === p.id)))}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="offer-target-search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type 2+ letters: Holmes, Philosophy, Emma…"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "offer-target-error" : undefined}
          className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
        />
      </div>
      {results.length ? (
        <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-md border border-border bg-card p-1" aria-label="Search results">
          {results.map((p) => (
            <li key={`${p.type}:${p.id}`}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, p]);
                  setText("");
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[p.type]}</span>
                <span className="truncate">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : q.length >= 2 && !books.isFetching ? (
        <p className="text-sm text-muted-foreground">Nothing found for “{q}”.</p>
      ) : null}
      {error ? (
        <p id="offer-target-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Values = {
  type: "buy_n_percent" | "gift";
  gift_id: string;
  gift_quantity: string;
  min_subtotal: string;
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

function OfferDialog({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const { dict } = useT();
  const t = dict.shopExtras;
  const queryClient = useQueryClient();
  const [v, setV] = useState<Values>({
    type: offer?.type ?? "buy_n_percent",
    gift_id: String(offer?.gift_id ?? ""),
    gift_quantity: String(offer?.gift_quantity ?? 1),
    min_subtotal: offer?.min_subtotal ?? "",
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
      for (const f of ["name", "applies_to", "min_quantity", "percent_off", "starts_at", "ends_at", "max_orders", "targets", "gift_id", "gift_quantity", "min_subtotal", "type"] as const) {
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
  const previewOk = v.type !== "gift" && Number.isInteger(n) && n >= 2 && n <= 20 && percentOk;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    if (!v.name.trim()) e.name = "Give the offer a name (only staff see it).";
    if (!(Number.isInteger(n) && n >= (v.type === "gift" ? 1 : 2) && n <= 20)) e.min_quantity = v.type === "gift" ? t.quantityRange : "Enter a whole number from 2 to 20.";
    if (v.type !== "gift" && !percentOk) e.percent_off = "Enter a percent above 0 and at most 50, like 10 or 12.5.";
    if (v.type === "gift" && !v.gift_id) e.gift_id = t.giftType;
    if (v.max_orders.trim() && !(/^\d+$/.test(v.max_orders.trim()) && Number(v.max_orders) >= 1)) e.max_orders = "Enter a whole number, 1 or more.";
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) e.ends_at = "The end must be after the start.";
    if (v.applies_to === "selected" && v.targets.length === 0) e.targets = "Choose at least one book, category or series.";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      ...(v.type === "gift" || offer?.type === "gift" ? { type: v.type } : {}),
      ...(v.type === "gift" ? { gift_id: Number(v.gift_id), gift_quantity: Number(v.gift_quantity), min_subtotal: v.min_subtotal || null } : {}),
      name: v.name.trim(),
      applies_to: v.applies_to,
      min_quantity: n,
      percent_off: v.type === "gift" ? "0.00" : v.percent_off.trim(),
      starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
      ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
      max_orders: v.max_orders.trim() ? Number(v.max_orders) : null,
      is_active: v.is_active,
      ...(v.applies_to === "selected" ? { targets: v.targets.map(({ type, id }) => ({ type, id })) } : {}),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="lg">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{offer ? `Edit ${offer.name}` : "New offer"}</DialogTitle>
            <DialogDescription>
              Customers get the discount by themselves when the cart has enough books from the offer. It never adds up with a coupon: the customer gets the bigger one.
            </DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert title={errors.form} /> : null}
          <TextField label="Name" hint="Only staff see it (lists and reports)." value={v.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} maxLength={100} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Buy at least (books)" inputMode="numeric" value={v.min_quantity} onChange={(e) => set({ min_quantity: e.target.value })} error={errors.min_quantity} hint="2 to 20" />
            {v.type !== "gift" ? <TextField label="Percent off each book" inputMode="decimal" value={v.percent_off} onChange={(e) => set({ percent_off: e.target.value })} error={errors.percent_off} hint="Up to 50" /> : null}
          </div>
          <SelectField label={t.offerType} value={v.type} onChange={(e) => set({ type: e.target.value as Values["type"] })}>
            <option value="buy_n_percent">{t.percentType}</option><option value="gift">{t.giftType}</option>
          </SelectField>
          {v.type === "gift" ? <div className="grid gap-4">
            <SelectField label={t.giftType} value={v.gift_id} onChange={(e) => set({ gift_id: e.target.value })} error={errors.gift_id}>
              <option value="">—</option>{gifts.data?.map((gift) => <option key={gift.id} value={gift.id}>{gift.name_en} ({gift.stock})</option>)}
            </SelectField>
            <TextField label={t.giftQuantity} type="number" min={1} max={100} value={v.gift_quantity} onChange={(e) => set({ gift_quantity: e.target.value })} error={errors.gift_quantity} />
            <TextField label={t.minSubtotal} inputMode="decimal" value={v.min_subtotal} onChange={(e) => set({ min_subtotal: e.target.value })} error={errors.min_subtotal} />
          </div> : null}
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">Which books</legend>
            <Segmented
              label="Which books"
              value={v.applies_to}
              options={[
                { value: "selected", label: "Chosen books" },
                { value: "all", label: "All books" },
              ]}
              onChange={(val) => set({ applies_to: val })}
            />
          </fieldset>
          {v.applies_to === "selected" ? <TargetPicker value={v.targets} onChange={(targets) => set({ targets })} error={errors.targets} /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Starts" optional type="datetime-local" value={v.starts_at} onChange={(e) => set({ starts_at: e.target.value })} error={errors.starts_at} />
            <TextField label="Ends" optional type="datetime-local" value={v.ends_at} onChange={(e) => set({ ends_at: e.target.value })} error={errors.ends_at} />
            <TextField label="Orders allowed" optional inputMode="numeric" hint="Empty for no limit." value={v.max_orders} onChange={(e) => set({ max_orders: e.target.value })} error={errors.max_orders} />
          </div>

          <section aria-labelledby="offer-preview" className="grid gap-2 rounded-lg border border-dashed border-border bg-surface-1 p-4">
            <h3 id="offer-preview" className="text-sm font-semibold">
              What customers see
            </h3>
            {previewOk ? (
              <>
                <div>
                  <SaleBadge label={`Buy ${n}, save ${pct(v.percent_off)}%`} />
                </div>
                <p className="flex items-start gap-2 text-[15px] font-medium text-accent-text">
                  <Tag className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {customerSentence(n, pct(v.percent_off), v.applies_to === "selected" ? single : null, v.ends_at ? new Date(v.ends_at).toISOString() : null)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Fill in the number of books and the percent to see the preview.</p>
            )}
          </section>

          <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-4 py-2">
            <span className="grid">
              <span className="font-semibold">On</span>
              <span className="text-sm text-muted-foreground">Off stops new orders getting it; orders that got it keep their discount.</span>
            </span>
            <Switch checked={v.is_active} onCheckedChange={(checked) => set({ is_active: checked })} />
          </label>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>
              {offer ? "Save offer" : "Create offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const FILTERS = ["all", "live", "scheduled", "paused", "ended"] as const;

export default function OffersAdminPage() {
  const { dict } = useT();
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const { get, page, set, hrefFor } = useListParams();
  const q = get("q");
  const filter = FILTERS.find((f) => f === get("show")) ?? "all";
  const offers = useQuery(opsQueries.offers({ q: q || undefined, status: filter === "all" ? undefined : filter, page, per_page: 25 }));
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const [turningOn, setTurningOn] = useState<Offer | null>(null);

  const toggle = useMutation({
    mutationFn: ({ offer, on }: { offer: Offer; on: boolean }) => opsApi.updateOffer(offer.id, { is_active: on }),
    onSuccess: (saved) => {
      toast.success(saved.is_active ? `${saved.name} is on` : `${saved.name} is paused`);
      void queryClient.invalidateQueries({ queryKey: ["staff", "offers"] });
    },
    onError: (error) => toast.error({ title: "Couldn't change the offer", description: ApiError.from(error).message }),
    onSettled: () => setTurningOn(null),
  });
  const remove = useMutation({
    mutationFn: (o: Offer) => opsApi.deleteOffer(o.id),
    onSuccess: (_r, o) => {
      toast.success(`${o.name} deleted`);
      void queryClient.invalidateQueries({ queryKey: ["staff", "offers"] });
    },
    onError: (error) => toast.error({ title: "Couldn't delete the offer", description: ApiError.from(error).message }),
    onSettled: () => setDeleting(null),
  });

  const meta = offers.data?.meta;
  const list = offers.data?.data ?? [];
  // Before the backend with offers is deployed, /staff/offers is a 404: say so instead of an error page.
  const notYet = offers.isError && ApiError.from(offers.error).status === 404;

  return (
    <AdminPage
      title="Offers"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "offer" : "offers") : "Automatic discounts like “Buy 2, save 15%”. No code needed."}
      actions={
        isAdmin && !notYet ? (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New offer
          </Button>
        ) : !isAdmin ? (
          <p className="text-sm text-muted-foreground">Only admins create or change offers.</p>
        ) : null
      }
    >
      {notYet ? (
        <EmptyState
          icon={Tag}
          title="Offers are not available yet"
          description="The API on this server does not have offers yet. They appear here once the backend update is deployed."
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox label="Search offers" value={q} placeholder="Name" onSearch={(val) => set({ q: val || undefined })} />
            <Segmented
              label="Show"
              value={filter}
              options={FILTERS.map((f) => ({ value: f, label: f === "all" ? "All" : STATUS[f].label }))}
              onChange={(val) => set({ show: val === "all" ? undefined : val })}
            />
          </div>
          <ListState
            query={offers}
            empty={{ when: list.length === 0, icon: Tag, title: "No offers match", description: q ? "Check the name." : "Create one to sell more books per order." }}
          >
            <TableCard stale={offers.isPlaceholderData} minWidth={900}>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={th}>Offer</th>
                  <th scope="col" className={th}>Books</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={`${th} text-right`}>Orders</th>
                  <th scope="col" className={th}>Ends</th>
                  <th scope="col" className={th}>On</th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((o) => {
                  const status = STATUS[o.status] ?? STATUS.paused;
                  return (
                    <tr key={o.id}>
                      <th scope="row" className={`${td} font-semibold`}>
                        {o.name}
                        <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                          {o.type === "gift" ? dict.shopExtras.giftType : `Buy ${o.min_quantity}, save ${pct(o.percent_off)}%`}
                        </span>
                      </th>
                      <td className={cn(td, "max-w-[18rem] text-sm")}>{coverage(o)}</td>
                      <td className={td}>
                        <Badge tone={status.tone} shape={status.live ? "tint" : "outline"}>
                          {status.live ? <CheckCircle2 aria-hidden="true" /> : <CircleSlash aria-hidden="true" />} {status.label}
                        </Badge>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {o.used_count}
                        {o.max_orders ? ` / ${o.max_orders}` : ""}
                      </td>
                      <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{o.ends_at ? orderDate(o.ends_at) : "No end"}</td>
                      <td className={td}>
                        <Switch
                          checked={o.is_active}
                          disabled={!isAdmin || toggle.isPending}
                          aria-label={`${o.is_active ? "Pause" : "Turn on"} ${o.name}`}
                          onCheckedChange={(on) => (on ? setTurningOn(o) : toggle.mutate({ offer: o, on: false }))}
                        />
                      </td>
                      <td className={td}>
                        {isAdmin ? (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" aria-label={`Edit ${o.name}`} onClick={() => setEditing(o)}>
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button size="icon" variant="ghost" aria-label={`Delete ${o.name}`} onClick={() => setDeleting(o)}>
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          </ListState>
          <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
        </>
      )}
      {editing ? <OfferDialog key={editing === "new" ? "new" : editing.id} offer={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={Boolean(turningOn)}
        onOpenChange={(open) => !open && setTurningOn(null)}
        title={`Turn on ${turningOn?.name ?? "the offer"}?`}
        description={
          turningOn
            ? turningOn.type === "gift" ? dict.shopExtras.giftType : `Customers buying ${turningOn.min_quantity} or more books from ${coverage(turningOn).toLowerCase() === "all books" ? "any books" : coverage(turningOn)} get ${pct(turningOn.percent_off)}% off each, starting now${turningOn.starts_at && new Date(turningOn.starts_at) > new Date() ? ` (from ${orderDate(turningOn.starts_at)})` : ""}.`
            : ""
        }
        confirmLabel="Turn on"
        loading={toggle.isPending}
        onConfirm={() => turningOn && toggle.mutate({ offer: turningOn, on: true })}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "offer"}?`}
        description="Only offers that were never used can be deleted. To stop a used one, pause it with the switch."
        confirmLabel="Delete offer"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AdminPage>
  );
}
