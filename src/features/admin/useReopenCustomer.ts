import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi, opsKeys, type StaffCustomer } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { toast } from "@/stores/toast";

/*
 * Admins reopen an account the customer closed (they changed their mind and asked the shop), while it's
 * inside its 30 days. The API records it in the audit log and emails the customer.
 */
export function useReopenCustomer(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customer: StaffCustomer) => opsApi.reopenCustomer(customer.id),
    onSuccess: (saved) => {
      queryClient.setQueryData(opsKeys.customer(saved.id), (old: StaffCustomer | undefined) => (old ? { ...old, ...saved } : saved));
      void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
      void queryClient.invalidateQueries({ queryKey: opsKeys.customer(saved.id) });
      toast.success({ title: `${saved.name}'s account is open again`, description: saved.email ? "They can sign in as before. We emailed them." : "They can sign in as before." });
    },
    onError: (error) => toast.error({ title: "Couldn't reopen the account", description: ApiError.from(error).message }),
    onSettled: () => onDone?.(),
  });
}
