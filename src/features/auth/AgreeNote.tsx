import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { turnstileSiteKey } from "./turnstile";
import { useT } from "@/i18n";

/** Terms + privacy consent line, and the Cloudflare note when the bot check is on. */
export function AgreeNote() {
  const { dict } = useT();
  const [before, middle, after] = dict.signin.agree.split(/\{terms\}|\{privacy\}/);
  const link = "font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground";
  return (
    <div className="grid gap-2 border-t border-border pt-4 text-center text-xs leading-5 text-muted-foreground">
      <p>
        {before}
        <Link to="/terms" className={link}>{dict.footer.terms}</Link>
        {middle}
        <Link to="/privacy" className={link}>{dict.footer.privacy}</Link>
        {after}
      </p>
      {turnstileSiteKey() ? (
        <p className="inline-flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
          {dict.signin.protectedBy}
        </p>
      ) : null}
    </div>
  );
}
