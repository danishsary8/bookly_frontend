import { useQuery } from "@tanstack/react-query";
import { reportQueries, type ReportGroup, type ReportName, type ReportRange } from "@/api/endpoints/reports";
import { daysIn } from "@/features/admin/dashboardRange";

export const GROUPS: Array<{ value: ReportGroup; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Days for up to 2 months, weeks up to 6 months, months beyond. */
export const autoGroup = (range: ReportRange): ReportGroup => {
  const n = daysIn(range.from, range.to);
  return n <= 62 ? "day" : n <= 183 ? "week" : "month";
};

/** A report's data with its loading and error states. */
export function useReport<N extends ReportName>(name: N, range: ReportRange, group?: ReportGroup) {
  return useQuery(reportQueries.report(name, group ? { ...range, group } : range));
}

