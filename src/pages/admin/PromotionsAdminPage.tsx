import { formatUsd } from "@/stores/currency";
import { ResultSummary } from "@/features/admin/reportKit";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { promotionQueries, promotionsApi, type PromotionInput, type PromotionStatus, type StaffPromotion } from "@/api/endpoints/promotions";
import { opsQueries } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { Switch } from "@/components/ui/switch";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { orderDate } from "@/features/orders/format";
import { toast } from "@/stores/toast";

/*
 * /admin/promotions (owner 2026-11-12): the pop-up the shop shows between two dates, and a small reminder in the cart
 * and at checkout. Staff write the text (English, Khmer optional), choose the dates, link an offer (optional: the
 * pop-up then shows its percent and free delivery) and switch it on or off. The newest live promotion is the one
 * shown. Each row carries its results: times shown, button uses, and the linked offer's orders and revenue while the
 * promotion ran.
 */

const STATUS: Record<PromotionStatus, { label: string; tone: "success" | "info" | "neutral"; live?: boolean }> = {
  live: { label: "Showing", tone: "success", live: true },
  scheduled: { label: "Scheduled", tone: "info", live: true },
  hidden: { label: "Hidden", tone: "neutral" },
  ended: { label: "Ended", tone: "neutral" },
};

const toLocalInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
const rate = (clicks: number, views: number) => (views > 0 ? `${Math.round((clicks / views) * 100)}%` : "—");

