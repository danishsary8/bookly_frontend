/*
 * Storefront navigation (V2 routes from docs/V2_PLAN.md). Pages behind these
 * links are built in Phase 3 onward.
 */

export type NavLink = { label: string; to: string };

export const primaryNav: NavLink[] = [
  { label: "Books", to: "/books" },
  { label: "Authors", to: "/authors" },
  { label: "Series", to: "/series" },
  { label: "New arrivals", to: "/books?sort=newest" },
];

export const accountNav: NavLink[] = [
  { label: "Account", to: "/account" },
  { label: "Orders", to: "/account/orders" },
  { label: "Wishlist", to: "/account/wishlist" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All books", to: "/books" },
      { label: "New arrivals", to: "/books?sort=newest" },
      { label: "Best rated", to: "/books?sort=rating" },
      { label: "Authors", to: "/authors" },
      { label: "Series", to: "/series" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Orders", to: "/account/orders" },
      { label: "Wishlist", to: "/account/wishlist" },
      { label: "Cart", to: "/cart" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Shipping & delivery", to: "/shipping" },
      { label: "Returns", to: "/returns-policy" },
      { label: "FAQ", to: "/faq" },
      { label: "Contact us", to: "/contact" },
    ],
  },
];

export const legalNav: NavLink[] = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
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
