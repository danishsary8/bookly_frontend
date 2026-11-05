import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { ratingsApi } from "@/api/endpoints/ratings";
import { StarRatingInput } from "@/components/ratings/StarRatingInput";
import { StoreRatingBadge } from "@/components/ratings/StoreRatingBadge";
import { OrderRatingForm } from "./OrderRatingForm";

afterEach(() => vi.restoreAllMocks());
it("provides a labelled keyboard radio group with 44px targets", async () => {
  const change = vi.fn();
  const user = userEvent.setup();
  renderWithProviders(<StarRatingInput value={3} onChange={change} />);
  expect(screen.getByRole("radiogroup")).toHaveAccessibleName();
  const radios = screen.getAllByRole("radio");
  expect(radios).toHaveLength(5);
  radios[2].focus();
  await user.keyboard("{ArrowRight}");
  expect(change).toHaveBeenCalledWith(4);
  expect(radios[0].closest("label")).toHaveClass("size-11");
});
it("hides store proof below ten and shows real average/count at ten", async () => {
  const store = vi.spyOn(ratingsApi, "store").mockResolvedValue({ average: 4.8, count: 9 });
  const view = renderWithProviders(<StoreRatingBadge />);
  await waitFor(() => expect(store).toHaveBeenCalled());
  expect(screen.queryByText(/orders rated/)).not.toBeInTheDocument();
  store.mockResolvedValue({ average: 4.8, count: 10 });
  await view.queryClient.invalidateQueries({ queryKey: ["store-rating"] });
  expect(await screen.findByText("★ 4.8 · 10 orders rated")).toBeInTheDocument();
});
it("saves selected stars and plain comment", async () => {
  vi.spyOn(ratingsApi, "own").mockResolvedValue(null);
  const save = vi.spyOn(ratingsApi, "save").mockResolvedValue({ stars: 4 });
  const user = userEvent.setup();
  renderWithProviders(<OrderRatingForm orderId={7} />);
  const radios = await screen.findAllByRole("radio");
  await user.click(radios[3].closest("label")!);
  await user.type(screen.getByLabelText("Comment (optional)"), "Arrived safely");
  await user.click(screen.getByRole("button", { name: "Save rating" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(7, { stars: 4, comment: "Arrived safely" }, false));
});
