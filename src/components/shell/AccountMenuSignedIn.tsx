import { LogOut, Package, Heart, UserCircle2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router-dom";
import type { Customer } from "@/api/types";
import { Button } from "@/components/ui/button";
import { useSignOut } from "./useSignOut";
import { useT } from "@/i18n";

/* The signed-in account button and its menu (Radix: arrow keys, Esc, return focus). Loaded only for signed-in customers. */

const itemClass =
  "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 text-[15px] text-foreground outline-none data-[highlighted]:bg-secondary";

export default function AccountMenuSignedIn({ user }: { user: Customer | null | undefined }) {
  const signOut = useSignOut();
  const { dict } = useT();
  const t = dict.shell;
  const firstName = user?.name?.split(" ")[0] ?? t.account;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.accountMenuFor(user?.name ?? t.you)}>
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
            <span className="block text-sm text-muted-foreground">{t.signedInAs}</span>
            <span className="block truncate font-semibold">{firstName}</span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account">
              <UserCircle2 className="size-[18px] text-muted-foreground" aria-hidden="true" /> {t.account}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account/orders">
              <Package className="size-[18px] text-muted-foreground" aria-hidden="true" /> {t.orders}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/account/wishlist">
              <Heart className="size-[18px] text-muted-foreground" aria-hidden="true" /> {t.wishlist}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={itemClass} onSelect={() => void signOut()}>
            <LogOut className="size-[18px] text-muted-foreground" aria-hidden="true" /> {t.signOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
