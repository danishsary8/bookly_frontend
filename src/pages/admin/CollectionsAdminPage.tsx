import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  opsApi,
  opsQueries,
  type BookCollectionStatus,
  type StaffBookCollection,
} from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { AdminPage } from "@/features/admin/AdminPage";
import {
  ListState,
  SearchBox,
  TableCard,
  td,
  th,
  thead,
} from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { toast } from "@/stores/toast";

/*
 * /admin/collections: seasonal collections (owner 2026-11-01: home row + own page, up to 2 live, books picked by hand,
 * English + Khmer fields). Same shape as Offers: a table and a dialog. Staff see the list; only admins create, change,
 * switch on/off or delete (the API enforces it too). The home page shows the first 2 live ones by position.
 */

const STATUS: Record<
  BookCollectionStatus,
  { label: string; tone: "success" | "warning" | "neutral"; live?: boolean }
> = {
  live: { label: "Live", tone: "success", live: true },
  scheduled: { label: "Scheduled", tone: "warning" },
  hidden: { label: "Off", tone: "neutral" },
  ended: { label: "Ended", tone: "neutral" },
};

const when = (c: StaffBookCollection) =>
  c.starts_at && new Date(c.starts_at) > new Date()
    ? `From ${orderDate(c.starts_at)}`
    : c.ends_at
      ? `Until ${orderDate(c.ends_at)}`
      : "No end";

export default function CollectionsAdminPage() {
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const { get, page, set, hrefFor } = useListParams();
  const q = get("q");
  const collections = useQuery(
    opsQueries.collections({ q: q || undefined, page, per_page: 25 }),
  );
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<StaffBookCollection | null>(null);

  const toggle = useMutation({
    mutationFn: ({ c, on }: { c: StaffBookCollection; on: boolean }) =>
      opsApi.updateCollection(c.id, { is_active: on }),
    onSuccess: (saved) => {
      toast.success(
        saved.is_active
          ? `${saved.title_en} is on`
          : `${saved.title_en} is off`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["staff", "collections"],
      });
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't change the collection",
        description: ApiError.from(error).message,
      }),
  });
  const remove = useMutation({
    mutationFn: (c: StaffBookCollection) => opsApi.deleteCollection(c.id),
    onSuccess: (_r, c) => {
      toast.success(`${c.title_en} deleted`);
      void queryClient.invalidateQueries({
        queryKey: ["staff", "collections"],
      });
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't delete the collection",
        description: ApiError.from(error).message,
      }),
    onSettled: () => setDeleting(null),
  });

  const meta = collections.data?.meta;
  const list = collections.data?.data ?? [];
  // Before the backend with collections is deployed, /staff/collections is a 404: say so instead of an error page.
  const notYet =
    collections.isError && ApiError.from(collections.error).status === 404;

  return (
    <AdminPage
      title="Collections"
      lead={
        meta && meta.total
          ? `${rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "collection" : "collections")} · the home page shows the first 2 live ones`
          : "Hand-picked seasonal shelves for the home page, like “Rainy season reads”."
      }
      actions={
        isAdmin && !notYet ? (
          <Button onClick={() => navigate("/admin/collections/new")}>
            <Plus aria-hidden="true" /> New collection
          </Button>
        ) : !isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Only admins create or change collections.
          </p>
        ) : null
      }
    >
      {notYet ? (
        <EmptyState
          icon={Sparkles}
          title="Collections are not available yet"
          description="The API on this server does not have collections yet. They appear here once the backend update is deployed."
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <>
          <div className="work-toolbar">
            <SearchBox
              label="Search collections"
              value={q}
              placeholder="Title"
              onSearch={(val) => set({ q: val || undefined })}
            />
          </div>
          <ListState
            query={collections}
            empty={{
              when: list.length === 0,
              icon: Sparkles,
              title: "No collections match",
              description: q
                ? "Check the title."
                : "Create one for the next season or holiday.",
            }}
          >
            <TableCard stale={collections.isPlaceholderData} minWidth={820}>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={th}>
                    Collection
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Books
                  </th>
                  <th scope="col" className={th}>
                    Status
                  </th>
                  <th scope="col" className={th}>
                    When
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Order
                  </th>
                  <th scope="col" className={th}>
                    On
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((c) => {
                  const status = STATUS[c.status] ?? STATUS.hidden;
                  const inTrash = c.books.filter((b) => b.in_trash).length;
                  return (
                    <tr key={c.id}>
                      <th scope="row" className={`${td} font-semibold`}>
                        {c.title_en}
                        <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                          {c.title_km ? (
                            <span lang="km">{c.title_km} · </span>
                          ) : null}
                          /collections/{c.slug}
                        </span>
                      </th>
                      <td className={`${td} text-right tabular-nums`}>
                        {c.books.length - inTrash}
                        {inTrash ? (
                          <span className="block text-xs text-muted-foreground">
                            +{inTrash} in trash
                          </span>
                        ) : null}
                      </td>
                      <td className={td}>
                        <Badge
                          tone={status.tone}
                          shape={status.live ? "tint" : "outline"}
                        >
                          {status.live ? (
                            <CheckCircle2 aria-hidden="true" />
                          ) : (
                            <CircleSlash aria-hidden="true" />
                          )}{" "}
                          {status.label}
                        </Badge>
                      </td>
                      <td
                        className={`${td} whitespace-nowrap text-sm text-muted-foreground`}
                      >
                        {when(c)}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {c.position}
                      </td>
                      <td className={td}>
                        <Switch
                          checked={c.is_active}
                          disabled={!isAdmin || toggle.isPending}
                          aria-label={`${c.is_active ? "Turn off" : "Turn on"} ${c.title_en}`}
                          onCheckedChange={(on) => toggle.mutate({ c, on })}
                        />
                      </td>
                      <td className={td}>
                        <div className="flex justify-end gap-1">
                          {c.status === "live" ? (
                            <Button size="icon" variant="ghost" asChild>
                              <Link
                                to={`/collections/${c.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${c.title_en} in the shop (new tab)`}
                              >
                                <ExternalLink aria-hidden="true" />
                              </Link>
                            </Button>
                          ) : null}
                          {isAdmin ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Edit ${c.title_en}`}
                                onClick={() => navigate(`/admin/collections/${c.id}`)}
                              >
                                <Pencil aria-hidden="true" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Delete ${c.title_en}`}
                                onClick={() => setDeleting(c)}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          </ListState>
          <Pagination
            page={meta?.current_page ?? 1}
            lastPage={meta?.last_page ?? 1}
            hrefFor={hrefFor}
          />
        </>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title_en ?? "collection"}?`}
        description="It leaves the home page and its page stops working. The books themselves are not touched. To hide it for now, switch it off instead."
        confirmLabel="Delete collection"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AdminPage>
  );
}
