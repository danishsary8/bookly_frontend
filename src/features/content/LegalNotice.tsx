import { legal, shop } from "@/content/shop";

const updated = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(legal.updated));

/** Who the page is from and when it last changed (src/content/shop.ts). */
export function LegalNotice() {
  return (
    <p className="text-sm text-muted-foreground">
      {shop.name} · Last updated <time dateTime={legal.updated}>{updated}</time>
    </p>
  );
}
