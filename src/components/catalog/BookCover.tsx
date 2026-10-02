import { useState } from "react";
import { cn } from "@/lib/utils";

/*
 * 2:3 book cover. Without an image (or when it fails to load) it shows a flat
 * lapis-tint "cover" with the title in Gloock, so a grid never shows a broken
 * image or an empty grey box (MASTER §6.12).
 */

type BookCoverProps = {
  src?: string | null;
  title?: string;
  /** Alt text; empty for covers next to a visible title link. */
  alt?: string;
  eager?: boolean;
  sizes?: string;
  className?: string;
};

export function BookCover({ src, title = "", alt = "", eager = false, className }: BookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-[2px] bg-lapis-tint", className)}>
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          decoding="async"
          onError={() => setFailedSrc(src ?? null)}
          className="size-full object-cover"
        />
      ) : (
        <div role={alt ? "img" : undefined} aria-label={alt || undefined} className="flex size-full flex-col justify-center gap-2 border-l-2 border-primary/20 px-[12%] [container-type:inline-size]">
          <span aria-hidden="true" className="line-clamp-4 break-words font-display text-[clamp(0.85rem,10cqw,1.5rem)] leading-tight text-primary">
            {title}
          </span>
          <span aria-hidden="true" className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Bookly
          </span>
        </div>
      )}
    </div>
  );
}