export default function PromotionsAdminPage() {
  const queryClient = useQueryClient();
  const isAdmin = useStaff()?.user.role === "admin";
  const promotions = useQuery(promotionQueries.staffList());
  const list = promotions.data?.data ?? [];
  const [editing, setEditing] = useState<StaffPromotion | "new" | null>(null);
  const [deleting, setDeleting] = useState<StaffPromotion | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff", "promotions"] });
    void queryClient.invalidateQueries({ queryKey: ["promotions", "current"] });
  };

  const toggle = useMutation({
    mutationFn: ({ promotion, on }: { promotion: StaffPromotion; on: boolean }) => promotionsApi.update(promotion.id, { is_active: on }),
    onSuccess: (saved) => {
      refresh();
      toast.success(saved.is_active ? `${saved.title_en} is switched on` : `${saved.title_en} is hidden`);
    },
    onError: (err) => toast.error(ApiError.from(err).message),
  });
  const remove = useMutation({
    mutationFn: (promotion: StaffPromotion) => promotionsApi.remove(promotion.id),
    onSuccess: () => {
      refresh();
      toast.success("Promotion deleted");
      setDeleting(null);
    },
    onError: (err) => toast.error(ApiError.from(err).message),
  });

  return (
    <AdminPage
      title="Promotions"
      lead="The pop-up shoppers see, with its dates. The newest one that is showing wins; the cart and checkout carry a small reminder."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" /> New promotion
        </Button>
      }
    >
      {promotions.data && list.length > 0 ? <ResultSummary items={[
        { label: "Times shown", value: list.reduce((total, promotion) => total + promotion.views, 0).toLocaleString("en-US") },
        { label: "Button uses", value: list.reduce((total, promotion) => total + promotion.clicks, 0).toLocaleString("en-US") },
        { label: "Linked offer revenue", value: formatUsd(list.filter((promotion) => promotion.offer_id !== null).reduce((total, promotion) => total + Number(promotion.revenue_usd), 0)) },
      ]} /> : null}
      <ListState query={promotions} empty={{ when: list.length === 0, icon: Megaphone, title: "No promotions yet", description: "Create one to announce a sale or a set offer." }}>
        <TableCard minWidth={980}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={th}>Promotion</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Dates</th>
              <th scope="col" className={`${th} text-right`}>Shown</th>
              <th scope="col" className={`${th} text-right`}>Button used</th>
              <th scope="col" className={`${th} text-right`}>Orders</th>
              <th scope="col" className={`${th} text-right`}>Revenue</th>
              <th scope="col" className={th}>On</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((p) => {
              const status = STATUS[p.status] ?? STATUS.hidden;
              return (
                <tr key={p.id}>
                  <th scope="row" className={`${td} max-w-[20rem] font-semibold`}>
                    {p.title_en}
                    <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{p.offer_name ? `Offer: ${p.offer_name}` : "No offer linked"} · opens {p.cta_url}</span>
                  </th>
                  <td className={td}>
                    <Badge tone={status.tone} shape={status.live ? "tint" : "outline"}>
                      {status.live ? <CheckCircle2 aria-hidden="true" /> : <CircleSlash aria-hidden="true" />} {status.label}
                    </Badge>
                  </td>
                  <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>
                    {p.starts_at ? orderDate(p.starts_at) : "Now"} – {p.ends_at ? orderDate(p.ends_at) : "no end"}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{p.views}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {p.clicks} <span className="text-sm text-muted-foreground">({rate(p.clicks, p.views)})</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{p.offer_id ? p.orders_count : "—"}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.offer_id ? `$${p.revenue_usd}` : "—"}</td>
                  <td className={td}>
                    <Switch
                      checked={p.is_active}
                      disabled={toggle.isPending}
                      aria-label={`${p.is_active ? "Hide" : "Show"} ${p.title_en}`}
                      onCheckedChange={(on) => toggle.mutate({ promotion: p, on })}
                    />
                  </td>
                  <td className={td}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`Edit ${p.title_en}`} onClick={() => setEditing(p)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      {isAdmin ? <Button size="icon" variant="ghost" aria-label={`Delete ${p.title_en}`} onClick={() => setDeleting(p)}>
                        <Trash2 aria-hidden="true" />
                      </Button> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </ListState>

      {editing ? <PromotionDialog promotion={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} /> : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title_en ?? "promotion"}?`}
        description="Its results (times shown, button uses) are deleted with it. To stop showing it, switch it off instead."
        confirmLabel="Delete promotion"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AdminPage>
  );
}

type Values = {
  title_en: string;
  title_km: string;
  body_en: string;
  body_km: string;
  image_url: string;
  cta_label_en: string;
  cta_label_km: string;
  cta_url: string;
  offer_id: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};
type Errors = Partial<Record<keyof Values | "form", string>>;
const FIELDS = ["title_en", "title_km", "body_en", "body_km", "image_url", "cta_label_en", "cta_label_km", "cta_url", "offer_id", "starts_at", "ends_at"] as const;

function PromotionDialog({ promotion, onClose, onSaved }: { promotion: StaffPromotion | null; onClose: () => void; onSaved: () => void }) {
  const offers = useQuery(opsQueries.offers({ per_page: 100 }));
  const [v, setV] = useState<Values>({
    title_en: promotion?.title_en ?? "",
    title_km: promotion?.title_km ?? "",
    body_en: promotion?.body_en ?? "",
    body_km: promotion?.body_km ?? "",
    image_url: promotion?.image_url ?? "",
    cta_label_en: promotion?.cta_label_en ?? "",
    cta_label_km: promotion?.cta_label_km ?? "",
    cta_url: promotion?.cta_url ?? "/books",
    offer_id: promotion?.offer_id ? String(promotion.offer_id) : "",
    starts_at: toLocalInput(promotion?.starts_at ?? null),
    ends_at: toLocalInput(promotion?.ends_at ?? null),
    is_active: promotion?.is_active ?? false, // new promotions start hidden: switch them on from the list once checked
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));

  const save = useMutation({
    mutationFn: (input: PromotionInput) => (promotion ? promotionsApi.update(promotion.id, input) : promotionsApi.create(input)),
    onSuccess: (saved) => {
      onSaved();
      toast.success(promotion ? `${saved.title_en} saved` : `${saved.title_en} created (hidden until you switch it on)`);
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
    if (!v.title_en.trim()) e.title_en = "Write the title shoppers will read.";
    if (!/^\/(?!\/)\S*$/.test(v.cta_url.trim())) e.cta_url = "Use a page of the shop, starting with /, like /books or /series/3.";
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) e.ends_at = "The end must be after the start.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const orNull = (value: string) => value.trim() || null;
    save.mutate({
      title_en: v.title_en.trim(),
      title_km: orNull(v.title_km),
      body_en: orNull(v.body_en),
      body_km: orNull(v.body_km),
      image_url: orNull(v.image_url),
      cta_label_en: orNull(v.cta_label_en),
      cta_label_km: orNull(v.cta_label_km),
      cta_url: v.cta_url.trim(),
      offer_id: v.offer_id ? Number(v.offer_id) : null,
      starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
      ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
      ...(promotion ? {} : { is_active: false }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="lg">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{promotion ? `Edit ${promotion.title_en}` : "New promotion"}</DialogTitle>
            <DialogDescription>
              Shoppers see this as a pop-up once per visit, and as a small line in the cart and at checkout. It only announces: the discount itself is the offer you link.
            </DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert title={errors.form} /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Title (English)" value={v.title_en} onChange={(e) => set({ title_en: e.target.value })} error={errors.title_en} maxLength={120} />
            <TextField label="Title (Khmer)" optional hint="Empty: the English title shows in Khmer too." value={v.title_km} onChange={(e) => set({ title_km: e.target.value })} error={errors.title_km} maxLength={120} />
            <TextAreaField label="Text (English)" optional rows={3} value={v.body_en} onChange={(e) => set({ body_en: e.target.value })} error={errors.body_en} maxLength={500} />
            <TextAreaField label="Text (Khmer)" optional rows={3} value={v.body_km} onChange={(e) => set({ body_km: e.target.value })} error={errors.body_km} maxLength={500} />
          </div>
          <ImageUploadField label="Picture" optional hint="Wide pictures work best (about 16:7). JPEG, PNG or WebP up to 5 MB." value={v.image_url} onChange={(url) => set({ image_url: url })} error={errors.image_url} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label="Offer to announce" value={v.offer_id} onChange={(e) => set({ offer_id: e.target.value })} error={errors.offer_id} hint="The pop-up shows its percent and free delivery while the offer is on.">
              <option value="">No offer</option>
              {(offers.data?.data ?? []).filter((o) => o.type !== "gift").map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </SelectField>
            <TextField label="Button opens" hint="A page of the shop, like /books or /series/3." value={v.cta_url} onChange={(e) => set({ cta_url: e.target.value })} error={errors.cta_url} maxLength={255} />
            <TextField label="Button text (English)" optional hint="Empty: “Shop now”." value={v.cta_label_en} onChange={(e) => set({ cta_label_en: e.target.value })} error={errors.cta_label_en} maxLength={40} />
            <TextField label="Button text (Khmer)" optional value={v.cta_label_km} onChange={(e) => set({ cta_label_km: e.target.value })} error={errors.cta_label_km} maxLength={40} />
            <TextField label="Starts" optional type="datetime-local" value={v.starts_at} onChange={(e) => set({ starts_at: e.target.value })} error={errors.starts_at} />
            <TextField label="Ends" optional type="datetime-local" hint="The pop-up counts down to this time." value={v.ends_at} onChange={(e) => set({ ends_at: e.target.value })} error={errors.ends_at} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={save.isPending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>{promotion ? "Save promotion" : "Create promotion"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
