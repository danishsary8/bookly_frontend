import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import "./workspace.css";

/** Staff form surface. Radix still owns focus, dismissal and return focus. */
export function AdminFormDialogContent({ className, children, ...props }: ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props} className={cn("admin-form-dialog", className)}><div className="admin-form-scroll">{children}</div></DialogContent>;
}
