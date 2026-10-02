import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { orderKeys, orderQueries, ordersApi, type ReturnLineInput } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { EmptyState } from "@/components/EmptyState";
import { SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatLabel } from "@/lib/catalog";
import { toast } from "@/stores/toast";

const MAX_REASON = 2000;
const MAX_LINE_REASON = 255;

type Line = { selected: boolean; quantity: number; reason: string };

/*
 * /account/orders/:id/return: pick the books to send back (physical formats only,
 * up to what's still returnable), how many of each, and why. The API checks the
 * window and quantities again and its messages are shown as they come.
 */
export default function ReturnRequestPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const order = useQuery({ ...orderQueries.order(id), enabled: valid });
  const returnable = useQuery({ ...orderQueries.returnable(id), enabled: valid });
  const [lines, setLines] = useState<Record<number, Line>>({});
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ form?: string; items?: string; reason?: string }>({});
  const alertRef = useRef<HTMLDivElement>(null);
  useDocumentTitle(order.data ? `Return from ${order.data.order_number}` : "Request a return");

  const lineFor = (itemId: number): Line => lines[itemId] ?? { selected: false, quantity: 1, reason: "" };
  const update = (itemId: number, patch: Partial<Line>) => setLines((all) => ({ ...all, [itemId]: { ...lineFor(itemId), ...patch } }));

  const submit = useMutation({
    mutationFn: (items: ReturnLineInput[]) => ordersApi.requestReturn(id, reason.trim(), items),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["returns"] });
      void queryClient.invalidateQueries({ queryKey: orderKeys.returnable(id) });
      toast.success({ title: "Return requested", description: "We'll check it and let you know. Keep the books in their packaging until then." });
      navigate(`/account/returns/${created.id}`, { replace: true });
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      setErrors({
        form: apiError.field("order") ?? apiError.field("items") ?? (apiError.kind === "validation" ? undefined : apiError.message),
        reason: apiError.field("reason"),
      });
      void queryClient.invalidateQueries({ queryKey: orderKeys.returnable(id) });
      requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  if (!valid || [order.error, returnable.error].some((e) => e && ApiError.from(e).kind === "not_found")) {
    return <NotFoundState what="order" backTo="/account/orders" backLabel="See all your orders" />;
  }
  if (order.isError || returnable.isError) {
    const error = order.error ?? returnable.error;
    return <ErrorState error={error} onRetry={() => void Promise.all([order.refetch(), returnable.refetch()])} headingLevel="h1" showHomeLink={false} />;
  }
  if (!order.data || !returnable.data) {
    return (
      <SkeletonGroup label="Loading your order…" className="grid gap-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-56 rounded-xl" />
      </SkeletonGroup>
    );
  }

  const o = order.data;
  const r = returnable.data;
  const items = r.items.filter((item) => item.returnable_quantity > 0);
  const back = (
    <Link to={`/account/orders/${id}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> Order {o.order_number}
    </Link>
  );

  if (!r.can_request_return) {
    return (
      <div className="grid gap-6">
        {back}
        <EmptyState
          icon={RotateCcw}
          headingLevel="h1"
          title="This order can't be returned"
          description={r.reason_unavailable ?? "Returns aren't available for this order."}
          action={
            <Link to={`/account/orders/${id}`} className={buttonVariants({ variant: "outline" })}>
              Back to the order
            </Link>
          }
          className="rounded-xl border border-dashed border-border"
        />
      </div>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const chosen = items.filter((item) => lineFor(item.order_item_id).selected);
    const next = {
      items: chosen.length ? undefined : "Choose at least one book to return.",
      reason: reason.trim() ? undefined : "Tell us why you're returning these books.",
    };
    setErrors(next);
    if (next.items || next.reason) return;
    submit.mutate(
      chosen.map((item) => {
        const line = lineFor(item.order_item_id);
        return { order_item_id: item.order_item_id, quantity: line.quantity, ...(line.reason.trim() ? { reason: line.reason.trim() } : {}) };
      }),
    );
  };

  return (
    <div className="grid gap-6">
      {back}
      <div className="grid gap-1.5">
        <h1 className="font-display text-[2.441rem] leading-[1.1]">Request a return</h1>
        <p className="text-muted-foreground">
          Physical books can be sent back {r.returnable_until ? `until ${orderDate(r.returnable_until)}` : "within the return window"}. Ebooks and audiobooks can't be returned.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-6">
        {errors.form ? (
          <FormAlert ref={alertRef} title="The return wasn't requested">
            {errors.form}
          </FormAlert>
        ) : null}

        <fieldset className="grid gap-3" aria-describedby={errors.items ? "return-items-error" : undefined}>
          <legend className="mb-3 font-display text-[1.563rem] leading-tight">Which books?</legend>
          {items.map((item) => {
            const line = lineFor(item.order_item_id);
            const checkboxId = `return-item-${item.order_item_id}`;
            return (
              <div key={item.order_item_id} className="grid gap-4 rounded-xl border border-border bg-card p-4 has-[button[data-state=checked]]:border-primary sm:p-5">
                <label htmlFor={checkboxId} className="flex min-h-11 cursor-pointer items-start gap-3">
                  <Checkbox
                    id={checkboxId}
                    checked={line.selected}
                    onCheckedChange={(checked) => update(item.order_item_id, { selected: checked === true })}
                    className="mt-0.5"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatLabel(item.format)} · bought {item.purchased_quantity}
                      {item.returnable_quantity < item.purchased_quantity ? `, ${item.returnable_quantity} can still be returned` : ""}
                    </span>
                  </span>
                </label>
                {line.selected ? (
                  <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:pl-8">
                    <SelectField
                      label="Quantity"
                      value={line.quantity}
                      onChange={(event) => update(item.order_item_id, { quantity: Number(event.target.value) })}
                    >
                      {Array.from({ length: item.returnable_quantity }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </SelectField>
                    <TextField
                      label="What's wrong with it?"
                      optional
                      maxLength={MAX_LINE_REASON}
                      value={line.reason}
                      placeholder="e.g. damaged cover"
                      onChange={(event) => update(item.order_item_id, { reason: event.target.value })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          {errors.items ? (
            <p id="return-items-error" className="text-sm font-medium text-destructive">
              {errors.items}
            </p>
          ) : null}
        </fieldset>

        <TextAreaField
          label="Why are you returning these books?"
          hint={`The shop reads this before approving. Up to ${MAX_REASON} characters.`}
          value={reason}
          maxLength={MAX_REASON}
          error={errors.reason}
          onChange={(event) => setReason(event.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={submit.isPending}>
            <RotateCcw aria-hidden="true" /> Request return
          </Button>
          <Link to={`/account/orders/${id}`} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">The refund is confirmed once the shop has received and checked the books.</p>
      </form>
    </div>
  );
}
