import { useState } from "react";
import { LogOut } from "lucide-react";
import type { Customer } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { useSignOut } from "./useSignOut";

type SignOutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: Customer | null;
};

/**
 * Confirmation pop-up before ending a customer session (MASTER §6.17).
 * Shows which account is active, reassures that saved data remains intact,
 * and locks dismissal while the logout request is in flight.
 */
export function SignOutDialog({ open, onOpenChange, user }: SignOutDialogProps) {
  const signOut = useSignOut();
  const { dict } = useT();
  const t = dict.shell;
  const [signingOut, setSigningOut] = useState(false);

  const identity = user?.email ?? user?.phone ?? null;
  const initial = (user?.name ?? identity ?? "?").trim().charAt(0).toUpperCase() || "?";

  const handleConfirm = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      onOpenChange(false);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !signingOut && onOpenChange(next)}>
      <DialogContent size="sm" hideClose role="alertdialog">
        <div className="mb-4 inline-grid size-12 place-items-center rounded-xl bg-destructive-tint text-destructive">
          <LogOut className="size-5" aria-hidden="true" />
        </div>

        <DialogHeader className="gap-2 pr-0">
          <DialogTitle>{t.signOutConfirmTitle}</DialogTitle>
          <DialogDescription>{t.signOutConfirmBody}</DialogDescription>
        </DialogHeader>

        {user?.name || identity ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3.5 py-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              {user?.name ? <p className="truncate text-sm font-semibold text-foreground">{user.name}</p> : null}
              {identity ? <p className="truncate text-xs text-muted-foreground">{identity}</p> : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline" disabled={signingOut}>
              {t.staySignedIn}
            </Button>
          </DialogClose>
          <Button variant="destructive" loading={signingOut} onClick={() => void handleConfirm()}>
            {!signingOut ? <LogOut className="size-4" aria-hidden="true" /> : null}
            {signingOut ? t.signingOut : t.signOut}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
