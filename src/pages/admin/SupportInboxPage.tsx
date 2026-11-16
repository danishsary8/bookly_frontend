import { Inbox, MessageSquareText, RefreshCw } from "lucide-react";
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
  return <div className="work-inbox-detail">
    {conversation ? <aside className="work-customer-details">
      <div className="grid gap-1"><p className="font-semibold break-words [overflow-wrap:anywhere]">{conversation.customer?.name ?? t.guest}</p><p className="text-muted-foreground break-words [overflow-wrap:anywhere]">{conversation.customer?.email}</p>
      {conversation.order_id ? <Link className="inline-flex min-h-11 items-center text-primary underline" to={`/admin/orders/${conversation.order_id}`}>{t.orderLink} #{conversation.order_id}</Link> : null}</div>
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
    <div className="work-toolbar" aria-label="Conversation filters"><label>{t.statusLabel}<select className={supportField} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t.all}</option>{Object.entries(t.status).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>{t.topic}<select className={supportField} value={topic} onChange={(event) => { setTopic(event.target.value); setPage(1); }}><option value="">{t.all}</option>{Object.entries(t.topics).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="work-check"><input type="checkbox" checked={assigned} onChange={(event) => { setAssigned(event.target.checked); setPage(1); }} />{t.assigned}</label><label className="work-check"><input type="checkbox" checked={unread} onChange={(event) => { setUnread(event.target.checked); setPage(1); }} />{t.unreadOnly}</label>
      <Button variant="outline" onClick={() => void client.invalidateQueries({ queryKey: ["support"] })}><RefreshCw className="size-4" aria-hidden="true" />{t.refresh}</Button>
    </div>
    <div className="work-inbox"><div className="work-inbox-list"><h2 className="work-inbox-heading"><span className="flex items-center gap-2"><Inbox className="size-4" aria-hidden="true" />Conversations</span><span className="text-xs font-normal text-muted-foreground">{list.data?.value.meta?.total ?? list.data?.value.data.length ?? 0}</span></h2><ul aria-label="Conversations">{list.data?.value.data.map((item) => <li key={item.id}><button type="button" aria-current={selected === item.id ? "true" : undefined} className="work-conversation-row" onClick={() => setParams({ conversation: String(item.id) })}><span><strong>{t.topics[item.topic]}</strong>{item.unread_count ? <span className="work-unread" aria-label={`${item.unread_count} unread`}>{item.unread_count}</span> : null}</span><span><small>#{item.id} · {item.customer?.name ?? t.guest}</small><small>{t.status[item.status]}</small></span></button></li>)}</ul>{list.isError ? <p role="alert" className="work-inbox-empty">{t.error}</p> : !list.data?.value.data.length ? <div className="work-inbox-empty"><MessageSquareText className="size-6" aria-hidden="true" /><p>{list.isPending ? t.loading : t.empty}</p></div> : null}
    <div className="work-pagination px-3"><Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={dict.ui.previousPage}>&larr;</Button><span>{page}</span><Button variant="ghost" disabled={page >= (list.data?.value.meta?.last_page ?? 1)} onClick={() => setPage(page + 1)} aria-label={dict.ui.nextPage}>&rarr;</Button></div></div>{selected ? <StaffConversation key={selected} id={selected} /> : <div className="work-empty-conversation desk-card grid place-content-center justify-items-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center"><span className="work-icon"><MessageSquareText className="size-6" aria-hidden="true" /></span><h2 className="text-lg font-semibold">Select a conversation</h2><p className="max-w-xs text-sm text-muted-foreground">Choose a conversation to view its messages and help your customer.</p></div>}</div>
    <SupportTools templates={templates.data ?? []} admin={session?.user.role === "admin"} />
  </AdminPage>;
}
