import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { promotionQueries, promotionsApi, promotionText } from "@/api/endpoints/promotions";
import { orderDate } from "@/features/orders/format";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * The live promotion as one quiet line in the cart and checkout summaries (owner 2026-11-12): it stays there even
 * after "Don't show this again" on the pop-up, so a shopper who is about to pay still knows the offer and its end
 * date. Renders nothing when there is no live promotion.
 */
export function PromoReminder({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { dict, lang, locale } = useT();
  const promotion = useQuery(promotionQueries.current()).data;
  if (!promotion) return null;
  const text = promotionText(promotion, lang);
  return (
    <p className={cn("flex items-start gap-2.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm", className)}>
      <Gift className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-semibold text-foreground">{text.title}</span>
        {promotion.ends_at ? <span className="text-muted-foreground"> · {dict.promo.reminderEnds(orderDate(promotion.ends_at, locale))}</span> : null}{" "}
        <Link
          to={promotion.cta_url}
          onClick={() => {
            void promotionsApi.click(promotion.id);
            onNavigate?.();
          }}
          className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-primary underline-offset-4 hover:underline"
        >
          {dict.promo.see} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </span>
    </p>
  );
}
