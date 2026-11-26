import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Headphones, Send, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi, type Conversation, type QuickReply } from "@/api/endpoints/support";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { StarRatingInput } from "@/components/ratings/StarRatingInput";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useConversation } from "./useSupport";

export const supportField = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ConversationView({ id, staff = false, templates = [] }: { id: number; staff?: boolean; templates?: QuickReply[] }) {
  const { dict, lang } = useT();
  const t = dict.support;
  const label = useId();
  const query = useConversation(id, staff);
  const conversation = query.data?.value.data;
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
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

  if (query.isError && !conversation) {
    return <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive-tint/50 px-4 py-3 text-sm text-destructive">{t.error}</p>;
  }
  if (!conversation) {
    return (
      <SkeletonGroup label={t.loading} className="grid gap-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-3.5 py-2.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid gap-3 rounded-xl border border-border bg-surface-2/25 p-3.5">
          <Skeleton className="h-14 w-3/4 justify-self-end rounded-2xl" />
          <Skeleton className="h-16 w-4/5 justify-self-start rounded-2xl" />
          <Skeleton className="h-12 w-2/3 justify-self-end rounded-2xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 w-20 rounded-lg" />
        </div>
      </SkeletonGroup>
    );
  }

  const messages = [...older, ...(conversation.messages ?? [])];
  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed || action.isPending) return;
    action.mutate(async () => {
      await supportApi.message(id, trimmed, staff, internal);
      setMessage("");
    });
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3" aria-label={`${t.reference} #${id}`}>
      {/* Conversation header with status & compact Close action */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-surface-2/40 px-3.5 py-2.5 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-lapis-tint text-primary" aria-hidden="true">
            <Headphones className="size-3.5" />
          </span>
          <span className="truncate font-semibold text-foreground">
            {t.topics[conversation.topic]} <span className="font-normal text-muted-foreground">· #{id}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
              conversation.status === "closed" ? "bg-surface-2 text-muted-foreground" : "bg-lapis-tint text-primary",
            )}
          >
            {t.status[conversation.status]}
          </span>
          {!staff && conversation.status !== "closed" ? (
            <button
              type="button"
              disabled={action.isPending}
              onClick={() => action.mutate(() => supportApi.status(id, "closed"))}
              className="inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive-tint/50 hover:text-destructive disabled:opacity-50"
            >
              <XCircle className="size-3" aria-hidden="true" />
              <span>{t.close}</span>
            </button>
          ) : null}
        </div>
      </div>

      {(conversation.messages?.length ?? 0) === 100 && hasOlder ? (
        <Button
          variant="outline"
          size="sm"
          disabled={action.isPending}
          onClick={() =>
            action.mutate(async () => {
              const result = await supportApi.older(id, messages[0].id, staff);
              setOlder((previous) => [...(result.messages ?? []), ...previous]);
              setHasOlder(result.messages?.length === 100);
            })
          }
        >
          {t.previous}
        </Button>
      ) : null}

      {/* Scrollable message log */}
      <div
        ref={logRef}
        role="log"
        aria-label={t.message}
        aria-live="polite"
        aria-relevant="additions"
        className="grid min-h-[180px] max-h-80 flex-1 content-start gap-2.5 overflow-y-auto rounded-xl border border-border/80 bg-surface-2/30 p-3.5"
      >
        {messages.map((item) => {
          const isMine = (staff && item.sender === "staff" && !item.is_internal) || (!staff && item.sender === "customer");
          const isSystem = item.sender === "system";
          return (
            <article
              key={item.id}
              className={cn(
                "min-w-0 max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-2xs",
                item.is_internal
                  ? "justify-self-stretch max-w-full border border-warning/40 bg-warning-tint/45 text-foreground"
                  : isSystem
                    ? "justify-self-center border border-border/70 bg-card/80 px-3 py-1.5 text-center text-xs text-muted-foreground"
                    : isMine
                      ? "justify-self-end rounded-br-xs bg-primary text-primary-foreground"
                      : "justify-self-start rounded-bl-xs border border-border bg-card text-foreground",
              )}
            >
              <p className={cn("text-[11px] font-semibold", isMine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {item.is_internal ? t.note : item.sender === "staff" ? t.team : item.sender === "system" ? t.system : staff ? t.customer : t.you}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">{item.body}</p>
              <time
                className={cn("mt-1 block text-[10.5px]", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}
                dateTime={item.created_at}
              >
                {new Date(item.created_at).toLocaleString(lang === "km" ? "km-KH" : "en-GB")}
              </time>
            </article>
          );
        })}
      </div>

      {/* Pinned reply composer (Enter to send, Shift+Enter for newline) */}
      {conversation.status !== "closed" ? (
        <form
          className="grid shrink-0 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          {staff && templates.length ? (
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              {t.quickReplies}
              <select
                className={supportField}
                defaultValue=""
                onChange={(event) => {
                  const template = templates.find((item) => item.id === Number(event.target.value));
                  if (template) setMessage(lang === "km" ? template.body_km : template.body_en);
                  event.target.value = "";
                }}
              >
                <option value="">{t.quickReplies}</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label htmlFor={`${label}-message`} className="text-xs font-semibold text-muted-foreground">
            {staff ? t.reply : t.message}
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id={`${label}-message`}
              className={cn(supportField, "min-h-11 resize-none py-2.5 text-sm leading-snug")}
              required
              maxLength={2000}
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button type="submit" disabled={action.isPending || !message.trim()} className="h-11 shrink-0 gap-1.5 px-4">
              <Send className="size-4" aria-hidden="true" />
              <span>{t.send}</span>
            </Button>
          </div>
          {staff ? (
            <label className="flex min-h-10 items-center gap-2 text-xs font-medium text-muted-foreground">
              <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
              {t.note}
            </label>
          ) : null}
          <p className="text-[11px] text-muted-foreground">{t.noTyping}</p>
        </form>
      ) : (
        <p className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2/45 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
          {t.closed}
        </p>
      )}

      {/* Post-close CSAT rating card */}
      {!staff && conversation.status === "closed" ? (
        conversation.rating ? (
          <p role="status" className="rounded-xl border border-success/25 bg-success-tint/50 px-3.5 py-2.5 text-xs font-semibold text-success">
            {t.rated} {conversation.rating.stars}/5
          </p>
        ) : (
          <form
            className="grid gap-3 rounded-xl border border-border bg-surface-2/30 p-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              action.mutate(() => supportApi.rate(id, stars, comment));
            }}
          >
            <StarRatingInput value={stars} onChange={setStars} />
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              {t.comment}
              <textarea className={supportField} maxLength={500} rows={2} value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>
            <Button type="submit" size="sm" disabled={!stars || action.isPending}>
              {t.rate}
            </Button>
          </form>
        )
      ) : null}

      {action.isError ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {t.error}
        </p>
      ) : null}
    </section>
  );
}
