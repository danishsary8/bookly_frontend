import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Mail, Pencil, Phone, Plus, Truck, UserRound } from "lucide-react";
import { ApiError } from "@/api/errors";
import { supplierQueries, suppliersApi, type Supplier, type SupplierInput, type SupplierType } from "@/api/endpoints/suppliers";
import { SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { catalogQueries } from "@/api/endpoints/catalog";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { AdminPage } from "@/features/admin/AdminPage";
import { Highlight, SearchBox, Segmented } from "@/features/admin/listKit";
import { Panel } from "@/features/admin/reportKit";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";
import "@/features/admin/dashboard/dashboard.css";

/*
 * /admin/suppliers (Phase 3): the shops and distributors the bookshop buys from, as easy-to-scan cards with what was
 * bought from each. Staff with catalogue rights add and edit; a supplier is switched off, never deleted.
 */

type Filter = "all" | "1" | "0";
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Phnom_Penh" });

export default function SuppliersPage() {
  const { dict } = useT();
  const t = dict.suppliers;
  const session = useStaff();
  // Admins, and staff whose permission list includes catalog:manage (no list = full staff rights, like the dashboard).
  const user = session?.user;
  const canEdit = user?.role === "admin" || !user?.permissions || user.permissions.includes("catalog:manage");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<"all" | SupplierType>("all");
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const query = useQuery(supplierQueries.list({ q: q || undefined, active: filter === "all" ? undefined : filter, ...(kind === "all" ? {} : { type: kind }) }));
  const all = useQuery(supplierQueries.list());
  const missing = query.isError && ApiError.from(query.error).status === 404;
  const totals = (all.data ?? []).reduce((sum, s) => ({ active: sum.active + (s.is_active ? 1 : 0), spent: sum.spent + Math.round(Number(s.spend_usd) * 100) }), { active: 0, spent: 0 });

  return (
    <div className="dash-overview">
      <AdminPage
        title={t.title}
        lead={t.lead}
        actions={canEdit && !missing ? <Button onClick={() => setEditing("new")}><Plus aria-hidden="true" />{t.add}</Button> : null}
      >
        {missing ? (
          <Panel id="suppliers-missing" title={t.title} icon={Truck} tone="saffron"><p className="text-[15px] text-muted-foreground">{t.missing}</p></Panel>
        ) : (
          <>
            <div className="dash-toolbar">
              <SearchBox label={t.search} value={q} onSearch={setQ} placeholder={t.searchPlaceholder} className="min-w-0 flex-1 sm:max-w-md" busy={query.isFetching} />
              <Segmented label={t.title} value={filter} options={[{ value: "all", label: t.all }, { value: "1", label: t.active }, { value: "0", label: t.off }]} onChange={setFilter} />
              <Segmented label={t.type} value={kind} options={[{ value: "all", label: t.allTypes }, { value: "publisher", label: t.typePublisher }, { value: "distributor", label: t.typeDistributor }]} onChange={setKind} />
            </div>
            {all.data?.length ? (
              <ul className="flex flex-wrap gap-2" aria-label={t.title}>
                <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold"><Truck className="size-4 text-muted-foreground" aria-hidden="true" />{t.activeCount.replace("{n}", String(totals.active))}</li>
                <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold tabular-nums">{t.totalSpent.replace("{v}", formatUsd((totals.spent / 100).toFixed(2)))}</li>
              </ul>
            ) : null}
            {query.isPending ? (
              <SkeletonGroup label={dict.dashboardPrint.loading} className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                <Skeleton className="h-52 rounded-[20px]" /><Skeleton className="h-52 rounded-[20px]" /><Skeleton className="h-52 rounded-[20px]" />
              </SkeletonGroup>
            ) : query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} />
            ) : query.data.length === 0 ? (
              <div className="grid place-items-center gap-3 rounded-[20px] border border-dashed border-border bg-card px-6 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-[var(--tone-saffron-tint)] text-[var(--tone-saffron-ink)]"><Truck className="size-6" aria-hidden="true" /></span>
                <p className="max-w-[48ch] text-[15px] text-muted-foreground">{q || filter !== "all" ? t.noMatch : t.empty}</p>
                {canEdit && !q && filter === "all" ? <Button onClick={() => setEditing("new")}><Plus aria-hidden="true" />{t.add}</Button> : null}
              </div>
            ) : (
              <ul className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3", query.isPlaceholderData && "opacity-60")}>
                {query.data.map((s) => (
                  <li key={s.id} className="min-w-0">
                    <SupplierCard supplier={s} query={q} onEdit={canEdit ? () => setEditing(s) : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <SupplierDialog supplier={editing} onClose={() => setEditing(null)} />
      </AdminPage>
    </div>
  );
}

function SupplierCard({ supplier: s, query, onEdit }: { supplier: Supplier; query: string; onEdit?: () => void }) {
  const { dict } = useT();
  const t = dict.suppliers;
  return (
    <article aria-labelledby={`supplier-${s.id}`} data-tone="saffron" className={cn("desk-card flex h-full flex-col gap-4 rounded-[20px] border border-border bg-card p-5", !s.is_active && "opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="dash-kpi-icon grid size-10 shrink-0 place-items-center rounded-full bg-[var(--tone-tint)] text-[var(--tone-ink)]"><Truck className="size-[18px]" /></span>
          <div className="min-w-0">
            <h2 id={`supplier-${s.id}`} className="truncate font-sans text-base font-semibold tracking-normal"><Highlight text={s.name} query={query} /></h2>
            <span className="mt-0.5 flex flex-wrap gap-1.5">
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-bold", s.is_active ? "bg-success-tint text-success" : "bg-secondary text-muted-foreground")}>{s.is_active ? t.active : t.off}</span>
              {s.type ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", s.type === "publisher" ? "bg-lapis-tint text-primary" : "bg-surface-2 text-foreground")}>
                  {s.type === "publisher" ? <BookOpen className="size-3" aria-hidden="true" /> : <Truck className="size-3" aria-hidden="true" />}
                  {s.type === "publisher" ? t.typePublisher : t.typeDistributor}
                </span>
              ) : null}
            </span>
            {s.publisher ? <span className="mt-1 block truncate text-xs text-muted-foreground">{s.publisher.name}</span> : null}
          </div>
        </div>
        {onEdit ? (
          <Button variant="outline" size="sm" onClick={onEdit} aria-label={`${t.edit} ${s.name}`}>
            <Pencil aria-hidden="true" />{t.edit}
          </Button>
        ) : null}
      </div>

      {s.contact_name || s.phone || s.email ? (
        <ul className="grid gap-1.5 text-sm">
          {s.contact_name ? <li className="flex items-center gap-2"><UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="sr-only">{t.contact}: </span>{s.contact_name}</li> : null}
          {s.phone ? <li className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="sr-only">{t.phone}: </span><a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="underline-offset-4 hover:underline">{s.phone}</a></li> : null}
          {s.email ? <li className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="sr-only">{t.email}: </span><a href={`mailto:${s.email}`} className="truncate underline-offset-4 hover:underline">{s.email}</a></li> : null}
        </ul>
      ) : null}
      {s.note ? <p className="line-clamp-2 text-sm text-muted-foreground">{s.note}</p> : null}

      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
        <div><dt className="text-xs text-muted-foreground">{t.restocks}</dt><dd className="text-lg font-semibold tabular-nums">{s.restocks.toLocaleString("en-US")}</dd></div>
        <div><dt className="text-xs text-muted-foreground">{t.copies}</dt><dd className="text-lg font-semibold tabular-nums">{s.units.toLocaleString("en-US")}</dd></div>
        <div><dt className="text-xs text-muted-foreground">{t.spent}</dt><dd className="text-lg font-semibold tabular-nums text-[var(--tone-ink)]">{formatUsd(s.spend_usd)}</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">{s.last_restock_at ? t.lastRestock.replace("{date}", dateFmt.format(new Date(s.last_restock_at))) : t.never}</p>
    </article>
  );
}

type Values = { name: string; type: SupplierType; publisher_id: string; contact_name: string; phone: string; email: string; note: string; is_active: boolean };
type Errors = Partial<Record<keyof Values | "form", string>>;
const blank: Values = { name: "", type: "distributor", publisher_id: "", contact_name: "", phone: "", email: "", note: "", is_active: true };

function SupplierDialog({ supplier, onClose }: { supplier: Supplier | "new" | null; onClose: () => void }) {
  const open = supplier !== null;
  // Re-mount the form for each supplier so it starts from that supplier's values.
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open ? <SupplierForm key={supplier === "new" ? "new" : supplier.id} supplier={supplier} onClose={onClose} /> : null}
    </Dialog>
  );
}

function SupplierForm({ supplier, onClose }: { supplier: Supplier | "new"; onClose: () => void }) {
  const { dict } = useT();
  const t = dict.suppliers;
  const queryClient = useQueryClient();
  const alertRef = useRef<HTMLDivElement>(null);
  const existing = supplier === "new" ? null : supplier;
  const [values, setValues] = useState<Values>(existing ? { name: existing.name, type: existing.type ?? "distributor", publisher_id: existing.publisher ? String(existing.publisher.id) : "", contact_name: existing.contact_name ?? "", phone: existing.phone ?? "", email: existing.email ?? "", note: existing.note ?? "", is_active: existing.is_active } : blank);
  const [errors, setErrors] = useState<Errors>({});
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));

  const save = useMutation({
    mutationFn: (input: SupplierInput) => (existing ? suppliersApi.update(existing.id, input) : suppliersApi.create(input)),
    onSuccess: () => {
      toast.success(t.saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "suppliers"] });
      onClose();
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      const next: Errors = {};
      for (const f of ["name", "type", "publisher_id", "contact_name", "phone", "email", "note"] as const) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
      if (next.form) requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    if (!values.name.trim()) e.name = t.nameRequired;
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = t.emailInvalid;
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = (v: string) => v.trim() || null;
    save.mutate({ name: values.name.trim(), type: values.type, publisher_id: values.type === "publisher" && values.publisher_id ? Number(values.publisher_id) : null, contact_name: clean(values.contact_name), phone: clean(values.phone), email: clean(values.email), note: clean(values.note), is_active: values.is_active });
  };

  return (
    <DialogContent size="md">
      <form onSubmit={submit} noValidate className="grid gap-5">
        <DialogHeader>
          <DialogTitle>{existing ? t.editTitle : t.addTitle}</DialogTitle>
          <DialogDescription>{t.lead}</DialogDescription>
        </DialogHeader>
        {errors.form ? <FormAlert ref={alertRef} title={errors.form} /> : null}
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">{t.type}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["publisher", "distributor"] as const).map((k) => (
                <label key={k} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm", values.type === k ? "border-primary bg-lapis-tint" : "border-border hover:bg-surface-2")}>
                  <input type="radio" name="supplier-type" className="mt-0.5 size-4 accent-[var(--primary)]" checked={values.type === k} onChange={() => set({ type: k, ...(k === "distributor" ? { publisher_id: "" } : {}) })} />
                  <span className="grid gap-0.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {k === "publisher" ? <BookOpen className="size-4" aria-hidden="true" /> : <Truck className="size-4" aria-hidden="true" />}
                      {k === "publisher" ? t.typePublisher : t.typeDistributor}
                    </span>
                    <span className="text-muted-foreground">{k === "publisher" ? t.typePublisherHint : t.typeDistributorHint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {values.type === "publisher" ? (
            <SelectField
              label={t.linkPublisher}
              optional
              hint={t.linkHint}
              value={values.publisher_id}
              error={errors.publisher_id}
              onChange={(e) => {
                const name = publishers.data?.data.find((p) => String(p.id) === e.target.value)?.name;
                set({ publisher_id: e.target.value, ...(name && !values.name.trim() ? { name } : {}) });
              }}
            >
              <option value="">{t.linkNone}</option>
              {(publishers.data?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          ) : null}
          <TextField label={t.name} required autoFocus value={values.name} maxLength={150} onChange={(e) => set({ name: e.target.value })} error={errors.name} placeholder={values.type === "publisher" ? "e.g. Penguin Random House" : "e.g. Monument Books"} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t.contact} optional value={values.contact_name} maxLength={150} onChange={(e) => set({ contact_name: e.target.value })} error={errors.contact_name} autoComplete="off" />
            <TextField label={t.phone} optional type="tel" inputMode="tel" value={values.phone} maxLength={40} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} autoComplete="off" />
          </div>
          <TextField label={t.email} optional type="email" value={values.email} maxLength={190} onChange={(e) => set({ email: e.target.value })} error={errors.email} autoComplete="off" />
          <TextAreaField label={t.note} optional rows={2} value={values.note} maxLength={1000} onChange={(e) => set({ note: e.target.value })} error={errors.note} />
          <label className="flex items-start justify-between gap-4 rounded-xl border border-border p-3.5">
            <span className="grid gap-0.5">
              <span className="text-sm font-semibold">{t.isActive}</span>
              <span className="text-sm text-muted-foreground">{t.isActiveHint}</span>
            </span>
            <Switch checked={values.is_active} onCheckedChange={(v) => set({ is_active: v })} aria-label={t.isActive} />
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={save.isPending}>{t.cancel}</Button></DialogClose>
          <Button type="submit" loading={save.isPending}>{t.save}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
