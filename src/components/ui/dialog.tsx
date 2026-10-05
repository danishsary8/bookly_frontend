import * as React from "react"
import { X } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { useControllableState } from "@/hooks/useControllableState"
import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"

/*
 * MASTER §6.17. Radix gives focus trap, Esc, scrim click, return focus and
 * aria-modal; Motion plays the 320ms enter and 220ms exit (skipped under reduced
 * motion by the global config). Every dialog needs a DialogTitle.
 */

const OpenContext = React.createContext(false)

type DialogProps = Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "open" | "onOpenChange"> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({ open, defaultOpen = false, onOpenChange, children, ...props }: DialogProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen} {...props}>
      <OpenContext.Provider value={isOpen}>{children}</OpenContext.Provider>
    </DialogPrimitive.Root>
  )
}

const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

const sizes = {
  sm: "max-w-[min(92vw,26rem)]",
  md: "max-w-[min(92vw,32rem)]",
  lg: "max-w-[min(92vw,40rem)]",
} as const

type DialogContentProps = Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "asChild" | "forceMount"> & {
  size?: keyof typeof sizes
  /** Hide the corner close button (e.g. confirm dialogs that have Cancel). */
  hideClose?: boolean
}

function DialogContent({ className, children, size = "md", hideClose = false, ...props }: DialogContentProps) {
  const open = React.useContext(OpenContext)
  return (
    <AnimatePresence>
      {open ? (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <m.div
              className="fixed inset-0 z-(--z-dialog) bg-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: transitions.enter }}
              exit={{ opacity: 0, transition: transitions.exit }}
            />
          </DialogPrimitive.Overlay>
          <div className="pointer-events-none fixed inset-0 z-(--z-dialog) grid place-items-center overflow-y-auto p-4">
            <DialogPrimitive.Content asChild forceMount {...props}>
              <m.div
                data-slot="dialog-content"
                className={cn(
                  "pointer-events-auto relative w-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-overlay outline-none",
                  sizes[size],
                  className,
                )}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0, transition: transitions.enter }}
                exit={{ opacity: 0, scale: 0.98, transition: transitions.exit }}
              >
                {children}
                {hideClose ? null : (
                  <DialogPrimitive.Close
                    className="absolute right-2 top-2 grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </DialogPrimitive.Close>
                )}
              </m.div>
            </DialogPrimitive.Content>
          </div>
        </DialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("grid gap-1.5 pr-10", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-2xl leading-tight text-foreground", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-[15px] leading-6 text-muted-foreground", className)} {...props} />
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Names the action ("Remove address"), never "OK". */
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

/** Yes/no question before an action that cannot be undone (MASTER §6.17). */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent size="sm" hideClose role="alertdialog" {...(description ? {} : { "aria-describedby": undefined })}>
        <DialogHeader className="pr-0">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button variant={destructive ? "destructive" : "default"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogProps,
}
