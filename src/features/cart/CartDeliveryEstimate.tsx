import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { cartApi } from "@/api/endpoints/cart";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { SelectField } from "@/components/form/Field";
import { InlineError } from "@/components/ui/error-state";
import { useT } from "@/i18n";
import { formatMoney, useCurrency } from "@/stores/currency";

/*
 * Cart summary: the delivery fee and date from the checkout preview (with an area choice when there is no saved
 * address yet), then the free-delivery progress. pages/shopping.md.
 */
export function CartDeliveryEstimate({ version, coupon }: { version: string; coupon: string | null }) {
  const { dict } = useT();
  const currency = useCurrency();
  const [area, setArea] = useState<"phnom_penh" | "provinces">("phnom_penh");
  const preview = useQuery({ queryKey: ["cart", "preview", "estimate", version, coupon, area], queryFn: () => cartApi.preview(coupon, null, area) });
  const data = preview.data;
  return (
    <section aria-label={dict.shopExtras.deliveryEstimate} className="grid gap-3">
      {data?.has_delivery_address === false ? (
        <SelectField label={dict.shopExtras.deliveryArea} value={area} onChange={(e) => setArea(e.target.value as typeof area)}>
          <option value="phnom_penh">{dict.checkoutPage.phnomPenh}</option>
          <option value="provinces">{dict.checkoutPage.provinces}</option>
        </SelectField>
      ) : null}
      {preview.isError ? <InlineError error={preview.error} onRetry={() => preview.refetch()} /> : null}
      <div aria-live="polite" aria-busy={preview.isFetching} className="grid gap-3">
        {data ? (
          <>
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
                <Truck className="size-4" aria-hidden="true" />
              </span>
              <div className="grid min-w-0 gap-0.5 [&>p]:text-sm [&>p]:leading-snug">
                <p className="font-semibold text-foreground">
                  {dict.shopExtras.deliveryEstimate}: {formatMoney(data.shipping_fee?.usd, data.shipping_fee?.khr, currency)}
                </p>
                {data.estimated_delivery?.formatted ? <p className="text-muted-foreground">{dict.checkoutPage.estDelivery(data.estimated_delivery.formatted)}</p> : null}
                {data.shipping_notice ? <p className="text-muted-foreground">{data.shipping_notice}</p> : null}
              </div>
            </div>
            {data.requires_shipping && (data.free_shipping_threshold?.usd || data.is_free_shipping) ? (
              <FreeShippingBar subtotalUsd={String(Math.max(0, Number(data.subtotal?.usd) - Number(data.discount?.usd)))} thresholdUsd={data.free_shipping_threshold?.usd} free={data.is_free_shipping} />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
