import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportApi, type QuickReply } from "@/api/endpoints/support";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { supportField } from "./ConversationView";

export function SupportTools({ templates, admin }: { templates: QuickReply[]; admin: boolean }) {
  const t = useT().dict.support; const client = useQueryClient();
  const [editing, setEditing] = useState<number>(); const [title, setTitle] = useState(""); const [en, setEn] = useState(""); const [km, setKm] = useState("");
  const [staffId, setStaffId] = useState(""); const [telegramId, setTelegramId] = useState("");
  const staff = useQuery({ queryKey: ["support", "staff-options"], queryFn: supportApi.staff, enabled: admin });
  const mutate = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: () => client.invalidateQueries({ queryKey: ["support"] }) });
  return <div className="grid gap-4">
    <details className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer font-semibold">{t.quickReplies}</summary>
      <ul className="grid gap-3">{templates.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-2"><span className="mr-auto break-words">{item.title}</span><Button variant="outline" onClick={() => { setEditing(item.id); setTitle(item.title); setEn(item.body_en); setKm(item.body_km); }}>{t.edit}</Button><Button variant="outline" disabled={mutate.isPending} onClick={() => mutate.mutate(() => supportApi.deleteTemplate(item.id))}>{t.delete}</Button></li>)}</ul>
      <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); mutate.mutate(async () => { await supportApi.saveTemplate({ title, body_en: en, body_km: km }, editing); setEditing(undefined); setTitle(""); setEn(""); setKm(""); }); }}>
        <label className="grid gap-1">{t.templateTitle}<input className={supportField} value={title} required maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="grid gap-1">{t.english}<textarea className={supportField} value={en} required maxLength={2000} onChange={(event) => setEn(event.target.value)} /></label>
        <label className="grid gap-1">{t.khmer}<textarea lang="km" className={supportField} value={km} required maxLength={2000} onChange={(event) => setKm(event.target.value)} /></label>
        <Button type="submit" disabled={mutate.isPending}>{editing ? t.save : t.addTemplate}</Button>
      </form>
    </details>
    {admin ? <details className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer font-semibold">{t.binding}</summary><p className="text-sm text-muted-foreground">{t.bindingHelp}</p><form className="mt-3 grid gap-3" onSubmit={(event) => { event.preventDefault(); mutate.mutate(() => supportApi.bind(Number(staffId), telegramId ? Number(telegramId) : null)); }}>
      <label className="grid gap-1">{t.staff}<select className={supportField} required value={staffId} onChange={(event) => setStaffId(event.target.value)}><option value="">{t.staff}</option>{staff.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1">{t.telegramId}<input className={supportField} type="number" min={1} step={1} value={telegramId} onChange={(event) => setTelegramId(event.target.value)} /></label><Button disabled={mutate.isPending} type="submit">{t.save}</Button>
    </form></details> : null}
    {mutate.isError ? <p role="alert" className="text-destructive">{t.error}</p> : mutate.isSuccess ? <p role="status">{t.saved}</p> : null}
  </div>;
}
