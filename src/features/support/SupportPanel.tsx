import { useId, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, MessagesSquare, Plus, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { supportApi, type Topic } from "@/api/endpoints/support";
import { ordersApi } from "@/api/endpoints/orders";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useTurnstile } from "@/features/auth/turnstile";
import { isVerified } from "@/features/auth/verification";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { ConversationView, supportField } from "./ConversationView";
import { useConversations } from "./useSupport";

function GuestSupport({ initialMessage = "" }: { initialMessage?: string }) {
  const t = useT().dict.support;
  const id = useId();
  const turnstile = useTurnstile("support_guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const submit = useMutation({
    mutationFn: async () => {
      try {
        return await supportApi.guest({ name, email, message, turnstile_token: await turnstile.getToken() });
      } finally {
        turnstile.reset();
      }
    },
  });

  return (
    <div className="grid gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{t.guestIntro}</p>
      {submit.data ? (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success-tint/60 p-4 text-sm font-semibold text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {t.sent} #{submit.data.id}
          </span>
        </div>
      ) : (
        <form
          className="grid gap-3 rounded-xl border border-border bg-surface-2/25 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit.mutate();
          }}
        >
          <div className="grid gap-1">
            <label htmlFor={`${id}-name`} className="text-xs font-semibold text-foreground">
              {t.name}
            </label>
            <input id={`${id}-name`} autoComplete="name" className={supportField} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <label htmlFor={`${id}-email`} className="text-xs font-semibold text-foreground">
              {t.email}
            </label>
            <input id={`${id}-email`} type="email" autoComplete="email" className={supportField} required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <label htmlFor={`${id}-message`} className="text-xs font-semibold text-foreground">
              {t.message}
            </label>
            <textarea id={`${id}-message`} className={supportField} required maxLength={2000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>
          {turnstile.widget}
          <Button type="submit" disabled={submit.isPending} className="gap-1.5">
            <Send className="size-4" aria-hidden="true" />
            {t.send}
          </Button>
          {submit.isError ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t.error}
            </p>
          ) : null}
        </form>
      )}
      <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline" to="/login">
        {t.signIn}
      </Link>
    </div>
  );
}

function CustomerSupport({ customer, initialMessage = "" }: { customer: Customer; initialMessage?: string }) {
  const { dict } = useT();
  const t = dict.support;
  const client = useQueryClient();
  const storageKey = `bookly.support.${customer.id}`;
  const [selected, setSelected] = useState(() => {
    if (initialMessage) return 0;
    try {
      return Number(localStorage.getItem(storageKey)) || 0;
    } catch {
      return 0;
    }
  });
  const [starting, setStarting] = useState(Boolean(initialMessage));
  const [topic, setTopic] = useState<Topic>("other");
  const [order, setOrder] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [page, setPage] = useState(1);
  const list = useConversations(false, `?page=${page}`);
  const orders = useQuery({ queryKey: ["support-orders", customer.id], queryFn: () => ordersApi.orders({ per_page: 20 }), enabled: starting && isVerified(customer) });

  const select = (id: number) => {
    setSelected(id);
    setStarting(false);
    try {
      localStorage.setItem(storageKey, String(id));
    } catch {
      /* Storage can be disabled. */
    }
  };

  const start = useMutation({
    mutationFn: () => supportApi.start({ topic, message, ...(order ? { order_id: Number(order) } : {}) }),
    onSuccess: (conversation) => {
      select(conversation.id);
      setMessage("");
      void client.invalidateQueries({ queryKey: ["support"] });
    },
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5">
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{t.intro}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selected || starting ? (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3.5 text-xs"
            onClick={() => {
              select(0);
              setStarting(false);
            }}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t.back}
          </Button>
        ) : (
          <span />
        )}
        {!starting ? (
          <Button
            variant={selected ? "outline" : "default"}
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3.5 text-xs"
            onClick={() => {
              select(0);
              setStarting(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t.start}
          </Button>
        ) : null}
      </div>

      {selected ? (
        <ConversationView key={selected} id={selected} />
      ) : starting ? (
        <form
          className="grid gap-3 rounded-xl border border-border bg-surface-2/30 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            start.mutate();
          }}
        >
          <label className="grid gap-1 text-xs font-semibold text-foreground">
            {t.topic}
            <select className={supportField} value={topic} onChange={(event) => setTopic(event.target.value as Topic)}>
              {Object.entries(t.topics).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-foreground">
            {t.order}
            <select className={supportField} value={order} onChange={(event) => setOrder(event.target.value)}>
              <option value="">{t.noOrder}</option>
              {orders.data?.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.order_number}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-foreground">
            {t.firstMessage}
            <textarea className={supportField} required maxLength={2000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <Button type="submit" disabled={start.isPending || !message.trim()} className="gap-1.5">
            <Send className="size-4" aria-hidden="true" />
            {t.send}
          </Button>
          {start.isError ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {t.error}
            </p>
          ) : null}
        </form>
      ) : list.isError ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive-tint/50 px-4 py-3 text-sm text-destructive">
          {t.error}
        </p>
      ) : list.isPending ? (
        <SkeletonGroup label={t.loading} className="grid gap-2.5">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
              <div className="grid gap-1.5">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
              <Skeleton className="size-4 rounded-full" />
            </div>
          ))}
        </SkeletonGroup>
      ) : (
        <ul className="grid gap-2.5">
          {list.data?.value.data.length ? (
            list.data.value.data.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/45 hover:bg-lapis-tint/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => select(item.id)}
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate font-semibold text-foreground group-hover:text-primary">
                      {t.topics[item.topic]} <span className="text-xs font-normal text-muted-foreground">· #{item.id}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{t.status[item.status]}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {item.unread_count ? (
                      <span className={cn("rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground")}>
                        {t.newReply} · {item.unread_count}
                      </span>
                    ) : null}
                    <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              <span className="grid size-11 place-items-center rounded-full bg-lapis-tint text-primary" aria-hidden="true">
                <MessagesSquare className="size-5" />
              </span>
              {t.empty}
            </li>
          )}
        </ul>
      )}

      {!selected && !starting && (list.data?.value.meta.last_page ?? 1) > 1 ? (
        <nav aria-label={dict.ui.pagination} className="flex items-center justify-between gap-2 pt-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {dict.ui.prev}
          </Button>
          <span className="text-xs font-medium text-muted-foreground">{dict.ui.page(page)}</span>
          <Button variant="outline" size="sm" disabled={page >= (list.data?.value.meta.last_page ?? 1)} onClick={() => setPage(page + 1)}>
            {dict.ui.next}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

export function SupportPanel({ initialMessage = "" }: { initialMessage?: string }) {
  const customer = useSession<Customer>("customer")?.user;
  // Any signed-in customer chats in the account, so staff replies show here (owner 2026-11-17).
  return customer ? <CustomerSupport key={`${customer.id}:${initialMessage}`} customer={customer} initialMessage={initialMessage} /> : <GuestSupport key={initialMessage} initialMessage={initialMessage} />;
}
