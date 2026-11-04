import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { GiftOption } from "./GiftOption";

function Harness({ cod = true, khqr = true }: { cod?: boolean; khqr?: boolean }) {
  const [isGift, setIsGift] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <GiftOption isGift={isGift} onIsGiftChange={setIsGift} message={message} onMessageChange={setMessage} cashOnDelivery={cod} khqrAvailable={khqr} />
      <output data-testid="state">{JSON.stringify({ isGift, message })}</output>
    </>
  );
}

describe("Gift option at checkout", () => {
  it("is off until ticked, then asks for an optional message of at most 200 characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    const box = screen.getByRole("checkbox", { name: /This is a gift/ });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription(/Free\. We add your message/);
    expect(screen.queryByLabelText(/Gift message/)).not.toBeInTheDocument();

    await user.click(box);
    const message = screen.getByLabelText(/Gift message/);
    expect(message).toHaveAttribute("maxLength", "200");
    await user.type(message, "Happy birthday!");
    expect(screen.getByText("15/200")).toBeInTheDocument();
    expect(screen.getByTestId("state")).toHaveTextContent('{"isGift":true,"message":"Happy birthday!"}');
  });

  it("with cash on delivery, suggests KHQR to keep the price a surprise", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: /This is a gift/ }));
    expect(screen.getByText(/pay now with Bakong KHQR/)).toBeInTheDocument();
    unmount();

    renderWithProviders(<Harness cod={false} />);
    await user.click(screen.getByRole("checkbox", { name: /This is a gift/ }));
    expect(screen.queryByText(/person receiving it pays/)).not.toBeInTheDocument();
  });
});
