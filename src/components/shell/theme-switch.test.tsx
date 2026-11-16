import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { renderWithProviders } from "@/test/render";
import { ThemeSwitch } from "./ThemeToggle";

it("phone menu Light / Dark switch shows the choice and switches the theme", async () => {
  renderWithProviders(<ThemeProvider><ThemeSwitch /></ThemeProvider>);
  const group = screen.getByRole("radiogroup", { name: "Appearance" });
  expect(group).toBeInTheDocument();
  const dark = screen.getByRole("radio", { name: "Dark" });
  const light = screen.getByRole("radio", { name: "Light" });
  if (light.getAttribute("aria-checked") !== "true") await userEvent.click(light);
  expect(light).toHaveAttribute("aria-checked", "true");
  await userEvent.click(dark);
  expect(dark).toHaveAttribute("aria-checked", "true");
  expect(document.documentElement).toHaveClass("dark");
  await userEvent.click(light);
  expect(light).toHaveAttribute("aria-checked", "true");
  expect(document.documentElement).not.toHaveClass("dark");
});
