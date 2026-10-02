import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountApi, type AddressPayload } from "@/api/endpoints/account";
import type { Address } from "@/api/types";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { applyApiErrors } from "@/lib/forms";
import { addressSchema, type AddressValues } from "./schemas";

/*
 * Add / edit a delivery address. Used in the address book and, in the cart
 * phase, at checkout. Free-text city, state/province and country (owner
 * decision); country starts as Cambodia. Calls onSaved with the API's address.
 */

const FIELDS = ["label", "recipient_name", "phone", "address_line1", "address_line2", "city", "state", "postal_code", "country", "is_default"] as const;

const toValues = (address?: Address, defaults?: Partial<AddressValues>): AddressValues => ({
  label: address?.label ?? "",
  recipient_name: address?.recipient_name ?? defaults?.recipient_name ?? "",
  phone: address?.phone ?? defaults?.phone ?? "",
  address_line1: address?.address_line1 ?? "",
  address_line2: address?.address_line2 ?? "",
  city: address?.city ?? "",
  state: address?.state ?? "",
  postal_code: address?.postal_code ?? "",
  country: address?.country ?? "Cambodia",
  is_default: address?.is_default ?? defaults?.is_default ?? false,
});

// Empty optional fields go to the API as null so an edit can clear them.
const toInput = (values: AddressValues) => ({
  ...values,
  label: values.label || undefined,
  address_line2: values.address_line2 || null,
  state: values.state || null,
  postal_code: values.postal_code || null,
});

type Props = {
  address?: Address;
  /** Prefill for a new address (e.g. the customer's name and phone). */
  defaults?: Partial<AddressValues>;
  /** Hide "Make this my default" (e.g. for the first address, which is always default). */
  hideDefaultToggle?: boolean;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function AddressForm({ address, defaults, hideDefaultToggle, onSaved, onCancel, submitLabel }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { register, control, handleSubmit, setError, formState } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: toValues(address, defaults),
  });
  const { errors, isSubmitting } = formState;

  const submit = async (values: AddressValues) => {
    setFormError(null);
    try {
      const input: AddressPayload = toInput(values);
      // Unticking "default" on the default address is ignored by the API; don't send it.
      if (address?.is_default && !values.is_default) delete input.is_default;
      const saved = address?.id ? await accountApi.updateAddress(address.id, input) : await accountApi.createAddress(input);
      onSaved(saved);
    } catch (error) {
      const message = applyApiErrors(error, setError, FIELDS);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid gap-4">
      {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Recipient name" autoComplete="shipping name" error={errors.recipient_name?.message} {...register("recipient_name")} />
        <TextField label="Phone" type="tel" inputMode="tel" autoComplete="shipping tel" placeholder="012 345 678" hint="The courier calls this number." error={errors.phone?.message} {...register("phone")} />
      </div>
      <TextField label="Street address" autoComplete="shipping address-line1" placeholder="House 12, Street 240" error={errors.address_line1?.message} {...register("address_line1")} />
      <TextField label="Apartment, floor, landmark" optional autoComplete="shipping address-line2" error={errors.address_line2?.message} {...register("address_line2")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="City" autoComplete="shipping address-level2" placeholder="Phnom Penh" error={errors.city?.message} {...register("city")} />
        <TextField label="State / province" optional autoComplete="shipping address-level1" error={errors.state?.message} {...register("state")} />
        <TextField label="Postal code" optional autoComplete="shipping postal-code" inputMode="numeric" error={errors.postal_code?.message} {...register("postal_code")} />
        <TextField label="Country" autoComplete="shipping country-name" error={errors.country?.message} {...register("country")} />
      </div>
      <TextField label="Label" optional placeholder="Home, Work…" hint="Helps you pick the right address at checkout." error={errors.label?.message} {...register("label")} />
      {hideDefaultToggle ? null : (
        <Controller
          control={control}
          name="is_default"
          render={({ field }) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} disabled={address?.is_default} />
              {address?.is_default ? "This is your default address" : "Make this my default address"}
            </label>
          )}
        />
      )}
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? "Saving…" : (submitLabel ?? (address ? "Save address" : "Add address"))}
        </Button>
      </div>
    </form>
  );
}
