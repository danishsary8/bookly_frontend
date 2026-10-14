import type { ReactNode } from "react";
import { MailCheck, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { withNext } from "@/lib/forms";
import { useUsableCart } from "./useCart";
import { useT } from "@/i18n";

/**
 * What to show instead of a cart when there can't be one: signed out → sign in,
 * unverified → verify email. Renders children otherwise.
 */
export function CartGate({ children, onNavigate, headingLevel = "h2" }: { children: ReactNode; onNavigate?: () => void; headingLevel?: "h1" | "h2" | "h3" }) {
  const { session, verified } = useUsableCart();
  const location = useLocation();
  const here = location.pathname + location.search;
  const { dict } = useT();
  const s = dict.signin;

  if (!session) {
    return (
      <EmptyState
        icon={ShoppingBag}
        headingLevel={headingLevel}
        title={s.cartSignIn}
        description={s.cartSignInLead}
        action={
          <Link to={withNext("/login", here)} onClick={onNavigate} className={buttonVariants()}>
            {s.signIn}
          </Link>
        }
        secondaryAction={
          <Link to={withNext("/register", here)} onClick={onNavigate} className={buttonVariants({ variant: "link" })}>
            {s.createAccount}
          </Link>
        }
      />
    );
  }
  if (!verified) {
    return (
      <EmptyState
        icon={MailCheck}
        headingLevel={headingLevel}
        title={s.cartVerify}
        description={s.cartVerifyLead}
        action={
          <Link to={withNext("/verify-email", here)} onClick={onNavigate} className={buttonVariants()}>
            {s.verifyEmail}
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}
