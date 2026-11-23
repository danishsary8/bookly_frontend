import { portalPath, type Portal } from "@/features/admin/portal";

/** The API prints up to 50 orders at a time (OrderDocumentController::MAX_ORDERS). */
export const MAX_PRINT = 50;

export type PrintDoc = "invoice" | "packing-slip" | "manifest";

/** "/admin/print?doc=packing-slip&ids=3,1&autoprint=1" (or "/staff/print?..."): opens the sheets and the print dialog. */
export const staffPrintPath = (doc: PrintDoc, ids: number[], autoprint = true, portal: Portal = "admin") =>
  `${portalPath(portal, "print")}?doc=${doc}&ids=${ids.join(",")}${autoprint ? "&autoprint=1" : ""}`;

/** "/admin/print/daily-sales?..." (or "/staff/print/daily-sales?..."): printable daily/period sales & cash settlement register. */
export const staffDailySalesPrintPath = (
  params: { from?: string; to?: string; status?: string; pay?: string } = {},
  portal: Portal = "admin",
) => {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);
  if (params.pay) query.set("pay", params.pay);
  const qs = query.toString();
  const base = portalPath(portal, "print/daily-sales");
  return qs ? `${base}?${qs}` : base;
};

/** "3,1,x,3" -> [3, 1]: positive whole numbers, first copy kept, at most MAX_PRINT. */
export const parsePrintIds = (raw: string | null): number[] => {
  const ids = (raw ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, MAX_PRINT);
};
