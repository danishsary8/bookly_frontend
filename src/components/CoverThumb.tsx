import { useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Small decorative cover for list rows (live search, cart lines). Falls back to
 * a book icon on the --surface-2 block when there is no image or it fails to
 * load, so a broken-image glyph never shows. Sized by className (2:3).
 */
export function CoverThumb({ src, className }: { src?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-[2px] bg-surface-2", className)}>
      {showImage ? (
        <img src={src!} alt="" loading="lazy" decoding="async" onError={() => setFailedSrc(src ?? null)} className="size-full object-cover" />
      ) : (
        <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}
