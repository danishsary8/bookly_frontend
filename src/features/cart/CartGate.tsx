import type { ReactNode } from "react";
import { MailCheck, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { withNext } from "@/lib/forms";
import { useUsableCart } from "./useCart";

/**
 * What to show instead of a cart when there can't be one: signed out → sign in,
 * unverified → verify email. Renders children otherwise.
 */
export function CartGate({ children, onNavigate, headingLevel = "h2" }: { children: ReactNode; onNavigate?: () => void; headingLevel?: "h1" | "h2" | "h3" }) {
  const { session, verified } = useUsableCart();
  const location = useLocation();
  const here = location.pathname + location.search;

  if (!session) {
    return (
      <EmptyState
        icon={ShoppingBag}
        headingLevel={headingLevel}
        title="Sign in to see your cart"
        description="Your cart is saved to your account, so it follows you to any device."
        action={
          <Link to={withNext("/login", here)} onClick={onNavigate} className={buttonVariants()}>
            Sign in
          </Link>
        }
        secondaryAction={
          <Link to={withNext("/register", here)} onClick={onNavigate} className={buttonVariants({ variant: "link" })}>
            Create an account
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
        title="Verify your email to use your cart"
        description="Enter the 6-digit code we emailed you when you signed up."
        action={
          <Link to={withNext("/verify-email", here)} onClick={onNavigate} className={buttonVariants()}>
            Verify email
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}
