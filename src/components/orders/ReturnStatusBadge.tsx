import type { ComponentType } from "react";
import { BadgeCheck, CheckCircle2, Clock3, WalletCards, XCircle } from "lucide-react";
import type { ReturnRequest } from "@/api/types";
import { Badge, type BadgeProps } from "@/components/ui/badge";

/* Return statuses, like order statuses (MASTER §6.3a): icon + fill style + written label. */

type ReturnStatus = NonNullable<ReturnRequest["status"]>;
type Meta = { label: string; Icon: ComponentType<{ className?: string }>; tone: BadgeProps["tone"]; shape: BadgeProps["shape"] };

const RETURN_STATUS: Record<ReturnStatus, Meta> = {
  requested: { label: "Requested", Icon: Clock3, tone: "warning", shape: "tint" },
  approved: { label: "Approved", Icon: CheckCircle2, tone: "info", shape: "tint" },
  rejected: { label: "Not accepted", Icon: XCircle, tone: "neutral", shape: "outline" },
  refunded: { label: "Refunded", Icon: WalletCards, tone: "success", shape: "tint" },
};

export function ReturnStatusBadge({ status, className }: { status: ReturnStatus | undefined; className?: string }) {
  const meta = (status && RETURN_STATUS[status]) || { label: status ?? "Unknown", Icon: BadgeCheck, tone: "neutral" as const, shape: "tint" as const };
  const { Icon } = meta;
  return (
    <Badge tone={meta.tone} shape={meta.shape} size="md" className={className}>
      <Icon aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
