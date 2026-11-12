import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cleanEvent } from "@/lib/analyticsEvent";
import { VisitorAnalytics } from "./VisitorAnalytics";

describe("visitor statistics", () => {
  it("removes everything after ? and # before a page view is sent", () => {
    expect(cleanEvent({ type: "pageview", url: "https://shop.test/reset-password?email=dara%40example.com&code=123456#top" })).toEqual({
      type: "pageview",
      url: "https://shop.test/reset-password",
    });
    expect(cleanEvent({ type: "pageview", url: "https://shop.test/books/7" })?.url).toBe("https://shop.test/books/7");
  });

  it("does not count staff pages", () => {
    expect(cleanEvent({ type: "pageview", url: "https://shop.test/admin" })).toBeNull();
    expect(cleanEvent({ type: "pageview", url: "https://shop.test/admin/orders?status=paid" })).toBeNull();
    expect(cleanEvent({ type: "pageview", url: "https://shop.test/administration-guide" })?.url).toBe("https://shop.test/administration-guide");
  });

  it("loads nothing outside Vercel builds (local copies and tests)", () => {
    const { container } = render(<VisitorAnalytics />);
    expect(container).toBeEmptyDOMElement();
  });
});
