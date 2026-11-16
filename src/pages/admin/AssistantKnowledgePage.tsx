import { AdminPage } from "@/features/admin/AdminPage";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assistantApi, type AssistantFaq, type FaqInput } from "@/api/endpoints/assistant";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminFormDialogContent } from "@/features/admin/AdminFormDialog";
import { Bot, Plus } from "lucide-react";
import { useStaff } from "@/features/admin/staffSession";
import { supportField } from "@/features/support/ConversationView";
import { useT } from "@/i18n";

const empty = { question_en: "", question_km: "", answer_en: "", answer_km: "", keywords: "", is_active: true };
export default function AssistantKnowledgePage() {
  const { dict } = useT(); const t = dict.assistant; const session = useStaff();
  const allowed = !!session && (session.user.role === "admin" || !session.user.permissions || session.user.permissions.includes("support:manage"));
  const [page, setPage] = useState(1); const [unansweredPage, setUnansweredPage] = useState(1);
  const [form, setForm] = useState(empty); const [id, setId] = useState<number>(); const [unansweredId, setUnansweredId] = useState<number>();
  const [removeId, setRemoveId] = useState<number>();
  const [formOpen, setFormOpen] = useState(false);
  const faqs = useQuery({ queryKey: ["staff", "assistant", "faqs", page], queryFn: () => assistantApi.faqs(page), enabled: allowed });
  const unanswered = useQuery({ queryKey: ["staff", "assistant", "unanswered", unansweredPage], queryFn: () => assistantApi.unanswered(unansweredPage), enabled: allowed });
  const client = useQueryClient();
  const action = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: () => client.invalidateQueries({ queryKey: ["staff", "assistant"] }) });
  const edit = (item: AssistantFaq) => { setFormOpen(true); action.reset(); setId(item.id); setUnansweredId(undefined); setForm({ question_en: item.question_en, question_km: item.question_km, answer_en: item.answer_en, answer_km: item.answer_km, keywords: item.keywords.join(", "), is_active: item.is_active }); };
  const reset = () => { setFormOpen(false); setForm(empty); setId(undefined); setUnansweredId(undefined); };
  if (!allowed) return <p role="alert">{dict.support.noPermission}</p>;
  return <AdminPage title={t.training} lead="Improve answers with useful knowledge and customer questions." actions={<Button onClick={() => { reset(); action.reset(); setFormOpen(true); }}><Plus aria-hidden="true" />{t.create}</Button>}>
    <p className="work-note"><Bot aria-hidden="true" />Manage the answers your assistant can use. Turn repeated customer questions into useful knowledge in English and Khmer.</p>
    <div className="work-knowledge-grid">
    <section className="desk-card grid gap-3 rounded-xl border border-border bg-card p-5"><h2 className="font-sans text-lg font-semibold">{t.faqs}</h2>
      {faqs.isError ? <p role="alert">{t.error}</p> : faqs.isPending ? <p role="status">{t.loading}</p> : <ul className="grid gap-3">{faqs.data?.data.length ? faqs.data.data.map((faq) => <li key={faq.id} className="work-knowledge-item"><p className="font-semibold">{faq.question_en}</p><p lang="km">{faq.question_km}</p><p className="text-sm text-muted-foreground">{t.hits}: {faq.hits}</p><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" onClick={() => edit(faq)}>{t.edit}</Button>{session?.user.role === "admin" ? <Button variant="outline" disabled={action.isPending} onClick={() => setRemoveId(faq.id)}>{t.remove}</Button> : null}</div></li>) : <li>{t.empty}</li>}</ul>}
      <div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button><span className="self-center">{page}</span><Button variant="outline" disabled={page >= (faqs.data?.last_page ?? 1)} onClick={() => setPage(page + 1)}>{t.next}</Button></div>
    </section>
    <section className="desk-card grid gap-3 rounded-xl border border-border bg-card p-5"><h2 className="font-sans text-lg font-semibold">{t.unanswered}</h2>{unanswered.isError ? <p role="alert">{t.error}</p> : <ul className="grid gap-2">{unanswered.data?.data.length ? unanswered.data.data.map((item) => <li key={item.id} className="work-knowledge-item"><p className="break-words">{item.question} · {item.count}</p><Button variant="outline" onClick={() => { setFormOpen(true); action.reset(); setId(undefined); setUnansweredId(item.id); setForm({ ...empty, ...(/[\u1780-\u17ff]/u.test(item.question) ? { question_km: item.question } : { question_en: item.question }) }); }}>{t.teach}</Button></li>) : <li>{unanswered.isPending ? t.loading : t.empty}</li>}</ul>}
      <div className="flex gap-2"><Button variant="outline" disabled={unansweredPage <= 1} onClick={() => setUnansweredPage(unansweredPage - 1)}>{t.previous}</Button><span className="self-center">{unansweredPage}</span><Button variant="outline" disabled={unansweredPage >= (unanswered.data?.last_page ?? 1)} onClick={() => setUnansweredPage(unansweredPage + 1)}>{t.next}</Button></div>
    </section>
    </div>
    {!formOpen && action.isSuccess ? <p role="status" className="text-sm text-success">{t.saved}</p> : null}
    <Dialog open={formOpen} onOpenChange={(open) => { if (!open && !action.isPending) reset(); }}><AdminFormDialogContent aria-describedby="knowledge-form-help"><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); const input: FaqInput = { ...form, keywords: form.keywords.split(",").map((word) => word.trim()).filter(Boolean), ...(unansweredId ? { unanswered_id: unansweredId } : {}) }; action.mutate(async () => { await assistantApi.save(input, id); reset(); }); }}><DialogHeader><DialogTitle>{id ? t.edit : t.create}</DialogTitle><DialogDescription id="knowledge-form-help">Write a clear question and a helpful answer in each language.</DialogDescription></DialogHeader>
      {(["question_en", "question_km", "answer_en", "answer_km"] as const).map((field) => <label key={field} className="grid gap-1">{field === "question_en" ? t.questionEn : field === "question_km" ? t.questionKm : field === "answer_en" ? t.answerEn : t.answerKm}<textarea lang={field.endsWith("km") ? "km" : "en"} className={supportField} required maxLength={field.startsWith("question") ? 300 : 2000} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}
      <label className="grid gap-1">{t.keywords}<input className={supportField} required value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })} /></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />{t.active}</label>
      {action.isError ? <p role="alert" className="text-destructive">{t.error}</p> : action.isSuccess ? <p role="status">{t.saved}</p> : null}
      <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={action.isPending}>{t.cancel}</Button></DialogClose><Button type="submit" disabled={action.isPending}>{t.save}</Button></DialogFooter>
    </form></AdminFormDialogContent></Dialog>
    <ConfirmDialog open={removeId !== undefined} onOpenChange={(open) => { if (!open) setRemoveId(undefined); }} title={t.confirmRemove} confirmLabel={t.remove} loading={action.isPending} onConfirm={() => { if (removeId !== undefined) action.mutate(async () => { await assistantApi.remove(removeId); setRemoveId(undefined); }); }} />
  </AdminPage>;
}
