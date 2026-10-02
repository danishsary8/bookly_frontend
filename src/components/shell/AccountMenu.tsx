import { LogOut, Package, Heart, UserCircle2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router-dom";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignOut } from "./useSignOut";

/*
 * Signed out: a "Sign in" button (primary, not the vermilion CTA; pages/header.md §3).
 * Signed in: an account button with a menu (Radix: arrow keys, Esc, return focus).
 */

const itemClass =
  "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 text-[15px] text-foreground outline-none data-[highlighted]:bg-secondary";

export function AccountMenu() {
  const session = useSession<Customer>("customer");
  const signOut = useSignOut();

  if (!session) {
    return (
      <Link to="/login" className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden sm:inline-flex")}>
        Sign in
      </Link>
    );
  }

  const firstName = session.user?.name?.split(" ")[0] ?? "Account";

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Account menu for ${session.user?.name ?? "you"}`}>
          <UserCircle2 aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="ui-pop z-(--z-popover) w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-overlay"
        >
          <DropdownMenu.Label className="px-3 pb-2 pt-1.5">
            <span className="block text-sm text-muted-foreground">Signed in as</span>
            <span className="block truncate font-semibold">{firstName}</span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account">
              <UserCircle2 className="size-[18px] text-muted-foreground" aria-hidden="true" /> Account
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account/orders">
              <Package className="size-[18px] text-muted-foreground" aria-hidden="true" /> Orders
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account/wishlist">
              <Heart className="size-[18px] text-muted-foreground" aria-hidden="true" /> Wishlist
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={itemClass} onSelect={() => void signOut()}>
            <LogOut className="size-[18px] text-muted-foreground" aria-hidden="true" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
