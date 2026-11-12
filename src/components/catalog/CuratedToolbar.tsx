import { useSearchParams } from "react-router-dom";
import { useT } from "@/i18n";
import { Pagination } from "@/components/ui/pagination";

export function CuratedToolbar({ total, page, lastPage }: { total: number; page: number; lastPage: number }) {
  const { dict } = useT();
  const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete("page"); if (value) next.set(key, value); else next.delete(key); setParams(next); };
  return <div className="mb-6 grid gap-3">
    <form role="search" aria-label={dict.browse.searchWithinLabel} className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); update("q", String(data.get("q") ?? "").trim()); }}>
      <label className="grid flex-1 gap-1 text-sm">{dict.browse.searchWithinLabel}<input key={params.get("q")} name="q" defaultValue={params.get("q") ?? ""} type="search" className="h-11 min-w-0 rounded-md border border-input bg-card px-3 text-base" /></label>
      <button className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">{dict.pages.search}</button>
      <label className="grid gap-1 text-sm">{dict.browse.sortBy}<select value={params.get("sort") ?? ""} onChange={e => update("sort", e.target.value)} className="h-11 rounded-md border border-input bg-card px-3 text-base"><option value="">{dict.catalogueV2.curated}</option><option value="title">{dict.browse.sorts.title}</option><option value="price_asc">{dict.browse.sorts.price_asc}</option></select></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={params.get("in_stock") === "1"} onChange={e => update("in_stock", e.target.checked ? "1" : "")} />{dict.browse.inStockOnly}</label>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite">{dict.pages.bookCount(total)}</p>{params.size > 0 ? <button className="min-h-11 px-3 font-semibold text-primary" onClick={() => setParams({})}>{dict.browse.clearAll}</button> : null}</div>
    {lastPage > 1 ? <Pagination page={page} lastPage={lastPage} hrefFor={p => { const next = new URLSearchParams(params); next.set("page", String(p)); return `?${next}`; }} /> : null}
  </div>;
}
