import * as React from "react"
import { X } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { useControllableState } from "@/hooks/useControllableState"
import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"

/*
 * MASTER §6.18: side panel on a scrim, built on Radix Dialog (focus trap, Esc,
 * scrim click, return focus, aria-modal). Header and footer stay put; the body
 * scrolls. Used by the cart drawer, the mobile menu and mobile filters.
 */

const OpenContext = React.createContext(false)

type DrawerProps = Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "open" | "onOpenChange"> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Drawer({ open, defaultOpen = false, onOpenChange, children, ...props }: DrawerProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen} {...props}>
      <OpenContext.Provider value={isOpen}>{children}</OpenContext.Provider>
    </DialogPrimitive.Root>
  )
}

const DrawerTrigger = DialogPrimitive.Trigger
const DrawerClose = DialogPrimitive.Close

type Side = "right" | "left" | "bottom"

const panel: Record<Side, string> = {
  right: "inset-y-0 right-0 h-dvh w-[min(88vw,400px)] border-l",
  left: "inset-y-0 left-0 h-dvh w-[min(88vw,400px)] border-r",
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t",
}

const offscreen: Record<Side, { x?: string; y?: string }> = {
  right: { x: "100%" },
  left: { x: "-100%" },
  bottom: { y: "100%" },
}

type DrawerContentProps = Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "asChild" | "forceMount"> & {
  side?: Side
}

function DrawerContent({ className, children, side = "right", ...props }: DrawerContentProps) {
  const open = React.useContext(OpenContext)
  return (
    <AnimatePresence>
      {open ? (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <m.div
              className="fixed inset-0 z-(--z-drawer) bg-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: transitions.enter }}
              exit={{ opacity: 0, transition: transitions.exit }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount {...props}>
            <m.div
              data-slot="drawer-content"
              data-side={side}
              className={cn(
                "fixed z-(--z-drawer) flex flex-col border-border bg-card text-card-foreground shadow-overlay outline-none",
                panel[side],
                className,
              )}
              initial={offscreen[side]}
              animate={{ x: 0, y: 0, transition: transitions.enter }}
              exit={{ ...offscreen[side], transition: transitions.exit }}
            >
              {children}
            </m.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

function DrawerHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border py-2 pl-5 pr-2", className)}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      <DialogPrimitive.Close
        className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
      >
        <X className="size-5" aria-hidden="true" />
      </DialogPrimitive.Close>
    </div>
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-body" className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-5", className)} {...props} />
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("shrink-0 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("truncate font-display text-xl leading-tight", className)} {...props} />
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  type DrawerProps,
}
