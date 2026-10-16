import { describe, expect, it } from "vitest";
import type { StaffBook } from "@/api/endpoints/staff";
import { bookDefaults, bookSchema, toBookInput } from "./bookSchema";

const scheduled = (publishAt: string) =>
  ({
    id: 1,
    title: "Book",
    status: "scheduled",
    publish_at: publishAt,
    authors: [],
    categories: [],
    language: "English",
  }) as unknown as StaffBook;

describe("book form schedule", () => {
  it("loads and saves the time in Cambodia time", () => {
    const values = bookDefaults(scheduled("2099-01-01T02:00:00Z"));
    expect(values.publish_at).toBe("2099-01-01T09:00");
    expect(toBookInput(values, true).publish_at).toBe(
      "2099-01-01T09:00:00+07:00",
    );
  });

  it("lets an already-passed schedule stay when it isn't changed, but not a new past time", () => {
    const values = bookDefaults(scheduled("2020-01-01T02:00:00Z"));
    expect(bookSchema.safeParse(values).success).toBe(true);
    expect(
      bookSchema.safeParse({ ...values, publish_at: "2020-01-02T09:00" })
        .success,
    ).toBe(false);
    expect(
      bookSchema.safeParse({ ...values, publish_at: "2099-01-02T09:00" })
        .success,
    ).toBe(true);
  });
});
