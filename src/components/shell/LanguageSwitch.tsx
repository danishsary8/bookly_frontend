import { m } from "motion/react";
import { RadioGroup } from "radix-ui";
import { useId } from "react";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useT, type Language } from "@/i18n";

const options: { value: Language; label: string; lang?: string }[] = [
  { value: "en", label: "English" },
  { value: "km", label: "ភាសាខ្មែរ", lang: "km" },
];

export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLanguage, dict } = useT();
  const layoutId = `language-${useId()}`;

  return (
    <RadioGroup.Root
      value={lang}
      onValueChange={(value) => setLanguage(value as Language)}
      aria-label={dict.language.label}
      orientation="horizontal"
      className={cn("inline-flex h-11 items-center rounded-lg border border-border bg-card p-1", className)}
    >
      {options.map((option) => {
        const active = lang === option.value;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "relative grid h-9 min-w-16 place-items-center whitespace-nowrap rounded-md px-2.5 text-sm font-semibold transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <m.span layoutId={layoutId} transition={transitions.toggle} className="absolute inset-0 rounded-md bg-primary" aria-hidden="true" />
            ) : null}
            <span className={cn("relative", option.lang === "km" && "font-khmer")} lang={option.lang}>
              {option.label}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
