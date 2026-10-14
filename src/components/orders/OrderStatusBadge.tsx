import type { ComponentType } from "react";
import { BadgeCheck, CheckCircle2, Clock3, PackageCheck, RotateCcw, Truck, WalletCards, XCircle } from "lucide-react";
import type { OrderStatus } from "@/api/types";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useT } from "@/i18n";

/*
 * MASTER §6.3a order statuses: each one has its own icon *and* fill style
 * (tint / solid / dashed outline) plus its written label, never colour alone.
 */

type Meta = { Icon: ComponentType<{ className?: string }>; tone: BadgeProps["tone"]; shape: BadgeProps["shape"] };

const ORDER_STATUS: Record<OrderStatus, Meta> = {
  pending: { Icon: Clock3, tone: "warning", shape: "tint" },
  paid: { Icon: WalletCards, tone: "info", shape: "tint" },
  processing: { Icon: PackageCheck, tone: "info", shape: "tint" },
  shipped: { Icon: Truck, tone: "info", shape: "solid" },
  delivered: { Icon: CheckCircle2, tone: "success", shape: "tint" },
  cancelled: { Icon: XCircle, tone: "neutral", shape: "outline" },
  returned: { Icon: RotateCcw, tone: "neutral", shape: "solid" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus | undefined; className?: string }) {
  const { dict } = useT();
  const known = status && ORDER_STATUS[status];
  const meta = known || { Icon: BadgeCheck, tone: "neutral" as const, shape: "tint" as const };
  const label = known ? dict.orderStatus[status] : (status ?? dict.orderStatus.unknown);
  const { Icon } = meta;
  return (
    <Badge tone={meta.tone} shape={meta.shape} size="md" className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
