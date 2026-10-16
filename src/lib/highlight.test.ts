import { describe, expect, it } from "vitest";
import { highlightParts } from "./highlight";

describe("highlightParts", () => {
  it("marks each matched word, ignoring case", () => {
    expect(highlightParts("Harry Potter and the Philosopher's Stone", "harry po")).toEqual([
      { text: "Harry", match: true },
      { text: " ", match: false },
      { text: "Po", match: true },
      { text: "tter and the Philosopher's Stone", match: false },
    ]);
  });

  it("returns the text unmarked for an empty query", () => {
    expect(highlightParts("Dune", "  ")).toEqual([{ text: "Dune", match: false }]);
  });

  it("treats regex characters literally", () => {
    expect(highlightParts("C++ Primer (5th)", "c++ (5")).toEqual([
      { text: "C++", match: true },
      { text: " Primer ", match: false },
      { text: "(5", match: true },
      { text: "th)", match: false },
    ]);
  });

  it("handles Khmer queries with zero-width spaces", () => {
    expect(highlightParts("រឿងព្រេងបុរាណ", "ព្រេង\u200B")).toEqual([
      { text: "រឿង", match: false },
      { text: "ព្រេង", match: true },
      { text: "បុរាណ", match: false },
    ]);
  });
});
