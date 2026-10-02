import * as React from "react"
import { motion } from "motion/react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { useControllableState } from "@/hooks/useControllableState"
import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"

/*
 * MASTER §6.16: underline tabs. Radix handles roles and arrow keys; the 2px
 * indicator slides to the active trigger with a shared layoutId.
 */

const TabsContext = React.createContext<{ value: string; layoutId: string }>({ value: "", layoutId: "" })

type TabsProps = Omit<React.ComponentProps<typeof TabsPrimitive.Root>, "value" | "defaultValue" | "onValueChange"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function Tabs({ value, defaultValue = "", onValueChange, className, ...props }: TabsProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange)
  const layoutId = `tabs-indicator-${React.useId()}`
  return (
    <TabsContext.Provider value={{ value: current, layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={current}
        onValueChange={setCurrent}
        className={cn("grid gap-6", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("no-scrollbar flex gap-6 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, value, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const tabs = React.useContext(TabsContext)
  const active = tabs.value === value
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md text-[15px] font-semibold text-muted-foreground transition-colors duration-150",
        "hover:text-foreground data-[state=active]:text-foreground disabled:pointer-events-none disabled:opacity-40",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
      {...props}
    >
      {children}
      {active ? (
        <motion.span
          layoutId={tabs.layoutId}
          transition={transitions.toggle}
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      ) : null}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 rounded-sm", className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
