import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { opsApi, opsQueries, type Coupon, type CouponInput, type CouponType } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { SelectField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
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
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

/** "10% off" or "$5.00 off", with the minimum when there is one. */
const describe = (c: Coupon) => `${c.type === "percentage" ? `${Number(c.value)}%` : formatUsd(c.value)} off${c.min_order_amount && Number(c.min_order_amount) > 0 ? ` orders of ${formatUsd(c.min_order_amount)} or more` : ""}`;

/** Live (usable now), Scheduled, Expired, Used up or Off. */
function couponState(c: Coupon): { label: string; tone: "success" | "neutral" | "warning" } {
  const now = Date.now();
  if (!c.is_active) return { label: "Off", tone: "neutral" };
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return { label: "Expired", tone: "neutral" };
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { label: "Used up", tone: "neutral" };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: "Scheduled", tone: "warning" };
  return { label: "Live", tone: "success" };
}

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

type Values = { code: string; type: CouponType; value: string; min_order_amount: string; max_uses: string; starts_at: string; expires_at: string; is_active: boolean };

function CouponDialog({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState<Values>({
    code: coupon?.code ?? "",
    type: coupon?.type ?? "percentage",
    value: coupon ? String(Number(coupon.value)) : "",
    min_order_amount: coupon?.min_order_amount && Number(coupon.min_order_amount) > 0 ? coupon.min_order_amount : "",
    max_uses: coupon?.max_uses ? String(coupon.max_uses) : "",
    starts_at: toLocalInput(coupon?.starts_at ?? null),
    expires_at: toLocalInput(coupon?.expires_at ?? null),
    is_active: coupon?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "form", string>>>({});
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));

  const save = useMutation({
    mutationFn: (input: CouponInput) => (coupon ? opsApi.updateCoupon(coupon.id, input) : opsApi.createCoupon(input)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "coupons"] });
      toast.success(coupon ? `${saved.code} saved` : `${saved.code} created`);
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      const next: typeof errors = {};
      for (const f of ["code", "type", "value", "min_order_amount", "max_uses", "starts_at", "expires_at"] as const) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: typeof errors = {};
    const code = v.code.trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(code)) e.code = "Use 3 to 50 letters, numbers, dashes or underscores.";
    if (!/^\d+(\.\d{1,2})?$/.test(v.value.trim()) || Number(v.value) <= 0) e.value = "Enter an amount above 0, like 10 or 5.50.";
    else if (v.type === "percentage" && Number(v.value) > 100) e.value = "A percentage can't be more than 100.";
    if (v.min_order_amount.trim() && !/^\d+(\.\d{1,2})?$/.test(v.min_order_amount.trim())) e.min_order_amount = "Enter an amount in dollars, like 20.";
    if (v.max_uses.trim() && !(/^\d+$/.test(v.max_uses.trim()) && Number(v.max_uses) >= 1)) e.max_uses = "Enter a whole number, 1 or more.";
    if (v.starts_at && v.expires_at && v.expires_at <= v.starts_at) e.expires_at = "The end must be after the start.";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      code,
      type: v.type,
      value: v.value.trim(),
      min_order_amount: v.min_order_amount.trim() || null,
      max_uses: v.max_uses.trim() ? Number(v.max_uses) : null,
      starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
      expires_at: v.expires_at ? new Date(v.expires_at).toISOString() : null,
      is_active: v.is_active,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{coupon ? `Edit ${coupon.code}` : "New coupon"}</DialogTitle>
            <DialogDescription>Customers enter the code on their cart page. Each customer can use a coupon once.</DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert title={errors.form} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Code" value={v.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} error={errors.code} autoComplete="off" className="uppercase" />
            <SelectField label="Discount" value={v.type} onChange={(e) => set({ type: e.target.value as CouponType })} error={errors.type}>
              <option value="percentage">Percentage off</option>
              <option value="fixed">Dollars off</option>
            </SelectField>
            <TextField label={v.type === "percentage" ? "Percent off" : "Dollars off"} inputMode="decimal" value={v.value} onChange={(e) => set({ value: e.target.value })} error={errors.value} />
            <TextField label="Minimum order (USD)" optional inputMode="decimal" value={v.min_order_amount} onChange={(e) => set({ min_order_amount: e.target.value })} error={errors.min_order_amount} />
            <TextField label="Total uses allowed" optional inputMode="numeric" hint="Across all customers. Empty for no limit." value={v.max_uses} onChange={(e) => set({ max_uses: e.target.value })} error={errors.max_uses} />
            <div className="hidden sm:block" />
            <TextField label="Starts" optional type="datetime-local" value={v.starts_at} onChange={(e) => set({ starts_at: e.target.value })} error={errors.starts_at} />
            <TextField label="Ends" optional type="datetime-local" value={v.expires_at} onChange={(e) => set({ expires_at: e.target.value })} error={errors.expires_at} />
          </div>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-4 py-2">
            <span className="grid">
              <span className="font-semibold">On</span>
              <span className="text-sm text-muted-foreground">Off stops new orders using it; orders that used it keep their discount.</span>
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
              {coupon ? "Save coupon" : "Create coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* /admin/coupons: discount codes with their rules and how often they've been used. */
export default function CouponsAdminPage() {
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const { get, page, set, hrefFor } = useListParams();
  const q = get("q");
  const filter = (["all", "on", "off"] as const).find((f) => f === get("show")) ?? "all";
  const coupons = useQuery(opsQueries.coupons({ q: q || undefined, active: filter === "on" ? true : filter === "off" ? false : null, page, per_page: 25 }));
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const remove = useMutation({
    mutationFn: (c: Coupon) => opsApi.deleteCoupon(c.id),
    onSuccess: (_r, c) => {
      toast.success(`${c.code} deleted`);
      void queryClient.invalidateQueries({ queryKey: ["staff", "coupons"] });
    },
    onError: (error) => toast.error({ title: "Couldn't delete the coupon", description: ApiError.from(error).message }),
    onSettled: () => setDeleting(null),
  });
  const meta = coupons.data?.meta;
  const list = coupons.data?.data ?? [];

  return (
    <AdminPage
      title="Coupons"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "coupon" : "coupons") : "Discount codes customers enter on their cart."}
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" /> New coupon
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search coupons" value={q} placeholder="Code" onSearch={(val) => set({ q: val || undefined })} />
        <Segmented
          label="Show"
          value={filter}
          options={[
            { value: "all", label: "All" },
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
          onChange={(val) => set({ show: val === "all" ? undefined : val })}
        />
      </div>
      <ListState query={coupons} empty={{ when: list.length === 0, icon: TicketPercent, title: "No coupons match", description: q ? "Check the code." : "Create one to run a promotion." }}>
        <TableCard stale={coupons.isPlaceholderData} minWidth={760}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={th}>Code</th>
              <th scope="col" className={th}>Discount</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={`${th} text-right`}>Used</th>
              <th scope="col" className={th}>Ends</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((c) => {
              const state = couponState(c);
              return (
                <tr key={c.id}>
                  <th scope="row" className={`${td} font-mono font-semibold tracking-wide`}>{c.code}</th>
                  <td className={td}>{describe(c)}</td>
                  <td className={td}>
                    <Badge tone={state.tone} shape={state.label === "Live" ? "tint" : "outline"}>
                      {state.label === "Live" ? <CheckCircle2 aria-hidden="true" /> : <CircleSlash aria-hidden="true" />} {state.label}
                    </Badge>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {c.used_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{c.expires_at ? orderDate(c.expires_at) : "No end"}</td>
                  <td className={td}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`Edit ${c.code}`} onClick={() => setEditing(c)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      {isAdmin ? (
                        <Button size="icon" variant="ghost" aria-label={`Delete ${c.code}`} onClick={() => setDeleting(c)}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
      {editing ? <CouponDialog key={editing === "new" ? "new" : editing.id} coupon={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.code ?? "coupon"}?`}
        description="Only coupons that were never used can be deleted. To stop a used one, edit it and turn it off."
        confirmLabel="Delete coupon"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AdminPage>
  );
}
