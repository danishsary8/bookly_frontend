import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// MASTER §6.1. Every size keeps a hit area of at least 44x44px: the compact
// sizes (used inside 36px inputs) extend theirs with an invisible ::after.
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[15px] font-semibold tracking-[0.01em]",
    "transition-[background-color,color,border-color,filter,transform] duration-150 ease-out",
    "active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-40",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        cta: "bg-accent text-accent-foreground hover:brightness-105",
        destructive: "bg-destructive text-background hover:brightness-110",
        outline: "border border-input bg-transparent text-foreground hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-lapis-tint dark:hover:bg-border",
        ghost: "text-foreground hover:bg-secondary",
        link: "h-auto px-1 text-primary underline-offset-4 hover:underline active:scale-100",
        "on-lapis": "border border-on-lapis-muted bg-transparent text-on-lapis hover:bg-on-lapis/10 focus-visible:ring-gold focus-visible:ring-offset-lapis",
      },
      size: {
        default: "h-11 px-5",
        xs: "h-8 gap-1 px-2.5 text-xs after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-11 px-4 text-sm",
        lg: "h-12 px-6",
        icon: "size-11",
        "icon-xs": "size-6 after:absolute after:-inset-2.5 after:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 after:absolute after:-inset-1.5 after:content-[''] [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, disables the button and sets aria-busy. Pair it with a verb change ("Saving…"). */
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants, type ButtonProps }
