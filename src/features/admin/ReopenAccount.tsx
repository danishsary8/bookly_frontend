import type { StaffCustomer } from "@/api/endpoints/staffOps";
import { ConfirmDialog } from "@/components/ui/dialog";

/** Confirm before reopening a closed account (useReopenCustomer does the work). */
export function ReopenDialog({
  customer,
  onOpenChange,
  loading,
  onConfirm,
}: {
  customer: StaffCustomer | null;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={customer !== null}
      onOpenChange={onOpenChange}
      title={`Reopen ${customer?.name ?? "this"}'s account?`}
      description="Only do this when the customer asks. They can sign in again as before and we email them. Reviews, wishlist and cart removed when they closed it don't come back. This is recorded in the audit log."
      confirmLabel="Reopen account"
      destructive={false}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
