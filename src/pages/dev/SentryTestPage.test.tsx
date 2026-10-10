import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SentryTestPage, { triggerSentryTestError } from "./SentryTestPage";

describe("SentryTestPage", () => {
  it("renders heading and button", () => {
    render(<SentryTestPage />);
    expect(
      screen.getByRole("heading", { name: /sentry source map test/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /throw test error/i }),
    ).toBeInTheDocument();
  });

  it("triggerSentryTestError throws an uncaught error with timestamp", () => {
    expect(() => triggerSentryTestError()).toThrow(
      /sentry source map test \d{4}-\d{2}-\d{2}/i,
    );
  });
});
