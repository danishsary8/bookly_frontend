import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { accountKeys } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/features/account/AddressForm";
import { MAX_ADDRESSES, formatAddressLines } from "@/features/account/address";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 1 (minimal, 2026-11-26): the saved addresses as compact radio rows (name, default tag, one address
 * line) and a quiet "Add a new address" link-button under them.
 * With no saved address the form is shown inline.
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

  const canAdd = addresses.length < MAX_ADDRESSES;

  return (
    <fieldset className="checkout-addresses grid gap-2">
      <legend className="sr-only">{k.deliveryAddress}</legend>
      {addresses.map((address) => {
        const checked = address.id === value;
        const addressText = Array.from(
          new Set(
            formatAddressLines(address)
              .flatMap((line) => line.split(", "))
              .map((part) => part.trim())
              .filter(Boolean),
          ),
        ).join(", ");
        return (
          <label
            key={address.id}
            className={cn(
              "checkout-address-card flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card",
              checked ? "border-primary bg-lapis-tint/40" : "border-border bg-card hover:border-primary/40",
            )}
          >
            <input
              type="radio"
              name="address"
              value={address.id}
              checked={checked}
              onChange={() => address.id && onChange(address.id)}
              className="mt-0.5 size-[18px] shrink-0 accent-primary"
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[15px] font-semibold">{address.label || address.recipient_name}</span>
                {address.is_default ? (
                  <span className="rounded-full bg-primary/10 px-2 py-px text-[10.5px] font-bold uppercase tracking-[0.08em] text-primary">{k.default}</span>
                ) : null}
              </span>
              <span className="text-[13.5px] leading-snug text-muted-foreground">
                {address.label && address.label !== address.recipient_name ? `${address.recipient_name} · ` : ""}
                {addressText}
              </span>
            </span>
          </label>
        );
      })}

      {canAdd ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-lapis-tint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
          {k.addNew}
        </button>
      ) : null}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{k.newAddress}</DialogTitle>
            <DialogDescription>{k.newAddressLead}</DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            {adding ? <AddressForm defaults={defaults} onSaved={(a) => void saved(a)} onCancel={() => setAdding(false)} submitLabel={k.useThis} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
