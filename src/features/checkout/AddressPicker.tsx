import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPinPlus } from "lucide-react";
import { accountKeys } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/features/account/AddressForm";
import { MAX_ADDRESSES, formatAddressLines } from "@/features/account/address";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/** Stylized miniature map-location pin tile for saved address rows. */
function MapPinBadge({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border transition-all duration-150",
        active
          ? "border-primary/25 bg-gradient-to-br from-[#EAF3FF] via-[#F2F7FF] to-[#E6F6EE] shadow-[0_6px_14px_-8px_rgb(20_32_122/0.4)]"
          : "border-border bg-gradient-to-br from-surface-1 to-surface-2/80",
      )}
    >
      {/* Subtle stylized street-map grid lines */}
      <svg viewBox="0 0 44 44" fill="none" className="pointer-events-none absolute inset-0 size-full">
        <path
          d="M0 14 L44 10 M0 30 L44 34 M14 0 L11 44 M31 0 L34 44"
          stroke={active ? "#9BB6E8" : "#CBD2E1"}
          strokeWidth="1.5"
          strokeOpacity={active ? "0.55" : "0.45"}
        />
        <path
          d="M4 38 L22 22 L40 8"
          stroke={active ? "#4CAF82" : "#B8C2D6"}
          strokeWidth="2.2"
          strokeOpacity={active ? "0.45" : "0.35"}
          strokeLinecap="round"
        />
      </svg>
      {/* Crisp colorful map location pin */}
      <svg viewBox="0 0 24 24" fill="none" className="relative size-6 drop-shadow-[0_2px_4px_rgb(20_32_122/0.22)]">
        <path
          d="M12 2.25C7.86 2.25 4.5 5.56 4.5 9.65C4.5 14.95 10.95 20.88 11.55 21.42C11.81 21.65 12.19 21.65 12.45 21.42C13.05 20.88 19.5 14.95 19.5 9.65C19.5 5.56 16.14 2.25 12 2.25Z"
          fill={active ? "#E85432" : "#3B52A5"}
        />
        <circle cx="12" cy="9.5" r="3" fill="#FFFFFF" />
      </svg>
    </span>
  );
}

/** Illustrated miniature map tile matching PaymentBrandMark for Step 3 review cards. */
export function AddressBrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("review-address-brand", className)} aria-hidden="true">
      <svg viewBox="0 0 72 50" fill="none" className="size-full">
        {/* Soft map canvas */}
        <rect width="72" height="50" fill="#EFF4FC" />
        {/* Green park blocks */}
        <path d="M0 0 H24 L19 19 H0 Z" fill="#D4EFE1" />
        <path d="M50 31 H72 V50 H46 Z" fill="#D4EFE1" />
        {/* Soft river corner */}
        <path d="M52 0 H72 V17 C64 16 57 10 52 0 Z" fill="#CDE2FF" />
        {/* Clean city streets */}
        <path d="M0 20 L72 15 M0 36 L72 40 M23 0 L18 50 M49 0 L54 50" stroke="#FFFFFF" strokeWidth="3.2" />
        {/* Dashed courier route leading into the pin */}
        <path
          d="M10 43 C19 36 24 34 36 33"
          stroke="#2640A6"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="3.5 3.5"
        />
        <circle cx="10" cy="43" r="2.6" fill="#2640A6" />
        {/* Pin ground shadow */}
        <ellipse cx="38" cy="37.5" rx="7.5" ry="2.6" fill="#14207A" fillOpacity="0.16" />
        {/* Vibrant location pin */}
        <path
          d="M38 10.5C32.2 10.5 27.5 15.1 27.5 20.8C27.5 28.1 36.4 36.1 37.3 36.9C37.7 37.25 38.3 37.25 38.7 36.9C39.6 36.1 48.5 28.1 48.5 20.8C48.5 15.1 43.8 10.5 38 10.5Z"
          fill="#E85432"
        />
        <circle cx="38" cy="20.6" r="4.2" fill="#FFFFFF" />
      </svg>
    </span>
  );
}

/*
 * Checkout step 1: saved delivery addresses with illustrated map-pin badges,
 * clear selected state, and a crisp dashed "Add a new address" button.
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
    <fieldset className="checkout-addresses grid gap-2.5">
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
              "checkout-address-card flex cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card",
              checked
                ? "border-primary bg-gradient-to-r from-lapis-tint/50 via-lapis-tint/20 to-card shadow-[0_8px_22px_-16px_rgb(20_32_122/0.35)]"
                : "border-border bg-card hover:border-primary/40 hover:bg-surface-1/50",
            )}
          >
            <input
              type="radio"
              name="address"
              value={address.id}
              checked={checked}
              onChange={() => address.id && onChange(address.id)}
              className="size-[18px] shrink-0 accent-primary"
            />
            <MapPinBadge active={checked} />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[15px] font-semibold text-foreground">{address.label || address.recipient_name}</span>
                {address.is_default ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
                    {k.default}
                  </span>
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
          className="mt-0.5 inline-flex min-h-11 items-center gap-2 justify-self-start rounded-xl border border-dashed border-primary/40 bg-lapis-tint/25 px-3.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-lapis-tint/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-6 place-items-center rounded-lg bg-primary/12 text-primary" aria-hidden="true">
            <MapPinPlus className="size-3.5" />
          </span>
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
