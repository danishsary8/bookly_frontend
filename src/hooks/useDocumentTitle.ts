import { useEffect } from "react";

const SITE = "Bookly";
const DEFAULT_TITLE = `${SITE} · Books delivered across Cambodia`;

/**
 * Sets the tab title to "{title} · Bookly" (pass "Bookly" for Home) while the page is shown.
 * On leaving, it resets the title only if it is still this page's: during a page transition the
 * next page has usually set its own title before this one unmounts.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const own = title === SITE ? DEFAULT_TITLE : `${title} · ${SITE}`;
    document.title = own;
    return () => {
      if (document.title === own) document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
