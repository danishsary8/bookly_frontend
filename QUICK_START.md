# Quick Start Guide - Professional Modern UI

## 🚀 Get Started in 5 Minutes

### Step 1: Fix Dependencies
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
# Note: tw-animate-css has been removed from package.json
```

### Step 2: Start Development
```bash
npm run dev
# App runs at http://localhost:5173
```

### Step 3: Import Components
```tsx
// Page transitions
import { PageTransition } from "@/components/PageTransition";

// Card animations
import { AnimatedCard } from "@/components/AnimatedCard";

// Smooth interactions
import { SmoothButton } from "@/components/SmoothButton";
import { SmoothInput } from "@/components/SmoothInput";
```

---

## 📚 Component Quick Reference

### PageTransition
Wrap your entire page/route:
```tsx
<PageTransition>
  <YourPageContent />
</PageTransition>
```

**Props**: None (just wraps children)
**Duration**: 500ms enter, 300ms exit

### AnimatedCard
Reusable animated card container:
```tsx
<AnimatedCard 
  variant="lift"    // "lift" | "scale" | "slide"
  delay={0}         // 0, 1, 2, 3... (stagger effect)
  className="p-6"   // Custom classes
>
  Your Card Content
</AnimatedCard>
```

**Variants**:
- `lift` - Lifts up on hover (default)
- `scale` - Scales to 1.02x on hover
- `slide` - Slides right on hover

### SmoothButton
Professional button with interactions:
```tsx
<SmoothButton
  variant="primary"     // "primary" | "secondary" | "outline" | "ghost"
  size="md"            // "sm" | "md" | "lg"
  isLoading={false}    // Shows spinner when true
  icon={<Icon />}      // Optional icon
  onClick={handler}
>
  Click Me
</SmoothButton>
```

### SmoothInput
Premium form input:
```tsx
<SmoothInput
  label="Email"           // Animated label
  type="email"
  icon={<MailIcon />}    // Optional icon
  error={errorMessage}   // Error text
  placeholder="Enter..."
  required
/>
```

---

## 🎨 Design Tokens

### Colors (Use these classes)
```tsx
// Text colors
text-foreground        // Deep charcoal
text-primary          // Sage green
text-accent          // Terracotta
text-destructive     // Ruby red
text-success         // Fresh green
text-muted-foreground // Light gray

// Background colors
bg-background        // Light cream
bg-card             // Off-white
bg-primary          // Sage green
bg-accent          // Terracotta
bg-destructive     // Ruby red
bg-success        // Fresh green
bg-muted          // Light gray
```

### Spacing (8px Grid)
```tsx
p-1  // 8px
p-2  // 16px
p-4  // 32px
p-6  // 48px
p-8  // 64px

gap-2  // 16px gap
gap-4  // 32px gap
gap-6  // 48px gap
```

### Rounded Corners
```tsx
rounded-sm    // 6px (xs)
rounded      // 10px (md)
rounded-lg   // 12px (lg)
rounded-xl   // 14px (xl)
rounded-2xl  // 18px (2xl)
rounded-full // 9999px (pill)
```

---

## ✨ Animation Classes

### Entrance Animations
```tsx
animate-slide-in-bottom  // Slides up from bottom
animate-slide-in-left    // Slides from left
animate-slide-in-right   // Slides from right
animate-fade-in         // Simple fade
animate-scale-in        // Scale pop-in
animate-blur-in         // Blur fade
```

### Continuous Animations
```tsx
animate-float           // Floating effect
animate-glow           // Glowing pulse
animate-pulse-soft     // Opacity pulse
animate-bounce-subtle  // Gentle bounce
animate-spin-slow      // Slow rotation
```

### Utility Classes
```tsx
hover-lift             // Lifts on hover with shadow
hover-lift-sm          // Subtle lift effect
interactive-hover      // Scales 1.05x on hover
interactive-press      // Scales 0.95x on press
transition-smooth      // 200ms transition
transition-smooth-lg   // 300ms transition
```

---

## 🎯 Common Patterns

### Grid with Stagger
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item, index) => (
    <AnimatedCard key={item.id} delay={index} variant="lift">
      {item.content}
    </AnimatedCard>
  ))}
</div>
```

