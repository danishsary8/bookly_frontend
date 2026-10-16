import { Truck, CheckCircle2 } from "lucide-react";
import { formatMoney, useCurrency } from "@/stores/currency";
import { policy } from "@/content/shop";
import { useT } from "@/i18n";

interface Props {
  subtotalUsd?: string | number | null;
  thresholdUsd?: string | number | null;
  className?: string;
}

export function FreeShippingBar({ subtotalUsd, thresholdUsd, className }: Props) {
  const currency = useCurrency();
  const { lang } = useT();

  const subtotal = Number(subtotalUsd || 0);
  const threshold = Number(thresholdUsd || policy.freeShippingThresholdUsd || 50);

  if (threshold <= 0) return null;

  const diff = Math.max(0, threshold - subtotal);
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));
  const isUnlocked = diff <= 0;

  const diffFormatted = formatMoney(diff.toFixed(2), null, currency);
  const thresholdFormatted = formatMoney(threshold.toFixed(2), null, currency);

  const isKm = lang === "km";

  return (
    <div
      className={`rounded-lg border border-border p-3 transition-colors ${
        isUnlocked ? "bg-success-tint/40 border-success/30" : "bg-surface-1"
      } ${className ?? ""}`}
      role="region"
      aria-label="Free delivery progress"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isUnlocked ? (
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Truck className="size-4 shrink-0 text-primary" aria-hidden="true" />
        )}
        <span className={isUnlocked ? "text-success font-semibold" : "text-foreground"}>
          {isUnlocked
            ? isKm
              ? "អ្នកទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃ! 🎉"
              : "You've unlocked FREE delivery! 🎉"
            : isKm
              ? `បន្ថែម ${diffFormatted} ទៀតដើម្បីទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃ (លើសពី ${thresholdFormatted})`
              : `Add ${diffFormatted} more for FREE delivery (orders over ${thresholdFormatted})`}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isUnlocked ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
