import { Popover } from "radix-ui";
import { ChevronDown, Globe, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";
import { CurrencySwitch } from "./CurrencySwitch";
import { LanguageSwitch } from "./LanguageSwitch";

/*
 * One compact "🌐 EN · $" button for settings people set once: language, currency and light/dark.
 * Opens a small panel (radix Popover: focus moves in, Escape closes); motion: .nav-pop.
 */
export function PreferencesMenu({ className }: { className?: string }) {
  const { lang, dict } = useT();
  const currency = useCurrency();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={dict.shell.preferences}
        className={cn(
          "group inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted",
          className,
        )}
      >
        <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
        <span aria-hidden="true" className="whitespace-nowrap">
          {lang.toUpperCase()} · {currency === "USD" ? "$" : "៛"}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="nav-pop z-(--z-header) grid w-72 gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_24px_48px_-24px_rgb(20_32_122/0.35)] outline-none"
        >
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dict.language.label}</p>
            <LanguageSwitch className="w-full [&>*]:flex-1" />
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dict.shell.currency}</p>
            <CurrencySwitch className="w-full [&>*]:flex-1" />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={isDark}
            className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.shell.darkTheme}
            {isDark ? <SunMedium className="size-4" aria-hidden="true" /> : <MoonStar className="size-4" aria-hidden="true" />}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
