import { CalendarClock, CheckCircle2, EyeOff, FileText, Trash2 } from "lucide-react";
import type { StaffBook } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";

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

  if (book.status === "scheduled") {
    const formatted = book.publish_at ? new Date(book.publish_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
    return (
      <Badge tone="warning" shape="tint" title={book.publish_at ? `Publishes ${book.publish_at}` : undefined}>
        <CalendarClock aria-hidden="true" /> Scheduled{formatted ? ` (${formatted})` : ""}
      </Badge>
    );
  }

  if (!book.is_visible)
    return (
      <Badge tone="neutral" shape="outline" title="Live but has no active formats">
        <EyeOff aria-hidden="true" /> Hidden
      </Badge>
    );

  return (
    <Badge tone="success" shape="tint">
      <CheckCircle2 aria-hidden="true" /> Live
    </Badge>
  );
}
