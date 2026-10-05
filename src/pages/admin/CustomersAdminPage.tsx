import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Ban, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { opsQueries } from "@/api/endpoints/staffOps";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";

/* /admin/customers: find a customer by name, email or phone; active or deactivated. */
export default function CustomersAdminPage() {
  const { get, page, set, hrefFor } = useListParams();
  const q = get("q");
  const filter = (["all", "active", "deactivated"] as const).find((f) => f === get("show")) ?? "all";
  const customers = useQuery(opsQueries.customers({ q: q || undefined, active: filter === "active" ? true : filter === "deactivated" ? false : null, page, per_page: 25 }));
  const meta = customers.data?.meta;
  const list = customers.data?.data ?? [];

  return (
    <AdminPage title="Customers" lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "customer" : "customers") : "People with a shop account."}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search customers" value={q} placeholder="Name, email or phone" onSearch={(v) => set({ q: v || undefined })} />
        <Segmented
          label="Show"
          value={filter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "deactivated", label: "Deactivated" },
          ]}
          onChange={(v) => set({ show: v === "all" ? undefined : v })}
        />
      </div>
      <ListState query={customers} empty={{ when: list.length === 0, icon: Users, title: "No customers match", description: "Try part of the name or email." }}>
        <TableCard stale={customers.isPlaceholderData} minWidth={680}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>Account</th>
              <th scope="col" className={`${th} text-right`}>Orders</th>
              <th scope="col" className={th}>Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2/60">
                <th scope="row" className={`${td} font-normal`}>
                  <Link to={`/admin/customers/${c.id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                    {c.name}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{c.email}</span>
                </th>
                <td className={td}>
                  <span className="flex flex-wrap gap-1.5">
                    {c.is_active ? null : (
                      <Badge tone="danger" shape="outline">
                        <Ban aria-hidden="true" /> Deactivated
                      </Badge>
                    )}
                    {c.email_verified ? (
                      <Badge tone="success" shape="tint">
                        <BadgeCheck aria-hidden="true" /> Verified
                      </Badge>
                    ) : (
                      <Badge tone="warning" shape="outline">Not verified</Badge>
                    )}
                  </span>
                </td>
                <td className={`${td} text-right tabular-nums`}>{c.orders_count ?? 0}</td>
                <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{orderDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
    </AdminPage>
  );
}
