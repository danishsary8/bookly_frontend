import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordRules } from "./schemas";
import { useT } from "@/i18n";

/** The API's password rules as a live checklist under "new password" fields (icon + text, not colour alone). */
export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  const { dict } = useT();
  return (
    <ul id={id} className="grid gap-1 text-sm" aria-label={dict.forms.rulesLabel}>
      {passwordRules.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={cn("flex items-center gap-2", met ? "text-success" : "text-muted-foreground")}>
            {met ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
            <span>
              {rule.label(dict)}
              <span className="sr-only">{met ? dict.forms.ruleDone : dict.forms.ruleNotYet}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
