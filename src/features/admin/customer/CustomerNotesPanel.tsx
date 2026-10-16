import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2 } from "lucide-react";
import { opsApi, opsKeys, opsQueries, type CustomerNote } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { SkeletonGroup, Skeleton } from "@/components/ui/skeleton";
import { useStaff } from "@/features/admin/staffSession";
import { orderDateTime } from "@/features/orders/format";
import { toast } from "@/stores/toast";

interface CustomerNotesPanelProps {
  customerId: number;
}

export function CustomerNotesPanel({ customerId }: CustomerNotesPanelProps) {
  const queryClient = useQueryClient();
  const session = useStaff();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === "admin";

  const [body, setBody] = useState("");
  const [deletingNote, setDeletingNote] = useState<CustomerNote | null>(null);

  const notesQuery = useQuery(opsQueries.customerNotes(customerId));
  const notes = notesQuery.data ?? [];

  const addMutation = useMutation({
    mutationFn: () => opsApi.addCustomerNote(customerId, body.trim()),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: opsKeys.customerNotes(customerId) });
      toast.success("Note added");
    },
    onError: (err) => {
      toast.error({
        title: "Couldn't add note",
        description: ApiError.from(err).message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: number) => opsApi.deleteCustomerNote(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opsKeys.customerNotes(customerId) });
      toast.success("Note deleted");
    },
    onError: (err) => {
      toast.error({
        title: "Couldn't delete note",
        description: ApiError.from(err).message,
      });
    },
    onSettled: () => setDeletingNote(null),
  });

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addMutation.mutate();
  };

  return (
    <section aria-labelledby="customer-notes-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="customer-notes-heading" className="font-sans text-[1.0625rem] font-semibold tracking-normal flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
          Staff notes
        </h2>
        <span className="text-xs text-muted-foreground">Internal only (not visible to customer)</span>
      </div>

      <form onSubmit={handleAdd} className="grid gap-2">
        <label htmlFor="customer-note-body" className="sr-only">Add note</label>
        <textarea
          id="customer-note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add an internal note about this customer…"
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{body.length} / 2000</span>
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim()}
            loading={addMutation.isPending}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add note
          </Button>
        </div>
      </form>

      {notesQuery.isLoading ? (
        <SkeletonGroup label="Loading notes…" className="grid gap-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </SkeletonGroup>
      ) : notes.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-1" role="list">
          {notes.map((note) => {
            const canDelete = isAdmin || (currentUser && currentUser.id === note.author?.id);
            return (
              <li key={note.id} className="p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {note.author?.name || "Staff"}
                    <span className="ml-2 font-normal text-muted-foreground">{orderDateTime(note.created_at)}</span>
                  </span>
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingNote(note)}
                      className="h-7 px-2 text-destructive hover:bg-destructive-tint hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{note.body}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No notes on this customer yet.</p>
      )}

      <ConfirmDialog
        open={deletingNote !== null}
        onOpenChange={(open) => (open ? null : setDeletingNote(null))}
        title="Delete this note?"
        description="This will permanently delete this note. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deletingNote && deleteMutation.mutate(deletingNote.id)}
      />
    </section>
  );
}
