import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ListChecks, Package, Printer, X } from "lucide-react";
import { Link } from "react-router-dom";
import { opsApi, opsQueries } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import type { OrderStatus } from "@/api/types";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { BulkStatusDialog } from "@/features/admin/orders/BulkStatusDialog";
import { useIsNewOrder } from "@/features/admin/orders/newOrders";
import { ListState, SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDateTime } from "@/features/orders/format";
import { MAX_PRINT, staffPrintPath } from "@/features/orders/documents/printLinks";
import { rangeSummary } from "@/lib/pagination";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const STATUSES: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];
const isStatus = (v: string): v is OrderStatus => STATUSES.some((s) => s.value === v && v !== "all");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Phnom_Penh" });
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Phnom_Penh" });

/** Admins: download every order placed between two days as a CSV (the API caps it at 366 days). */
function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!from || !to || to < from) return setError("Choose a start day on or before the end day.");
    setError(null);
    setBusy(true);
    try {
      const blob = await opsApi.exportOrders(from, to);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `orders-${from}-to-${to}.csv` });
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Orders exported");
      onOpenChange(false);
    } catch (err) {
      setError(ApiError.from(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent size="sm">
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Export orders</DialogTitle>
            <DialogDescription>A CSV of every order placed in these days (Phnom Penh time), up to a year at a time.</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={error} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <TextField label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={busy}>
              <Download aria-hidden="true" /> Download CSV
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ticked orders and what to do with them (print, change status); the ticks stay while paging or filtering. */
function SelectionBar({ ids, onStatus, onClear }: { ids: number[]; onStatus: () => void; onClear: () => void }) {
  return (
    <div role="region" aria-label="Selected orders" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-lapis-tint px-4 py-3">
      <p className="font-semibold tabular-nums">
        {ids.length} selected{ids.length >= MAX_PRINT ? ` (the most at once)` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onStatus}>
          <ListChecks aria-hidden="true" /> Change status
        </Button>
        <a href={staffPrintPath("packing-slip", ids)} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Printer aria-hidden="true" /> Print packing slips
        </a>
        <a href={staffPrintPath("invoice", ids)} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <FileText aria-hidden="true" /> Print invoices
        </a>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden="true" /> Clear
        </Button>
      </div>
    </div>
  );
}

/*
 * /admin/orders: every order, newest first; search by order number or customer,
 * filter by status and by the day it was placed. All filters live in the URL.
 * Tick orders to change their status or print their packing slips or invoices together (up to 50).
 * New orders appear by themselves (the admin shell checks every 30 s) with a "New" badge.
 */
export default function OrdersAdminPage() {
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const { get, page, set, hrefFor } = useListParams();
  const rawStatus = get("status");
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const q = get("q");
  const from = get("from");
  const to = get("to");
  const orders = useQuery(opsQueries.orders({ status, q: q || undefined, from: from || undefined, to: to || undefined, page, per_page: 20 }));
  const isNew = useIsNewOrder();
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [changing, setChanging] = useState(false);
  const meta = orders.data?.meta;
  const list = orders.data?.data ?? [];
  const pageIds = list.map((o) => o.id!);
  const onPage = pageIds.filter((id) => selected.includes(id)).length;
  const full = selected.length >= MAX_PRINT;
  const toggle = (id: number, on: boolean) =>
    setSelected((current) => (on ? (current.includes(id) || current.length >= MAX_PRINT ? current : [...current, id]) : current.filter((x) => x !== id)));
  const togglePage = (on: boolean) =>
    setSelected((current) => (on ? [...current, ...pageIds.filter((id) => !current.includes(id))].slice(0, MAX_PRINT) : current.filter((id) => !pageIds.includes(id))));

  return (
    <AdminPage
      title="Orders"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "order" : "orders") : "Every order, newest first."}
      actions={
        isAdmin ? (
          <Button variant="outline" onClick={() => setExporting(true)}>
            <Download aria-hidden="true" /> Export CSV
          </Button>
        ) : null
      }
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox label="Search orders" value={q} placeholder="Order number, customer name or email" onSearch={(v) => set({ q: v || undefined })} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm font-semibold">
              Placed from
              <input type="date" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value || undefined })} className="h-11 rounded-md border border-input bg-card px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              to
              <input type="date" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value || undefined })} className="h-11 rounded-md border border-input bg-card px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            {from || to ? (
              <Button variant="ghost" onClick={() => set({ from: undefined, to: undefined })}>
                Clear dates
              </Button>
            ) : null}
          </div>
        </div>
        <Segmented label="Status" value={status ?? "all"} options={STATUSES} onChange={(v) => set({ status: v === "all" ? undefined : v })} />
        {selected.length ? <SelectionBar ids={selected} onStatus={() => setChanging(true)} onClear={() => setSelected([])} /> : null}
      </div>

      <ListState
        query={orders}
        empty={{ when: list.length === 0, icon: Package, title: "No orders match", description: q || status || from || to ? "Try another search, status or date." : "Orders will show up here as customers place them." }}
      >
        <TableCard stale={orders.isPlaceholderData} minWidth={800}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={`${th} w-12`}>
                <label className="-m-3 grid size-11 cursor-pointer place-items-center">
                  <span className="sr-only">Select every order on this page</span>
                  <Checkbox
                    checked={onPage === 0 ? false : onPage === pageIds.length ? true : "indeterminate"}
                    onCheckedChange={(state) => togglePage(state === true)}
                    disabled={pageIds.length === 0}
                  />
                </label>
              </th>
              <th scope="col" className={th}>Order</th>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={`${th} text-right`}>Total</th>
              <th scope="col" className={th}>Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((o) => (
              <tr key={o.id} className={selected.includes(o.id!) ? "bg-lapis-tint/60" : "hover:bg-surface-2/60"}>
                <td className={`${td} w-12`}>
                  <label className="-m-3 grid size-11 cursor-pointer place-items-center">
                    <span className="sr-only">Select order {o.order_number}</span>
                    <Checkbox
                      checked={selected.includes(o.id!)}
                      onCheckedChange={(state) => toggle(o.id!, state === true)}
                      disabled={full && !selected.includes(o.id!)}
                    />
                  </label>
                </td>
                <th scope="row" className={`${td} font-normal`}>
                  <Link to={`/admin/orders/${o.id}`} className="font-semibold tabular-nums underline-offset-4 hover:text-primary hover:underline">
                    {o.order_number}
                  </Link>
                  {isNew(o.id) ? (
                    <Badge tone="info" shape="solid" className="ml-2 h-5 px-1.5 align-middle tracking-normal">
                      New
                    </Badge>
                  ) : null}
                  <span className="block text-sm text-muted-foreground">
                    {o.item_count} {o.item_count === 1 ? "item" : "items"}
                    {o.coupon_code ? ` · ${o.coupon_code}` : ""}
                  </span>
                </th>
                <td className={td}>
                  <span className="block">{o.customer?.name}</span>
                  <span className="block text-sm text-muted-foreground">{o.customer?.email}</span>
                </td>
                <td className={td}>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{formatUsd(o.total_usd)}</td>
                <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{orderDateTime(o.placed_at)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
      {isAdmin ? <ExportDialog open={exporting} onOpenChange={setExporting} /> : null}
      <BulkStatusDialog
        ids={selected}
        open={changing}
        onOpenChange={setChanging}
        onDone={(result) => setSelected((current) => current.filter((id) => !result.updated.some((u) => u.id === id)))}
      />
    </AdminPage>
  );
}
