import { useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Plus,
  Send,
  Trash2,
  Edit2,
  Users,
  Clock,
  CheckCircle2,
  UserX,
  Search,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  newsletterApi,
  newsletterQueries,
  newsletterKeys,
  type NewsletterCampaign,
  type NewsletterCampaignInput,
} from "@/api/endpoints/newsletter";
import { ApiError } from "@/api/errors";
import { catalogApi } from "@/api/endpoints/catalog";
import { AdminPage } from "@/features/admin/AdminPage";
import { TableCard, th, td, thead } from "@/features/admin/listKit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/stores/toast";

export default function NewsletterAdminPage() {
  const queryClient = useQueryClient();
  const [page] = useState(1);

  // Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery(
    newsletterQueries.summary(),
  );

  // Campaigns list
  const { data: campaignsData, isLoading: isCampaignsLoading } = useQuery(
    newsletterQueries.campaigns(page),
  );

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<NewsletterCampaign | null>(null);

  // Send confirm dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [campaignToSend, setCampaignToSend] =
    useState<NewsletterCampaign | null>(null);

  // Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] =
    useState<NewsletterCampaign | null>(null);

  // Mutations
  const testSendMutation = useMutation({
    mutationFn: (id: number) => newsletterApi.testSendCampaign(id),
    onSuccess: (res) => toast.success(res.message),
    onError: (err: unknown) =>
      toast.error(ApiError.from(err).message || "Failed to send test email."),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => newsletterApi.sendCampaign(id),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: newsletterKeys.all });
      setSendDialogOpen(false);
      setCampaignToSend(null);
      toast.success(res.message);
    },
    onError: (err: unknown) =>
      toast.error(ApiError.from(err).message || "Failed to send campaign."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsletterApi.deleteCampaign(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: newsletterKeys.all });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      toast.success("Campaign deleted.");
    },
    onError: (err: unknown) =>
      toast.error(ApiError.from(err).message || "Failed to delete campaign."),
  });

  const confirmedCount = summary?.confirmed ?? 0;
  const dailyLimit = summary?.daily_limit ?? 60;
  const estimatedDays = Math.max(
    1,
    Math.ceil(confirmedCount / Math.max(1, dailyLimit)),
  );

  return (
    <AdminPage
      title="Newsletter"
      lead="Manage newsletter subscribers, create announcements, and schedule marketing campaigns."
      actions={
        <Button
          onClick={() => {
            setEditingCampaign(null);
            setEditorOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" />
          <span>New campaign</span>
        </Button>
      }
    >
      {/* 1. Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Confirmed subscribers
            </span>
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isSummaryLoading ? "…" : summary?.confirmed.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Active recipients for broadcasts
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Pending confirmation
            </span>
            <Clock className="size-5 text-warning" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isSummaryLoading ? "…" : summary?.pending.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Awaiting double opt-in click
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Unsubscribed
            </span>
            <UserX className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isSummaryLoading ? "…" : summary?.unsubscribed.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Opted out from newsletters
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total subscribers
            </span>
            <Users className="size-5 text-primary" />
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isSummaryLoading ? "…" : summary?.total.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            All sign-up records
          </p>
        </div>
      </div>

      {/* 2. Campaign List */}
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
          {campaignsData?.total !== undefined && (
            <span className="text-xs text-muted-foreground">
              {campaignsData.total}{" "}
              {campaignsData.total === 1 ? "campaign" : "campaigns"}
            </span>
          )}
        </div>

        {isCampaignsLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading campaigns…
          </div>
        ) : !campaignsData?.data?.length ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No newsletter campaigns created yet. Click &ldquo;New
            campaign&rdquo; to draft one.
          </div>
        ) : (
          <TableCard minWidth={640}>
            <thead className={thead}>
              <tr>
                <th scope="col" className={th}>
                  Subject
                </th>
                <th scope="col" className={th}>
                  Status
                </th>
                <th scope="col" className={th}>
                  Recipients
                </th>
                <th scope="col" className={th}>
                  Created
                </th>
                <th scope="col" className={th}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaignsData.data.map((c: NewsletterCampaign) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className={td}>
                    <div className="font-medium text-foreground">
                      {c.subject_en}
                    </div>
                    {c.subject_km && (
                      <div className="text-xs text-muted-foreground">
                        {c.subject_km}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    <Badge
                      tone={
                        c.status === "sent"
                          ? "success"
                          : c.status === "sending"
                            ? "warning"
                            : "neutral"
                      }
                      shape="tint"
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className={td}>
                    {c.status === "draft"
                      ? `Est. ${confirmedCount} subscribers`
                      : `${c.sent_count ?? 0} of ${c.recipients_total} sent`}
                  </td>
                  <td className={td}>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1.5">
                      {c.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testSendMutation.mutate(c.id)}
                            disabled={testSendMutation.isPending}
                            title="Send test to me"
                            className="h-8 gap-1 px-2.5 text-xs"
                          >
                            <Mail className="size-3.5" />
                            <span className="hidden sm:inline">Test to me</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setCampaignToSend(c);
                              setSendDialogOpen(true);
                            }}
                            className="h-8 gap-1 px-2.5 text-xs"
                          >
                            <Send className="size-3.5" />
                            <span>Send</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCampaign(c);
                              setEditorOpen(true);
                            }}
                            aria-label={`Edit ${c.subject_en}`}
                            className="size-8 p-0"
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCampaignToDelete(c);
                              setDeleteDialogOpen(true);
                            }}
                            aria-label={`Delete ${c.subject_en}`}
                            className="size-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                      {c.status !== "draft" && (
                        <span className="text-xs text-muted-foreground">
                          Sent
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </div>

      {/* 3. Editor Dialog */}
      {editorOpen && (
        <CampaignEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          campaign={editingCampaign}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: newsletterKeys.all,
            });
            setEditorOpen(false);
          }}
        />
      )}

      {/* 4. Send Confirmation Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send newsletter campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to broadcast this campaign to confirmed
              subscribers?
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="font-semibold text-foreground">
                {campaignToSend?.subject_en}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Recipients:{" "}
                <span className="font-semibold text-foreground">
                  {confirmedCount}
                </span>{" "}
                confirmed subscribers.
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Daily marketing limit:{" "}
                <span className="font-semibold text-foreground">
                  {dailyLimit}
                </span>{" "}
                emails/day (sign-in codes and order emails are not counted).
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  About {estimatedDays} {estimatedDays === 1 ? "day" : "days"}{" "}
                  to reach everyone at the {dailyLimit}/day limit.
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Once queued, the campaign cannot be undone or re-sent.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSendDialogOpen(false)}
              disabled={sendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() =>
                campaignToSend && sendMutation.mutate(campaignToSend.id)
              }
              disabled={sendMutation.isPending}
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Queueing…</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Send to {confirmedCount} subscribers</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete draft campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;
              {campaignToDelete?.subject_en}&rdquo;?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                campaignToDelete && deleteMutation.mutate(campaignToDelete.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

/**
 * Campaign Editor Dialog with Book Search Picker
 */
function CampaignEditorDialog({
  open,
  onOpenChange,
  campaign,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: NewsletterCampaign | null;
  onSaved: () => void;
}) {
  const isEditing = Boolean(campaign);

  const [subjectEn, setSubjectEn] = useState(campaign?.subject_en ?? "");
  const [subjectKm, setSubjectKm] = useState(campaign?.subject_km ?? "");
  const [bodyEn, setBodyEn] = useState(campaign?.body_en ?? "");
  const [bodyKm, setBodyKm] = useState(campaign?.body_km ?? "");
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>(
    campaign?.book_ids ?? [],
  );

  // Book search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooksMap, setSelectedBooksMap] = useState<
    Array<{ id: number; title: string }>
  >([]);

  // Search books query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["admin-newsletter-book-search", searchQuery],
    queryFn: () => catalogApi.books({ q: searchQuery, per_page: 6 }),
    enabled: searchQuery.trim().length >= 2,
  });

  const mutation = useMutation({
    mutationFn: (data: NewsletterCampaignInput) =>
      isEditing && campaign
        ? newsletterApi.updateCampaign(campaign.id, data)
        : newsletterApi.createCampaign(data),
    onSuccess: () => {
      toast.success(isEditing ? "Campaign updated." : "Campaign created.");
      onSaved();
    },
    onError: (err: unknown) => {
      toast.error(ApiError.from(err).message || "Failed to save campaign.");
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!subjectEn.trim() || !bodyEn.trim()) return;

    mutation.mutate({
      subject_en: subjectEn.trim(),
      subject_km: subjectKm.trim() || null,
      body_en: bodyEn.trim(),
      body_km: bodyKm.trim() || null,
      book_ids: selectedBookIds,
    });
  };

  const handleAddBook = (book: { id?: number; title?: string }) => {
    if (!book.id || !book.title) return;
    if (selectedBookIds.includes(book.id) || selectedBookIds.length >= 12)
      return;
    setSelectedBookIds([...selectedBookIds, book.id]);
    setSelectedBooksMap([
      ...selectedBooksMap,
      { id: book.id, title: book.title },
    ]);
    setSearchQuery("");
  };

  const handleRemoveBook = (bookId: number) => {
    setSelectedBookIds(selectedBookIds.filter((id) => id !== bookId));
    setSelectedBooksMap(selectedBooksMap.filter((b) => b.id !== bookId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit campaign" : "New campaign"}
          </DialogTitle>
          <DialogDescription>
            Compose campaign content in English (required) and Khmer (optional
            fallback to English).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5 py-2">
          {/* Subjects */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="campaign-subject-en"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Subject (English) <span className="text-destructive">*</span>
              </label>
              <input
                id="campaign-subject-en"
                type="text"
                required
                value={subjectEn}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSubjectEn(e.target.value)
                }
                placeholder="e.g. New Arrivals & Monthly Recommendations"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="campaign-subject-km"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Subject (Khmer)
              </label>
              <input
                id="campaign-subject-km"
                type="text"
                value={subjectKm}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSubjectKm(e.target.value)
                }
                placeholder="ចំណងជើងជាភាសាខ្មែរ (ស្រេចចិត្ត)"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Bodies */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="campaign-body-en"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Body (English) <span className="text-destructive">*</span>
              </label>
              <textarea
                id="campaign-body-en"
                required
                rows={6}
                value={bodyEn}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setBodyEn(e.target.value)
                }
                placeholder="Write plain paragraphs. Separate paragraphs with blank lines."
                className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="campaign-body-km"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Body (Khmer)
              </label>
              <textarea
                id="campaign-body-km"
                rows={6}
                value={bodyKm}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setBodyKm(e.target.value)
                }
                placeholder="សរសេរកថាខណ្ឌជាភាសាខ្មែរ (បើទទេ នឹងប្រើភាសាអង់គ្លេស)"
                className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Chosen Books Picker */}
          <div className="grid gap-2">
            <label
              htmlFor="search-books"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Featured Books ({selectedBookIds.length}/12)
            </label>

            {/* Selected books list */}
            {selectedBookIds.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/20 p-2.5">
                {selectedBookIds.map((id) => {
                  const item = selectedBooksMap.find((b) => b.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      <span>{item?.title ?? `Book #${id}`}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBook(id)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Remove book ${id}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search input */}
            {selectedBookIds.length < 12 && (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  id="search-books"
                  type="search"
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  placeholder="Type book title to search and add up to 12 books…"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />

                {/* Autocomplete dropdown */}
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                    {isSearching ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        Searching…
                      </div>
                    ) : !searchResults?.data?.length ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No books found.
                      </div>
                    ) : (
                      searchResults.data.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          disabled={
                            b.id !== undefined && selectedBookIds.includes(b.id)
                          }
                          onClick={() =>
                            handleAddBook({
                              id: b.id,
                              title: b.title ?? `Book #${b.id}`,
                            })
                          }
                          className="flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs hover:bg-accent disabled:opacity-50"
                        >
                          <span className="truncate font-medium">
                            {b.title}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {b.id !== undefined &&
                            selectedBookIds.includes(b.id)
                              ? "Added"
                              : "+ Add"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending || !subjectEn.trim() || !bodyEn.trim()
              }
            >
              {mutation.isPending
                ? "Saving…"
                : isEditing
                  ? "Update campaign"
                  : "Save draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
