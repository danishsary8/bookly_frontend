import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// MASTER §6.15: 44x24 track, 20px thumb, 220ms.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-input/50 transition-colors duration-(--dur-toggle)",
        "data-[state=checked]:bg-primary",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-card shadow-sm transition-transform duration-(--dur-toggle) ease-(--ease-out-expo)",
          "data-[state=checked]:translate-x-[22px] dark:data-[state=checked]:bg-primary-foreground motion-reduce:transition-none",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
