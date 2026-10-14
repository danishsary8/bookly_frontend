import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useT } from "@/i18n";

/** Daylight / Lapis Night switch: a toggle button, so it reports its state with aria-pressed. */
export function ThemeToggle({ className }: { className?: string }) {
  const { dict } = useT();
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={dict.shell.darkTheme}
      title={isDark ? dict.shell.toLight : dict.shell.toDark}
      className={className}
    >
      {isDark ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />}
    </Button>
  );
}
