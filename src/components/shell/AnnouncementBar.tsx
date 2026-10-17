import { useState } from "react";
import { ArrowRight, Truck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";

export const ANNOUNCEMENT_STORAGE_KEY = "bookly_announcement_bar_dismissed_v1";

export function AnnouncementBar() {
  const { dict } = useT();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors in private/restricted browsing mode
    }
  };

  return (
    <aside
      aria-label={dict.shell.announcementDelivery}
      className="relative z-30 border-b border-primary/20 bg-primary text-primary-foreground select-none"
    >
      <div className="container-shell flex items-center justify-between gap-3 py-2 text-xs sm:text-sm">
        <div className="flex flex-1 items-center justify-center gap-2 text-center">
          <Truck className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="font-medium tracking-tight">
            <span>{dict.shell.announcementDelivery}</span>{" "}
            <Link
              to="/books"
              className="inline-flex items-center gap-1 font-semibold underline decoration-amber-300 underline-offset-4 hover:text-amber-200 transition-colors"
            >
              {dict.shell.announcementAction}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={dict.shell.dismissAnnouncement}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 transition-colors"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
