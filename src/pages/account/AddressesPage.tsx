import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinPlus, Plus } from "lucide-react";
import { accountApi, accountKeys, accountQueries } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { AddressCard } from "@/features/account/AddressCard";
import { AddressForm } from "@/features/account/AddressForm";
import { MAX_ADDRESSES } from "@/features/account/address";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/stores/toast";

/*
 * /account/addresses: up to 10 delivery addresses, one default (the API makes the
 * first one default and promotes another when the default is deleted). Add and
 * edit open a dialog; delete asks first.
 */

type Editing = { mode: "new" } | { mode: "edit"; address: Address } | null;

export default function AddressesPage() {
  useDocumentTitle("Addresses");
  const queryClient = useQueryClient();
  const session = useSession<Customer>("customer");
  const addresses = useQuery(accountQueries.addresses());
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const list = addresses.data ?? [];
  const full = list.length >= MAX_ADDRESSES;

  const refresh = () => queryClient.invalidateQueries({ queryKey: accountKeys.addresses() });

  const remove = useMutation({
    mutationFn: (address: Address) => accountApi.deleteAddress(address.id!),
    onSuccess: async (_data, address) => {
      await refresh();
      setDeleting(null);
      toast.success({ title: "Address deleted", description: address.is_default && list.length > 1 ? "Another address is now your default." : undefined });
    },
    onError: (error) => toast.error({ title: "Couldn't delete the address", description: ApiError.from(error).message }),
  });

  const makeDefault = useMutation({
    mutationFn: (address: Address) => accountApi.updateAddress(address.id!, { is_default: true }),
    onSuccess: async (address) => {
      await refresh();
      toast.success(`${address.label || "This address"} is now your default`);
    },
    onError: (error) => toast.error({ title: "Couldn't change the default", description: ApiError.from(error).message }),
  });

  const saved = async (address: Address) => {
    const isNew = editing?.mode === "new";
    await refresh();
    setEditing(null);
    toast.success(isNew ? { title: "Address added", description: address.is_default ? "It's your default delivery address." : undefined } : "Address saved");
  };

  const addButton = (
    <div className="grid justify-items-end gap-1">
      <Button onClick={() => setEditing({ mode: "new" })} disabled={full || addresses.isPending}>
        <Plus aria-hidden="true" /> Add address
      </Button>
      {full ? <p className="text-sm text-muted-foreground">You can save up to {MAX_ADDRESSES}. Delete one to add another.</p> : null}
    </div>
  );

  const title = editing?.mode === "edit" ? "Edit address" : "New address";

  return (
    <AccountSection
      title="Addresses"
      lead={addresses.data ? `${list.length} of ${MAX_ADDRESSES} saved. Your default is picked first at checkout.` : "Where we deliver your books."}
      action={list.length ? addButton : undefined}
    >
      {addresses.isPending ? (
        <SkeletonGroup label="Loading addresses…" className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </SkeletonGroup>
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={MapPinPlus}
          title="No saved addresses"
          description="Add one now and checkout will fill it in for you."
          action={
            <Button onClick={() => setEditing({ mode: "new" })}>
              <Plus aria-hidden="true" /> Add address
            </Button>
          }
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <Stagger as="ul" className="grid gap-4 md:grid-cols-2">
          {list.map((address, index) => (
            <StaggerItem as="li" key={address.id} index={index}>
              <AddressCard
                address={address}
                busy={(remove.isPending && remove.variables?.id === address.id) || (makeDefault.isPending && makeDefault.variables?.id === address.id)}
                onEdit={() => setEditing({ mode: "edit", address })}
                onDelete={() => setDeleting(address)}
                onMakeDefault={() => makeDefault.mutate(address)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Couriers use these details to find you, so include a landmark if it helps.</DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            {editing ? (
              <AddressForm
                key={editing.mode === "edit" ? editing.address.id : "new"}
                address={editing.mode === "edit" ? editing.address : undefined}
                defaults={{ recipient_name: session?.user?.name ?? "", phone: session?.user?.phone ?? "" }}
                hideDefaultToggle={editing.mode === "new" && list.length === 0}
                onSaved={(address) => void saved(address)}
                onCancel={() => setEditing(null)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this address?"
        description={
          deleting?.is_default && list.length > 1
            ? "It's your default address; your most recent other address will become the default. Orders already placed keep their address."
            : "Orders already placed keep their delivery address."
        }
        confirmLabel="Delete address"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AccountSection>
  );
}
