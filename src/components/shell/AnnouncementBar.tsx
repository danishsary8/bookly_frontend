import { useState } from "react";
import { ArrowRight, PackageSearch, Truck, X } from "lucide-react";
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
      {/* Slim utility strip: what the shop promises on the left, the two things people look for on the right. */}
      <div className="container-shell flex min-h-9 items-center justify-between gap-4 py-1.5 text-xs sm:text-[13px]">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center lg:justify-start lg:text-left">
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
        <nav aria-label={dict.homePage.helpLinks} className="hidden shrink-0 items-center gap-5 font-medium lg:flex">
          <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-primary-foreground/85 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline">
            <PackageSearch className="size-4" aria-hidden="true" /> {dict.homePage.trackOrder}
          </Link>
          <Link to="/faq" className="text-primary-foreground/85 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline">
            {dict.homePage.help}
          </Link>
        </nav>
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
