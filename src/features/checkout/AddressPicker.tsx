import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus } from "lucide-react";
import { accountKeys } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/features/account/AddressForm";
import { MAX_ADDRESSES, formatAddressLines } from "@/features/account/address";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 1: pick one of the saved addresses (radio cards, default first)
 * or add a new one (the account area's AddressForm, in a dialog; the new address
 * is selected). With no saved address the form is shown inline.
 */
export function AddressPicker({ addresses, value, onChange }: { addresses: Address[]; value: number | null; onChange: (id: number) => void }) {
  const queryClient = useQueryClient();
  const session = useSession<Customer>("customer");
  const [adding, setAdding] = useState(false);
  const { dict } = useT();
  const k = dict.checkoutPage;
  const defaults = { recipient_name: session?.user?.name ?? "", phone: session?.user?.phone ?? "" };

  const saved = async (address: Address) => {
    await queryClient.invalidateQueries({ queryKey: accountKeys.addresses() });
    if (address.id) onChange(address.id);
    setAdding(false);
  };

  if (addresses.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="mb-4 text-muted-foreground">{k.addFirst}</p>
        <AddressForm defaults={defaults} hideDefaultToggle onSaved={(a) => void saved(a)} submitLabel={k.useThis} />
      </div>
    );
  }

  return (
    <fieldset className="checkout-addresses grid gap-3">
      <legend className="sr-only">{k.deliveryAddress}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => {
          const checked = address.id === value;
          return (
            <label
              key={address.id}
              className={cn(
                "checkout-address-card group relative flex cursor-pointer gap-3 rounded-2xl border bg-card p-4 pr-5 transition-[border-color,background-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                checked ? "border-primary bg-lapis-tint/70 shadow-[0_18px_32px_-26px_rgb(20_32_122/0.6)]" : "border-border hover:border-input",
              )}
            >
              <span className="checkout-address-icon" aria-hidden="true"><MapPin className="size-5" /></span>
              <span className="grid min-w-0 flex-1 gap-0.5 text-[15px] leading-6">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {address.label || address.recipient_name}
                  {address.is_default ? <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary shadow-[inset_0_0_0_1px_var(--border)]">{k.default}</span> : null}
                </span>
                {address.label && address.label !== address.recipient_name ? <span>{address.recipient_name}</span> : null}
                <span className="text-muted-foreground">{Array.from(new Set(formatAddressLines(address).flatMap((line) => line.split(", ")).map((part) => part.trim()).filter(Boolean))).join(", ")}</span>
              </span>
              <input type="radio" name="address" value={address.id} checked={checked} onChange={() => address.id && onChange(address.id)} className="sr-only" />
            </label>
          );
        })}
      </div>
      {addresses.length < MAX_ADDRESSES ? (
        <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" /> {k.addNew}
        </Button>
      ) : null}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{k.newAddress}</DialogTitle>
            <DialogDescription>{k.newAddressLead}</DialogDescription>
          </DialogHeader>
          <div className="mt-6">{adding ? <AddressForm defaults={defaults} onSaved={(a) => void saved(a)} onCancel={() => setAdding(false)} submitLabel={k.useThis} /> : null}</div>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
