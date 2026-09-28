import { useMemo, useState, type SyntheticEvent } from "react";
import { BookOpen } from "lucide-react";

interface BookCoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Covers below this in either dimension are treated as missing. Real covers in
 * the catalogue are 198x255 at the smallest, while tracking pixels and "no cover
 * available" placeholders are 1x1, so there is a wide margin between the two.
 */
const MIN_COVER_DIMENSION = 32;

// Cloudinary delivery URLs are commonly returned with an immutable cache
// policy. A single cache key per page load keeps the database book_img value
// authoritative while ensuring an overwritten Cloudinary asset is fetched
// again after a refresh.
const IMAGE_CACHE_BUSTER = Date.now().toString();

// Missing-cover placeholder (MASTER: flat lapis-tint "cover" with lapis type; no cream,
// no gradient). SVG data URIs can't read CSS variables, so the Daylight token hexes are inlined.
const buildFallbackCover = (title: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <rect width="300" height="450" fill="#E6E9F8" />
      <rect x="18" y="0" width="2" height="450" fill="#14207A" opacity="0.18" />
      <text x="40" y="190" fill="#14207A" font-size="26" font-family="Gloock, Georgia, serif">
        ${title.slice(0, 24).replace(/[&<>"]/g, "")}
      </text>
      <text x="40" y="226" fill="#4C5378" font-size="12" font-family="Hanken Grotesk, Arial, sans-serif" letter-spacing="3">
        BOOKLY
      </text>
    </svg>
  `)}`;

const isAbsoluteImageSrc = (value: string) =>
  /^(?:https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");

const isCloudinaryUrl = (value: string) =>
  /^https?:\/\/res\.cloudinary\.com\//i.test(value);

const addCloudinaryCacheBuster = (value: string) => {
  if (!isCloudinaryUrl(value)) {
    return value;
  }

  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}bookly_cb=${IMAGE_CACHE_BUSTER}`;
};

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const legacyBookCoverMap: Record<string, string> = {
  "grapes_of_wrath.jpg": "https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Grapes_of_Wrath_%281939_1st_ed_cover%29.jpg",
  "love_cholera.jpg": "https://covers.openlibrary.org/b/olid/OL51478818M-L.jpg",
  "roger_ackroyd.jpg": "https://covers.openlibrary.org/b/olid/OL24927382M-L.jpg",
  "and_then_there_were_none.jpg": "https://upload.wikimedia.org/wikipedia/commons/9/94/81nChcVy7CL._AC_UF1000%2C1000_QL80.jpg",
  "steve_jobs.jpg": "https://covers.openlibrary.org/b/olid/OL27193250M-L.jpg",
};

const resolveBookImageSrc = (src?: string | null) => {
  const trimmedSrc = src?.trim();
  if (!trimmedSrc) {
    return "";
  }

  if (isAbsoluteImageSrc(trimmedSrc)) {
    return addCloudinaryCacheBuster(trimmedSrc);
  }

  const normalizedPath = trimmedSrc.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const mappedLegacyCover = legacyBookCoverMap[normalizedPath.toLowerCase()];
  if (mappedLegacyCover) {
    return mappedLegacyCover;
  }

  const imageBaseUrl = (import.meta.env.VITE_BOOK_IMAGE_BASE_URL || import.meta.env.VITE_API_BASE_URL || "").trim();

  return imageBaseUrl ? joinUrl(imageBaseUrl, normalizedPath) : normalizedPath;
};

const BookCoverImage = ({ src, alt, className = "", iconClassName = "h-10 w-10" }: BookCoverImageProps) => {
  const fallbackSrc = useMemo(() => buildFallbackCover(alt), [alt]);
  const resolvedSrc = useMemo(() => resolveBookImageSrc(src), [src]);

  const [imageSrc, setImageSrc] = useState(resolvedSrc || fallbackSrc);
  const [failed, setFailed] = useState(!resolvedSrc);

  // Re-seed when the source changes, during render rather than in an effect.
  const [lastResolvedSrc, setLastResolvedSrc] = useState(resolvedSrc);

  if (resolvedSrc !== lastResolvedSrc) {
    setLastResolvedSrc(resolvedSrc);
    setImageSrc(resolvedSrc || fallbackSrc);
    setFailed(!resolvedSrc);
  }

  const isShowingFallback = imageSrc === fallbackSrc;

  const showFallback = () => {
    setFailed(true);

    if (!isShowingFallback) {
      setImageSrc(fallbackSrc);
    }
  };

  /**
   * A broken cover is not always an error. A host can answer 200 with a 1x1
   * placeholder, which decodes cleanly and never fires onError but renders as an
   * empty panel. Measuring the decoded bitmap catches that as well as a genuine
   * decode failure (naturalWidth === 0).
   */
  const measure = (img: HTMLImageElement) => {
    // Never re-judge the fallback against itself.
    if (isShowingFallback) {
      return;
    }

    const { naturalWidth, naturalHeight } = img;

    if (
      naturalWidth === 0 ||
      naturalWidth < MIN_COVER_DIMENSION ||
      naturalHeight < MIN_COVER_DIMENSION
    ) {
      showFallback();
      return;
    }

    setFailed(false);
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => measure(event.currentTarget);

  // An image restored from cache can finish decoding before React attaches
  // onLoad, so it is measured on mount too.
  const handleRef = (img: HTMLImageElement | null) => {
    if (img?.complete) {
      measure(img);
    }
  };

  return (
    <>
      <img
        ref={handleRef}
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
        onLoad={handleLoad}
        onError={showFallback}
      />
      {failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-card/80 p-3">
            <BookOpen className={`text-muted-foreground ${iconClassName}`} aria-hidden="true" />
          </div>
        </div>
      )}
    </>
  );
};

export default BookCoverImage;
