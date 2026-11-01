/** "15.00" -> "15", "12.50" -> "12.5" (offer percents in the shop's sentences). */
export const percentLabel = (percent: string | null | undefined) => (percent ? String(Number(percent)) : "");
