import { describe, expect, it } from "vitest";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { Segmented, TableCard } from "./listKit";

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

function Filters() {
  const [value, setValue] = useState("all");
  return <Segmented label="Status" value={value} options={[{ value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }]} onChange={setValue} />;
}

it("moves segmented filters with arrow keys, wraps, and supports Home and End", async () => {
  const user = userEvent.setup();
  render(<Filters />);
  await user.tab();
  expect(screen.getByRole("radio", { name: "All" })).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("radio", { name: "Pending" })).toHaveFocus();
  expect(screen.getByRole("radio", { name: "Pending" })).toHaveAttribute("aria-checked", "true");
  await user.keyboard("{End}{ArrowRight}");
  expect(screen.getByRole("radio", { name: "All" })).toHaveFocus();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("radio", { name: "Paid" })).toHaveFocus();
  await user.keyboard("{Home}");
  expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
});
