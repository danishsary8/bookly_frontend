import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Plus } from "lucide-react";
import { accountKeys } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/features/account/AddressForm";
import { MAX_ADDRESSES, formatAddressLines } from "@/features/account/address";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 1: pick one of the saved addresses (balanced 2-column radio cards
 * with clear selection indicator) or add a new one via the matching dashed card tile.
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
  const addSpansFull = addresses.length % 2 === 0;

  return (
    <fieldset className="checkout-addresses grid gap-3">
      <legend className="sr-only">{k.deliveryAddress}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
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
                "checkout-address-card group relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-[border-color,background-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card",
                checked
                  ? "border-[1.5px] border-primary bg-lapis-tint/35 shadow-[0_12px_28px_-20px_rgb(20_32_122/0.55)]"
                  : "border-border bg-card hover:border-primary/45 hover:bg-surface-1/60",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-200",
                  checked
                    ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgb(20_32_122/0.55)]"
                    : "bg-lapis-tint text-primary group-hover:bg-primary/15",
                )}
              >
                <MapPin className="size-[18px]" />
              </span>

              <span className="grid min-w-0 flex-1 gap-1 pr-6">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold leading-5 text-foreground">
                    {address.label || address.recipient_name}
                  </span>
                  {address.is_default ? (
                    <span className="rounded-full border border-primary/20 bg-card px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary">
                      {k.default}
                    </span>
                  ) : null}
                </span>
                {address.label && address.label !== address.recipient_name ? (
                  <span className="text-[13px] font-medium leading-5 text-foreground/80">{address.recipient_name}</span>
                ) : null}
                <span className="text-[13.5px] leading-relaxed text-muted-foreground">{addressText}</span>
              </span>

              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-3.5 top-3.5 grid size-5 place-items-center rounded-full transition-all duration-200",
                  checked
                    ? "bg-primary text-primary-foreground"
                    : "border-2 border-input bg-card group-hover:border-primary/60",
                )}
              >
                {checked ? <Check className="size-3 stroke-[3]" /> : null}
              </span>

              <input
                type="radio"
                name="address"
                value={address.id}
                checked={checked}
                onChange={() => address.id && onChange(address.id)}
                className="sr-only"
              />
            </label>
          );
        })}

        {canAdd ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "group flex min-h-[4.5rem] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-dashed border-input/80 bg-surface-1/40 px-4 py-4 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/60 hover:bg-lapis-tint/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              addSpansFull ? "sm:col-span-2 min-h-12 py-3" : "flex-col text-center",
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-xl bg-lapis-tint text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <Plus className="size-4" />
            </span>
            <span>{k.addNew}</span>
          </button>
        ) : null}
      </div>

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
