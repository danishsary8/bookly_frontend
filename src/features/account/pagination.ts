import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function accountPage(raw: string | null): number {
  const page = Number(raw);
  return raw !== null && /^\d+$/.test(raw) && Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/** Recover invalid links and the empty last page after an item is removed. */
export function useAccountPageBounds(meta: { last_page?: number } | undefined, stale = false) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("page");
  const page = accountPage(raw);
  const invalid = raw !== null && String(page) !== raw;
  const last = meta && !stale ? Math.max(1, meta.last_page ?? 1) : undefined;
  useEffect(() => {
    if (!invalid && (last === undefined || page <= last)) return;
    const target = Math.min(page, last ?? page);
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (target > 1) next.set("page", String(target));
      else next.delete("page");
      return next;
    }, { replace: true });
  }, [invalid, last, page, setParams]);
}
