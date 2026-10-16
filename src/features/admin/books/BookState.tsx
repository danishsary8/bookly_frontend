import {
  CalendarClock,
  CheckCircle2,
  EyeOff,
  FileText,
  Trash2,
} from "lucide-react";
import type { StaffBook } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";
import { formatShopDateTime, isFutureTime } from "@/lib/shopTime";

/** Live (on sale), scheduled, draft, or deleted: icon, fill style and text (MASTER §6.3). */
export function BookState({ book }: { book: StaffBook }) {
  if (book.deleted_at)
    return (
      <Badge tone="danger" shape="outline">
        <Trash2 aria-hidden="true" /> Deleted
      </Badge>
    );

  if (book.status === "draft")
    return (
      <Badge tone="neutral" shape="outline">
        <FileText aria-hidden="true" /> Draft
      </Badge>
    );

  // A scheduled book is live once its time has passed (the API decides visibility at read time).
  if (
    book.status === "scheduled" &&
    (!book.publish_at || isFutureTime(book.publish_at))
  ) {
    return (
      <Badge
        tone="warning"
        shape="tint"
        title={
          book.publish_at
            ? `Goes live ${formatShopDateTime(book.publish_at)} (Cambodia time)`
            : undefined
        }
      >
        <CalendarClock aria-hidden="true" /> Scheduled
        {book.publish_at ? ` (${formatShopDateTime(book.publish_at)})` : ""}
      </Badge>
    );
  }

  if (!book.is_visible)
    return (
      <Badge
        tone="neutral"
        shape="outline"
        title="Live but has no active formats"
      >
        <EyeOff aria-hidden="true" /> Hidden
      </Badge>
    );

  return (
    <Badge tone="success" shape="tint">
      <CheckCircle2 aria-hidden="true" /> Live
    </Badge>
  );
}
