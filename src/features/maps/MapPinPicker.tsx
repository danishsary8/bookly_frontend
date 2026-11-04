import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { loadGoogleMaps, PHNOM_PENH, PIN_AREA, type LatLng } from "./googleMaps";

/*
 * "Pick on map": the map moves under a fixed pin in the middle, so the spot is wherever the pin points (no paid marker
 * features needed). The map can't leave Cambodia (the API only accepts pins there). "Use my location" asks the
 * browser, not Google. The map script loads only when this opens.
 */
const round = (n: number) => Math.round(n * 1e6) / 1e6;

type Props = { open: boolean; onOpenChange: (open: boolean) => void; value: LatLng | null; onPick: (pin: LatLng) => void };

export function MapPinPicker({ open, onOpenChange, value, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted only while open, so every opening starts from the saved pin. */}
      {open ? <PickerBody onOpenChange={onOpenChange} value={value} onPick={onPick} /> : null}
    </Dialog>
  );
}

function PickerBody({ onOpenChange, value, onPick }: Omit<Props, "open">) {
  const { dict } = useT();
  const t = dict.mapPin;
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<InstanceType<Awaited<ReturnType<typeof loadGoogleMaps>>["Map"]> | null>(null);
  const [center, setCenter] = useState<LatLng>(value ?? PHNOM_PENH);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let listener: { remove(): void } | undefined;
    const start = value ?? PHNOM_PENH;
    // Wait a frame so the dialog's map box exists.
    const frame = requestAnimationFrame(() => {
      loadGoogleMaps()
        .then((maps) => {
          if (cancelled || !holder.current) return;
          map.current = new maps.Map(holder.current, {
            center: start,
            zoom: value ? 17 : 13,
            restriction: { latLngBounds: PIN_AREA, strictBounds: false },
            clickableIcons: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            gestureHandling: "greedy",
          });
          listener = map.current.addListener("idle", () => {
            const c = map.current?.getCenter();
            if (c) setCenter({ lat: round(c.lat()), lng: round(c.lng()) });
          });
          setStatus("ready");
        })
        .catch(() => !cancelled && setStatus("failed"));
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      listener?.remove();
      map.current = null;
    };
    // The map is made once per opening; `value` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setLocateError(t.noLocation);
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        if (here.lat < PIN_AREA.south || here.lat > PIN_AREA.north || here.lng < PIN_AREA.west || here.lng > PIN_AREA.east) return setLocateError(t.outsideCambodia);
        map.current?.setCenter(here);
        map.current?.setZoom(17);
        setCenter(here);
      },
      () => {
        setLocating(false);
        setLocateError(t.noLocation);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.lead}</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-surface-2 sm:aspect-[16/10]">
          <div ref={holder} className="absolute inset-0" role="application" aria-label={t.mapLabel} />
          {status === "ready" ? (
            <MapPin className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-full fill-accent text-accent-foreground drop-shadow" aria-hidden="true" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
              {status === "loading" ? <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-label={t.loading} /> : <p role="alert">{t.failed}</p>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation} loading={locating} disabled={status !== "ready"}>
            <Crosshair aria-hidden="true" /> {t.useMyLocation}
          </Button>
          <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {status === "ready" ? `${center.lat}, ${center.lng}` : null}
          </p>
        </div>
        {locateError ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {locateError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {dict.ui.cancel}
          </Button>
          <Button
            type="button"
            disabled={status !== "ready"}
            onClick={() => {
              onPick(center);
              onOpenChange(false);
            }}
          >
            {t.usePin}
          </Button>
        </DialogFooter>
    </DialogContent>
  );
}
