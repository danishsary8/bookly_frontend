import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi, opsKeys, type StaffOrder } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import type { OrderStatus } from "@/api/types";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/stores/toast";
import { STEPS } from "./orderSteps";

export function StatusDialog({ order, to, onClose }: { order: Pick<StaffOrder, "id" | "order_number">; to: OrderStatus; onClose: () => void }) {
  const queryClient = useQueryClient();
  const step = STEPS[to]!;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: () => opsApi.setOrderStatus(order.id!, to, note.trim() || undefined),
    onSuccess: (saved) => {
      queryClient.setQueryData(opsKeys.order(order.id!), saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
      toast.success({ title: step.done, description: order.order_number });
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("status") ?? apiError.field("note") ?? apiError.message);
      void queryClient.invalidateQueries({ queryKey: opsKeys.order(order.id!) });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    change.mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !change.isPending && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {step.label}: {order.order_number}
            </DialogTitle>
            <DialogDescription>{step.detail}</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={error} /> : null}
          <TextAreaField label="Note for the timeline" optional hint="The customer sees this on their order. Up to 500 characters." maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={change.isPending}>
                Back
              </Button>
            </DialogClose>
            <Button type="submit" variant={step.destructive ? "destructive" : "default"} loading={change.isPending}>
              {step.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

