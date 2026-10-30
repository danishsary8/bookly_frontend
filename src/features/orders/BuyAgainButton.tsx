import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cartKeys } from "@/api/endpoints/cart";
import { ordersApi, type ReorderResult } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import type { Order } from "@/api/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

const skippedLines = (skipped: ReorderResult["skipped"]) => skipped.map((s) => (s.title ? `${s.title}: ${s.reason}` : s.reason)).join("\n");

/*
 * "Buy again": the API puts every line of the order back in the cart with the normal cart rules.
 * The returned cart replaces the cached one (header count and drawer update at once), then the
 * customer lands on the cart; books that can't be bought now are listed with the API's reason.
 */
export function BuyAgainButton({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { dict } = useT();
  const t = dict.orders;

  const reorder = useMutation({
    mutationFn: () => ordersApi.reorder(order.id!),
    onSuccess: ({ added, skipped, cart }) => {
      queryClient.setQueryData(cartKeys.cart(), cart);
      queryClient.removeQueries({ queryKey: ["cart", "preview"] });

      if (added.length === 0) {
        toast.error({ title: t.noneAdded, description: skippedLines(skipped) });
        return;
      }
      const count = added.reduce((sum, line) => sum + line.quantity, 0);
      toast.success(t.boughtAgain(count));
      if (skipped.length > 0) toast.info({ title: t.someSkipped(skipped.length), description: skippedLines(skipped), duration: null });
      navigate("/cart");
    },
    onError: (error) => toast.error({ title: t.buyAgainFailed, description: ApiError.from(error).message }),
  });

  return (
    <Button variant="outline" onClick={() => reorder.mutate()} loading={reorder.isPending}>
      <ShoppingCart aria-hidden="true" /> {t.buyAgain}
    </Button>
  );
}
