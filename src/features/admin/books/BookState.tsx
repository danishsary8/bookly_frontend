import { useState } from "react";
import { CalendarClock, CheckCircle2, EyeOff, FileText, Trash2 } from "lucide-react";
import type { StaffBook } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";
import { trashDaysRemaining } from "@/features/admin/removal";

/** Live (on sale), scheduled, draft, or deleted: icon, fill style and text (MASTER §6.3). */
export function BookState({ book }: { book: StaffBook }) {
  const [now] = useState(() => Date.now());

  if (book.deleted_at) {
    const daysLeft = trashDaysRemaining(book.deleted_at, now);

    return (
      <Badge
        tone="danger"
        shape="outline"
        title={daysLeft > 0 ? `${daysLeft} days remaining to restore` : "Trash retention expired (over 30 days)"}
      >
        <Trash2 aria-hidden="true" /> Trash{daysLeft > 0 ? ` (${daysLeft}d)` : " (expired)"}
      </Badge>
    );
  }

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
