import { useQuery } from "@tanstack/react-query";
import { Eye, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n";
import { Link } from "react-router-dom";
import { opsQueries } from "@/api/endpoints/staffOps";
import { ReturnStatusBadge } from "@/components/orders/ReturnStatusBadge";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { usePortalPath } from "@/features/admin/portal";
import { ListState, SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { formatUsd } from "@/stores/currency";

// "open" stays the default (new requests); approved returns that still need a refund get their own tab (owner 2026-11-17).
const FILTERS = ["open", "approved", "refunded", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

/*
 * /admin/returns: return requests, "Needs action" (requested) first by default;
 * search by order number or customer.
 */
export default function ReturnsAdminPage() {
  const t = useT().dict.returnsAdmin;
  const toPortal = usePortalPath();
  const STATUSES = [
    { value: "open" as const, label: t.newRequests },
    { value: "approved" as const, label: t.toRefund },
    { value: "refunded" as const, label: t.refunded },
    { value: "rejected" as const, label: t.rejected },
    { value: "all" as const, label: t.all },
  ];
  const { get, page, set, hrefFor } = useListParams();
  const raw = get("status") as Filter;
  const filter: Filter = FILTERS.includes(raw) ? raw : "open";
  const q = get("q");
  const status = filter === "all" ? undefined : filter === "open" ? "requested" : filter;
  const returns = useQuery(opsQueries.returns({ status, q: q || undefined, page, per_page: 20 }));
  const meta = returns.data?.meta;
  const list = returns.data?.data ?? [];

  return (
    <AdminPage title="Returns" lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "return" : "returns") : "Requests to send books back."}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search returns" value={q} placeholder="Order number, customer name or email" onSearch={(v) => set({ q: v || undefined })} />
        <Segmented label="Status" value={filter} options={[...STATUSES]} onChange={(v) => set({ status: v === "open" ? undefined : v })} />
      </div>
      <ListState
        query={returns}
        empty={{ when: list.length === 0, icon: RotateCcw, title: filter === "open" ? "Nothing waiting" : "No returns match", description: filter === "open" ? "New return requests show up here." : "Try another status or search." }}
      >
        <TableCard stale={returns.isPlaceholderData} minWidth={980}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={th}>Return</th>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>{t.books}</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={`${th} text-right`}>Refund</th>
              <th scope="col" className={th}>Requested</th>
              <th scope="col" className={th}><span className="sr-only">{t.review}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-surface-2/60">
                <th scope="row" className={`${td} whitespace-nowrap font-normal`}>
                  <Link to={toPortal(`returns/${r.id}`)} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                    Return #{r.id}
                  </Link>
                  <span className="block text-sm tabular-nums text-muted-foreground">{r.order_number}</span>
                </th>
                <td className={td}>
                  <span className="block">{r.customer?.name}</span>
                  <span className="block text-sm text-muted-foreground">{r.customer?.email}</span>
                </td>
                <td className={`${td} max-w-[18rem]`}>
                  <span className="block truncate font-medium">
                    {r.items?.[0]?.title}
                    {(r.items?.length ?? 0) > 1 ? <span className="text-muted-foreground"> {t.more.replace("{n}", String((r.items?.length ?? 1) - 1))}</span> : null}
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">“{r.reason}”</span>
                </td>
                <td className={td}>
                  <ReturnStatusBadge status={r.status} />
                </td>
                <td className={`${td} text-right tabular-nums`}>
                  <span className="font-semibold">{formatUsd(r.refund_amount_usd)}</span>
                  <span className="block text-xs text-muted-foreground">{r.is_refund_final ? "paid" : "estimate"}</span>
                </td>
                <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{orderDate(r.requested_at)}</td>
                <td className={td}>
                  <Link to={toPortal(`returns/${r.id}`)} className={buttonVariants({ variant: r.status === "requested" || r.status === "approved" ? "default" : "outline", size: "sm" })} aria-label={`${t.review} return #${r.id}`}>
                    <Eye aria-hidden="true" /> {t.review}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
    </AdminPage>
  );
}
