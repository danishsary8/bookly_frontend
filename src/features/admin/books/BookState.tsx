import { CheckCircle2, EyeOff, Trash2 } from "lucide-react";
import type { StaffBook } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";

/** Live (on sale), hidden (no active format yet) or deleted: icon, fill style and text (MASTER §6.3). */
export function BookState({ book }: { book: StaffBook }) {
  if (book.deleted_at)
    return (
      <Badge tone="danger" shape="outline">
        <Trash2 aria-hidden="true" /> Deleted
      </Badge>
    );
  if (!book.is_visible)
    return (
      <Badge tone="neutral" shape="outline">
        <EyeOff aria-hidden="true" /> Hidden
      </Badge>
    );
  return (
    <Badge tone="success" shape="tint">
      <CheckCircle2 aria-hidden="true" /> Live
    </Badge>
  );
}
