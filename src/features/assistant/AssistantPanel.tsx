import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { assistantApi, type AssistantAnswer } from "@/api/endpoints/assistant";
import { BookCard } from "@/components/catalog/BookCard";
import { Button } from "@/components/ui/button";
import { supportField } from "@/features/support/ConversationView";
import { useT } from "@/i18n";

export function AssistantPanel({ staff = false, onHandoff }: { staff?: boolean; onHandoff?: (question: string) => void }) {
  const t = useT().dict.assistant;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | { intent: string; text: string; link: string | null }>();
  const [asked, setAsked] = useState("");
  const ask = useMutation({ mutationFn: (value: string) => staff ? assistantApi.staff(value) : assistantApi.ask(value), onSuccess: (result, value) => { setAnswer(result); setAsked(value); } });
  const submit = (value: string) => { if (value.trim()) { setQuestion(value); ask.mutate(value.trim()); } };
  const books = answer && "books" in answer ? answer.books : [];
  return <section className="grid min-w-0 gap-4">
    <p className="text-sm text-muted-foreground">{staff ? t.staffDescription : t.description}</p>
    {!staff ? <div className="flex flex-wrap gap-2">{[t.orders, t.delivery, t.payment, t.ebooks].map((chip) => <Button type="button" variant="outline" key={chip} disabled={ask.isPending} onClick={() => submit(chip)}>{chip}</Button>)}</div> : null}
    <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); submit(question); }}>
      <label className="grid gap-1">{t.question}<textarea className={supportField} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} required rows={3} /></label>
      <Button type="submit" disabled={ask.isPending || !question.trim()}>{t.send}</Button>
    </form>
    {ask.isError ? <p role="alert" className="text-destructive">{t.error}</p> : null}
    {answer ? <div role="status" className="grid gap-3 rounded-lg border border-border p-4"><p className="whitespace-pre-wrap break-words">{answer.text}</p>
      {answer.link ? <Link className="min-h-11 py-2 text-primary underline" to={answer.link}>{answer.link.startsWith("/admin") ? t.staffTitle : t.title}</Link> : null}
      {books?.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{books.map((book) => <BookCard key={book.id} book={book} />)}</div> : null}
      {"handoff" in answer && answer.handoff && onHandoff ? <Button variant="outline" onClick={() => onHandoff(asked)}>{t.handoff}</Button> : null}
    </div> : null}
  </section>;
}
