import { RotateCcw, Truck, Wallet } from "lucide-react";
import { policy } from "@/content/shop";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Three plain promises under the buy button (pages/shopping.md): how you can pay, where we deliver, and the return
 * window from src/content/shop.ts (the API's own setting). Facts only: no badges or numbers we can't back up.
 */
export function TrustRow({ className }: { className?: string }) {
  const { dict } = useT();
  const s = dict.shopping;
  const items = [
    { Icon: Wallet, text: s.trustPay },
    { Icon: Truck, text: s.trustProvinces },
    { Icon: RotateCcw, text: s.trustReturns(policy.returnWindowDays) },
  ];
  return (
    <ul aria-label={s.trustLabel} className={cn("grid gap-2.5 border-t border-dashed border-border pt-4", className)}>
      {items.map(({ Icon, text }) => (
        <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}
