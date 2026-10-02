import type { ComponentType } from "react";
import { BadgeCheck, CheckCircle2, Clock3, PackageCheck, RotateCcw, Truck, WalletCards, XCircle } from "lucide-react";
import type { OrderStatus } from "@/api/types";
import { Badge, type BadgeProps } from "@/components/ui/badge";

/*
 * MASTER §6.3a order statuses: each one has its own icon *and* fill style
 * (tint / solid / dashed outline) plus its written label, never colour alone.
 */

type Meta = { label: string; Icon: ComponentType<{ className?: string }>; tone: BadgeProps["tone"]; shape: BadgeProps["shape"] };

const ORDER_STATUS: Record<OrderStatus, Meta> = {
  pending: { label: "Pending", Icon: Clock3, tone: "warning", shape: "tint" },
  paid: { label: "Paid", Icon: WalletCards, tone: "info", shape: "tint" },
  processing: { label: "Processing", Icon: PackageCheck, tone: "info", shape: "tint" },
  shipped: { label: "Shipped", Icon: Truck, tone: "info", shape: "solid" },
  delivered: { label: "Delivered", Icon: CheckCircle2, tone: "success", shape: "tint" },
  cancelled: { label: "Cancelled", Icon: XCircle, tone: "neutral", shape: "outline" },
  returned: { label: "Returned", Icon: RotateCcw, tone: "neutral", shape: "solid" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus | undefined; className?: string }) {
  const meta = (status && ORDER_STATUS[status]) || { label: status ?? "Unknown", Icon: BadgeCheck, tone: "neutral" as const, shape: "tint" as const };
  const { Icon } = meta;
  return (
    <Badge tone={meta.tone} shape={meta.shape} size="md" className={className}>
      <Icon aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
