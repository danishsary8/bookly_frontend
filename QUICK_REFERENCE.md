# Modern UI Design System - Quick Reference

## Color Palette

```
PRIMARY:    --primary: oklch(0.5 0.12 160)      // Sage Green
ACCENT:     --accent: oklch(0.62 0.15 35)       // Terracotta
SUCCESS:    --success: oklch(0.57 0.13 135)     // Fresh Green
DESTRUCTIVE:--destructive: oklch(0.58 0.2 25)  // Ruby Red
FOREGROUND: --foreground: oklch(0.2 0.015 65)   // Deep Charcoal
BACKGROUND:--background: oklch(0.98 0.008 90)  // Warm Cream
```

## Typography

- **Headings**: `font-sans` with Sora family
- **Body**: `font-sans` with Manrope family
- **Monospace**: `font-mono` for code

## Spacing Scale
`4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px...`

## Border Radius
- `rounded-lg`: 8px (default)
- `rounded-xl`: 12px (cards)
- `rounded-2xl`: 16px (sections)

## Shadows
- `shadow-sm`: Base cards (light)
- `shadow-md`: Hover/elevated states
- No custom shadows in Tailwind v4

## Animation Timings

```tsx
// Fast interaction
transition={{ duration: 0.15 }} 

// Standard transition
transition={{ duration: 0.2 }} 

// Slower animation
transition={{ duration: 0.3 }} 

// Entrance animation
transition={{ duration: 0.4 }} 

// List stagger
delay: index * 0.05 // 50ms between items
```

## Common Patterns

### Button
```tsx
import { Button } from "@/components/Button";

<Button variant="primary" size="md" loading={isLoading}>
  Click me
</Button>
```

### Toast
```tsx
import { Toast, ToastContainer } from "@/components/Toast";

const [toasts, setToasts] = useState([]);

// Show toast
setToasts([...toasts, { 
  id: Date.now().toString(),
  message: "Success!",
  type: "success"
}]);
```

### Skeleton
```tsx
import { Skeleton, CardSkeleton, GridSkeleton } from "@/components/Skeleton";

<CardSkeleton />
<GridSkeleton count={6} />
```

### StatCard
```tsx
import { StatCard } from "@/components/StatCard";

<StatCard 
  label="Total Revenue"
  value="$12,500"
  change="+12% from last month"
  isPositive={true}
  icon={DollarSign}
  trend={[40, 70, 45, 90, 65, 80, 95]}
/>
```

### Animated Container
```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  whileHover={{ y: -4 }}
>
  Content
</motion.div>
```

## Semantic Colors in Classes

```tsx
// Use design tokens, not raw colors
className="text-foreground"        // Not text-slate-900
className="bg-card"                 // Not bg-white
className="border-border/50"        // Not border-slate-200
className="text-primary"            // Not text-green-600
className="bg-primary/10"           // Not bg-green-50
className="text-success"            // Not text-emerald-700
className="bg-destructive/10"       // Not bg-rose-50
```

## Focus States

```tsx
className="focus-ring" 
// Adds: outline-none ring-2 ring-primary ring-offset-2 ring-offset-background
```

## Hover Effects

```tsx
className="hover-lift"          // Scale up, lift, add shadow
className="hover-lift-sm"       // Subtle lift
className="interactive-hover"   // Scale 1.05
className="interactive-press"   // Active scale 0.95
```

## Common Responsive Patterns

```tsx
// Stack on mobile, grid on desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"

// Padding adjustments
className="p-6 md:p-8"

// Font size scaling
className="text-base md:text-lg lg:text-xl"
```

## Animation Utilities

```tsx
// Entrance animations
.animate-slide-in-bottom    // From bottom
.animate-slide-in-left      // From left
.animate-fade-in            // Fade
.animate-scale-in           // Scale up

// Continuous animations
.animate-float              // Float up/down
.animate-bounce-subtle      // Subtle bounce
.animate-pulse-soft         // Soft pulse

// Loading states
.animate-shimmer            // Shimmer effect
.skeleton-shimmer           // Combined skeleton + shimmer

// Page transitions
.page-enter                 // Blur in
.animate-blur-in
```

## CSS Variables Reference

All these are available in Tailwind classes:
- `var(--radius)`: Border radius
- `var(--primary)`: Primary color
- `var(--accent)`: Accent color
- `var(--foreground)`: Text color
- `var(--background)`: Background color
- `var(--border)`: Border color

## Component Imports

```tsx
import { Button } from "@/components/Button";
import { Toast, ToastContainer } from "@/components/Toast";
import { Skeleton, CardSkeleton, GridSkeleton, TableSkeleton } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
```

## Performance Tips

1. Use `motion.div` only when needed (don't wrap everything)
2. Prefer hover pseudo-classes over hover:scale-105
3. GPU accelerate with `will-change: transform`
4. Use `whileInView` for animations below fold
5. Keep animation durations consistent (150ms-600ms)

## Dark Mode

All colors automatically adjust via CSS variables:
```css
.dark {
  --primary: oklch(0.6 0.12 160); /* Lighter in dark mode */
  --background: oklch(0.12 0.01 65); /* Dark background */
  /* ... etc */
}
```

No need for dark: prefixes for semantic colors!

## Testing Colors for Accessibility

Use WCAG AA standards:
- Contrast ratio ≥ 4.5:1 for body text
- Contrast ratio ≥ 3:1 for large text
- All semantic colors pass WCAG AA

---

**Last Updated**: April 1, 2026
**Design System Version**: 2.0.0
