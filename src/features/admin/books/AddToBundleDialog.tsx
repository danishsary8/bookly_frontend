import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Layers, Plus } from "lucide-react";
import type { StaffBook } from "@/api/endpoints/staff";
import { opsApi, type Offer } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { usePortalPath } from "@/features/admin/portal";
import { FormAlert } from "@/components/form/FormAlert";
import { TextField } from "@/components/form/Field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/*
 * "Add to bundle" from the Books list (owner 2026-11-26): put the selected books (e.g. slow sellers) into an
 * existing "any N for $P" bundle, or start a new one with them. A new bundle starts paused, like every new offer.
 */

const MAX_TARGETS = 200; // the API's limit per offer
const money = (v: string | number | null | undefined) => {
  const n = Number(v ?? 0);
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
};
const STATUS: Record<string, string> = { live: "Live", scheduled: "Scheduled", paused: "Paused", ended: "Ended", used_up: "Used up", no_books: "No books" };

export function AddToBundleDialog({ books: initialBooks, onClose, onSuccess }: { books: StaffBook[]; onClose: () => void; onSuccess: () => void }) {
  const toPortal = usePortalPath();
  // Kept from the moment the dialog opened: the page clears its selection after a save.
  const [books] = useState(initialBooks);
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey: ["staff", "offers", "bundles"], queryFn: () => opsApi.offers({ per_page: 100 }) });
  const bundles = (offers.data?.data ?? []).filter((o) => o.type === "bundle_price" && o.status !== "ended" && o.status !== "used_up");

  const [choice, setChoice] = useState<number | "new" | null>(null);
  const [size, setSize] = useState("5");
  const [price, setPrice] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ offer: Offer; added: number } | null>(null);

  const picked = typeof choice === "number" ? bundles.find((b) => b.id === choice) ?? null : null;
  const n = Number(size);
  const sizeOk = Number.isInteger(n) && n >= 2 && n <= 20;
  const priceOk = /^\d+(\.\d{1,2})?$/.test(price.trim()) && Number(price) > 0 && Number(price) <= 5000;

  const save = useMutation({
    mutationFn: async () => {
      const ids = books.map((b) => b.id);
      if (choice === "new") {
        const offer = await opsApi.createOffer({
          name: `Any ${n} for ${money(price)}`,
          type: "bundle_price",
          applies_to: "selected",
          min_quantity: n,
          bundle_price: price.trim(),
          percent_off: "0.00",
          is_active: false,
          targets: ids.map((id) => ({ type: "book" as const, id })),
        });
        return { offer, added: ids.length };
      }
      const current = (picked!.targets ?? []).filter((t) => !t.in_trash).map((t) => ({ type: t.type, id: t.id }));
      const have = new Set(current.filter((t) => t.type === "book").map((t) => t.id));
      const fresh = ids.filter((id) => !have.has(id));
      if (current.length + fresh.length > MAX_TARGETS) throw new Error(`A bundle can hold up to ${MAX_TARGETS} books, categories or series. Choose fewer books.`);
      const offer = fresh.length ? await opsApi.updateOffer(picked!.id, { targets: [...current, ...fresh.map((id) => ({ type: "book" as const, id }))] }) : picked!;
      return { offer, added: fresh.length };
    },
    onSuccess: (result) => {
      setError(null);
      setDone(result);
      void queryClient.invalidateQueries({ queryKey: ["staff", "offers"] });
      onSuccess();
    },
    onError: (e) => setError(e instanceof Error && !(e as { isAxiosError?: boolean }).isAxiosError ? e.message : ApiError.from(e).message),
  });

  const canSave = choice === "new" ? sizeOk && priceOk : picked !== null && picked.applies_to === "selected";
  const count = books.length === 1 ? "1 book" : `${books.length} books`;

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add to bundle</DialogTitle>
          <DialogDescription>{count} selected. Customers can mix and match any books in a bundle.</DialogDescription>
        </DialogHeader>

        {error ? <FormAlert>{error}</FormAlert> : null}

        {done ? (
          <div className="mt-5 grid justify-items-center gap-3 rounded-xl border border-success/30 bg-success-tint px-5 py-7 text-center">
            <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
            <p className="font-display text-2xl text-foreground">
              {done.added === 0 ? "Already in this bundle" : done.added === 1 ? "1 book added" : `${done.added} books added`}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {done.offer.name}
              {done.offer.is_active ? "." : " is paused: check it, then turn it on in Offers."}
            </p>
          </div>
        ) : (
          <div role="radiogroup" aria-label="Bundle" className="mt-4 grid gap-2.5">
            {offers.isPending ? <p className="text-sm text-muted-foreground">Loading bundles…</p> : null}
            {bundles.map((b) => {
              const all = b.applies_to === "all";
              const selected = choice === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={all}
                  onClick={() => setChoice(b.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                    selected ? "border-primary bg-lapis-tint/60 ring-2 ring-primary/25" : "border-border bg-card hover:bg-surface-2",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground")} aria-hidden="true">
                    <Layers className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{b.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[
                        b.name.includes(money(b.bundle_price)) ? null : `Any ${b.min_quantity} for ${money(b.bundle_price)}`,
                        all ? "already every book" : `${b.targets.length} chosen`,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", b.status === "live" ? "bg-success-tint text-success" : "bg-surface-2 text-muted-foreground")}>
                    {STATUS[b.status] ?? b.status}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              role="radio"
              aria-checked={choice === "new"}
              onClick={() => setChoice("new")}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                choice === "new" ? "border-primary bg-lapis-tint/60 ring-2 ring-primary/25" : "border-border hover:bg-surface-2",
              )}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", choice === "new" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground")} aria-hidden="true">
                <Plus className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">New bundle with these books</span>
                <span className="block text-sm text-muted-foreground">Starts paused, so you can check it first.</span>
              </span>
            </button>

            {choice === "new" ? (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-1 p-3">
                <TextField label="Books in the bundle" inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} error={size && !sizeOk ? "2 to 20" : undefined} />
                <TextField label="Bundle price ($)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={price && !priceOk ? "Above $0" : undefined} />
                <p className="col-span-2 text-sm text-muted-foreground">Customers see: <strong className="text-foreground">Any {sizeOk ? n : "…"} for {priceOk ? money(price) : "…"}</strong></p>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="mt-5">
          {done ? (
            <>
              <Link to={toPortal(`offers/${done.offer.id}`)} className={buttonVariants({ variant: "outline" })}>Open the bundle</Link>
              <Button onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button disabled={!canSave} loading={save.isPending} onClick={() => save.mutate()}>
                {choice === "new" ? "Create bundle" : "Add books"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
