import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

/** Daylight / Lapis Night switch: a toggle button, so it reports its state with aria-pressed. */
export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label="Dark theme"
      title={isDark ? "Switch to the light theme" : "Switch to the dark theme"}
      className={className}
    >
      {isDark ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />}
    </Button>
  );
}
