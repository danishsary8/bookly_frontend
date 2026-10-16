import { useState, type FormEvent } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { ApiError } from "@/api/errors";
import { FormAlert } from "@/components/form/FormAlert";
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

export interface StrictDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  entityLabel: string;
  description?: string;
  onConfirm: (payload: { confirm: string; password: string; code: string }) => Promise<unknown>;
  onSuccess?: () => void;
}

export function StrictDeleteDialog({
  open,
  onOpenChange,
  title,
  itemName,
  entityLabel,
  description,
  onConfirm,
  onSuccess,
}: StrictDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setConfirmText("");
    setPassword("");
    setCode("");
    setError(null);
    setLoading(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (confirmText.trim() !== itemName) {
      setError(`Type "${itemName}" to confirm.`);
      return;
    }
    if (!password) {
      setError("Please enter your admin password.");
      return;
    }
    if (!code.trim()) {
      setError("Please enter your 6-digit authentication code.");
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        confirm: confirmText.trim(),
        password,
        code: code.trim(),
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const apiErr = ApiError.from(err);
      const fieldMsg = apiErr.field("confirm") ?? apiErr.field("password") ?? apiErr.field("code");
      setError(fieldMsg ?? apiErr.message ?? `Failed to delete ${entityLabel}.`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    confirmText.trim() === itemName && password.length > 0 && code.trim().length >= 6;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" aria-hidden="true" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            {description ??
              `This action moves "${itemName}" to the Trash for 30 days. To prevent accidental deletion, verify your administrator identity below.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {error ? <FormAlert>{error}</FormAlert> : null}

          <div className="grid gap-1.5">
            <label htmlFor="strict-confirm-text" className="text-sm font-semibold text-foreground">
              Type <span className="select-all font-bold text-destructive">&ldquo;{itemName}&rdquo;</span> to confirm
            </label>
            <input
              id="strict-confirm-text"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={itemName}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="strict-admin-password" className="text-sm font-semibold text-foreground">
              Your password
            </label>
            <input
              id="strict-admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your admin password"
              className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="strict-admin-2fa" className="text-sm font-semibold text-foreground">
              Two-step authentication code
            </label>
            <input
              id="strict-admin-2fa"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              className="h-10 rounded-md border border-input bg-card px-3 font-mono text-base tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="one-time-code"
            />
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              loading={loading}
              disabled={!isFormValid || loading}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Strict delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
