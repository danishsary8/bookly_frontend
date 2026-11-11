/*
 * What this browser remembers about promotion pop-ups (owner 2026-11-12):
 * - shown once per visit (sessionStorage), so it does not come back on every page;
 * - "Don't show this again" (localStorage) hides that promotion for good; a new promotion shows again.
 * Storage can be blocked (private mode): then the pop-up simply shows once per page load.
 */
const SEEN = "bookly-promo-seen";
const HIDDEN = "bookly-promo-hidden";

const read = (store: () => Storage, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};
const write = (store: () => Storage, key: string, value: string) => {
  try {
    store().setItem(key, value);
  } catch {
    // storage blocked
  }
};

export const promoStorage = {
  shouldShow: (id: number) => read(() => sessionStorage, SEEN) !== String(id) && read(() => localStorage, HIDDEN) !== String(id),
  markSeen: (id: number) => write(() => sessionStorage, SEEN, String(id)),
  hideForGood: (id: number) => write(() => localStorage, HIDDEN, String(id)),
};
