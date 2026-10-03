import { useEffect, useRef, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "@/stores/toast";

const subscribe = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

/** False while the browser reports no connection. */
function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/*
 * MASTER §6.22 offline state for the whole shop: a slim bar under the header while
 * the connection is gone (pages already open keep working; lists refresh by
 * themselves when it's back, TanStack Query refetches on reconnect), and a
 * "Back online" toast when it returns.
 */
export function OfflineBanner() {
  const online = useOnline();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      toast.success("Back online");
    }
  }, [online]);

  if (online) return null;
  return (
    <div role="status" className="border-b border-warning/40 bg-warning-tint">
      <p className="container-shell flex min-h-11 items-center gap-3 py-2 text-[15px] font-medium text-foreground">
        <WifiOff className="size-[18px] shrink-0 text-warning" aria-hidden="true" />
        <span>
          You're offline. Pages you've opened still work; new pages and changes wait until you're back online.
        </span>
      </p>
    </div>
  );
}
