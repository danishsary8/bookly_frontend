import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeEach } from "vitest";

beforeEach(async () => {
  // Import after test mocks are registered; keep api.get/post available for spies.
  const { http } = await import("@/api/client");
  const { ApiError } = await import("@/api/errors");
  http.defaults.adapter = async (config) => {
    if (config.method === "get" && config.url === "/auth/options") {
      return { data: { telegram: false }, status: 200, statusText: "OK", headers: {}, config };
    }

    throw new ApiError({
      kind: "unexpected",
      message: `Unstubbed API request: ${(config.method ?? "get").toUpperCase()} ${config.url}. Stub the api method with vi.spyOn or provide a test Axios adapter.`,
    });
  };
});

// Animations finish instantly in tests, as they do for reduced-motion visitors.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => cleanup());

// jsdom lacks these browser APIs that Radix and Motion use.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class StubObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.ResizeObserver ??= StubObserver as unknown as typeof ResizeObserver;
window.IntersectionObserver ??= StubObserver as unknown as typeof IntersectionObserver;
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;
