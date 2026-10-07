import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Ban, Clock3, MailCheck, Trash2, UserX, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { opsApi, opsQueries, type StaffCustomer } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, ListTabs, SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { ReopenDialog } from "@/features/admin/ReopenAccount";
import { useReopenCustomer } from "@/features/admin/useReopenCustomer";
import { erasureLabel, removalLabel } from "@/features/admin/removal";
import { useStaff } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { toast } from "@/stores/toast";

type View = "verified" | "unverified" | "closed";

const SIGN_IN: Record<string, string> = { password: "Password", google: "Google", facebook: "Facebook" };

/*
 * /admin/customers: customers who verified their email, (second tab) unfinished sign-ups that are
 * removed 48 hours after signing up unless they enter their code, and (third tab) accounts customers
 * closed, kept 30 days before their details are erased; admins can reopen one when the customer asks.
 * Search by name, email or phone; active or deactivated.
 */
export default function CustomersAdminPage() {
  const { get, page, set, hrefFor } = useListParams();
  const [params] = useSearchParams();
  const q = get("q");
  const view: View = get("view") === "unverified" ? "unverified" : get("view") === "closed" ? "closed" : "verified";
  const closedView = view === "closed";
  const filter = (["all", "active", "deactivated"] as const).find((f) => f === get("show")) ?? "all";
  const customers = useQuery(
    opsQueries.customers(
      closedView
        ? { q: q || undefined, closed: true, page, per_page: 25 }
        : {
            q: q || undefined,
            active: filter === "active" ? true : filter === "deactivated" ? false : null,
            verified: view === "verified",
            page,
            per_page: 25,
          },
    ),
  );
  const meta = customers.data?.meta;
  const counts = meta?.counts;
  const list = customers.data?.data ?? [];
  const pending = view === "unverified";
  const isAdmin = useStaff()?.user.role === "admin";
  const canDelete = pending && isAdmin;
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<StaffCustomer | null>(null);
  const remove = useMutation({
    mutationFn: (c: StaffCustomer) => opsApi.deleteCustomer(c.id),
    onSuccess: (_, c) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
      toast.success({ title: `${c.name}'s sign-up was deleted`, description: `${c.email ?? c.phone ?? "Their details"} can be used to sign up again.` });
    },
    onError: (error) => toast.error({ title: "Couldn't delete the sign-up", description: ApiError.from(error).message }),
    onSettled: () => setDeleting(null),
  });
  const [reopening, setReopening] = useState<StaffCustomer | null>(null);
  const reopen = useReopenCustomer(() => setReopening(null));
  const canReopen = closedView && isAdmin;
  const filtered = Boolean(q) || (!closedView && filter !== "all");

  // Switching tabs keeps the search and filter, and goes back to page 1.
  const viewHref = (next: View) => {
    const p = new URLSearchParams(params);
    p.delete("page");
    if (next === "verified") p.delete("view");
    else p.set("view", next);
    return `?${p.toString()}`;
  };

  const [one, many] = pending ? ["unfinished sign-up", "unfinished sign-ups"] : closedView ? ["closed account", "closed accounts"] : ["customer", "customers"];

  return (
    <AdminPage title="Customers" lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? one : many) : "People with a shop account."}>
      <ListTabs
        label="Customer accounts"
        value={view}
        hrefFor={viewHref}
        tabs={[
          { value: "verified", label: "Verified", count: counts?.verified },
          { value: "unverified", label: "Not verified yet", count: counts?.unverified },
          { value: "closed", label: "Closed", count: counts?.closed },
        ]}
      />
      {pending ? (
        <p className="flex max-w-3xl items-start gap-2 text-[15px] text-muted-foreground">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            People who signed up but haven't entered the code we emailed. They can't order yet, and each account is removed 48 hours after signing up
            unless they finish. Signing up again with the same email starts over.
          </span>
        </p>
      ) : closedView ? (
        <p className="flex max-w-3xl items-start gap-2 text-[15px] text-muted-foreground">
          <UserX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Customers who closed their own account. Their name, email, phone and addresses are erased 30 days after closing; orders are kept either way.
            Until then an admin can reopen an account if the customer asks.
          </span>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search customers" value={q} placeholder="Name, email or phone" onSearch={(v) => set({ q: v || undefined })} />
        {closedView ? null : (
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
        )}
      </div>
      <ListState
        query={customers}
        empty={{
          when: list.length === 0,
          icon: pending ? MailCheck : closedView ? UserX : Users,
          title: filtered ? "No customers match" : pending ? "No unfinished sign-ups" : closedView ? "No closed accounts" : "No customers yet",
          description: filtered
            ? "Try part of the name or email, or another filter."
            : pending
              ? "Everyone who signed up has entered their code."
              : closedView
                ? "Accounts customers close stay here for 30 days, until their details are erased."
                : "Customers appear here once they verify their email.",
        }}
      >
        <TableCard stale={customers.isPlaceholderData} minWidth={680}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>{pending ? "Status" : closedView ? "Details" : "Signs in with"}</th>
              <th scope="col" className={`${th} text-right`}>Orders</th>
              <th scope="col" className={th}>{pending ? "Signed up" : closedView ? "Closed" : "Joined"}</th>
              {canDelete || canReopen ? (
                <th scope="col" className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2/60">
                <th scope="row" className={`${td} font-normal`}>
                  <Link to={`/admin/customers/${c.id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                    {c.name}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{c.email ?? c.phone}</span>
                </th>
                <td className={td}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {c.is_active ? null : (
                      <Badge tone="danger" shape="outline">
                        <Ban aria-hidden="true" /> Deactivated
                      </Badge>
                    )}
                    {c.removal_at ? (
                      <Badge tone="warning" shape="outline">
                        <Clock3 aria-hidden="true" /> {removalLabel(c.removal_at)}
                      </Badge>
                    ) : null}
                    {c.erase_at ? (
                      <Badge tone="neutral" shape="outline">
                        <Clock3 aria-hidden="true" /> {erasureLabel(c.erase_at)}
                      </Badge>
                    ) : null}
                    {!pending && !closedView && c.is_active ? (
                      <span className="text-sm text-muted-foreground">{c.login_methods.map((m) => SIGN_IN[m] ?? m).join(", ") || "—"}</span>
                    ) : null}
                  </span>
                </td>
                <td className={`${td} text-right tabular-nums`}>{c.orders_count ?? 0}</td>
                <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{orderDate(closedView && c.closed_at ? c.closed_at : c.created_at)}</td>
                {canDelete ? (
                  <td className={`${td} text-right`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.name}'s sign-up`}
                      className="text-destructive hover:bg-destructive-tint"
                    >
                      <Trash2 aria-hidden="true" /> Delete
                    </Button>
                  </td>
                ) : null}
                {canReopen ? (
                  <td className={`${td} text-right`}>
                    <Button variant="ghost" size="sm" onClick={() => setReopening(c)} aria-label={`Reopen ${c.name}'s account`}>
                      <ArchiveRestore aria-hidden="true" /> Reopen
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </TableCard>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
        title={`Delete ${deleting?.name ?? "this"}'s sign-up?`}
        description={`They never entered their code, so they have no orders. The account is deleted for good and ${deleting?.email ?? deleting?.phone ?? "the email"} can be used to sign up again.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
      <ReopenDialog
        customer={reopening}
        onOpenChange={(open) => (open ? null : setReopening(null))}
        loading={reopen.isPending}
        onConfirm={() => reopening && reopen.mutate(reopening)}
      />
    </AdminPage>
  );
}
