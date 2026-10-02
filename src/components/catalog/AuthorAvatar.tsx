import { useState } from "react";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((ch) => /\p{L}/u.test(ch))
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Author photo, or their initials in Gloock on lapis tint when there is none. Decorative (alt=""). */
export function AuthorAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-lapis-tint font-display text-primary", className)}>
      {photoUrl && !failed ? <img src={photoUrl} alt="" className="size-full object-cover" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  );
}
