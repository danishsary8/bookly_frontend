import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AnimatedNumber } from "./AnimatedNumber";

const motion = vi.hoisted(() => ({ animate: vi.fn() }));
vi.mock("motion/react", async (original) => ({ ...await original<typeof import("motion/react")>(), animate: motion.animate, useReducedMotion: () => false }));
beforeEach(() => { motion.animate.mockReset().mockReturnValue({ stop: vi.fn() }); });

it("retargets a fast period change from the currently visible number instead of the previous target", () => {
  const format = (value: number) => value.toFixed(0);
  const view = render(<AnimatedNumber value={100} format={format} />);
  view.rerender(<AnimatedNumber value={200} format={format} />);
  const first = motion.animate.mock.calls[0][2] as { onUpdate: (value: number) => void };
  act(() => first.onUpdate(140));
  expect(screen.getByText("140")).toBeInTheDocument();
  view.rerender(<AnimatedNumber value={50} format={format} />);
  expect(motion.animate.mock.calls.at(-1)?.slice(0, 2)).toEqual([140, 50]);
});
