import { ResultSummary } from "@/features/admin/reportKit";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { opsApi, opsQueries, type Offer, type OfferStatus, type OfferTargetType } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { useT } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
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
  const navigate = useNavigate();
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
          <Button onClick={() => navigate("/admin/offers/new")}>
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
          {offers.data && list.length > 0 ? <ResultSummary items={[
            { label: "Offers", value: list.length },
            { label: "Live offers", value: list.filter((offer) => offer.status === "live").length },
            { label: "Orders with offers", value: list.reduce((total, offer) => total + offer.used_count, 0) },
          ]} /> : null}
          <div className="work-toolbar">
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
                          {o.type === "gift" ? dict.shopExtras.giftType : o.whole_series ? `Full set, save ${pct(o.percent_off)}%` : `Buy ${o.min_quantity}, save ${pct(o.percent_off)}%`}
                          {o.free_delivery ? " + free delivery" : null}
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
                            <Button size="icon" variant="ghost" aria-label={`Edit ${o.name}`} onClick={() => navigate(`/admin/offers/${o.id}`)}>
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
