import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Info, Target, Truck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { shopSettingsApi, shopSettingsQueries, type ShopSettings } from "@/api/endpoints/shopSettings";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { Panel } from "@/features/admin/reportKit";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";
import "@/features/admin/dashboard/dashboard.css";

/*
 * /admin/settings (Phase 4): the store's delivery fees, free delivery threshold and monthly sales goal in one calm
 * form, grouped by topic. Admins edit; other staff see the values read-only. Payment options stay on their own page
 * and are linked here so everything about "how the shop charges" can be found from one place.
 */

type Values = { phnomPenh: string; provinces: string; freeFrom: string; goal: string };
type Errors = Partial<Record<keyof Values | "form", string>>;
const money = /^\d+(\.\d{1,2})?$/;

const fromSettings = (s: ShopSettings): Values => ({
  phnomPenh: s.shipping_fee_phnom_penh_usd,
  provinces: s.shipping_fee_provinces_usd,
  freeFrom: s.free_shipping_threshold_usd ?? "",
  goal: s.monthly_sales_goal_usd ?? "",
});

export default function SettingsPage() {
  const { dict } = useT();
  const t = dict.storeSettings;
  const query = useQuery(shopSettingsQueries.get());
  const missing = query.isError && ApiError.from(query.error).status === 404;

  return (
    <div className="dash-overview">
      <AdminPage title={t.title} lead={t.lead}>
        {missing ? (
          <Panel id="settings-missing" title={t.title} icon={Info} tone="slate"><p className="text-[15px] text-muted-foreground">{t.missing}</p></Panel>
        ) : query.isPending ? (
          <SkeletonGroup label={t.title} className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></SkeletonGroup>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} />
        ) : (
          <SettingsForm key={JSON.stringify(query.data)} settings={query.data} />
        )}
      </AdminPage>
    </div>
  );
}

function SettingsForm({ settings }: { settings: ShopSettings }) {
  const { dict } = useT();
  const t = dict.storeSettings;
  const isAdmin = useStaff()?.user.role === "admin";
  const queryClient = useQueryClient();
  const initial = fromSettings(settings);
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  const save = useMutation({
    mutationFn: (input: Parameters<typeof shopSettingsApi.update>[0]) => shopSettingsApi.update(input),
    onSuccess: (data) => {
      queryClient.setQueryData(shopSettingsQueries.get().queryKey, data);
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard", "goal"] });
      toast.success(t.saved);
    },
    onError: (error) => {
      const e = ApiError.from(error);
      const map: Record<string, keyof Values> = { shipping_fee_phnom_penh_usd: "phnomPenh", shipping_fee_provinces_usd: "provinces", free_shipping_threshold_usd: "freeFrom", monthly_sales_goal_usd: "goal" };
      const next: Errors = {};
      for (const [api, field] of Object.entries(map)) {
        const m = e.field(api);
        if (m) next[field] = m;
      }
      if (!Object.keys(next).length) next.form = e.message;
      setErrors(next);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    for (const key of ["phnomPenh", "provinces"] as const) if (!money.test(values[key].trim())) e[key] = t.invalid;
    for (const key of ["freeFrom", "goal"] as const) if (values[key].trim() && !money.test(values[key].trim())) e[key] = t.invalid;
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      shipping_fee_phnom_penh_usd: values.phnomPenh.trim(),
      shipping_fee_provinces_usd: values.provinces.trim(),
      free_shipping_threshold_usd: values.freeFrom.trim() || null,
      monthly_sales_goal_usd: values.goal.trim() || null,
    });
  };

  const provinceRates = Object.entries(settings.province_rates ?? {});
  const disabled = !isAdmin || save.isPending;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      {!isAdmin ? <p role="note" className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[15px] text-muted-foreground"><Info className="size-4 shrink-0" aria-hidden="true" />{t.readOnly}</p> : null}
      {errors.form ? <FormAlert title={errors.form} /> : null}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel id="settings-delivery" title={t.delivery} icon={Truck} tone="sky">
          <p className="text-sm text-muted-foreground">{t.deliveryNote}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t.phnomPenh} inputMode="decimal" required disabled={disabled} value={values.phnomPenh} onChange={(e) => set({ phnomPenh: e.target.value })} error={errors.phnomPenh} hint={t.feeHint} />
            <TextField label={t.provinces} inputMode="decimal" required disabled={disabled} value={values.provinces} onChange={(e) => set({ provinces: e.target.value })} error={errors.provinces} hint={t.feeHint} />
          </div>
          <TextField label={t.freeThreshold} optional inputMode="decimal" disabled={disabled} value={values.freeFrom} onChange={(e) => set({ freeFrom: e.target.value })} error={errors.freeFrom} hint={values.freeFrom.trim() ? t.freeThresholdHint : `${t.freeOff}. ${t.freeThresholdHint}`} />
          {money.test(values.phnomPenh.trim()) ? (
            <p className="rounded-xl bg-[var(--tone-tint)] px-4 py-3 text-sm tabular-nums">
              {t.preview.replace("{amount}", formatUsd("20.00")).replace("{fee}", values.freeFrom.trim() && Number(values.freeFrom) <= 20 ? formatUsd("0.00") : formatUsd(Number(values.phnomPenh).toFixed(2)))}
            </p>
          ) : null}
          {provinceRates.length ? (
            <details className="text-sm">
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">{t.provinceRates}</summary>
              <ul className="grid gap-1 pb-1 sm:grid-cols-2">
                {provinceRates.map(([province, fee]) => (
                  <li key={province} className="flex justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 tabular-nums"><span className="capitalize">{province.replace(/_/g, " ")}</span><span className="font-semibold">{formatUsd(fee)}</span></li>
                ))}
              </ul>
            </details>
          ) : null}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel id="settings-goal" title={t.goal} icon={Target} tone="sea">
            <p className="text-sm text-muted-foreground">{t.goalNote}</p>
            <TextField label={t.goalField} optional inputMode="decimal" disabled={disabled} value={values.goal} onChange={(e) => set({ goal: e.target.value })} error={errors.goal} hint={t.goalHint} />
          </Panel>
          <Panel id="settings-payments" title={t.payments} icon={Wallet} tone="saffron">
            <p className="text-sm text-muted-foreground">{t.paymentsNote}</p>
            <Link to="/admin/rewards" className="group inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">{t.paymentsLink} <ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>
          </Panel>
        </div>
      </div>

      {isAdmin ? (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lift backdrop-blur">
          {dirty ? <p className="mr-auto text-sm font-semibold text-warning" role="status">{t.unsaved}</p> : null}
          <Button type="button" variant="outline" disabled={!dirty || save.isPending} onClick={() => { setValues(initial); setErrors({}); }}>{dict.suppliers.cancel}</Button>
          <Button type="submit" loading={save.isPending} disabled={!dirty}>{t.save}</Button>
        </div>
      ) : null}
    </form>
  );
}
