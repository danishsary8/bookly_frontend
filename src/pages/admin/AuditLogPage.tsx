import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ScrollText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { opsQueries, type AuditEntry } from "@/api/endpoints/staffOps";
import { SelectField, TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState } from "@/features/admin/listKit";
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
};

const entityLabel = (type: string) => ENTITIES[type]?.label ?? type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
/** What the person did, in words: "order.status_changed" → "changed the status of". */
const VERBS: Record<string, string> = {
  status_changed: "changed the status of",
  two_factor_reset: "reset two-step verification for",
  hidden: "hid",
  shown: "showed",
};
const verb = (action: string) => {
  const key = action.slice(action.indexOf(".") + 1);
  return VERBS[key] ?? key.replace(/_/g, " ");
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
  return keys.filter((k) => !entry.before || !entry.after || show(before[k]) !== show(after[k])).map((k) => ({ key: k, before: show(before[k]), after: show(after[k]) }));
}

function Entry({ entry }: { entry: AuditEntry }) {
  const meta = ENTITIES[entry.entity_type];
  const target = `${entityLabel(entry.entity_type)}${entry.entity_id ? ` #${entry.entity_id}` : ""}`;
  const rows = diffRows(entry);
  const sides = entry.before && entry.after ? "both" : entry.after ? "after" : "before";
  return (
    <li className="grid min-w-0 gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-[15px]">
        <span className="font-semibold">{entry.staff?.name ?? "Deleted staff member"}</span> {verb(entry.action)}{" "}
        {meta?.href && entry.entity_id ? (
          <Link to={meta.href(entry.entity_id)} className="font-semibold text-primary underline-offset-4 hover:underline">
            {target}
          </Link>
        ) : (
          <span className="font-semibold">{target}</span>
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        <time dateTime={entry.created_at}>{orderDateTime(entry.created_at)}</time> · <code className="text-[13px]">{entry.action}</code>
      </p>
      {rows.length ? (
        <details className="group mt-2 min-w-0">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            {rows.length === 1 ? "1 field" : `${rows.length} fields`}
          </summary>
          <div className="relative mt-2 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[420px] text-left text-sm">
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
                    <th scope="row" className="whitespace-nowrap px-3 py-2 font-mono text-[13px] font-normal text-muted-foreground">{r.key}</th>
                    {sides !== "after" ? <td className={cn("px-3 py-2 [overflow-wrap:anywhere]", sides === "both" && "text-destructive line-through decoration-destructive/40")}>{r.before}</td> : null}
                    {sides !== "before" ? <td className={cn("px-3 py-2 [overflow-wrap:anywhere]", sides === "both" && "font-semibold text-success")}>{r.after}</td> : null}
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
  const staffId = Number(get("staff")) || undefined;
  const entityType = get("entity_type") || undefined;
  const entityId = Number(get("entity_id")) || undefined;
  const from = get("from") || undefined;
  const to = get("to") || undefined;
  const log = useQuery(opsQueries.audit({ staff_user_id: staffId, entity_type: entityType, entity_id: entityId, from, to, page, per_page: 30 }));
  const members = useQuery(opsQueries.members({ per_page: 100 }));
  const meta = log.data?.meta;
  const list = log.data?.data ?? [];
  const filtered = Boolean(staffId || entityType || entityId || from || to);
  const from1 = meta ? (meta.current_page - 1) * (meta.per_page ?? 30) + 1 : 0;

  return (
    <AdminPage
      title="Audit log"
      lead={meta && meta.total ? rangeSummary(from1, from1 + list.length - 1, meta.total, meta.total === 1 ? "change" : "changes") : "Every change made in the admin, by whom and when."}
    >
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Staff member" value={staffId ? String(staffId) : ""} onChange={(e) => set({ staff: e.target.value || undefined })}>
          <option value="">Everyone</option>
          {(members.data?.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Kind of record" value={entityType ?? ""} onChange={(e) => set({ entity_type: e.target.value || undefined, entity_id: undefined })}>
          <option value="">Everything</option>
          {(meta?.entity_types ?? []).map((t) => (
            <option key={t} value={t}>
              {entityLabel(t)}
            </option>
          ))}
        </SelectField>
        <TextField label="From" type="date" value={from ?? ""} max={to} onChange={(e) => set({ from: e.target.value || undefined })} />
        <TextField label="To" type="date" value={to ?? ""} min={from} onChange={(e) => set({ to: e.target.value || undefined })} />
      </div>
      {filtered ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {entityId ? (
            <span>
              Showing the history of <span className="font-semibold">{`${entityLabel(entityType ?? "")} #${entityId}`}</span>
            </span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => set({ staff: undefined, entity_type: undefined, entity_id: undefined, from: undefined, to: undefined })}>
            <X aria-hidden="true" /> Clear filters
          </Button>
        </div>
      ) : null}
      <ListState query={log} empty={{ when: list.length === 0, icon: ScrollText, title: filtered ? "No changes match" : "No changes yet", description: filtered ? "Try a wider date range or fewer filters." : "Changes staff make will show up here." }}>
        <ol className={cn("grid grid-cols-[minmax(0,1fr)] gap-3", log.isPlaceholderData && "opacity-60 transition-opacity")} aria-label="Changes">
          {list.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ol>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
    </AdminPage>
  );
}
