import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordRules } from "./schemas";

/** The API's password rules as a live checklist under "new password" fields (icon + text, not colour alone). */
export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  return (
    <ul id={id} className="grid gap-1 text-sm" aria-label="Password requirements">
      {passwordRules.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.label} className={cn("flex items-center gap-2", met ? "text-success" : "text-muted-foreground")}>
            {met ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
            <span>
              {rule.label}
              <span className="sr-only">{met ? " (done)" : " (not yet)"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
