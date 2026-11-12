import { ResultSummary } from "@/features/admin/reportKit";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { rewardKeys, rewardQueries, rewardsApi, type PaymentSettings, type RewardRule, type RewardRuleInput } from "@/api/endpoints/rewards";
import { ApiError } from "@/api/errors";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { toast } from "@/stores/toast";

/*
 * /admin/rewards (owner 2026-11-12): the KHQR discount and the cash on delivery limit, then the next-order reward
 * rules ("buy 2 books, get 10% off your next order, at most $5, for 30 days"). The newest rule that is on is the one
 * the shop uses. Staff see everything; only admins change it (the API refuses others).
 */

const money = (v: string | null) => (v ? `$${v}` : "—");
const whatEarns = (r: RewardRule) =>
  [r.min_books ? `${r.min_books}+ books` : null, r.min_amount_usd ? `$${r.min_amount_usd}+ spent` : null].filter(Boolean).join(" or ");

export default function RewardsAdminPage() {
  const queryClient = useQueryClient();
  const isAdmin = useStaff()?.user.role === "admin";
  const rules = useQuery(rewardQueries.rules());
  const list = rules.data ?? [];
  const [editing, setEditing] = useState<RewardRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<RewardRule | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: rewardKeys.rules() });
  const activeId = list.find((r) => r.is_active)?.id;

  const toggle = useMutation({
    mutationFn: ({ rule, on }: { rule: RewardRule; on: boolean }) => rewardsApi.updateRule(rule.id, { is_active: on }),
    onSuccess: (saved) => {
      refresh();
      toast.success(saved.is_active ? `${saved.name} is on` : `${saved.name} is off`);
    },
    onError: (err) => toast.error(ApiError.from(err).message),
  });
  const remove = useMutation({
    mutationFn: (rule: RewardRule) => rewardsApi.deleteRule(rule.id),
    onSuccess: () => {
      refresh();
      toast.success("Reward rule deleted");
      setDeleting(null);
    },
    onError: (err) => toast.error(ApiError.from(err).message),
  });

  return (
    <AdminPage
      title="Rewards & payments"
      lead="Make KHQR the better way to pay, and thank customers with a coupon for their next order."
      actions={
        isAdmin ? (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New reward rule
          </Button>
        ) : null
      }
    >
      <PaymentSettingsCard isAdmin={isAdmin} />

      {rules.data && list.length > 0 ? <ResultSummary items={[
        { label: "Reward rules", value: list.length },
        { label: "Coupons issued", value: list.reduce((total, rule) => total + rule.issued_count, 0) },
        { label: "Coupons used", value: list.reduce((total, rule) => total + rule.used_count, 0) },
      ]} /> : null}
      <section aria-labelledby="rules-title" className="grid gap-3">
        <div className="grid gap-1">
          <h2 id="rules-title" className="font-display text-[1.563rem] leading-tight">Next-order rewards</h2>
          <p className="text-[15px] text-muted-foreground">
            A coupon is made when an order is paid by KHQR or delivered. One use, only for that customer. The newest rule that is on is used.
          </p>
        </div>
        <ListState query={rules} empty={{ when: list.length === 0, icon: Gift, title: "No reward rules yet", description: "Create one to thank customers with a coupon for their next order." }}>
          <TableCard minWidth={860}>
            <thead className={thead}>
              <tr>
                <th scope="col" className={th}>Rule</th>
                <th scope="col" className={th}>Earned with</th>
                <th scope="col" className={th}>Gives</th>
                <th scope="col" className={`${th} text-right`}>Coupons made</th>
                <th scope="col" className={`${th} text-right`}>Used</th>
                <th scope="col" className={th}>On</th>
                <th scope="col" className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className={`${td} max-w-[18rem] font-semibold`}>
                    {r.name}
                    {r.id === activeId ? (
                      <Badge tone="success" shape="tint" className="ml-2 align-middle">In use</Badge>
                    ) : null}
                  </th>
                  <td className={td}>{whatEarns(r)}</td>
                  <td className={td}>
                    {Number(r.percent_off)}% off, up to {money(r.max_discount_usd)}
                    <span className="block text-sm text-muted-foreground">for {r.valid_days} days</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{r.issued_count}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.used_count}</td>
                  <td className={td}>
                    <Switch
                      checked={r.is_active}
                      disabled={!isAdmin || toggle.isPending}
                      aria-label={`${r.is_active ? "Switch off" : "Switch on"} ${r.name}`}
                      onCheckedChange={(on) => toggle.mutate({ rule: r, on })}
                    />
                  </td>
                  <td className={td}>
                    {isAdmin ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </ListState>
      </section>

      {editing ? <RuleDialog rule={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} /> : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this rule"}?`}
        description="Coupons already given keep working. New orders stop earning this reward."
        confirmLabel="Delete rule"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AdminPage>
  );
}

function PaymentSettingsCard({ isAdmin }: { isAdmin: boolean }) {
  const settings = useQuery(rewardQueries.paymentSettings());
  return (
    <section aria-labelledby="payments-title" className="desk-card grid gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
          <QrCode className="size-5" aria-hidden="true" />
        </span>
        <div className="grid gap-0.5">
          <h2 id="payments-title" className="font-display text-[1.563rem] leading-tight">KHQR and cash on delivery</h2>
          <p className="text-[15px] text-muted-foreground">
            The KHQR discount comes off the books after offers and coupons; free delivery is decided before it. Leave a field empty to switch it off.
            {settings.data && !settings.data.khqr_enabled ? " KHQR is off on this server, so its discount is not offered." : null}
          </p>
        </div>
      </div>
      {settings.data ? (
        <PaymentSettingsForm key={`${settings.data.khqr_discount_percent}|${settings.data.cod_max_order_usd}`} initial={settings.data} isAdmin={isAdmin} />
      ) : settings.isError ? (
        <FormAlert title={ApiError.from(settings.error).message} />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">Loading settings…</p>
      )}
    </section>
  );
}

