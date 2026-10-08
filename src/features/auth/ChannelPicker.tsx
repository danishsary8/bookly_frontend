import type { UseFormRegisterReturn } from "react-hook-form";
import { Mail, Send } from "lucide-react";
import type { VerifyChannel } from "@/api/endpoints/auth";
import { cn } from "@/lib/utils";

/*
 * "How should we confirm your account?" on sign-up (and Facebook sign-up): the same radio cards as payment at
 * checkout. Email sends a 6-digit code; Telegram opens the Bookly bot, where one tap shares the phone number.
 */
const OPTIONS: { value: VerifyChannel; label: string; detail: string; Icon: typeof Mail }[] = [
  { value: "email", label: "Email", detail: "We email you a 6-digit code.", Icon: Mail },
  { value: "telegram", label: "Telegram", detail: "One tap in our Telegram bot shares your phone number. No code to type.", Icon: Send },
];

export function ChannelPicker({
  value,
  field,
  legend = "How should we confirm your account?",
}: {
  value: VerifyChannel;
  field: UseFormRegisterReturn<"verify_by">;
  legend?: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[15px] font-semibold text-foreground">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: option, label, detail, Icon }) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors duration-150",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
              value === option ? "border-primary bg-lapis-tint" : "border-border hover:border-foreground/30",
            )}
          >
            <input type="radio" value={option} className="mt-1 size-[18px] shrink-0 accent-primary outline-none" {...field} />
            <span className="grid gap-0.5">
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {label}
              </span>
              <span className="text-sm text-muted-foreground">{detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
