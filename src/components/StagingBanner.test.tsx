import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IS_STAGING, StagingBanner } from "./StagingBanner";

describe("staging bar", () => {
  it("is off unless the build says staging", () => {
    expect(IS_STAGING).toBe(false);
    const { container } = render(<StagingBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tells visitors the staging site is not the real shop", () => {
    render(<StagingBanner show />);
    expect(screen.getByRole("note")).toHaveTextContent("Staging site: test data only. Orders and emails here are not real.");
  });
});
