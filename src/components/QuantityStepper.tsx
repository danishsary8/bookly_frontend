import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * MASTER §6.7: one joined control, 44px tall, 44×44 buttons, a 56px numeric field
 * with a hidden label. − disables at `min`, + at `max`; typed values are clamped on
 * blur/Enter. The visible label is optional (the cart row already names the book).
 */

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export const QuantityStepper = ({ value, onChange, min = 1, max = 99, label, showLabel = false, disabled, className }: QuantityStepperProps) => {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // When the value changes from outside (e.g. the cart reloads), show it in the field.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(String(value));
  }

  const clamp = (n: number) => Math.max(min, Math.min(max, Math.trunc(n)));
  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) && draft.trim() !== "" ? clamp(parsed) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const buttonClass =
    "grid h-11 w-11 place-items-center text-foreground transition-[background-color,transform] duration-150 hover:bg-secondary active:scale-90 disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100 outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className={showLabel ? "text-sm font-semibold text-foreground" : "sr-only"}>{label}</label>
      <div className="inline-flex h-11 w-max items-stretch overflow-hidden rounded-lg border border-input bg-card">
        <button type="button" className={buttonClass} onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= min} aria-label="Decrease quantity" aria-controls={id}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 3))}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }}
          className="w-14 border-x border-border bg-transparent text-center text-base font-semibold tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
        <button type="button" className={buttonClass} onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= max} aria-label="Increase quantity" aria-controls={id}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
