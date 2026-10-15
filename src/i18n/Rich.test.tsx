import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Rich } from "./Rich";

function renderRich(text: string) {
  return render(
    <BrowserRouter>
      <Rich text={text} />
    </BrowserRouter>,
  );
}

describe("Rich component link pattern", () => {
  it("renders safe internal route as a link", () => {
    renderRich("Visit [your account](/account) today");
    const link = screen.getByRole("link", { name: "your account" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/account");
  });

  it("renders protocol-relative //evil.com as plain text without link", () => {
    const { container } = renderRich("Visit [malicious](//evil.com)");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("[malicious](//evil.com)");
  });

  it("renders backslash /\\evil.com as plain text without link", () => {
    const { container } = renderRich("Visit [malicious](/\\evil.com)");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("[malicious](/\\evil.com)");
  });
});
