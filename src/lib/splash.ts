import { brand } from "@/config/brand";
import { getLanguage, translations } from "@/i18n";

/*
 * The splash (markup + CSS in index.html, switched on by public/splash-boot.js) draws an open book in gold ink and sets the name letter by letter.
 * Once the app has rendered, this fills in the translated tagline, waits for the drawing and a short rest (it never holds
 * a ready app longer than that), then fades the splash out. A click, tap or key press skips it straight away.
 */
const OPEN_MS = 2450; // drawn and named by ~2.2s, then a short rest; with the exit about 3s in all
const STILL_MS = 300; // reduced motion: a short look at a static page
const EXIT_MS = 580;
export const SPLASH_SEEN_KEY = "bookly-splash-seen";

export function dismissSplash(): void {
  const root = document.documentElement;
  const el = document.getElementById("splash");
  if (!el) return;
  if (!root.hasAttribute("data-splash")) {
    el.remove();
    return;
  }

  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
  } catch {
    // Storage blocked: the splash simply shows again next time.
  }

  const lang = getLanguage();
  const name = el.querySelector("[data-splash-name]");
  const tagline = el.querySelector<HTMLElement>("[data-splash-tagline]");
  // The letters are already in the markup (each animates on its own); rebuild only if the brand name changed.
  if (name && name.textContent !== brand.name) {
    name.replaceChildren(
      ...Array.from(brand.name, (letter, i) => {
        const span = document.createElement("span");
        span.textContent = letter;
        span.style.setProperty("--i", String(i));
        return span;
      }),
    );
  }
  if (tagline) {
    tagline.textContent = translations[lang].splash.tagline;
    tagline.lang = lang;
  }
  const foot = el.querySelector<HTMLElement>("[data-splash-foot]");
  if (foot) {
    foot.textContent = translations[lang].splash.foot;
    foot.lang = lang;
  }

  const still = root.hasAttribute("data-splash-still");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    events.forEach((type) => window.removeEventListener(type, finish, true));
    el.classList.add("is-leaving");
    window.setTimeout(
      () => {
        el.remove();
        root.removeAttribute("data-splash");
        root.removeAttribute("data-splash-still");
      },
      still ? 0 : EXIT_MS,
    );
  };

  const events = ["pointerdown", "keydown"] as const;
  events.forEach((type) => window.addEventListener(type, finish, true));
  const timer = window.setTimeout(finish, Math.max(0, (still ? STILL_MS : OPEN_MS) - performance.now()));
}
