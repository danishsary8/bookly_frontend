import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { accountKeys } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/features/account/AddressForm";
import { MAX_ADDRESSES, formatAddressLines } from "@/features/account/address";
import { cn } from "@/lib/utils";

/*
 * Checkout step 1: pick one of the saved addresses (radio cards, default first)
 * or add a new one (the account area's AddressForm, in a dialog; the new address
 * is selected). With no saved address the form is shown inline.
 */
export function AddressPicker({ addresses, value, onChange }: { addresses: Address[]; value: number | null; onChange: (id: number) => void }) {
  const queryClient = useQueryClient();
  const session = useSession<Customer>("customer");
  const [adding, setAdding] = useState(false);
  const defaults = { recipient_name: session?.user?.name ?? "", phone: session?.user?.phone ?? "" };

  const saved = async (address: Address) => {
    await queryClient.invalidateQueries({ queryKey: accountKeys.addresses() });
    if (address.id) onChange(address.id);
    setAdding(false);
  };

  if (addresses.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="mb-4 text-muted-foreground">Add the address we should deliver to. It's saved to your account for next time.</p>
        <AddressForm defaults={defaults} hideDefaultToggle onSaved={(a) => void saved(a)} submitLabel="Use this address" />
      </div>
    );
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="sr-only">Delivery address</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => {
          const checked = address.id === value;
          return (
            <label
              key={address.id}
              className={cn(
                "relative flex cursor-pointer gap-3 rounded-xl border bg-card p-4 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                checked ? "border-primary bg-lapis-tint" : "border-border hover:border-input",
              )}
            >
              <input type="radio" name="address" value={address.id} checked={checked} onChange={() => address.id && onChange(address.id)} className="mt-1 size-[18px] shrink-0 accent-primary" />
              <span className="grid gap-0.5 text-[15px] leading-6">
                <span className="font-semibold">
                  {address.label || address.recipient_name}
                  {address.is_default ? <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">Default</span> : null}
                </span>
                <span>{address.recipient_name}</span>
                {formatAddressLines(address).map((line) => (
                  <span key={line} className="text-muted-foreground">
                    {line}
                  </span>
                ))}
                <span className="tabular-nums text-muted-foreground">{address.phone}</span>
              </span>
            </label>
          );
        })}
      </div>
      {addresses.length < MAX_ADDRESSES ? (
        <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" /> Add a new address
        </Button>
      ) : null}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New address</DialogTitle>
            <DialogDescription>It's saved to your account and used for this order.</DialogDescription>
          </DialogHeader>
          <div className="mt-6">{adding ? <AddressForm defaults={defaults} onSaved={(a) => void saved(a)} onCancel={() => setAdding(false)} submitLabel="Use this address" /> : null}</div>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
