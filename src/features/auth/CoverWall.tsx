import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { catalogApi } from "@/api/endpoints/catalog";
import { useT } from "@/i18n";

/*
 * Sign-in cover panel: three columns of the shop's real covers drifting slowly up and down (an endless "shelf"),
 * fading into the lapis cloth, with a calm line of copy on top. It fills whatever height the panel has, so the
 * page never needs to scroll. Decorative (aria-hidden) apart from the pause button; reduced motion: still.
 * Shares the home page's catalogue-rows cache; while covers load (or the API is down) cloth boards stand in.
 */

const TONES = ["#2F5D4A", "#7A2E2A", "#C9A24B", "#4C5378", "#8A5A3B", "#3E6B73"];
type Tile = { id: string; cover: string | null; tone: string };

export function CoverWall() {
  const { dict } = useT();
  const s = dict.signin;
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const rows = useQuery({ queryKey: ["catalog", "rows", null], queryFn: () => catalogApi.rows(), staleTime: 15 * 60 * 1000 });

  const seen = new Set<string>();
  const covers: Tile[] = (rows.data ?? [])
    .flatMap((row) => row.books ?? [])
    .filter((book) => book.cover_image_url && !seen.has(String(book.id)) && seen.add(String(book.id)))
    .slice(0, 15)
    .map((book, i) => ({ id: String(book.id), cover: book.cover_image_url ?? null, tone: TONES[i % TONES.length] }));
  const tiles: Tile[] = covers.length >= 6 ? covers : TONES.concat(TONES).map((tone, i) => ({ id: `board-${i}`, cover: null, tone }));
  const columns = [0, 1, 2].map((c) => tiles.filter((_, i) => i % 3 === c));
  const still = reduceMotion || paused;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="auth-wall relative -mx-9 min-h-0 flex-1 overflow-hidden xl:-mx-11" aria-hidden="true">
        <div className="grid h-full grid-cols-3 gap-4 px-6 [transform:rotate(-6deg)_scale(1.15)]">
          {columns.map((column, c) => (
            <div key={c} className="min-h-0 overflow-hidden">
              <div
                className="auth-wall-track grid gap-4"
                style={{ animationDuration: `${46 + c * 9}s`, animationDirection: c === 1 ? "reverse" : "normal", animationPlayState: still ? "paused" : "running" }}
              >
                {column.concat(column).map((tile, i) => (
                  <div
                    key={`${tile.id}-${i}`}
                    className="relative aspect-[2/3] overflow-hidden rounded-[6px] shadow-[0_18px_30px_-18px_rgb(0_0_0/0.7)]"
                    style={{ backgroundColor: tile.tone }}
                  >
                    {tile.cover ? (
                      <img src={tile.cover} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center font-display text-4xl text-gold/70">B</span>
                    )}
                    <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.3)_0_3%,rgb(255_255_255/0.18)_4%,transparent_10%)]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative -mt-24 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {s.shelfEyebrow}
          </p>
          <p className="mt-3 max-w-[22ch] font-display text-[clamp(1.6rem,2.4vw,2.1rem)] leading-[1.15] text-on-lapis">{dict.splash.tagline}</p>
        </div>
        {!reduceMotion ? (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? s.playQuotes : s.pauseQuotes}
            aria-pressed={paused}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-on-lapis-muted/50 text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95"
          >
            {paused ? <Play className="size-[18px]" aria-hidden="true" /> : <Pause className="size-[18px]" aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
