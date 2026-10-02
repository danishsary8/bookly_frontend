import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { Customer } from "@/api/types";
import { safeNext, withNext } from "@/lib/forms";
import { toast } from "@/stores/toast";

/**
 * Where to go once a customer has a session: unverified accounts go to /verify-email
 * first (the API blocks cart, wishlist and checkout until then), everyone else back
 * to `next` or Home. Account data cached for a previous visitor is dropped.
 */
export function useAfterSignIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return (customer: Customer | undefined, next: string | null, greeting?: string) => {
    queryClient.removeQueries({ queryKey: ["cart"] });
    queryClient.removeQueries({ queryKey: ["account"] });
    if (customer && customer.email_verified === false) {
      navigate(withNext("/verify-email", next), { replace: true });
      return;
    }
    if (greeting) toast.success(greeting);
    navigate(safeNext(next), { replace: true });
  };
}
