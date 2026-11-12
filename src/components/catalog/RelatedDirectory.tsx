import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { useT } from "@/i18n";

export function RelatedDirectory({ kind, exclude }: { kind: "authors" | "series"; exclude: number }) {
  const { dict } = useT();
  const authors = useQuery({ ...catalogQueries.authors({ per_page: 6 }), enabled: kind === "authors" });
  const series = useQuery({ ...catalogQueries.seriesList({ per_page: 6 }), enabled: kind === "series" });
  const items = (kind === "authors" ? authors.data?.data : series.data?.data)?.filter(item => item.id !== exclude);
  if (!items?.length) return null;
  return <section className="mt-12 grid gap-4" aria-label={kind === "authors" ? dict.pages.authors : dict.pages.series}>
    <h2 className="font-display text-2xl">{kind === "authors" ? dict.pages.allAuthors : dict.pages.allSeries}</h2>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <li key={item.id}><Link to={`/${kind}/${item.id}`} className="shop-card flex min-h-20 flex-wrap items-center justify-between gap-3 border border-border bg-card p-4 hover:border-input"><span className="font-display text-xl">{item.name}</span><span className="text-sm text-muted-foreground">{dict.pages.bookCount(item.books_count ?? 0)}</span></Link></li>)}</ul>
  </section>;
}
