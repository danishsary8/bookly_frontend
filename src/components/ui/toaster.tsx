import { useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowRight, Check, Info, X } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { dismissToast, useToasts, type Toast, type ToastTone } from "@/stores/toast"
import { useT } from "@/i18n"

/*
 * Top-center notification pill: nests cleanly within the top header band,
 * uses a tinted surface + solid semantic icon badge + solid Lapis action pill
 * so it stands out immediately against the white header, and keeps a crisp
 * 3px bottom countdown bar that pauses on hover/focus.
 */

const ICONS: Record<ToastTone, typeof Info> = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

const actionPillClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-xs transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"

function ToastCard({ toast }: { toast: Toast }) {
  const { dict } = useT()
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

  const Icon = ICONS[toast.tone]
  const close = () => dismissToast(toast.id)
  const compact = !toast.description && !toast.action

  return (
    <m.div
      layout
      role={toast.tone === "error" ? "alert" : "status"}
      data-tone={toast.tone}
      initial={{ opacity: 0, y: -14, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{
        opacity: 0,
        y: -8,
        scale: 0.97,
        transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "toast-island pointer-events-auto relative flex w-fit min-w-[min(21rem,calc(100vw-2rem))] max-w-[min(39rem,calc(100vw-2rem))] items-center overflow-hidden",
        compact
          ? "gap-3.5 rounded-full py-3 pl-3.5 pr-3"
          : "gap-4 rounded-2xl py-3.5 pl-4 pr-3",
      )}
    >
      <span
        className={cn(
          "toast-island-chip grid shrink-0 place-items-center rounded-full",
          compact ? "size-9" : "size-10",
        )}
      >
        <Icon className={cn("stroke-[2.5]", compact ? "size-[18px]" : "size-5")} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 pr-1">
        <p className="text-[15.5px] font-semibold leading-5 text-foreground">
          {toast.title}
        </p>
        {toast.description ? (
          <p
            className={cn(
              "mt-1 text-[13.5px] leading-5 text-muted-foreground",
              toast.tone === "error" ? "whitespace-pre-line" : "line-clamp-2 sm:truncate",
            )}
          >
            {toast.description}
          </p>
        ) : null}
      </div>

      {toast.action ? (
        toast.action.href ? (
          <Link to={toast.action.href} onClick={close} className={actionPillClass}>
            {toast.action.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick?.()
              close()
            }}
            className={actionPillClass}
          >
            {toast.action.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )
      ) : null}

      <button
        type="button"
        onClick={close}
        aria-label={dict.shell.dismiss}
        className="relative grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:-inset-1 after:content-['']"
      >
        <X className="size-[18px]" aria-hidden="true" />
      </button>

      {toast.duration !== null ? (
        <span
          aria-hidden="true"
          className={cn(
            "toast-island-bar pointer-events-none absolute bottom-0 h-[3.5px] rounded-full opacity-90",
            compact ? "inset-x-6" : "inset-x-0",
          )}
          style={{
            animationDuration: `${toast.duration}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      ) : null}
    </m.div>
  )
}

function Toaster() {
  const { dict } = useT()
  const toasts = useToasts()
  return (
    <section
      aria-label={dict.shell.notifications}
      className="toast-viewport pointer-events-none fixed inset-x-4 z-(--z-toast) flex justify-center"
    >
      {/* A persistent live region: announced reliably, and kept visible to assistive tech while a
          dialog or drawer is open (Radix hides everything else, but leaves [aria-live] alone). */}
      <div aria-live="polite" className="flex w-full flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

export { Toaster }
