import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldAlert, Trash2 } from "lucide-react";
import { staffApi, type StaffBook } from "@/api/endpoints/staff";
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

export interface DeleteBookDialogProps {
  book: StaffBook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (deletedBook: StaffBook) => void;
}

export function DeleteBookDialog({ book, open, onOpenChange, onSuccess }: DeleteBookDialogProps) {
  const [confirmTitle, setConfirmTitle] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setConfirmTitle("");
    setPassword("");
    setCode("");
    setError(null);
  };

  const deleteMutation = useMutation({
    mutationFn: () =>
      staffApi.deleteBook(book.id, {
        confirm: confirmTitle.trim(),
        password,
        code: code.trim(),
      }),
    onSuccess: (result) => {
      resetForm();
      onOpenChange(false);
      onSuccess(result);
    },
    onError: (err) => {
      const apiErr = ApiError.from(err);
      const fieldMsg = apiErr.field("confirm") ?? apiErr.field("password") ?? apiErr.field("code");
      setError(fieldMsg ?? apiErr.message ?? "Failed to delete book.");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (confirmTitle.trim() !== book.title) {
      setError(`Type "${book.title}" to confirm.`);
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

    deleteMutation.mutate();
  };

  const isFormValid =
    confirmTitle.trim() === book.title && password.length > 0 && code.trim().length >= 6;

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
            <DialogTitle>Strict delete book</DialogTitle>
          </div>
          <DialogDescription>
            This action moves &ldquo;{book.title}&rdquo; to the Trash for 30 days. To prevent accidental
            deletion, verify your administrator identity below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {error ? <FormAlert>{error}</FormAlert> : null}

          <div className="grid gap-1.5">
            <label htmlFor="confirm-title" className="text-sm font-semibold text-foreground">
              Type <span className="select-all font-bold text-destructive">&ldquo;{book.title}&rdquo;</span> to confirm
            </label>
            <input
              id="confirm-title"
              type="text"
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              placeholder={book.title}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="strict-password" className="text-sm font-semibold text-foreground">
              Your password
            </label>
            <input
              id="strict-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your admin password"
              className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="strict-2fa" className="text-sm font-semibold text-foreground">
              Two-step authentication code
            </label>
            <input
              id="strict-2fa"
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
              <Button type="button" variant="outline" disabled={deleteMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              loading={deleteMutation.isPending}
              disabled={!isFormValid || deleteMutation.isPending}
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
