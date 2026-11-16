import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

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

/**
 * The phone menu's Light / Dark switch (owner 2026-11-16: easy to find). Two labelled halves with a sun and a moon; the
 * chosen one sits on a raised pill. A labelled radio group, so screen readers hear "Appearance, Light, selected".
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { dict } = useT();
  const { isDark, toggleTheme } = useTheme();
  const options = [
    { dark: false, label: dict.shell.lightMode, Icon: SunMedium },
    { dark: true, label: dict.shell.darkMode, Icon: MoonStar },
  ];
  return (
    <div role="radiogroup" aria-label={dict.shell.appearance} className={cn("theme-switch relative grid grid-cols-2 rounded-xl border border-border bg-secondary/60 p-1", className)}>
      <span aria-hidden="true" className={cn("theme-switch-thumb absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-sm", isDark && "translate-x-full")} />
      {options.map(({ dark, label, Icon }) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={isDark === dark}
          onClick={() => isDark !== dark && toggleTheme()}
          className={cn(
            "relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-lg text-[15px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            isDark === dark ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className={cn("size-5", isDark === dark && (dark ? "text-[#9CB0FF]" : "text-[#C98A12]"))} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
