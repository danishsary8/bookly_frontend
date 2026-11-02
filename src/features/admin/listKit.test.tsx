import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableCard } from "./listKit";

/* A wide table with no link or button inside must still be scrollable from the keyboard (axe "scrollable-region-focusable"). */

const rows = (
  <tbody>
    <tr>
      <td>Signed in</td>
    </tr>
  </tbody>
);

describe("TableCard", () => {
  it("with a label: a named region keyboard users can focus to scroll", () => {
    render(<TableCard label="Sign-in history">{rows}</TableCard>);
    const region = screen.getByRole("region", { name: "Sign-in history" });
    expect(region).toHaveAttribute("tabindex", "0");
    region.focus();
    expect(region).toHaveFocus();
  });

  it("without a label: no extra tab stop (tables with links or buttons are reachable already)", () => {
    const { container } = render(<TableCard>{rows}</TableCard>);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute("tabindex");
  });
});
