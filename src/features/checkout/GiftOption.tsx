import { Gift } from "lucide-react";
import { useId } from "react";
import { TextAreaField } from "@/components/form/Field";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/i18n";

export const GIFT_MESSAGE_MAX = 200;

/**
 * Checkout: free "This is a gift" option (owner 2026-11-05). The message is printed on the packing sheet, which never
 * shows book prices. With cash on delivery the person receiving it pays, so we suggest KHQR to keep the price a
 * surprise.
 */
export function GiftOption({
  isGift,
  onIsGiftChange,
  message,
  onMessageChange,
  cashOnDelivery,
  khqrAvailable,
}: {
  isGift: boolean;
  onIsGiftChange: (value: boolean) => void;
  message: string;
  onMessageChange: (value: string) => void;
  cashOnDelivery: boolean;
  khqrAvailable: boolean;
}) {
  const { dict } = useT();
  const t = dict.gift;
  const id = useId();

  return (
    <div className="checkout-gift-option mt-4 grid gap-3 rounded-xl border border-border bg-card p-4">
      <label htmlFor={`${id}-gift`} className="flex min-h-11 cursor-pointer items-start gap-3">
        <Checkbox
          id={`${id}-gift`}
          checked={isGift}
          onCheckedChange={(checked) => onIsGiftChange(checked === true)}
          aria-describedby={`${id}-gift-lead`}
          className="mt-0.5"
        />
        <span className="grid gap-0.5">
          <span className="flex items-center gap-2 font-semibold">
            <Gift className="size-4 text-primary" aria-hidden="true" /> {t.label}
          </span>
          <span id={`${id}-gift-lead`} className="text-sm text-muted-foreground">
            {t.lead}
          </span>
        </span>
      </label>
      {isGift ? (
        <>
          <TextAreaField
            label={t.message}
            optional
            hint={
              <span className="flex items-center justify-between gap-2">
                <span>{t.messageHint}</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">
                  {message.length}/{GIFT_MESSAGE_MAX}
                </span>
              </span>
            }
            maxLength={GIFT_MESSAGE_MAX}
            rows={3}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
          />
          {cashOnDelivery ? (
            <p className="rounded-lg bg-warning-tint px-3 py-2 text-sm text-foreground">
              {khqrAvailable ? t.codNoteKhqr : t.codNote}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
