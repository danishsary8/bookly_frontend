import { afterEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { setLanguage } from "@/i18n";
import { renderWithProviders } from "@/test/render";
import { FreeShippingBar } from "./FreeShippingBar";

/* The bar's words come from en.ts / km.ts (`freeShipping`), not from the component. */
afterEach(() => setLanguage("en"));

describe("FreeShippingBar", () => {
  it("says how much more is needed, then that delivery is free", () => {
    const { rerender } = renderWithProviders(<FreeShippingBar subtotalUsd="47.00" thresholdUsd="50.00" />);
    expect(screen.getByRole("region", { name: "Free delivery progress" })).toHaveTextContent("Add $3.00 more for FREE delivery (orders over $50.00)");
    rerender(<FreeShippingBar subtotalUsd="52.00" thresholdUsd="50.00" />);
    expect(screen.getByText("You've unlocked FREE delivery! 🎉")).toBeInTheDocument();
  });

  it("speaks Khmer", () => {
    setLanguage("km");
    renderWithProviders(<FreeShippingBar subtotalUsd="47.00" thresholdUsd="50.00" />);
    expect(screen.getByRole("region", { name: "ការរីកចម្រើនឆ្ពោះទៅការដឹកជញ្ជូនឥតគិតថ្លៃ" })).toHaveTextContent(/បន្ថែម \$3\.00 ទៀត/);
  });
});
