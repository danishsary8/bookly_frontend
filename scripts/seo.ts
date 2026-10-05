import type { Plugin } from "vite";

/*
 * Build-time SEO files.
 * - robots.txt: keeps crawlers out of private areas and points at the sitemap.
 * - sitemap.xml: static pages plus every book, author, series, category and publisher
 *   from the API. If the API can't be reached (the free Render plan sleeps), the build
 *   still succeeds with the static pages and a warning.
 * - index.html: absolute share URLs (og:url, og:image, canonical) need the site's address,
 *   so they're only added when VITE_SITE_URL is set.
 */

const STATIC_PAGES = ["/", "/books", "/authors", "/series", "/shipping", "/returns-policy", "/faq", "/about", "/contact", "/privacy", "/terms"];
const PRIVATE = ["/admin", "/account", "/checkout", "/cart", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/search", "/ui-kit"];

type Row = { id: number; slug?: string | null };

async function getJson(url: string, timeoutMs: number): Promise<{ data: Row[]; meta?: { last_page?: number } }> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as { data: Row[]; meta?: { last_page?: number } };
}

/** Every row of a paginated list (100 per page, the API's maximum). */
async function all(api: string, path: string, timeoutMs: number): Promise<Row[]> {
  const first = await getJson(`${api}${path}?per_page=100&page=1`, timeoutMs);
  const rows = [...first.data];
  for (let page = 2; page <= (first.meta?.last_page ?? 1); page++) rows.push(...(await getJson(`${api}${path}?per_page=100&page=${page}`, timeoutMs)).data);
  return rows;
}

async function catalogPaths(api: string): Promise<string[]> {
  // The first call wakes a sleeping server, so it gets longer.
  const books = await all(api, "/books", 90_000);
  const [authors, series, publishers, categories] = await Promise.all([
    all(api, "/authors", 20_000),
    all(api, "/series", 20_000),
    all(api, "/publishers", 20_000),
    getJson(`${api}/categories`, 20_000).then((r) => r.data),
  ]);
  return [
    ...books.map((b) => `/books/${b.id}`),
    ...authors.map((a) => `/authors/${a.id}`),
    ...series.map((s) => `/series/${s.id}`),
    ...publishers.map((p) => `/publishers/${p.id}`),
    ...categories.filter((c) => c.slug).map((c) => `/categories/${c.slug}`),
  ];
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function seo({ siteUrl, apiUrl }: { siteUrl?: string; apiUrl?: string }): Plugin {
  const site = siteUrl?.replace(/\/+$/, "");
  return {
    name: "bookly-seo",
    apply: "build",
    transformIndexHtml() {
      if (!site) return [];
      return [
        { tag: "link", attrs: { rel: "canonical", href: `${site}/` }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:url", content: `${site}/` }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:image", content: `${site}/og-image.png` }, injectTo: "head" },
        { tag: "meta", attrs: { name: "twitter:image", content: `${site}/og-image.png` }, injectTo: "head" },
      ];
    },
    async generateBundle() {
      const robots = ["User-agent: *", ...PRIVATE.map((p) => `Disallow: ${p}`), ...(site ? ["", `Sitemap: ${site}/sitemap.xml`] : [])].join("\n") + "\n";
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });

      if (!site) {
        this.warn("VITE_SITE_URL is not set: no sitemap.xml or absolute share links in this build.");
        return;
      }
      let paths = STATIC_PAGES;
      if (apiUrl) {
        try {
          paths = [...STATIC_PAGES, ...(await catalogPaths(apiUrl.replace(/\/+$/, "")))];
        } catch (error) {
          this.warn(`sitemap.xml has the static pages only; the catalogue couldn't be loaded (${(error as Error).message}).`);
        }
      }
      const urls = paths.map((p) => `  <url><loc>${xmlEscape(site + p)}</loc></url>`).join("\n");
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}
