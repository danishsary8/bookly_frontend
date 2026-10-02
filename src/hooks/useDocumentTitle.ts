import { useEffect } from "react";

const SITE = "Bookly";

/** Sets the tab title to "{title} · Bookly" ("Bookly · …" on Home) while the page is shown. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title === SITE ? `${SITE} · Books delivered across Cambodia` : `${title} · ${SITE}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
