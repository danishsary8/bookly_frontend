import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { Gift as GiftIcon, Plus } from "lucide-react";
import { ListState } from "@/features/admin/listKit";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { giftsApi, type Gift } from "@/api/endpoints/gifts";
import { ApiError } from "@/api/errors";
import { TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  return <AdminPage title={t.gifts} lead="Manage the gifts included with special offers." actions={admin ? <Button onClick={() => { save.reset(); setEditing({ ...blank }); }}><Plus aria-hidden="true" />{t.create}</Button> : null}>

    <ListState query={gifts} empty={{ when: (gifts.data?.length ?? 0) === 0, icon: GiftIcon, title: "No gifts yet", description: "Gifts added to your offers appear here." }}><ul className="work-gift-grid">{gifts.data?.map((gift) => <li key={gift.id} className="work-gift-card">
      <div className="work-gift-card-header"><span className="work-icon"><GiftIcon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold break-words">{gift.name_en}</p><p lang="km" className="text-sm text-muted-foreground break-words">{gift.name_km}</p><p className="mt-1 text-xs text-muted-foreground">{gift.is_active ? "Active" : "Inactive"}</p></div></div>
      <div className="work-gift-card-footer"><div><p className="text-sm">{t.stock}: <strong className="tabular-nums">{gift.stock}</strong></p>{(gift.stock ?? 0) <= 5 ? <p className="text-xs text-warning">{t.lowGift}</p> : null}</div>{admin ? <Button variant="outline" onClick={() => { save.reset(); setEditing({ ...gift }); }}>{t.edit}</Button> : null}</div>
    </li>)}</ul></ListState>
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !save.isPending) setEditing(null); }}>
      <DialogContent>
        {editing ? <form className="grid gap-4" onSubmit={submit}><DialogHeader><DialogTitle>{editing.id ? t.save : t.create}</DialogTitle><DialogDescription>Gift details and availability for your special offers.</DialogDescription></DialogHeader>
          <TextField label={t.giftNameEn} required maxLength={100} value={editing.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
          <TextField label={t.giftNameKm} required maxLength={100} value={editing.name_km ?? ""} onChange={(e) => setEditing({ ...editing, name_km: e.target.value })} />
          <TextField label={t.image} type="url" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value || null })} />
          <TextField label={t.stock} type="number" min={0} max={1000000} required value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />{t.active}</label>
          {save.isError ? <p role="alert" className="text-destructive">{ApiError.from(save.error).message}</p> : null}
          <DialogFooter><DialogClose asChild><Button variant="outline" type="button" disabled={save.isPending}>{dict.ui.cancel}</Button></DialogClose><Button type="submit" loading={save.isPending}>{t.save}</Button></DialogFooter>
        </form> : null}
      </DialogContent>
    </Dialog>
  </AdminPage>;
}
