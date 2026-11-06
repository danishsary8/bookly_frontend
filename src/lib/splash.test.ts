import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissSplash, SPLASH_SEEN_KEY } from "./splash";

const mount = () => {
  document.body.innerHTML =
    '<div id="splash"><span data-splash-name></span><p data-splash-tagline></p></div>';
};

describe("dismissSplash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mount();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.removeAttribute("data-splash");
    document.documentElement.removeAttribute("data-splash-still");
  });

  it("removes the splash at once when the boot script did not switch it on", () => {
    dismissSplash();
    expect(document.getElementById("splash")).toBeNull();
  });

  it("fills the tagline, remembers the visit and leaves after the opening", () => {
    document.documentElement.setAttribute("data-splash", "light");
    dismissSplash();
    expect(document.querySelector("[data-splash-tagline]")?.textContent).toBe("Find comfort in every page.");
    expect(sessionStorage.getItem(SPLASH_SEEN_KEY)).toBe("1");
    vi.advanceTimersByTime(7000);
    expect(document.getElementById("splash")).toBeNull();
    expect(document.documentElement.hasAttribute("data-splash")).toBe(false);
  });

  it("skips on a key press", () => {
    document.documentElement.setAttribute("data-splash", "dark");
    dismissSplash();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("splash")?.classList.contains("is-leaving")).toBe(true);
  });
});
