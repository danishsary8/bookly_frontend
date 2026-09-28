import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * MASTER §6.2 OTP: six 48×56 cells, numeric keypad, one-time-code autofill,
 * and pasting a whole code fills every cell. Arrow keys and Backspace move between
 * cells. The group is labelled once; each cell says which digit it is.
 */

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OtpInput = ({ value, onChange, length = 6, label = "Verification code", error, hint, disabled, autoFocus }: OtpInputProps) => {
  const groupId = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusCell = (index: number) => {
    const cell = refs.current[Math.max(0, Math.min(length - 1, index))];
    cell?.focus();
    cell?.select();
  };

  const writeFrom = (index: number, incoming: string) => {
    const clean = incoming.replace(/\D/g, "");
    if (!clean) return;
    const next = digits.slice();
    for (let i = 0; i < clean.length && index + i < length; i += 1) next[index + i] = clean[i];
    onChange(next.join("").slice(0, length));
    focusCell(Math.min(index + clean.length, length - 1));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = digits.slice();
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        focusCell(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    writeFrom(index, event.clipboardData.getData("text"));
  };

  const describedBy = error ? `${groupId}-error` : hint ? `${groupId}-hint` : undefined;

  return (
    <div className="grid gap-1.5">
      <p id={`${groupId}-label`} className="text-sm font-semibold text-foreground">{label}</p>
      <div role="group" aria-labelledby={`${groupId}-label`} aria-describedby={describedBy} className="flex gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { refs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              const typed = event.target.value.replace(/\D/g, "");
              // A full-length value is an SMS/email autofill: spread it from the first cell.
              if (typed.length >= length) writeFrom(0, typed);
              else writeFrom(index, typed.slice(-1));
            }}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.target.select()}
            className={cn(
              "h-14 w-12 rounded-md border border-input bg-card text-center text-xl font-semibold tabular-nums text-foreground",
              "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "aria-[invalid=true]:border-destructive disabled:opacity-60",
            )}
          />
        ))}
      </div>
      {error ? (
        <p id={`${groupId}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${groupId}-hint`} className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};
