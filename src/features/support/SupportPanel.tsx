import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { supportApi, type Topic } from "@/api/endpoints/support";
import { ordersApi } from "@/api/endpoints/orders";
import { Button } from "@/components/ui/button";
import { useTurnstile } from "@/features/auth/turnstile";
import { needsVerifying } from "@/features/auth/verification";
import { useT } from "@/i18n";
import { ConversationView, supportField } from "./ConversationView";
import { useConversations } from "./useSupport";

function GuestSupport({ initialMessage = "" }: { initialMessage?: string }) {
  const t = useT().dict.support; const id = useId(); const turnstile = useTurnstile("support_guest");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [message, setMessage] = useState(initialMessage);
  const submit = useMutation({ mutationFn: async () => { try { return await supportApi.guest({ name, email, message, turnstile_token: await turnstile.getToken() }); } finally { turnstile.reset(); } } });
  return <div className="grid gap-4"><p className="text-sm text-muted-foreground">{t.guestIntro}</p>{submit.data ? <p role="status">{t.sent} #{submit.data.id}</p> : <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}>
    <label htmlFor={`${id}-name`}>{t.name}</label><input id={`${id}-name`} autoComplete="name" className={supportField} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
    <label htmlFor={`${id}-email`}>{t.email}</label><input id={`${id}-email`} type="email" autoComplete="email" className={supportField} required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} />
    <label htmlFor={`${id}-message`}>{t.message}</label><textarea id={`${id}-message`} className={supportField} required maxLength={2000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
    {turnstile.widget}<Button type="submit" disabled={submit.isPending}>{t.send}</Button>{submit.isError ? <p role="alert" className="text-destructive">{t.error}</p> : null}
  </form>}<Link className="min-h-11 py-2 text-primary underline" to="/login">{t.signIn}</Link></div>;
}

function CustomerSupport({ customer, initialMessage = "" }: { customer: Customer; initialMessage?: string }) {
  const { dict } = useT(); const t = dict.support; const client = useQueryClient();
  const storageKey = `bookly.support.${customer.id}`;
  const [selected, setSelected] = useState(() => { if (initialMessage) return 0; try { return Number(localStorage.getItem(storageKey)) || 0; } catch { return 0; } });
  const [starting, setStarting] = useState(Boolean(initialMessage)); const [topic, setTopic] = useState<Topic>("other"); const [order, setOrder] = useState(""); const [message, setMessage] = useState(initialMessage);
  const [page, setPage] = useState(1);
  const list = useConversations(false, `?page=${page}`);
  const orders = useQuery({ queryKey: ["support-orders", customer.id], queryFn: () => ordersApi.orders({ per_page: 20 }), enabled: starting });
  const select = (id: number) => { setSelected(id); setStarting(false); try { localStorage.setItem(storageKey, String(id)); } catch { /* Storage can be disabled. */ } };
  const start = useMutation({ mutationFn: () => supportApi.start({ topic, message, ...(order ? { order_id: Number(order) } : {}) }), onSuccess: (conversation) => { select(conversation.id); setMessage(""); void client.invalidateQueries({ queryKey: ["support"] }); } });
  return <div className="grid min-w-0 gap-4"><p className="text-sm text-muted-foreground">{t.intro}</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { select(0); setStarting(false); }}>{t.back}</Button><Button variant="outline" onClick={() => { select(0); setStarting(true); }}>{t.start}</Button></div>
    {selected ? <ConversationView key={selected} id={selected} /> : starting ? <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); start.mutate(); }}>
      <label className="grid gap-1">{t.topic}<select className={supportField} value={topic} onChange={(event) => setTopic(event.target.value as Topic)}>{Object.entries(t.topics).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="grid gap-1">{t.order}<select className={supportField} value={order} onChange={(event) => setOrder(event.target.value)}><option value="">{t.noOrder}</option>{orders.data?.data.map((item) => <option key={item.id} value={item.id}>{item.order_number}</option>)}</select></label>
      <label className="grid gap-1">{t.firstMessage}<textarea className={supportField} required maxLength={2000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <Button type="submit" disabled={start.isPending || !message.trim()}>{t.send}</Button>{start.isError ? <p role="alert" className="text-destructive">{t.error}</p> : null}
    </form> : list.isError ? <p role="alert">{t.error}</p> : list.isPending ? <p role="status">{t.loading}</p> : <ul className="grid gap-2">{list.data?.value.data.length ? list.data.value.data.map((item) => <li key={item.id}><Button variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => select(item.id)}>#{item.id} · {t.topics[item.topic]} · {t.status[item.status]}{item.unread_count ? ` (${item.unread_count})` : ""}</Button></li>) : <li>{t.empty}</li>}</ul>}
    {!selected && !starting && (list.data?.value.meta.last_page ?? 1) > 1 ? <nav aria-label={dict.ui.pagination} className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{dict.ui.prev}</Button><span className="self-center">{dict.ui.page(page)}</span><Button variant="outline" disabled={page >= (list.data?.value.meta.last_page ?? 1)} onClick={() => setPage(page + 1)}>{dict.ui.next}</Button></nav> : null}
  </div>;
}
export function SupportPanel({ initialMessage = "" }: { initialMessage?: string }) {
  const customer = useSession<Customer>("customer")?.user;
  return customer && !needsVerifying(customer) ? <CustomerSupport key={`${customer.id}:${initialMessage}`} customer={customer} initialMessage={initialMessage} /> : <GuestSupport key={initialMessage} initialMessage={initialMessage} />;
}
