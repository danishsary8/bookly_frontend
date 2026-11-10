/*
 * "Add to cart" morph: a copy of the book's cover lifts off the page, arcs up to the header's cart button
 * and shrinks into it (rectangle → round chip), then the cart button gives a small bounce.
 *
 * The source is the cover nearest to the button that was pressed (the same card, row or panel), so callers
 * don't need to pass anything. Reduced motion, no cover or no visible cart button: nothing flies.
 * Web Animations API only (no layout reads after the first frame), and the copy is removed when it lands.
 */

let lastPress: { el: Element; at: number } | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element) lastPress = { el: event.target, at: performance.now() };
  }, { capture: true, passive: true });
}

/** The element that triggered the current action: the last press if it was just now, else the focused element. */
const trigger = (): Element | null => {
  if (lastPress && performance.now() - lastPress.at < 1500 && lastPress.el.isConnected) return lastPress.el;
  return document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
};

/** The visible cover image closest to `from`: walks up a few ancestors and takes the first sized <img> inside. */
const findCover = (from: Element | null): HTMLImageElement | null => {
  let node: Element | null = from;
  for (let depth = 0; node && depth < 7; depth++, node = node.parentElement) {
    const explicit = node.querySelector<HTMLImageElement>("[data-fly-cover] img, img[data-fly-cover]");
    const img = explicit ?? node.querySelector<HTMLImageElement>("img:not([aria-hidden='true'])");
    if (img && img.complete && img.naturalWidth > 0 && img.getBoundingClientRect().width > 24) return img;
  }
  return null;
};

const cartTarget = (): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).find((el) => el.getBoundingClientRect().width > 0) ?? null;

export function flyToCart(source: Element | null = trigger()) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const img = findCover(source);
  const target = cartTarget();
  if (!img || !target || typeof img.animate !== "function") return;

  const from = img.getBoundingClientRect();
  // The header tucks itself away while scrolling down: ask it back, and aim where the cart button will be.
  window.dispatchEvent(new Event("bookly:header-peek"));
  const header = target.closest<HTMLElement>("header");
  const tucked = header ? Math.min(0, header.getBoundingClientRect().top) : 0;
  const raw = target.getBoundingClientRect();
  const to = { left: raw.left, top: raw.top - tucked, width: raw.width, height: raw.height };
  // Off screen (scrolled away): no flight.
  if (from.bottom < 0 || from.top > window.innerHeight) return;

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    zIndex: "200",
    pointerEvents: "none",
    willChange: "transform",
  });
  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "100%",
    height: "100%",
    backgroundImage: `url("${img.currentSrc || img.src}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius: "6px",
    boxShadow: "0 24px 40px -18px rgb(10 16 60 / 0.55)",
    transformOrigin: "50% 50%",
    willChange: "transform, border-radius, opacity",
  });
  ghost.appendChild(card);
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // Ends as a chip the size of the cart icon.
  const end = Math.max(0.06, 26 / Math.max(from.width, from.height));
  const duration = Math.min(1000, 640 + Math.hypot(dx, dy) * 0.25);

  // Two layers give a curved path: the outer one travels sideways at an even pace,
  // the inner one rises first and then drops into the cart, while it shrinks and rounds.
  const across = ghost.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], {
    duration,
    easing: "cubic-bezier(0.45, 0, 0.25, 1)",
    fill: "forwards",
  });
  card.animate(
    [
      { transform: "translateY(0) scale(1) rotate(0deg)", borderRadius: "6px", opacity: 1, offset: 0 },
      { transform: "translateY(-18px) scale(1.06) rotate(-5deg)", borderRadius: "8px", opacity: 1, offset: 0.16 },
      { transform: `translateY(${dy * 0.55 - 40}px) scale(${(1 + end) / 2.2}) rotate(8deg)`, borderRadius: "24%", opacity: 1, offset: 0.62 },
      { transform: `translateY(${dy}px) scale(${end}) rotate(0deg)`, borderRadius: "50%", opacity: 0.35, offset: 1 },
    ],
    { duration, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" },
  );
  across.onfinish = () => {
    ghost.remove();
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.22) rotate(-8deg)" }, { transform: "scale(0.94)" }, { transform: "scale(1)" }],
      { duration: 480, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
  };
  across.oncancel = () => ghost.remove();
}
