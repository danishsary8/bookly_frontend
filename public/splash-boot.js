/*
 * Runs before the app (plain script, no bundle) and decides whether the splash shows: once per browser tab.
 * It only sets attributes on <html>; the splash markup and styles live in index.html, the exit in src/lib/splash.ts.
 */
(function () {
  try {
    if (sessionStorage.getItem("bookly-splash-seen")) return;
    var root = document.documentElement;
    var theme = localStorage.getItem("bookly-theme");
    var dark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-splash", dark ? "dark" : "light");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) root.setAttribute("data-splash-still", "");
  } catch (e) {
    // Storage blocked: skip the splash.
  }
})();
