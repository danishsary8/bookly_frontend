import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { Link } from "react-router-dom"

import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { dismissToast, useToasts, type Toast, type ToastTone } from "@/stores/toast"

/*
 * MASTER §6.5: bottom-right (bottom-center on mobile), card surface with a tinted
 * icon chip, title + body, optional action, 44x44 close. Success/info are
 * role="status" and pause their timer while hovered or focused; errors are
 * role="alert" and stay until closed.
 */

const tones: Record<ToastTone, { Icon: typeof Info; chip: string }> = {
  success: { Icon: CheckCircle2, chip: "bg-success-tint text-success" },
  error: { Icon: AlertCircle, chip: "bg-destructive-tint text-destructive" },
  info: { Icon: Info, chip: "bg-lapis-tint text-primary" },
}

function ToastCard({ toast }: { toast: Toast }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration)

  useEffect(() => {
    if (remaining.current === null || paused) return
    const started = Date.now()
    const timer = window.setTimeout(() => dismissToast(toast.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      if (remaining.current !== null) remaining.current -= Date.now() - started
    }
  }, [paused, toast.id])

  const { Icon, chip } = tones[toast.tone]
  const close = () => dismissToast(toast.id)

  return (
    <m.li
      layout
      role={toast.tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: transitions.enter }}
      exit={{ opacity: 0, scale: 0.98, transition: transitions.exit }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 pr-2 text-card-foreground shadow-overlay"
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", chip)}>
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[15px] font-semibold leading-5">{toast.title}</p>
        {toast.description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.description}</p> : null}
        {toast.action ? (
          toast.action.href ? (
            <Link
              to={toast.action.href}
              onClick={close}
              className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick?.()
                close()
              }}
              className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          )
        ) : null}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="-my-1.5 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-[18px]" aria-hidden="true" />
      </button>
    </m.li>
  )
}

function Toaster() {
  const toasts = useToasts()
  return (
    <section aria-label="Notifications" className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-(--z-toast) sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]">
      {/* A persistent live region: announced reliably, and kept visible to assistive tech while a
          dialog or drawer is open (Radix hides everything else, but leaves [aria-live] alone). */}
      <ol aria-live="polite" className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </ol>
    </section>
  )
}

export { Toaster }
