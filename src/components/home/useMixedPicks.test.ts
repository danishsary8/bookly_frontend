import { describe, expect, it } from "vitest";
import type { BookCard } from "@/api/types";
import { interleave } from "./useMixedPicks";

const b = (id: number) => ({ id, title: `Book ${id}` }) as BookCard;

describe("interleave", () => {
  it("takes one book from each lane per round", () => {
    expect(interleave([[b(1), b(2)], [b(10), b(11)], [b(20)]], 10).map((x) => x.id)).toEqual([1, 10, 20, 2, 11]);
  });

  it("skips books already taken and stops at the limit", () => {
    expect(interleave([[b(1), b(2), b(3)], [b(1), b(4)]], 3).map((x) => x.id)).toEqual([1, 2, 4]);
  });

  it("returns nothing for no lanes", () => {
    expect(interleave([], 5)).toEqual([]);
  });
});
