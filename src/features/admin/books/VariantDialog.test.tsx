import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { VariantDialog } from "./VariantDialog";

describe("price suggestion", () => {
  it("changes only the unsaved price after the staff member clicks", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VariantDialog bookId={1} variant={null} usedFormats={[]} open onOpenChange={() => {}} onSaved={() => {}} />);
    const input = screen.getByLabelText("Price (USD)");
    await user.type(input, "12.50");
    expect(input).toHaveValue("12.50");
    expect(screen.getByText("Prices ending in .99 sell better")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Make it $12.99" }));
    expect(input).toHaveValue("12.99");
  });
});
