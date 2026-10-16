import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "./JsonLd";

describe("JsonLd", () => {
  it("injects a script tag with application/ld+json into document head and cleans up on unmount", () => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "Book",
      name: "The Mekong Letters",
      offers: {
        "@type": "Offer",
        price: "25.00",
        priceCurrency: "USD",
      },
    };

    const { unmount } = render(<JsonLd data={payload} />);

    const script = document.head.querySelector('script[data-testid="json-ld-script"]');
    expect(script).not.toBeNull();
    expect(script?.getAttribute("type")).toBe("application/ld+json");
    expect(JSON.parse(script?.textContent || "{}")).toEqual(payload);

    unmount();
    expect(document.head.querySelector('script[data-testid="json-ld-script"]')).toBeNull();
  });
});
