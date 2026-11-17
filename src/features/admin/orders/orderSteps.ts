import { Ban, CheckCircle2, PackageCheck, Truck } from "lucide-react";
import type { OrderStatus } from "@/api/types";

/** What each staff step is called on its button, what it does, and the toast after it. */
export const STEPS: Partial<Record<OrderStatus, { label: string; Icon: typeof Truck; detail: string; done: string; destructive?: boolean }>> = {
  processing: { label: "Start processing", Icon: PackageCheck, detail: "The order is confirmed and being packed. The customer can no longer cancel it.", done: "Order is being processed" },
  shipped: { label: "Mark as shipped", Icon: Truck, detail: "The order is with the courier.", done: "Order marked as shipped" },
  delivered: { label: "Mark as delivered", Icon: CheckCircle2, detail: "The customer has the books and paid the courier: the cash payment is recorded as received.", done: "Order marked as delivered" },
  cancelled: { label: "Cancel order", Icon: Ban, detail: "The books go back into stock and any coupon use is given back to the customer.", done: "Order cancelled", destructive: true },
};

