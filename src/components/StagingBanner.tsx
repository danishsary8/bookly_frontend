import { useT } from "@/i18n";

/** True on the staging site (VITE_APP_ENV=staging); never on the live site. */
export const IS_STAGING = import.meta.env.VITE_APP_ENV === "staging";

/** A thin bar on every page of the staging site, so nobody mistakes it for the live shop. */
export function StagingBanner({ show = IS_STAGING }: { show?: boolean }) {
  const { dict } = useT();
  if (!show) return null;
  return (
    <p role="note" className="bg-warning-tint px-4 py-1.5 text-center text-sm font-semibold text-warning">
      {dict.ui.stagingBanner}
    </p>
  );
}
