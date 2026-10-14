import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderKeys, ordersApi } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import type { Order } from "@/api/types";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

const MAX_REASON = 500;

/** Cancel a pending order, with an optional reason for the shop (the API keeps it in the timeline). */
export function CancelOrderDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { dict } = useT();
  const t = dict.orderParts;

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(order.id!, reason.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(orderKeys.order(order.id!), updated);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
      setReason("");
      toast.success({ title: t.cancelled(order.order_number ?? ""), description: t.cancelledLead });
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("status") ?? apiError.field("reason") ?? apiError.message);
      // Most likely the shop moved the order on meanwhile: show its current state.
      void queryClient.invalidateQueries({ queryKey: orderKeys.order(order.id!) });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    cancel.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (cancel.isPending) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t.cancelTitle(order.order_number ?? "")}</DialogTitle>
            <DialogDescription>{t.cancelLead}</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={t.notCancelled}>{error}</FormAlert> : null}
          <TextAreaField
            label={t.reason}
            optional
            hint={t.reasonHint(MAX_REASON)}
            value={reason}
            maxLength={MAX_REASON}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={cancel.isPending}>
                {t.keepOrder}
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" loading={cancel.isPending}>
              {t.cancelOrder}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
