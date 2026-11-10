import { z } from "@/lib/zodConfig";
import type { BookInput, StaffBook } from "@/api/endpoints/staff";
import { fromShopInput, shopInputDate, toShopInput } from "@/lib/shopTime";

/* Client rules for the book form, mirroring Staff\Catalog\BookController::validated. */

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max),
      message,
    );

export const bookSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter the title.")
      .max(255, "Keep the title under 255 characters."),
    status: z.enum(["draft", "scheduled", "live"]),
    /** Shop time (Cambodia), "YYYY-MM-DDTHH:mm". */
    publish_at: z.string().optional(),
    /** The schedule as saved; a time that already passed may stay when it is not changed. */
    saved_publish_at: z.string(),
    author_ids: z.array(z.number()),
    category_ids: z.array(z.number()),
    publisher_id: z.string(),
    series_id: z.string(),
    series_order: optionalInt(1, 32767, "Use a whole number from 1."),
    language: z.string().trim().min(1, "Enter the language.").max(50),
    page_count: optionalInt(1, 100000, "Use a whole number of pages."),
    // Who the book is for (all optional): reader age, Khmer school grade, English level.
    age_min: optionalInt(0, 18, "Use an age from 0 to 18."),
    age_max: optionalInt(0, 18, "Use an age from 0 to 18."),
    school_grade: z.string(),
    // Reader rating from a public source (optional): shown on the storefront, labelled, until customers review.
    reader_rating: z.string().trim().refine((v) => v === "" || (/^\d(\.\d)?$/.test(v) && Number(v) >= 1 && Number(v) <= 5), "Use a score from 1.0 to 5.0."),
    reader_rating_source: z.string().trim().max(60),
    level: z.string(),
    publish_date: z.string(),
    description: z
      .string()
      .max(20000, "Keep the description under 20,000 characters."),
  })
  .refine((data) => data.age_min === "" || data.age_max === "" || Number(data.age_max) >= Number(data.age_min), {
    message: "The oldest age can't be below the youngest.",
    path: ["age_max"],
  })
  .refine(
    (data) => {
      if (data.status === "scheduled") {
        if (!data.publish_at || data.publish_at.trim() === "") return false;
        const date = shopInputDate(data.publish_at);
        if (Number.isNaN(date.getTime())) return false;
        return (
          data.publish_at === data.saved_publish_at ||
          date.getTime() > Date.now()
        );
      }
      return true;
    },
    {
      message: "Pick a date and time in the future (Cambodia time).",
      path: ["publish_at"],
    },
  );

export type BookValues = z.infer<typeof bookSchema>;

export const bookDefaults = (book?: StaffBook | null): BookValues => ({
  title: book?.title ?? "",
  status: book?.status ?? "draft",
  publish_at: toShopInput(book?.publish_at),
  saved_publish_at:
    book?.status === "scheduled" ? toShopInput(book.publish_at) : "",
  author_ids: book?.authors.map((a) => a.id) ?? [],
  category_ids: book?.categories.map((c) => c.id!).filter(Boolean) ?? [],
  publisher_id: book?.publisher_id ? String(book.publisher_id) : "",
  series_id: book?.series_id ? String(book.series_id) : "",
  series_order: book?.series_order ? String(book.series_order) : "",
  language: book?.language ?? "English",
  page_count: book?.page_count ? String(book.page_count) : "",
  age_min: book?.age_min != null ? String(book.age_min) : "",
  age_max: book?.age_max != null ? String(book.age_max) : "",
  school_grade: book?.school_grade != null ? String(book.school_grade) : "",
  reader_rating: (book as { reader_rating?: number | string | null } | undefined)?.reader_rating != null ? String((book as { reader_rating?: number | string | null }).reader_rating) : "",
  reader_rating_source: (book as { reader_rating_source?: string | null } | undefined)?.reader_rating_source ?? "",
  level: book?.level ?? "",
  publish_date: book?.publish_date ?? "",
  description: book?.description ?? "",
});

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export const toBookInput = (
  v: BookValues,
  isAdmin: boolean = false,
): BookInput => {
  const input: BookInput = {
    title: v.title.trim(),
    author_ids: v.author_ids,
    category_ids: v.category_ids,
    publisher_id: numOrNull(v.publisher_id),
    series_id: numOrNull(v.series_id),
    series_order: v.series_id ? numOrNull(v.series_order) : null,
    language: v.language.trim(),
    page_count: numOrNull(v.page_count),
    age_min: numOrNull(v.age_min),
    age_max: numOrNull(v.age_max),
    school_grade: numOrNull(v.school_grade),
    reader_rating: v.reader_rating ? Number(v.reader_rating) : null,
    reader_rating_source: v.reader_rating ? v.reader_rating_source.trim() || "Goodreads" : null,
    level: v.level || null,
    publish_date: v.publish_date || null,
    description: v.description.trim() || null,
  };
  if (isAdmin) {
    input.status = v.status;
    input.publish_at =
      v.status === "scheduled" && v.publish_at
        ? fromShopInput(v.publish_at)
        : null;
  }
  return input;
};
