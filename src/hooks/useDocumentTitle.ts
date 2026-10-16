import { useEffect } from "react";

const SITE = "Bookly";
const DEFAULT_TITLE = `${SITE} · Books delivered across Cambodia`;
const DEFAULT_DESCRIPTION =
  "Bookly is an online bookshop in Cambodia: paperbacks, hardcovers and ebooks, prices in dollars or riel, delivered to your door with cash on delivery.";

export type PageMeta = {
  /** Search-result snippet; trimmed to about 160 characters. */
  description?: string | null;
  /** Absolute image URL for link previews (book cover, author photo). */
  image?: string | null;
  /** Keep the page out of search results (search results, private pages). */
  noindex?: boolean;
  /** OpenGraph type (e.g. "website", "book", "profile"). Defaults to "website". */
  type?: "website" | "book" | "article" | "profile";
  /** Optional price information for products/books in link previews. */
  price?: { amount: string | number; currency: string } | null;
};

/** Sets an attribute on a <meta>/<link> in <head>, creating it if needed; null removes the tag. */
function setHead(tag: "meta" | "link", key: string, id: string, attr: string, value: string | null) {
  let el = document.head.querySelector(`${tag}[${key}="${id}"]`);
  if (value === null) return el?.remove();
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(key, id);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

// The build's default share image (absent when VITE_SITE_URL wasn't set), restored on pages without their own.
let defaultImage: string | null | undefined;

const clip = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157).replace(/\s+\S*$/, "")}…` : flat;
};

/**
 * Sets the tab title to "{title} · Bookly" (pass "Bookly" for Home) while the page is shown,
 * plus the description, canonical link and share tags (OpenGraph and Twitter Cards).
 */
export function useDocumentTitle(
  title: string | null | undefined,
  { description, image, noindex = false, type = "website", price }: PageMeta = {},
) {
  useEffect(() => {
    if (!title) return;
    const own = title === SITE ? DEFAULT_TITLE : `${title} · ${SITE}`;
    const text = description ? clip(description) : DEFAULT_DESCRIPTION;
    const url = window.location.origin + window.location.pathname;

    document.title = own;
    setHead("meta", "name", "description", "content", text);
    setHead("meta", "property", "og:title", "content", own);
    setHead("meta", "property", "og:description", "content", text);
    setHead("meta", "property", "og:type", "content", type);
    setHead("meta", "property", "og:site_name", "content", SITE);
    setHead("meta", "property", "og:url", "content", url);

    if (defaultImage === undefined) {
      defaultImage = document.head.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
    }
    const finalImage = image ?? defaultImage;
    setHead("meta", "property", "og:image", "content", finalImage);

    // Twitter Card metadata
    setHead("meta", "name", "twitter:card", "content", finalImage ? "summary_large_image" : "summary");
    setHead("meta", "name", "twitter:title", "content", own);
    setHead("meta", "name", "twitter:description", "content", text);
    setHead("meta", "name", "twitter:image", "content", finalImage);

    // Optional price metadata for book / product shares
    if (price && price.amount) {
      setHead("meta", "property", "product:price:amount", "content", String(price.amount));
      setHead("meta", "property", "product:price:currency", "content", price.currency);
      setHead("meta", "property", "og:price:amount", "content", String(price.amount));
      setHead("meta", "property", "og:price:currency", "content", price.currency);
    } else {
      setHead("meta", "property", "product:price:amount", "content", null);
      setHead("meta", "property", "product:price:currency", "content", null);
      setHead("meta", "property", "og:price:amount", "content", null);
      setHead("meta", "property", "og:price:currency", "content", null);
    }

    setHead("meta", "name", "robots", "content", noindex ? "noindex" : null);
    setHead("link", "rel", "canonical", "href", noindex ? null : url);

    return () => {
      if (document.title === own) document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, noindex, type, price]);
}
