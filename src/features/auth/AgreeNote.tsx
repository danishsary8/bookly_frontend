import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { turnstileSiteKey } from "./turnstile";
import { useT } from "@/i18n";

/** Terms + privacy consent line, and the Cloudflare note when the bot check is on. */
export function AgreeNote() {
  const { dict } = useT();
  const [before, middle, after] = dict.signin.agree.split(/\{terms\}|\{privacy\}/);
  const link = "font-medium text-foreground/80 underline decoration-foreground/25 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground";
  return (
    <div className="mx-auto grid max-w-[20rem] gap-1 pt-1 text-center text-muted-foreground">
      <p className="text-xs leading-5">
        {before}
        <Link to="/terms" className={link}>{dict.footer.terms}</Link>
        {middle}
        <Link to="/privacy" className={link}>{dict.footer.privacy}</Link>
        {after}
      </p>
      {turnstileSiteKey() ? (
        <p className="inline-flex items-center justify-center gap-1 text-[11px] leading-4">
          <ShieldCheck className="size-3 text-success" aria-hidden="true" />
          {dict.signin.protectedBy}
        </p>
      ) : null}
    </div>
  );
}
