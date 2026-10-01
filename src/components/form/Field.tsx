import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * MASTER §6.2 form field: visible label above, 48px control, 1px --input border,
 * 16px text (no iOS zoom), 2px ring on focus, and an error shown *below* the field
 * with an icon, wired up with aria-invalid + aria-describedby.
 */

export const controlClassName = cn(
  "block w-full rounded-md border border-input bg-card px-3.5 text-base text-foreground",
  "placeholder:text-muted-foreground/80",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-destructive",
);

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export const FieldShell = ({ id, label, hint, error, optional, children, className }: FieldShellProps) => (
  // content-start: when a neighbour in the same grid row has a hint/error, this field
  // stretches to match; keep label + control at the top instead of spreading them apart.
  <div className={cn("grid content-start gap-1.5", className)}>
    <label htmlFor={id} className="text-sm font-semibold text-foreground">
      {label}
      {optional ? <span className="ml-1.5 font-medium text-muted-foreground">(optional)</span> : null}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  id?: string;
  containerClassName?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, optional, id, containerClassName, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(controlClassName, "h-12", className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
TextField.displayName = "TextField";

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  id?: string;
  containerClassName?: string;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, hint, error, optional, id, containerClassName, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(controlClassName, "min-h-24 py-3 leading-6", className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
TextAreaField.displayName = "TextAreaField";

export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, "type">>(
  ({ label, hint, error, optional, id, containerClassName, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const [visible, setVisible] = useState(false);
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(fieldId, error, hint)}
            className={cn(controlClassName, "h-12 pr-12", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            aria-controls={fieldId}
            className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground active:scale-95 motion-reduce:active:scale-100"
          >
            {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
        </div>
      </FieldShell>
    );
  },
);
PasswordField.displayName = "PasswordField";
