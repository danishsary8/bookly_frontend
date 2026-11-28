import { useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useT } from "@/i18n";

/*
 * Back arrow for the shop when it runs as a home-screen app (iPhone "Add to Home Screen", Android install):
 * there is no browser back button there. Phones and tablets only (hidden from lg up), never on the home page,
 * and never in a normal browser tab, so the laptop layout and regular mobile browsing are unchanged.
 */
const query = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
const isStandalone = () =>
  Boolean(query?.matches) || (typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true);
const subscribe = (listener: () => void) => {
  query?.addEventListener?.("change", listener);
  return () => query?.removeEventListener?.("change", listener);
};

const useStandaloneApp = () => useSyncExternalStore(subscribe, isStandalone, () => false);

export function AppBackButton() {
  const standalone = useStandaloneApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { dict } = useT();
  if (!standalone || pathname === "/") return null;

  const goBack = () => {
    // React Router keeps the history position in `idx`; 0 means this is the first page opened in the app.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/", { replace: true });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={dict.shell.back}
      title={dict.shell.back}
      className="-ml-2 grid size-10 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
    >
      <ChevronLeft className="size-6" aria-hidden="true" />
    </button>
  );
}
