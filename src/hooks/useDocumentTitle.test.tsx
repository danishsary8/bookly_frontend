import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { useDocumentTitle, type PageMeta } from "./useDocumentTitle";

function Page({ title, meta }: { title: string; meta?: PageMeta }) {
  useDocumentTitle(title, meta);
  return null;
}
const head = (selector: string, attr = "content") => document.head.querySelector(selector)?.getAttribute(attr) ?? null;

describe("useDocumentTitle", () => {
  it("sets the title, a trimmed description, share tags and the canonical link", () => {
    render(<Page title="Emma" meta={{ description: `A novel. ${"word ".repeat(60)}`, image: "https://cdn.example/emma.jpg" }} />);
    expect(document.title).toBe("Emma · Bookly");
    expect(head('meta[name="description"]')!.length).toBeLessThanOrEqual(160);
    expect(head('meta[name="description"]')).toMatch(/…$/);
    expect(head('meta[property="og:title"]')).toBe("Emma · Bookly");
    expect(head('meta[property="og:image"]')).toBe("https://cdn.example/emma.jpg");
    expect(head('link[rel="canonical"]', "href")).toBe(window.location.origin + window.location.pathname);
    expect(head('meta[name="robots"]')).toBeNull();
  });

  it("keeps private pages out of search results and drops the old cover", () => {
    render(<Page title="Search: emma" meta={{ noindex: true }} />);
    expect(head('meta[name="robots"]')).toBe("noindex");
    expect(head('link[rel="canonical"]', "href")).toBeNull();
    expect(head('meta[property="og:image"]')).not.toBe("https://cdn.example/emma.jpg");
  });
});
