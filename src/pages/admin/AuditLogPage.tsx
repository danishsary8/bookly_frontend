import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Info, ScrollText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { opsQueries, type AuditEntry } from "@/api/endpoints/staffOps";
import { SelectField, TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, SearchBox } from "@/features/admin/listKit";
import { useListParams } from "@/features/admin/useListParams";
import { orderDateTime } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";

/** entity_type → what staff call it, and where it lives in the admin (if anywhere). */
const ENTITIES: Record<string, { label: string; href?: (id: number) => string }> = {
  order: { label: "Order", href: (id) => `/admin/orders/${id}` },
  order_return: { label: "Return", href: (id) => `/admin/returns/${id}` },
  customer: { label: "Customer", href: (id) => `/admin/customers/${id}` },
  book: { label: "Book", href: (id) => `/admin/books/${id}` },
  book_variant: { label: "Book format" },
  review: { label: "Review" },
  coupon: { label: "Coupon" },
  author: { label: "Author" },
  category: { label: "Category" },
  publisher: { label: "Publisher" },
  series: { label: "Series" },
  staff_user: { label: "Staff member" },
  exchange_rate: { label: "Exchange rate" },
  gift_card: { label: "Gift card", href: () => "/admin/gift-cards" },
  referral: { label: "Referral", href: () => "/admin/referrals" },
  newsletter_campaign: { label: "Campaign", href: () => "/admin/newsletter" },
  offer: { label: "Offer", href: () => "/admin/offers" },
  promotion: { label: "Promotion", href: () => "/admin/promotions" },
  reward_rule: { label: "Reward rule", href: () => "/admin/rewards" },
  book_collection: { label: "Collection", href: () => "/admin/collections" },
  gift: { label: "Gift", href: () => "/admin/gifts" },
};

const entityLabel = (type: string) => ENTITIES[type]?.label ?? type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
/** What the person did, in words: "order.status_changed" → "changed the status of". */
const VERBS: Record<string, string> = {
  status_changed: "changed the status of",
  two_factor_reset: "reset two-step verification for",
  hidden: "hid",
  shown: "showed",
  restocked: "restocked", sale: "allocated stock for", restock: "received stock for", return: "returned stock for", adjustment: "adjusted stock for",
  send: "queued delivery of", test_send: "sent a test for", resend_requested: "requested another delivery of", bulk_updated: "updated", imported_new: "imported", imported_update: "updated",
};
const actionLabel = (code: string) => code === "inventory.sale" ? "Sale / stock allocation" : code === "inventory.restock" ? "Stock received" : code === "inventory.return" ? "Stock returned" : code === "inventory.adjustment" ? "Stock adjustment" : code.replaceAll("_", " ").replaceAll(".", " · ");
const verb = (action: string) => {
  if (action !== "order.status_changed" && action.startsWith("order.status_")) return `recorded ${action.slice("order.status_".length).replaceAll("_", " ")} status for`;
  const key = action.slice(action.indexOf(".") + 1);
  return key === "placed" ? "placed" : VERBS[key] ?? key.replace(/_/g, " ");
};

const show = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/** Fields that changed; for a create or delete, every field on the side that exists. */
function diffRows(entry: AuditEntry) {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => !["id", "updated_at", "created_at"].includes(k));
  return keys.filter((k) => entry.before && entry.after ? show(before[k]) !== show(after[k]) : show((entry.after ?? entry.before ?? {})[k]) !== "—").map((k) => ({ key: k, before: show(before[k]), after: show(after[k]) }));
}

