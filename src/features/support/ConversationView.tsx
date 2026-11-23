import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi, type Conversation, type QuickReply } from "@/api/endpoints/support";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/ratings/StarRatingInput";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useConversation } from "./useSupport";

export const supportField = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ConversationView({ id, staff = false, templates = [] }: { id: number; staff?: boolean; templates?: QuickReply[] }) {
  const { dict, lang } = useT(); const t = dict.support; const label = useId();
  const query = useConversation(id, staff); const conversation = query.data?.value.data;
  const client = useQueryClient();
  const [message, setMessage] = useState(""); const [internal, setInternal] = useState(false);
  const [stars, setStars] = useState(0); const [comment, setComment] = useState("");
  const [older, setOlder] = useState<NonNullable<Conversation["messages"]>>([]);
  const [hasOlder, setHasOlder] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ["support"] });
  const action = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onSuccess: refresh });
  const unread = conversation?.unread_count ?? 0;
  useEffect(() => {
    if (!unread) return;
    void supportApi.read(id, staff).then(refresh).catch(() => {});
    // Only mark a mounted conversation read; background inbox polling never consumes unread state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, staff, unread]);
  const latestCount = conversation?.messages?.length ?? 0;
  useEffect(() => {
    const el = logRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [id, latestCount]);
  if (!conversation) return <p role="status">{query.isError ? t.error : t.loading}</p>;
  const messages = [...older, ...(conversation.messages ?? [])];
  return <section className="grid min-w-0 gap-4" aria-label={`${t.reference} #${id}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface-2/40 px-3 py-2 text-sm">
      <span className="font-semibold text-foreground">{t.topics[conversation.topic]} <span className="font-normal text-muted-foreground">· #{id}</span></span>
      <span className="rounded-full bg-lapis-tint px-2.5 py-0.5 text-xs font-semibold text-primary">{t.status[conversation.status]}</span>
    </div>
    {(conversation.messages?.length ?? 0) === 100 && hasOlder ? <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate(async () => { const result = await supportApi.older(id, messages[0].id, staff); setOlder((previous) => [...(result.messages ?? []), ...previous]); setHasOlder(result.messages?.length === 100); })}>{t.previous}</Button> : null}
    <div ref={logRef} role="log" aria-label={t.message} aria-live="polite" aria-relevant="additions" className="grid max-h-80 gap-3 overflow-y-auto rounded-xl border border-border bg-secondary/25 p-3.5">
      {messages.map((item) => {
        const isMine = (staff && item.sender === "staff" && !item.is_internal) || (!staff && item.sender === "customer");
        const isSystem = item.sender === "system";
        return (
          <article
            key={item.id}
            className={cn(
              "min-w-0 max-w-[88%] rounded-2xl border px-3.5 py-2.5 shadow-2xs",
              item.is_internal
                ? "justify-self-stretch max-w-full border-warning/40 bg-warning-tint/45 text-foreground"
                : isSystem
                  ? "justify-self-center border-border bg-surface-2/60 text-center text-xs text-muted-foreground"
                  : isMine
                    ? "justify-self-end rounded-br-sm border-primary/25 bg-lapis-tint/75 text-foreground"
                    : "justify-self-start rounded-bl-sm border-border bg-card text-foreground",
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {item.is_internal ? t.note : item.sender === "staff" ? t.team : item.sender === "system" ? t.system : staff ? t.customer : t.you}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{item.body}</p>
            <time className="mt-1 block text-[11px] text-muted-foreground" dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleString(lang === "km" ? "km-KH" : "en-GB")}
            </time>
          </article>
        );
      })}
    </div>
    {conversation.status !== "closed" ? <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); action.mutate(async () => { await supportApi.message(id, message.trim(), staff, internal); setMessage(""); }); }}>
      {staff && templates.length ? <label className="grid gap-1 text-sm">{t.quickReplies}<select className={supportField} defaultValue="" onChange={(event) => { const template = templates.find((item) => item.id === Number(event.target.value)); if (template) setMessage(lang === "km" ? template.body_km : template.body_en); event.target.value = ""; }}><option value="">{t.quickReplies}</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label> : null}
      <label htmlFor={`${label}-message`} className="text-sm font-semibold">{staff ? t.reply : t.message}</label>
      <textarea id={`${label}-message`} className={supportField} required maxLength={2000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
      {staff ? <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />{t.note}</label> : null}
      <Button type="submit" disabled={action.isPending || !message.trim()}>{t.send}</Button>
      <p className="text-xs text-muted-foreground">{t.noTyping}</p>
    </form> : <p>{t.closed}</p>}
    {!staff && conversation.status !== "closed" ? <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate(() => supportApi.status(id, "closed"))}>{t.close}</Button> : null}
    {!staff && conversation.status === "closed" ? conversation.rating ? <p role="status">{t.rated} {conversation.rating.stars}/5</p> : <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); action.mutate(() => supportApi.rate(id, stars, comment)); }}>
      <StarRatingInput value={stars} onChange={setStars} />
      <label className="grid gap-1 text-sm">{t.comment}<textarea className={supportField} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <Button type="submit" disabled={!stars || action.isPending}>{t.rate}</Button>
    </form> : null}
    {action.isError ? <p role="alert" className="text-destructive">{t.error}</p> : null}
  </section>;
}
