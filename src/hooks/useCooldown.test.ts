import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCooldown } from "./useCooldown";

afterEach(() => vi.useRealTimers());

describe("useCooldown", () => {
  it("counts down to zero once started", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCooldown());
    expect(result.current.remaining).toBe(0);
    act(() => result.current.start(2.2));
    expect(result.current.remaining).toBe(3);
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(0);
  });
});
