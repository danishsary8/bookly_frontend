import { forwardRef, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Form-level message (MASTER §6.2, §7): errors that belong to the whole form
 * ("Email or password is incorrect") rather than one field. It takes focus via the
 * forwarded ref on a failed submit so screen readers announce it immediately.
 */

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { className: string; Icon: typeof AlertCircle }> = {
  error: { className: "border-destructive/30 bg-destructive/10 text-destructive", Icon: AlertCircle },
  success: { className: "border-success/30 bg-success/10 text-success", Icon: CheckCircle2 },
  info: { className: "border-primary/25 bg-lapis-tint text-primary", Icon: Info },
};

interface FormAlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export const FormAlert = forwardRef<HTMLDivElement, FormAlertProps>(({ tone = "error", title, children, className }, ref) => {
  const { className: toneClass, Icon } = tones[tone];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border px-4 py-3 text-sm outline-none", toneClass, className)}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <div className="grid gap-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-6">{children}</div> : null}
      </div>
    </div>
  );
});
FormAlert.displayName = "FormAlert";
