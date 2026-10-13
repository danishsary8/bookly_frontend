import type { OrderDocument } from "@/api/types";

/**
 * "Receipt" once the customer has paid (cash recorded on delivery), else "Invoice". A returned or
 * cancelled order stays an invoice: its stamp says what happened.
 */
export const invoiceTitle = (doc: Pick<OrderDocument, "status" | "payment_status">): "Receipt" | "Invoice" =>
  doc.payment_status === "succeeded" && doc.status !== "returned" && doc.status !== "cancelled" ? "Receipt" : "Invoice";
