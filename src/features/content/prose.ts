import { cn } from "@/lib/utils";

/** Reading styles for the article column: 68ch measure, Gloock h2, 17px body. */
export const proseClass = cn(
  "max-w-[68ch] text-[1.0625rem] leading-[1.75]",
  "[&_p]:mt-4 [&_p:first-child]:mt-0",
  "[&_ul]:mt-4 [&_ul]:grid [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:list-[square] [&_li]:pl-1 [&_li::marker]:text-primary",
  "[&_ol]:mt-4 [&_ol]:grid [&_ol]:gap-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li::marker]:font-semibold [&_ol>li::marker]:tabular-nums",
  "[&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a:hover]:decoration-2",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
);