function PaymentSettingsForm({ initial, isAdmin }: { initial: PaymentSettings; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [khqr, setKhqr] = useState(initial.khqr_discount_percent ? String(Number(initial.khqr_discount_percent)) : "");
  const [codMax, setCodMax] = useState(initial.cod_max_order_usd ?? "");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => rewardsApi.updatePaymentSettings({ khqr_discount_percent: khqr.trim() || null, cod_max_order_usd: codMax.trim() || null }),
    onSuccess: (saved) => {
      queryClient.setQueryData(rewardKeys.paymentSettings(), saved);
      setError(null);
      toast.success("Payment settings saved");
    },
    onError: (err) => setError(ApiError.from(err).message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <>
      {error ? <FormAlert title={error} /> : null}
      <form onSubmit={submit} noValidate className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <TextField label="KHQR discount (%)" optional inputMode="decimal" hint="For example 3. Up to 20." value={khqr} onChange={(e) => setKhqr(e.target.value)} disabled={!isAdmin} />
        <TextField label="Cash on delivery up to ($)" optional inputMode="decimal" hint="Bigger orders must pay by KHQR." value={codMax} onChange={(e) => setCodMax(e.target.value)} disabled={!isAdmin} />
        {isAdmin ? (
          <Button type="submit" loading={save.isPending} className="sm:mb-6">Save</Button>
        ) : null}
      </form>
    </>
  );
}

type Values = { name: string; min_books: string; min_amount: string; percent_off: string; max_discount: string; valid_days: string; is_active: boolean };
type Errors = Partial<Record<keyof Values | "form", string>>;
const FIELDS = ["name", "min_books", "min_amount", "percent_off", "max_discount", "valid_days"] as const;

function RuleDialog({ rule, onClose, onSaved }: { rule: RewardRule | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Values>({
    name: rule?.name ?? "",
    min_books: rule?.min_books ? String(rule.min_books) : rule ? "" : "2",
    min_amount: rule?.min_amount_usd ?? "",
    percent_off: rule ? String(Number(rule.percent_off)) : "10",
    max_discount: rule?.max_discount_usd ?? (rule ? "" : "5"),
    valid_days: String(rule?.valid_days ?? 30),
    is_active: rule?.is_active ?? false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));

  const save = useMutation({
    mutationFn: (input: RewardRuleInput) => (rule ? rewardsApi.updateRule(rule.id, input) : rewardsApi.createRule(input)),
    onSuccess: (saved) => {
      onSaved();
      toast.success(rule ? `${saved.name} saved` : `${saved.name} created`);
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      const next: Errors = {};
      for (const field of FIELDS) {
        const message = apiError.field(field);
        if (message) next[field] = message;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    if (!v.name.trim()) e.name = "Give the rule a name staff will recognise.";
    if (!v.min_books.trim() && !v.min_amount.trim()) e.min_books = "Set a number of books, an amount, or both.";
    if (!(Number(v.percent_off) >= 1 && Number(v.percent_off) <= 90)) e.percent_off = "Between 1 and 90.";
    if (!(Number(v.valid_days) >= 1 && Number(v.valid_days) <= 365)) e.valid_days = "Between 1 and 365 days.";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      name: v.name.trim(),
      is_active: v.is_active,
      min_books: v.min_books.trim() ? Number(v.min_books) : null,
      min_amount: v.min_amount.trim() || null,
      percent_off: v.percent_off.trim(),
      max_discount: v.max_discount.trim() || null,
      valid_days: Number(v.valid_days),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="lg">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{rule ? `Edit ${rule.name}` : "New reward rule"}</DialogTitle>
            <DialogDescription>An order earns the coupon with the number of books or the amount spent (after discounts).</DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert title={errors.form} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} maxLength={120} containerClassName="sm:col-span-2" />
            <TextField label="Books in the order" optional inputMode="numeric" value={v.min_books} onChange={(e) => set({ min_books: e.target.value })} error={errors.min_books} />
            <TextField label="Or amount spent ($)" optional inputMode="decimal" value={v.min_amount} onChange={(e) => set({ min_amount: e.target.value })} error={errors.min_amount} />
            <TextField label="Percent off next order" inputMode="decimal" value={v.percent_off} onChange={(e) => set({ percent_off: e.target.value })} error={errors.percent_off} />
            <TextField label="At most ($)" optional inputMode="decimal" value={v.max_discount} onChange={(e) => set({ max_discount: e.target.value })} error={errors.max_discount} />
            <TextField label="Valid for (days)" inputMode="numeric" value={v.valid_days} onChange={(e) => set({ valid_days: e.target.value })} error={errors.valid_days} />
            <label className="flex items-center gap-3 self-end pb-2 text-[15px] font-semibold">
              <Switch checked={v.is_active} onCheckedChange={(on) => set({ is_active: on })} aria-label="Rule is on" />
              Rule is on
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={save.isPending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>{rule ? "Save rule" : "Create rule"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
