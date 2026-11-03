import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/* Reduced motion must still keep each word whole, so a Khmer word like ទូទាំង never breaks across two lines. */

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

const { default: BlurText } = await import("./BlurText");

afterEach(() => vi.restoreAllMocks());

describe("BlurText with reduced motion", () => {
  it("keeps every word in an unbreakable span and the full text for screen readers", () => {
    const { container } = render(<BlurText as="span" text="សៀវភៅ ដឹកជូន ទូទាំងប្រទេសកម្ពុជា" />);
    const words = [...container.querySelectorAll<HTMLSpanElement>('[aria-hidden="true"] span[style]')];
    expect(words.map((w) => w.textContent)).toEqual(["សៀវភៅ", "ដឹកជូន", "ទូទាំងប្រទេសកម្ពុជា"]);
    words.forEach((w) => expect(w.style.whiteSpace).toBe("nowrap"));
    expect(container.querySelector(".sr-only")).toHaveTextContent("សៀវភៅ ដឹកជូន ទូទាំងប្រទេសកម្ពុជា");
  });
});
