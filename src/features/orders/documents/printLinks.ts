/** The API prints up to 50 orders at a time (OrderDocumentController::MAX_ORDERS). */
export const MAX_PRINT = 50;

export type PrintDoc = "invoice" | "packing-slip";

/** "/admin/print?doc=packing-slip&ids=3,1&autoprint=1": opens the sheets and the print dialog. */
export const staffPrintPath = (doc: PrintDoc, ids: number[]) => `/admin/print?doc=${doc}&ids=${ids.join(",")}&autoprint=1`;

/** "3,1,x,3" -> [3, 1]: positive whole numbers, first copy kept, at most MAX_PRINT. */
export const parsePrintIds = (raw: string | null): number[] => {
  const ids = (raw ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, MAX_PRINT);
};
