# Professional UI & Component Guide

## Overview

This document outlines the professional, modern UI implementation with smooth transitions, premium animations, and best-in-class user experience design patterns.

## Fixed Issues

1. **Removed `tw-animate-css` dependency** - This package was conflicting with Tailwind v4 causing `card-shadow` compilation errors
2. **Cleaned CSS imports** - Removed problematic imports and ensured Tailwind v4 compatibility
3. **Streamlined animation system** - All animations now use native CSS keyframes and Framer Motion

## Component Library

### Core Premium Components

#### 1. PageTransition
Smooth page-to-page transitions with fade and slide effects.

```tsx
<PageTransition>
  <YourPageContent />
</PageTransition>
```

**Features:**
- Fade-in on mount (500ms)
- Fade-out on exit (300ms)
- Smooth Y-axis translation
- Perfect for route changes

#### 2. AnimatedCard
Flexible card component with multiple animation variants.

```tsx
<AnimatedCard variant="lift" delay={1}>
  <CardContent />
</AnimatedCard>
```

**Variants:**
- `lift` - Lifts on hover with shadow enhancement
- `scale` - Scales up smoothly (1.02x)
- `slide` - Slides right on hover
- Configurable delay for stagger effects

#### 3. SmoothButton
Professional button with spring physics and multiple variants.

```tsx
<SmoothButton variant="primary" size="lg" isLoading={false}>
  Click Me
</SmoothButton>
```

**Features:**
- Spring physics (scale: 1.02 on hover, 0.98 on click)
- 4 variants: primary, secondary, outline, ghost
- 3 sizes: sm, md, lg
- Loading state with spinning icon
- Focus ring for accessibility

#### 4. SmoothInput
Premium input field with animated label and focus states.

```tsx
<SmoothInput
  label="Email"
  type="email"
  error={emailError}
  icon={<MailIcon />}
  placeholder="your@email.com"
/>
```

**Features:**
- Animated label color on focus
- Icon support
- Error state with smooth animation
- Focus ring matching design system
- Full accessibility support

## Design System

### Color Palette

- **Primary**: Warm Sage Green (`oklch(0.5 0.12 160)`)
- **Accent**: Warm Terracotta (`oklch(0.62 0.15 35)`)
- **Success**: Fresh Green (`oklch(0.57 0.13 135)`)
- **Destructive**: Ruby Red (`oklch(0.58 0.2 25)`)
- **Background**: Light Cream (`oklch(0.98 0.008 90)`)
- **Card**: Off-white (`oklch(0.99 0.006 92)`)
- **Foreground**: Deep Charcoal (`oklch(0.2 0.015 65)`)

### Typography

- **Headings**: Sora font (700 weight, -0.015em letter-spacing)
- **Body**: Manrope font (400-800 weights)
- **Leading**: 1.5em for body text
- **Sizes**: Responsive h1-h6 with mobile-first approach

### Spacing Grid

- Base unit: 8px
- Used for padding, margins, gaps
- Responsive adjustments at md (768px) and lg (1024px)

### Border Radius

- `--radius: 0.625rem` (10px)
- Variants: sm, md, lg, xl, 2xl, 3xl, 4xl
- Cards use `md` by default

## Animation System

### Keyframe Animations

1. **slideInFromBottom** - Slides up with fade (600ms)
2. **slideInFromLeft** - Slides from left with fade (600ms)
3. **slideInFromRight** - Slides from right with fade (600ms)
4. **fadeIn** - Simple fade effect (500ms)
5. **scaleIn** - Scale from 0.95 to 1 with fade (400ms)
6. **float** - Subtle up-down bounce (3s infinite)
7. **glow** - Box-shadow glow pulse (2s infinite)
8. **pulse-soft** - Opacity pulse (2s infinite)
9. **bounce-subtle** - Tiny Y-axis bounce (2s infinite)
10. **spin-slow** - Slow 360° rotation (3s infinite)
11. **ripple** - Material Design ripple effect (600ms)
12. **swipe-enter** - Full-width slide in from left (400ms)
13. **blur-in** - Blur fade-in effect (600ms)
14. **stagger-in** - Staggered item entrance (500ms with delays)

### Framer Motion Utilities

All components use spring physics:
- `type: "spring"`
- `stiffness: 400`
- `damping: 17`
- Creates natural, fluid motion

## Best Practices

### 1. Transitions
- Use `duration-200` for quick interactions (150-250ms)
- Use `duration-300` for moderate transitions (300-400ms)
- Use `duration-600` for page/major transitions (500-700ms)

### 2. Hover States
All interactive elements have smooth hover states:
```tsx
hover:shadow-md hover:-translate-y-1 transition-all duration-200
```

### 3. Focus States
Accessibility-focused with visible focus rings:
```tsx
focus:ring-2 focus:ring-primary focus:ring-offset-2
```

### 4. Loading States
All buttons and inputs support loading states with spinner animation

### 5. Error Handling
- Red destructive color for errors
- Smooth fade-in animations
- Clear visual distinction

## Implementation Examples

### Page with Smooth Transitions
```tsx
import { PageTransition } from "@/components/PageTransition";

export function HomePage() {
  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Your content */}
      </div>
    </PageTransition>
  );
}
```

### Grid with Staggered Cards
```tsx
import { AnimatedCard } from "@/components/AnimatedCard";

export function CardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <AnimatedCard key={item.id} delay={index}>
          {/* Card content */}
        </AnimatedCard>
      ))}
    </div>
  );
}
```

### Form with Premium Inputs
```tsx
import { SmoothInput } from "@/components/SmoothInput";
import { SmoothButton } from "@/components/SmoothButton";
import { Mail, Lock } from "lucide-react";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form className="space-y-4">
      <SmoothInput
        label="Email"
        type="email"
        icon={<Mail />}
        placeholder="Enter your email"
      />
      <SmoothInput
        label="Password"
        type="password"
        icon={<Lock />}
        placeholder="Enter your password"
      />
      <SmoothButton
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Sign In
      </SmoothButton>
    </form>
  );
}
```

## Performance Considerations

### GPU Acceleration
All animations use transform and opacity for best performance:
- Transform: `translate`, `scale`, `rotate`
- Opacity changes
- Avoid animating layout properties

### Stagger Delays
Use small delays (50ms increments) for stagger effects:
```tsx
delay={index * 0.05} // Each item delays 50ms
```

### Reduced Motion
Consider `prefers-reduced-motion` for accessibility:
```tsx
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

## Accessibility

✅ **Keyboard Navigation** - All buttons and inputs are keyboard accessible
✅ **Focus Indicators** - Clear 2px ring on focus
✅ **ARIA Labels** - Properly labeled form inputs
✅ **Color Contrast** - WCAG AA compliant ratios
✅ **Semantic HTML** - Proper heading hierarchy and landmarks

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All animations use standard CSS and JS APIs with proper fallbacks.

---

**Last Updated**: April 2026
**Version**: 2.0 - Professional Modern Design System
