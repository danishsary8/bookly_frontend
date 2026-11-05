import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { giftsApi, type Gift } from "@/api/endpoints/gifts";
import { ApiError } from "@/api/errors";
import { TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminPage } from "@/features/admin/AdminPage";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";

const blank: Gift = { name_en: "", name_km: "", image_url: null, stock: 0, is_active: true };

export default function GiftsPage() {
  const { dict } = useT();
  const t = dict.shopExtras;
  const client = useQueryClient();
  const admin = useStaff()?.user.role === "admin";
  const gifts = useQuery({ queryKey: ["staff", "gifts"], queryFn: giftsApi.list });
  const [editing, setEditing] = useState<Gift | null>(null);
  const save = useMutation({ mutationFn: (gift: Gift) => giftsApi.save(gift.id, gift), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ["staff", "gifts"] });
    setEditing(null);
  } });
  const submit = (event: FormEvent) => { event.preventDefault(); if (editing) save.mutate(editing); };
  return <AdminPage title={t.gifts}>
    {admin ? <Button onClick={() => { save.reset(); setEditing({ ...blank }); }}>{t.create}</Button> : null}
    {gifts.isError ? <ErrorState error={gifts.error} onRetry={() => gifts.refetch()} /> : null}
    <ul className="grid gap-4">{gifts.data?.map((gift) => <li key={gift.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div><p className="font-semibold">{gift.name_en} · {gift.name_km}</p><p>{t.stock}: {gift.stock}</p>{(gift.stock ?? 0) <= 5 ? <p className="text-warning">{t.lowGift}</p> : null}</div>
      {admin ? <Button variant="outline" onClick={() => { save.reset(); setEditing({ ...gift }); }}>{t.edit}</Button> : null}
    </li>)}</ul>
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !save.isPending) setEditing(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{editing?.id ? t.save : t.create}</DialogTitle></DialogHeader>
        {editing ? <form className="grid gap-4" onSubmit={submit}>
          <TextField label={t.giftNameEn} required maxLength={100} value={editing.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
          <TextField label={t.giftNameKm} required maxLength={100} value={editing.name_km ?? ""} onChange={(e) => setEditing({ ...editing, name_km: e.target.value })} />
          <TextField label={t.image} type="url" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value || null })} />
          <TextField label={t.stock} type="number" min={0} max={1000000} required value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />{t.active}</label>
          {save.isError ? <p role="alert" className="text-destructive">{ApiError.from(save.error).message}</p> : null}
          <Button type="submit" loading={save.isPending}>{t.save}</Button>
        </form> : null}
      </DialogContent>
    </Dialog>
  </AdminPage>;
}
