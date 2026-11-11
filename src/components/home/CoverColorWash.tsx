import { useEffect, useState } from "react";

/** Keep the current wash visible until the next cover is decoded, then crossfade persistent layers. */
export function CoverColorWash({ src, sources }: { src?: string | null; sources: string[] }) {
  const [displayed, setDisplayed] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const image = new Image();
    const reveal = () => {
      void image.decode().catch(() => undefined).then(() => {
        if (!cancelled && image.naturalWidth > 0) setDisplayed(src);
      });
    };
    image.onload = reveal;
    image.src = src;
    if (image.complete && image.naturalWidth > 0) reveal();
    // A failed image keeps the last successful wash instead of revealing the white panel.
    return () => { cancelled = true; image.onload = null; };
  }, [src]);

  const layers = [...new Set([...sources, ...(displayed ? [displayed] : [])])];
  return (
    <div aria-hidden="true" className="cover-color-wash pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-65 dark:opacity-45">
      {layers.map((url) => (
        <img
          key={url}
          src={url}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full scale-125 object-cover blur-2xl saturate-200 transition-opacity duration-[800ms] ease-in-out motion-reduce:transition-none"
          style={{ opacity: displayed === url ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
