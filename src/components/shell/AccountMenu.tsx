import { lazy, Suspense } from "react";
import { UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Signed out: a "Sign in" button (primary, not the vermilion CTA; pages/header.md §3).
 * Signed in: an account button with a menu, loaded on demand so the menu code isn't
 * part of every visitor's first page load.
 */

const AccountMenuSignedIn = lazy(() => import("./AccountMenuSignedIn"));

export function AccountMenu() {
  const session = useSession<Customer>("customer");

  if (!session) {
    return (
      <Link to="/login" className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden sm:inline-flex")}>
        Sign in
      </Link>
    );
  }

  const placeholder = (
    <Button variant="ghost" size="icon" aria-label={`Account menu for ${session.user?.name ?? "you"}`} disabled>
      <UserCircle2 aria-hidden="true" />
    </Button>
  );
  return (
    <Suspense fallback={placeholder}>
      <AccountMenuSignedIn user={session.user} />
    </Suspense>
  );
}
