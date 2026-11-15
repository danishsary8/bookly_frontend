import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

/* Light is the default (owner 2026-11-15); only a theme picked with the switch is remembered. */
function Probe() {
  const { theme, toggleTheme } = useTheme();
  return <button type="button" onClick={toggleTheme}>{theme}</button>;
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});

describe("theme", () => {
  it("opens in light even when the device prefers dark or an old automatic value is stored", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
    localStorage.setItem("bookly-theme", "dark");
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("bookly-theme-choice")).toBeNull();
  });

  it("remembers a theme picked with the switch", () => {
    const first = render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => screen.getByRole("button").click());
    expect(localStorage.getItem("bookly-theme-choice")).toBe("dark");
    first.unmount();
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("dark");
  });
});
