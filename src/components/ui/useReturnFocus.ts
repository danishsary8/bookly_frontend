import { useLayoutEffect, useRef } from "react"

/**
 * Radix returns focus to its own Trigger on close. Our dialogs and drawers are mostly opened
 * from state (a store, a menu item, a row button), so there is no Trigger and focus fell to
 * <body>. This remembers what had focus when the panel opened and goes back there, unless
 * that element is gone (then Radix's default applies).
 * A layout effect runs before Radix moves focus into the panel (that happens in a child's effect).
 */
export function useReturnFocus(open: boolean, onCloseAutoFocus?: (event: Event) => void) {
  const opener = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [open])
  return (event: Event) => {
    onCloseAutoFocus?.(event)
    const el = opener.current
    if (event.defaultPrevented || !el || !el.isConnected || el === document.body) return
    event.preventDefault()
    el.focus()
  }
}