function Entry({ entry }: { entry: AuditEntry }) {
  const meta = ENTITIES[entry.entity_type];
  const target = `${entityLabel(entry.entity_type)}${entry.entity_id ? ` #${entry.entity_id}` : ""}`;
  const href = entry.context?.sku ? `/admin/stock?q=${encodeURIComponent(entry.context.sku)}` : meta?.href && entry.entity_id ? meta.href(entry.entity_id) : undefined;
  const rows = diffRows(entry);
  const sides = entry.before && entry.after ? "both" : entry.after ? "after" : "before";
  return (
    <li className="audit-entry grid min-w-0 gap-2 desk-card rounded-xl border border-border bg-card p-5">
      <p className="text-[15px]">
        <span className="font-semibold">{entry.staff?.name ?? (entry.source && entry.source !== "audit" ? "System / customer order" : "Unavailable staff member")}</span> {verb(entry.action)}{" "}
        {href ? (
          <Link to={href} className="font-semibold text-primary underline-offset-4 hover:underline">
            {target}
          </Link>
        ) : (
          <span className="font-semibold">{target}</span>
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        <time dateTime={entry.created_at}>{orderDateTime(entry.created_at)}</time> · <code className="text-[13px]">{entry.action}</code>
      </p>
      <div className="audit-context">{entry.after?.order_number ? <span>{String(entry.after.order_number)}</span> : null}{entry.after?.sku ? <span>{String(entry.after.sku)}</span> : null}<span>{entry.source === "inventory" ? "Inventory movement" : entry.source === "orders" ? "Order history" : "Staff change"}</span>{entry.after?.book_title ? <Link to={`/admin/books/${entry.after.book_id}`}>{String(entry.after.book_title)}</Link> : null}{entry.after?.quantity_change != null ? <strong className={Number(entry.after.quantity_change) > 0 ? "text-success" : "text-destructive"}>{Number(entry.after.quantity_change) > 0 ? "+" : ""}{String(entry.after.quantity_change)} copies</strong> : null}{entry.after?.reference_type === "order" && entry.after.reference_id ? <Link to={`/admin/orders/${entry.after.reference_id}`}>Order #{String(entry.after.reference_id)}</Link> : null}</div>
      {rows.length ? (
        <details className="group mt-2 min-w-0">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            {rows.length === 1 ? "1 field" : `${rows.length} fields`}
          </summary>
          <div className="audit-diff relative mt-2 rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Field</th>
                  {sides !== "after" ? <th scope="col" className="px-3 py-2 font-semibold">Before</th> : null}
                  {sides !== "before" ? <th scope="col" className="px-3 py-2 font-semibold">After</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key} className="align-top">
                    <th scope="row" title={r.key} className="px-3 py-2 text-[13px] font-medium text-muted-foreground">{r.key.replaceAll("_", " ")}</th>
                    {sides !== "after" ? <td data-label="Before" className={cn("px-3 py-2 [overflow-wrap:anywhere]", sides === "both" && "text-destructive line-through decoration-destructive/40")}>{r.before}</td> : null}
                    {sides !== "before" ? <td data-label="After" className={cn("px-3 py-2 [overflow-wrap:anywhere]", sides === "both" && "font-semibold text-success")}>{r.after}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </li>
  );
}

/*
 * /admin/audit-log (admins only): every change staff made, newest first, with
 * who, what and when, and the fields before and after. Read-only.
 * Filters live in the URL so a link can point at one record's history
 * (?entity_type=order&entity_id=12).
 */
export default function AuditLogPage() {
  const { get, page, set, hrefFor } = useListParams();
  const source = (["all", "audit", "inventory", "orders"].includes(get("source")) ? get("source") : "all") as "all" | "audit" | "inventory" | "orders";
  const q = get("q");
  const staffId = Number(get("staff")) || undefined;
  const entityType = get("entity_type") || undefined;
  const entityId = Number(get("entity_id")) || undefined;
  const action = get("action") || undefined;
  const from = get("from") || undefined;
  const to = get("to") || undefined;
  const log = useQuery(opsQueries.audit({ q: q || undefined, source, actor: get("staff") === "system" ? "system" : undefined, staff_user_id: staffId, action, entity_type: entityType, entity_id: entityId, from, to, page, per_page: 30 }));
  const members = useQuery(opsQueries.members({ per_page: 100 }));
  const meta = log.data?.meta;
  const list = log.data?.data ?? [];
  const actors = meta?.actors ?? members.data?.data ?? [];
  const filtered = Boolean(q || source !== "all" || get("staff") || action || entityType || entityId || from || to);
  const from1 = meta ? (meta.current_page - 1) * (meta.per_page ?? 30) + 1 : 0;

  return (
    <AdminPage
      title="Audit log"
      lead={meta && meta.total ? rangeSummary(from1, from1 + list.length - 1, meta.total, meta.total === 1 ? "event" : "events") : "Trace staff changes and inventory movements, with who, what and when."}
    >
      <div className="work-toolbar"><SearchBox label="Search activity" value={q} placeholder="Action, staff name, title, SKU, supplier or record number" onSearch={(value) => set({ q: value || undefined })} /><SelectField label="Activity source" value={source} onChange={(e) => set({ source: e.target.value === "all" ? undefined : e.target.value, action: undefined, entity_type: undefined, entity_id: undefined })}><option value="all">All activity</option><option value="audit">Staff changes</option><option value="inventory" disabled={!!meta && !meta.sources?.includes("inventory")}>Inventory movements</option><option value="orders" disabled={!!meta && !meta.sources?.includes("orders")}>Order history / sales</option></SelectField></div>
      <div className="admin-filter-grid desk-card rounded-xl border border-border bg-card p-4">
        <SelectField label="Staff member" value={get("staff")} onChange={(e) => set({ staff: e.target.value || undefined })}>
          <option value="">Everyone</option>
          <option value="system">System / customer orders</option>
          {staffId && !actors.some((member) => member.id === staffId) ? <option value={staffId}>Staff member #{staffId}</option> : null}
          {actors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Kind of record" value={entityType ?? ""} onChange={(e) => set({ entity_type: e.target.value || undefined, entity_id: undefined })}>
          <option value="">Everything</option>
          {[...new Set([...(meta?.entity_types ?? []), ...(entityType ? [entityType] : [])])].map((t) => (
            <option key={t} value={t}>
              {entityLabel(t)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Action" value={action ?? ""} onChange={(e) => set({ action: e.target.value || undefined })}><option value="">Every action</option>{[...new Set([...(meta?.actions ?? []), ...(action ? [action] : []), "book_variant.restocked", "order.status_changed"])].sort().map((code) => <option key={code} value={code}>{actionLabel(code)}</option>)}</SelectField>
        <TextField label="Record ID" type="number" min={1} value={entityId ?? ""} onChange={(e) => set({ entity_id: e.target.value || undefined })} />
        <TextField label="From" type="date" value={from ?? ""} max={to} onChange={(e) => set({ from: e.target.value || undefined })} />
        <TextField label="To" type="date" value={to ?? ""} min={from} onChange={(e) => set({ to: e.target.value || undefined })} />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Activity shortcuts">{[{ label: "Restocks", source: "inventory", action: "inventory.restock" }, { label: "Sales / orders placed", source: "orders", action: "order.placed" }, { label: "Stock returns", source: "inventory", action: "inventory.return" }, { label: "Stock adjustments", source: "inventory", action: "inventory.adjustment" }].map((item) => <Button key={item.action} variant={action === item.action ? "default" : "outline"} aria-pressed={action === item.action} disabled={!!meta && !meta.sources?.includes(item.source)} onClick={() => set({ source: item.source, action: item.action, entity_type: undefined, entity_id: undefined })}>{item.label}</Button>)}</div>
      <p className="work-note"><Info aria-hidden="true" />Dates use Phnom Penh time. Inventory sales show stock allocated to orders, not cash received. Staff restock changes and inventory movements are separate records. {meta && !meta.sources ? "This server currently provides staff changes only." : ""}</p>
      {filtered ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {entityId ? (
            <span>
              Showing the history of <span className="font-semibold">{`${entityLabel(entityType ?? "")} #${entityId}`}</span>
            </span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => set({ q: undefined, source: undefined, staff: undefined, action: undefined, entity_type: undefined, entity_id: undefined, from: undefined, to: undefined })}>
            <X aria-hidden="true" /> Clear filters
          </Button>
        </div>
      ) : null}
      <ListState query={log} empty={{ when: list.length === 0, icon: ScrollText, title: filtered ? "No changes match" : "No changes yet", description: filtered ? "Try a wider date range or fewer filters." : "Changes staff make will show up here." }}>
        <ol className={cn("grid grid-cols-[minmax(0,1fr)] gap-3", log.isPlaceholderData && "opacity-60 transition-opacity")} aria-label="Changes">
          {list.map((entry) => (
            <Entry key={`${entry.source ?? "audit"}-${entry.id}`} entry={entry} />
          ))}
        </ol>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
    </AdminPage>
  );
}
