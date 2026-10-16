import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

/*
 * Build-time SEO files & Pre-rendered HTML snapshots.
 * - robots.txt: keeps crawlers out of private areas and points at the sitemap.
 * - sitemap.xml: static pages plus every book, author, series, category and publisher
 *   from the API. If the API can't be reached (the free Render plan sleeps), the build
 *   still succeeds with the static pages and a warning.
 * - index.html: absolute share URLs (og:url, og:image, canonical) need the site's address,
 *   so they're only added when VITE_SITE_URL is set.
 * - pre-rendered HTML: static HTML snapshots for public storefront pages so search bots
 *   and social crawlers get instant semantic HTML, titles and OG tags without running JS.
 */

const STATIC_PAGES = ["/", "/books", "/authors", "/series", "/shipping", "/returns-policy", "/faq", "/about", "/contact", "/privacy", "/terms"];
const PRIVATE = ["/admin", "/account", "/checkout", "/cart", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/search", "/ui-kit"];

export const PRERENDER_PAGES: Record<string, { title: string; description: string; heading: string; text: string }> = {
  "/shipping": {
    title: "Shipping & Delivery · Bookly",
    description: "Fast delivery across all 25 provinces in Cambodia. $1.50 in Phnom Penh, $2-$3.50 in provinces, free delivery over $50.",
    heading: "Shipping & Delivery",
    text: "Fast and reliable book delivery across Phnom Penh and all 24 provinces in Cambodia. Free delivery on orders over $50.",
  },
  "/returns-policy": {
    title: "Returns Policy · Bookly",
    description: "7-day return policy for printed books in Cambodia. Cash, bank transfer, or store credit refunds.",
    heading: "Returns Policy",
    text: "Return eligible physical books within 7 days of delivery. Refunds available via cash, bank transfer, or 12-month store credit.",
  },
  "/terms": {
    title: "Terms & Conditions · Bookly",
    description: "Terms and conditions for shopping at Bookly: cash on delivery, accounts, order processing and customer reviews.",
    heading: "Terms of Service",
    text: "Clear, transparent terms for online shopping in Cambodia. Pay with cash on delivery.",
  },
  "/privacy": {
    title: "Privacy Policy · Bookly",
    description: "How Bookly protects your personal data in Cambodia. Data minimization, Telegram privacy, and 30-day account deletion grace period.",
    heading: "Privacy Policy",
    text: "We collect only what is necessary to deliver your books and keep your account secure. 30-day account deletion grace period.",
  },
  "/about": {
    title: "About Us · Bookly",
    description: "Bookly is an independent online bookshop delivering English and Khmer literature across Cambodia.",
    heading: "About Bookly",
    text: "An online bookstore dedicated to readers across Cambodia, delivering quality books with cash on delivery.",
  },
  "/contact": {
    title: "Contact Us · Bookly",
    description: "Get in touch with Bookly via Telegram or email. Online only, customer support Monday to Saturday.",
    heading: "Contact Bookly",
    text: "Have a question about your order or book selection? Reach out via Telegram or email.",
  },
  "/faq": {
    title: "Frequently Asked Questions · Bookly",
    description: "Common questions about ordering books, delivery areas in Cambodia, payment methods, and returns at Bookly.",
    heading: "Frequently Asked Questions",
    text: "Answers to common questions about ordering, delivery to 25 provinces, and returns.",
  },
};

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
    closeBundle() {
      // Pre-rendered HTML snapshots for static public pages
      const distDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.resolve(distDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const template = fs.readFileSync(indexPath, "utf-8");

      for (const [route, meta] of Object.entries(PRERENDER_PAGES)) {
        let pageHtml = template
          .replace(/<title>.*?<\/title>/, `<title>${xmlEscape(meta.title)}</title>`)
          .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${xmlEscape(meta.description)}" />`)
          .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${xmlEscape(meta.title)}" />`)
          .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${xmlEscape(meta.description)}" />`);

        if (site) {
          pageHtml = pageHtml.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${site}${route}" />`);
        }

        const preContent = `<main class="container mx-auto px-4 py-8"><h1 class="text-3xl font-bold tracking-tight">${xmlEscape(meta.heading)}</h1><p class="mt-4 text-base leading-relaxed text-muted-foreground">${xmlEscape(meta.text)}</p></main>`;
        pageHtml = pageHtml.replace('<div id="root"></div>', `<div id="root">${preContent}</div>`);

        const targetDir = path.resolve(distDir, route.replace(/^\//, ""));
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.resolve(targetDir, "index.html"), pageHtml, "utf-8");
      }
    },
  };
}
