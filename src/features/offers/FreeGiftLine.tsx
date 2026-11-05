import { Gift } from "lucide-react";
import type { components } from "@/api/schema";
import { useT } from "@/i18n";

export function FreeGiftLine({ gift, packing = false }: { gift: components["schemas"]["FreeGift"] | undefined; packing?: boolean }) {
  const { dict, lang } = useT();
  if (!gift) return null;
  const name = lang === "km" ? gift.name_km : gift.name_en;
  return <p className="flex flex-wrap items-center gap-2 text-sm"><Gift className="size-4 shrink-0" aria-hidden="true" />{packing ? dict.shopExtras.include(name ?? "", gift.quantity ?? 1) : dict.shopExtras.freeGift(name ?? "", gift.quantity ?? 1)}{!packing && gift.limited ? <span className="rounded-md bg-warning-tint px-2 py-1 text-xs font-semibold text-warning">{dict.shopExtras.limited}</span> : null}</p>;
}
