import { useEffect, useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi, type Conversation, type QuickReply } from "@/api/endpoints/support";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/ratings/StarRatingInput";
import { useT } from "@/i18n";
import { useConversation } from "./useSupport";

export const supportField = "min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ConversationView({ id, staff = false, templates = [] }: { id: number; staff?: boolean; templates?: QuickReply[] }) {
  const { dict, lang } = useT(); const t = dict.support; const label = useId();
  const query = useConversation(id, staff); const conversation = query.data?.value.data;
  const client = useQueryClient();
  const [message, setMessage] = useState(""); const [internal, setInternal] = useState(false);
  const [stars, setStars] = useState(0); const [comment, setComment] = useState("");
  const [older, setOlder] = useState<NonNullable<Conversation["messages"]>>([]);
  const [hasOlder, setHasOlder] = useState(true);
  const refresh = () => client.invalidateQueries({ queryKey: ["support"] });
  const action = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onSuccess: refresh });
  const unread = conversation?.unread_count ?? 0;
  useEffect(() => {
    if (!unread) return;
    void supportApi.read(id, staff).then(refresh).catch(() => {});
    // Only mark a mounted conversation read; background inbox polling never consumes unread state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, staff, unread]);
  if (!conversation) return <p role="status">{query.isError ? t.error : t.loading}</p>;
  const messages = [...older, ...(conversation.messages ?? [])];
  return <section className="grid min-w-0 gap-4" aria-label={`${t.reference} #${id}`}>
    <p className="text-sm text-muted-foreground">#{id} · {t.topics[conversation.topic]} · {t.status[conversation.status]}</p>
    {(conversation.messages?.length ?? 0) === 100 && hasOlder ? <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate(async () => { const result = await supportApi.older(id, messages[0].id, staff); setOlder((previous) => [...(result.messages ?? []), ...previous]); setHasOlder(result.messages?.length === 100); })}>{t.previous}</Button> : null}
    <div role="log" aria-label={t.message} aria-live="polite" aria-relevant="additions" className="grid max-h-80 gap-3 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3">
      {messages.map((item) => <article key={item.id} className="min-w-0 rounded-md border border-border bg-card p-3">
        <p className="text-xs font-semibold text-muted-foreground">{item.is_internal ? t.note : item.sender === "staff" ? t.team : item.sender === "system" ? t.system : staff ? t.customer : t.you}</p>
        <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.body}</p>
        <time className="mt-1 block text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(lang === "km" ? "km-KH" : "en-GB")}</time>
      </article>)}
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
