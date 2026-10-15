import { z } from "zod";
import type { BookInput, StaffBook } from "@/api/endpoints/staff";

/* Client rules for the book form, mirroring Staff\Catalog\BookController::validated. */

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), message);

export const bookSchema = z
  .object({
    title: z.string().trim().min(1, "Enter the title.").max(255, "Keep the title under 255 characters."),
    status: z.enum(["draft", "scheduled", "live"]),
    publish_at: z.string().optional(),
    author_ids: z.array(z.number()),
    category_ids: z.array(z.number()),
    publisher_id: z.string(),
    series_id: z.string(),
    series_order: optionalInt(1, 32767, "Use a whole number from 1."),
    language: z.string().trim().min(1, "Enter the language.").max(50),
    page_count: optionalInt(1, 100000, "Use a whole number of pages."),
    publish_date: z.string(),
    description: z.string().max(20000, "Keep the description under 20,000 characters."),
  })
  .refine(
    (data) => {
      if (data.status === "scheduled") {
        if (!data.publish_at || data.publish_at.trim() === "") return false;
        const date = new Date(data.publish_at);
        return !isNaN(date.getTime()) && date.getTime() > Date.now();
      }
      return true;
    },
    {
      message: "Scheduled books require a publish date and time in the future.",
      path: ["publish_at"],
    },
  );

export type BookValues = z.infer<typeof bookSchema>;

export const bookDefaults = (book?: StaffBook | null): BookValues => ({
  title: book?.title ?? "",
  status: book?.status ?? "draft",
  publish_at: book?.publish_at ? book.publish_at.slice(0, 16) : "",
  author_ids: book?.authors.map((a) => a.id) ?? [],
  category_ids: book?.categories.map((c) => c.id!).filter(Boolean) ?? [],
  publisher_id: book?.publisher_id ? String(book.publisher_id) : "",
  series_id: book?.series_id ? String(book.series_id) : "",
  series_order: book?.series_order ? String(book.series_order) : "",
  language: book?.language ?? "English",
  page_count: book?.page_count ? String(book.page_count) : "",
  publish_date: book?.publish_date ?? "",
  description: book?.description ?? "",
});

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export const toBookInput = (v: BookValues, isAdmin: boolean = false): BookInput => {
  const input: BookInput = {
    title: v.title.trim(),
    author_ids: v.author_ids,
    category_ids: v.category_ids,
    publisher_id: numOrNull(v.publisher_id),
    series_id: numOrNull(v.series_id),
    series_order: v.series_id ? numOrNull(v.series_order) : null,
    language: v.language.trim(),
    page_count: numOrNull(v.page_count),
    publish_date: v.publish_date || null,
    description: v.description.trim() || null,
  };
  if (isAdmin) {
    input.status = v.status;
    input.publish_at = v.status === "scheduled" && v.publish_at ? new Date(v.publish_at).toISOString() : null;
  }
  return input;
};
