import { MessageSquareText } from "lucide-react";
import { AdminPage } from "@/features/admin/AdminPage";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportApi, type Conversation } from "@/api/endpoints/support";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/features/admin/staffSession";
import { ConversationView, supportField } from "@/features/support/ConversationView";
import { useConversation, useConversations } from "@/features/support/useSupport";
import { SupportTools } from "@/features/support/SupportTools";
import { useT } from "@/i18n";

function StaffConversation({ id }: { id: number }) {
  const { dict } = useT(); const t = dict.support; const query = useConversation(id, true); const conversation = query.data?.value.data;
  const options = useQuery({ queryKey: ["support", "staff-options"], queryFn: supportApi.staff });
  const templates = useQuery({ queryKey: ["support", "templates"], queryFn: supportApi.templates });
  const client = useQueryClient(); const action = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: () => client.invalidateQueries({ queryKey: ["support"] }) });
  return <div className="grid min-w-0 gap-5">
    {conversation ? <aside className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <p className="break-words [overflow-wrap:anywhere]">{t.customer}: {conversation.customer?.name ?? t.guest}</p><p className="break-words [overflow-wrap:anywhere]">{conversation.customer?.email}</p>
      {conversation.order_id ? <Link className="min-h-11 py-2 text-primary underline" to={`/admin/orders/${conversation.order_id}`}>{t.orderLink} #{conversation.order_id}</Link> : null}
      <label className="grid gap-1">{t.assignee}<select className={supportField} disabled={action.isPending} value={conversation.assigned_staff_id ?? ""} onChange={(event) => action.mutate(() => supportApi.assign(id, event.target.value ? Number(event.target.value) : null))}><option value="">{t.unassigned}</option>{options.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1">{t.statusLabel}<select className={supportField} disabled={action.isPending} value={conversation.status} onChange={(event) => action.mutate(() => supportApi.status(id, event.target.value as Conversation["status"], true))}>{Object.entries(t.status).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      {action.isError ? <p role="alert" className="text-destructive">{t.error}</p> : null}
    </aside> : null}
    <ConversationView key={id} id={id} staff templates={templates.data} />
  </div>;
}

export default function SupportInboxPage() {
  const { dict } = useT(); const t = dict.support; const session = useStaff(); const client = useQueryClient();
  const allowed = !!session && (session.user.role === "admin" || !session.user.permissions || session.user.permissions.includes("support:manage"));
  const [params, setParams] = useSearchParams(); const selected = Number(params.get("conversation")) || 0;
  const [status, setStatus] = useState(""); const [topic, setTopic] = useState(""); const [assigned, setAssigned] = useState(false); const [unread, setUnread] = useState(false); const [page, setPage] = useState(1);
  const filters = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(topic ? { topic } : {}), ...(assigned ? { assigned_to_me: "1" } : {}), ...(unread ? { unread: "1" } : {}) });
  const list = useConversations(true, `?${filters}`, allowed);
  const templates = useQuery({ queryKey: ["support", "templates"], queryFn: supportApi.templates, enabled: allowed });
  if (!allowed) return <p role="alert">{t.noPermission}</p>;
  return <AdminPage title={t.title} lead="One place for customer conversations, follow-ups and resolutions.">
    <div className="desk-card grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"><label className="grid gap-1">{t.statusLabel}<select className={supportField} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t.all}</option>{Object.entries(t.status).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label className="grid gap-1">{t.topic}<select className={supportField} value={topic} onChange={(event) => { setTopic(event.target.value); setPage(1); }}><option value="">{t.all}</option>{Object.entries(t.topics).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={assigned} onChange={(event) => { setAssigned(event.target.checked); setPage(1); }} />{t.assigned}</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={unread} onChange={(event) => { setUnread(event.target.checked); setPage(1); }} />{t.unreadOnly}</label>
    </div><Button variant="outline" onClick={() => void client.invalidateQueries({ queryKey: ["support"] })}>{t.refresh}</Button>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"><div className="grid content-start gap-3"><ul className="grid gap-2">{list.data?.value.data.map((item) => <li key={item.id}><Button variant={selected === item.id ? "default" : "outline"} className="h-auto min-h-11 w-full justify-start whitespace-normal break-words text-left" onClick={() => setParams({ conversation: String(item.id) })}>#{item.id} · {t.topics[item.topic]} · {t.status[item.status]}{item.unread_count ? ` (${item.unread_count})` : ""}</Button></li>)}</ul>{list.isError ? <p role="alert">{t.error}</p> : !list.data?.value.data.length ? <p>{list.isPending ? t.loading : t.empty}</p> : null}
    <div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={dict.ui.previousPage}>&larr;</Button><span className="self-center">{page}</span><Button variant="outline" disabled={page >= (list.data?.value.meta?.last_page ?? 1)} onClick={() => setPage(page + 1)} aria-label={dict.ui.nextPage}>&rarr;</Button></div></div>{selected ? <StaffConversation key={selected} id={selected} /> : <div className="desk-card grid min-h-64 place-content-center justify-items-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center"><span className="grid size-12 place-items-center rounded-lg bg-lapis-tint text-primary"><MessageSquareText className="size-6" aria-hidden="true" /></span><h2 className="text-lg font-semibold">Select a conversation</h2><p className="max-w-xs text-sm text-muted-foreground">Choose a conversation to view its messages and help your customer.</p></div>}</div>
    <SupportTools templates={templates.data ?? []} admin={session?.user.role === "admin"} />
  </AdminPage>;
}