### Form with Validation
```tsx
<form className="space-y-4 max-w-md">
  <SmoothInput
    label="Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    error={errors.name}
    required
  />
  <SmoothInput
    label="Email"
    type="email"
    icon={<Mail />}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    error={errors.email}
  />
  <SmoothButton
    variant="primary"
    size="lg"
    isLoading={isSubmitting}
    className="w-full"
  >
    Submit
  </SmoothButton>
</form>
```

### Modal with Animations
```tsx
<PageTransition>
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Modal Title</h2>
      <p>Modal content here...</p>
      <div className="flex gap-2 justify-end">
        <SmoothButton variant="outline" onClick={onClose}>
          Cancel
        </SmoothButton>
        <SmoothButton variant="primary">
          Confirm
        </SmoothButton>
      </div>
    </div>
  </Modal>
</PageTransition>
```

---

## 📱 Responsive Breakpoints

```tsx
// Mobile-first approach
className="text-sm md:text-base lg:text-lg"

// Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Spacing
className="p-4 md:p-6 lg:p-8"

// Hidden/Visible
className="hidden md:block"  // Hidden on mobile
className="block md:hidden"  // Hidden on desktop
```

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## ♿ Accessibility Checklist

When creating components:

- [ ] All buttons have `onClick` handlers
- [ ] All inputs have `label` prop
- [ ] Focus rings visible (automatic with SmoothButton/SmoothInput)
- [ ] Color not the only indicator (use icons)
- [ ] Form errors have `error` prop
- [ ] Images have `alt` text
- [ ] Links have proper `href`
- [ ] Keyboard navigation works (Tab key)

---

## 🔧 Customization

### Change Primary Color
Edit `src/index.css`:
```css
:root {
  /* Change from sage green to blue */
  --primary: oklch(0.5 0.12 250);  /* Blue */
  --primary-foreground: oklch(0.98 0.005 95);
}
```

### Change Animation Speed
```tsx
// Make animations faster
transition={{ duration: 0.2 }}  // 200ms

// Make animations slower
transition={{ duration: 0.6 }}  // 600ms
```

### Change Button Color
```tsx
// Use accent color instead of primary
<SmoothButton 
  className="bg-accent hover:bg-accent/90 text-accent-foreground"
>
  Accent Button
</SmoothButton>
```

---

## 🐛 Troubleshooting

### Animations not working?
- Check if Framer Motion is installed: `npm list framer-motion`
- Verify `src/index.css` is imported in `main.tsx`
- Check browser DevTools for CSS errors

### Build errors?
```bash
# Clear cache and rebuild
rm -rf node_modules .vite dist
npm install
npm run build
```

### Styles not applying?
- Ensure component has `className` prop
- Check for conflicting Tailwind classes
- Verify design tokens are available (`--primary`, etc.)

---

## 📖 Full Documentation

- **PROFESSIONAL_UI_GUIDE.md** - Complete component reference
- **IMPLEMENTATION_CHECKLIST.md** - Step-by-step guide
- **MODERN_PROFESSIONAL_SUMMARY.md** - Full overview

---

## 💡 Pro Tips

1. **Stagger lists with index**:
   ```tsx
   delay={index * 0.5}  // Each item delays 50ms
   ```

2. **Use spring physics for snappy feel**:
   ```tsx
   whileHover={{ scale: 1.02 }}
   transition={{ type: "spring", stiffness: 400 }}
   ```

3. **Disable animations for reduced-motion users**:
   ```tsx
   const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   ```

4. **Test animations with DevTools**:
   - Slow down animations in Chrome DevTools
   - Check 60fps frame rate
   - Monitor performance

5. **Use semantic HTML**:
   ```tsx
   <button>Don't use <div> as button</button>
   <main>Wrap page in <main></main>
   <header>Use semantic elements</header>
   ```

---

## 🎓 Learning Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Web Animations Best Practices](https://web.dev/animations/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated**: April 2026
**Ready to Build**: Yes ✅
