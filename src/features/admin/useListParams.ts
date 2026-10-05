import { useSearchParams } from "react-router-dom";

/** A list screen's filters in the URL: read a value, change some (back to page 1), and build page links. */
export function useListParams() {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const set = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    merged.delete("page");
    setParams(merged, { replace: true });
  };
  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    return `?${next.toString()}`;
  };
  return { get, page, set, hrefFor };
}
