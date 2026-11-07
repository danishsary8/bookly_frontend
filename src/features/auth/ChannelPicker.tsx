import type { UseFormRegisterReturn } from "react-hook-form";
import { Mail, Send } from "lucide-react";
import type { VerifyChannel } from "@/api/endpoints/auth";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * "How should we confirm your account?" on sign-up (and Facebook sign-up): a compact segmented control (two radios). Email sends a 6-digit code; Telegram opens the Bookly bot, where one tap shares the phone number.
 */
const OPTIONS = [
  { value: "email", label: "channelEmail", detail: "channelEmailDetail", Icon: Mail },
  { value: "telegram", label: "channelTelegram", detail: "channelTelegramDetail", Icon: Send },
] as const satisfies readonly { value: VerifyChannel; label: string; detail: string; Icon: typeof Mail }[];

export function ChannelPicker({
  value,
  field,
  legend,
}: {
  value: VerifyChannel;
  field: UseFormRegisterReturn<"verify_by">;
  legend?: string;
}) {
  const { dict } = useT();
  const s = dict.signin;
  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium text-foreground">{legend ?? s.howConfirm}</legend>
      {/* Minimal segmented control: two options in one quiet track; the chosen one lifts onto paper. */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {OPTIONS.map(({ value: option, label, Icon }) => (
          <label
            key={option}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === option ? "bg-card text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input type="radio" value={option} className="sr-only" {...field} />
            <Icon className="size-4" aria-hidden="true" />
            {s[label]}
          </label>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground" aria-live="polite">{s[current.detail]}</p>
    </fieldset>
  );
}
