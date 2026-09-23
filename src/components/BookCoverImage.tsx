import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

interface BookCoverImageProps {
  src?: string | null;
  alt: string;
  author?: string;
  className?: string;
  iconClassName?: string;
}

const buildFallbackCover = (title: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f8efe4" />
          <stop offset="100%" stop-color="#ead8bf" />
        </linearGradient>
      </defs>
      <rect width="300" height="420" rx="28" fill="url(#bg)" />
      <rect x="24" y="24" width="252" height="372" rx="22" fill="rgba(255,255,255,0.52)" />
      <text x="40" y="180" fill="#523a28" font-size="26" font-family="Georgia, serif" font-weight="700">
        ${title.slice(0, 24).replace(/[&<>"]/g, "")}
      </text>
      <text x="40" y="222" fill="#7a614a" font-size="14" font-family="Arial, sans-serif" letter-spacing="2">
        BOOKLY EDITION
      </text>
    </svg>
  `)}`;

const isAbsoluteImageSrc = (value: string) =>
  /^(?:https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
const coverLookupCache = new Map<string, string | null>();
const legacyBookCoverMap: Record<string, string> = {
  "grapes_of_wrath.jpg": "https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Grapes_of_Wrath_%281939_1st_ed_cover%29.jpg",
  "love_cholera.jpg": "https://covers.openlibrary.org/b/olid/OL51478818M-L.jpg",
  "roger_ackroyd.jpg": "https://covers.openlibrary.org/b/olid/OL24927382M-L.jpg",
  "and_then_there_were_none.jpg": "https://upload.wikimedia.org/wikipedia/commons/9/94/81nChcVy7CL._AC_UF1000%2C1000_QL80.jpg",
  "steve_jobs.jpg": "https://covers.openlibrary.org/b/olid/OL27193250M-L.jpg",
};

const isLegacyFilename = (value: string) =>
  !isAbsoluteImageSrc(value) && !value.includes("/") && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(value);

const resolveBookImageSrc = (src?: string | null) => {
  const trimmedSrc = src?.trim();
  if (!trimmedSrc) {
    return "";
  }

  if (isAbsoluteImageSrc(trimmedSrc)) {
    return trimmedSrc;
  }

  const normalizedPath = trimmedSrc.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const mappedLegacyCover = legacyBookCoverMap[normalizedPath.toLowerCase()];
  if (mappedLegacyCover) {
    return mappedLegacyCover;
  }

  const imageBaseUrl = (import.meta.env.VITE_BOOK_IMAGE_BASE_URL || import.meta.env.VITE_API_BASE_URL || "").trim();

  return imageBaseUrl ? joinUrl(imageBaseUrl, normalizedPath) : normalizedPath;
};

const lookupOpenLibraryCover = async (title: string, author?: string) => {
  const queryKey = `${title.trim().toLowerCase()}::${(author || "").trim().toLowerCase()}`;
  if (coverLookupCache.has(queryKey)) {
    return coverLookupCache.get(queryKey) ?? null;
  }

  const params = new URLSearchParams({
    title,
    limit: "5",
    fields: "cover_i,title,author_name",
  });

  if (author?.trim()) {
    params.set("author", author.trim());
  }

  try {
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (!response.ok) {
      coverLookupCache.set(queryKey, null);
      return null;
    }

    const payload = await response.json() as {
      docs?: Array<{ cover_i?: number; title?: string; author_name?: string[] }>;
    };

    const docWithCover = payload.docs?.find((doc) => typeof doc.cover_i === "number");
    const coverUrl = docWithCover?.cover_i
      ? `https://covers.openlibrary.org/b/id/${docWithCover.cover_i}-L.jpg`
      : null;

    coverLookupCache.set(queryKey, coverUrl);
    return coverUrl;
  } catch {
    coverLookupCache.set(queryKey, null);
    return null;
  }
};

const BookCoverImage = ({ src, alt, author, className = "", iconClassName = "h-10 w-10" }: BookCoverImageProps) => {
  const fallbackSrc = useMemo(() => buildFallbackCover(alt), [alt]);
  const resolvedSrc = useMemo(() => resolveBookImageSrc(src), [src]);
  const [imageSrc, setImageSrc] = useState(resolvedSrc || fallbackSrc);
  const [failed, setFailed] = useState(!resolvedSrc);
  const [hasTriedLookup, setHasTriedLookup] = useState(false);
  const shouldLookupCover = useMemo(() => {
    const trimmedSrc = src?.trim();
    return Boolean(trimmedSrc && isLegacyFilename(trimmedSrc));
  }, [src]);

  useEffect(() => {
    if (resolvedSrc) {
      setImageSrc(resolvedSrc);
      setFailed(false);
    } else {
      setImageSrc(fallbackSrc);
      setFailed(true);
    }

    setHasTriedLookup(false);
  }, [fallbackSrc, resolvedSrc]);

  useEffect(() => {
    if (!shouldLookupCover || !failed || hasTriedLookup) {
      return;
    }

    let active = true;
    setHasTriedLookup(true);

    void lookupOpenLibraryCover(alt, author).then((coverUrl) => {
      if (!active || !coverUrl) {
        return;
      }

      setImageSrc(coverUrl);
      setFailed(false);
    });

    return () => {
      active = false;
    };
  }, [alt, author, failed, hasTriedLookup, shouldLookupCover]);

  return (
    <>
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onError={() => {
          if (shouldLookupCover && !hasTriedLookup) {
            setFailed(true);
            return;
          }

          setFailed(true);
          setImageSrc(fallbackSrc);
        }}
      />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-white/80 p-3 shadow-sm">
            <BookOpen className={`text-slate-500 ${iconClassName}`} />
          </div>
        </div>
      )}
    </>
  );
};

export default BookCoverImage;
