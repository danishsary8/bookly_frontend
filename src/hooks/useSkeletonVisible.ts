import { useEffect, useRef, useState } from "react";

/**
 * MASTER §6.11: show a loading skeleton only after 150ms, so a fast response
 * never flashes it, and once shown keep it for at least 400ms so it cannot
 * strobe on a near-instant load.
 */
export const useSkeletonVisible = (isLoading: boolean, showDelay = 150, minDuration = 400) => {
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const showTimer = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setIsVisible(true);
      }, showDelay);

      return () => window.clearTimeout(showTimer);
    }

    if (shownAtRef.current === null) {
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    const hideTimer = window.setTimeout(() => {
      shownAtRef.current = null;
      setIsVisible(false);
    }, remaining);

    return () => window.clearTimeout(hideTimer);
  }, [isLoading, showDelay, minDuration]);

  return isVisible;
};

export default useSkeletonVisible;
