/*
 * Storefront navigation (V2 routes from docs/V2_PLAN.md). Pages behind these
 * links are built in Phase 3 onward.
 */

import type { Translations } from "@/i18n";

/** `label` and column titles are keys of the dictionary's `navLinks` section (shown in the visitor's language). */
export type NavLink = { label: keyof Translations["navLinks"]; to: string };

export const primaryNav: NavLink[] = [
  { label: "books", to: "/books" },
  { label: "authors", to: "/authors" },
  { label: "series", to: "/series" },
  { label: "newArrivals", to: "/books?sort=newest" },
];

export const accountNav: NavLink[] = [
  { label: "account", to: "/account" },
  { label: "orders", to: "/account/orders" },
  { label: "wishlist", to: "/account/wishlist" },
];

export const footerNav: { title: keyof Translations["navLinks"]; links: NavLink[] }[] = [
  {
    title: "shop",
    links: [
      { label: "allBooks", to: "/books" },
      { label: "newArrivals", to: "/books?sort=newest" },
      { label: "bestRated", to: "/books?sort=rating" },
      { label: "authors", to: "/authors" },
      { label: "series", to: "/series" },
    ],
  },
  {
    title: "yourAccount",
    links: [
      { label: "signIn", to: "/login" },
      { label: "orders", to: "/account/orders" },
      { label: "wishlist", to: "/account/wishlist" },
      { label: "cart", to: "/cart" },
    ],
  },
  {
    title: "help",
    links: [
      { label: "shipping", to: "/shipping" },
      { label: "returns", to: "/returns-policy" },
      { label: "faq", to: "/faq" },
      { label: "contact", to: "/contact" },
    ],
  },
];

export const legalNav: NavLink[] = [
  { label: "privacy", to: "/privacy" },
  { label: "terms", to: "/terms" },
];

/** Active when the path matches, ignoring the query string. "/books" is active on /books/12 too. */
export const isActivePath = (pathname: string, to: string) => {
  const path = to.split("?")[0];
  if (to.includes("?")) return false;
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
};

/** Full results page for a search query. */
export const searchPath = (query: string) => `/search?q=${encodeURIComponent(query.trim())}`;

/** id of the mobile menu drawer, referenced by the header menu button (aria-controls). */
export const MOBILE_MENU_ID = "mobile-menu";
