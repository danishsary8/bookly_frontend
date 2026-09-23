# Bookly Design System Guide

## Overview
This guide explains the modern design system used in the Bookly bookstore. All styling is centralized and uses semantic design tokens to ensure consistency and maintainability.

## Color System

### Using Colors in Components

Instead of hardcoding colors, **always use semantic design tokens**:

```tsx
// ❌ DON'T DO THIS
<div className="bg-orange-500 text-white">...</div>

// ✅ DO THIS
<div className="bg-primary text-primary-foreground">...</div>
```

### Available Color Tokens

#### Primary (Sage Green)
```tsx
bg-primary           // Primary background (button, active states)
text-primary         // Primary text
border-primary       // Primary borders
ring-primary         // Focus ring color

// Usage
<button className="bg-primary text-primary-foreground">Submit</button>
```

#### Accent (Terracotta)
```tsx
bg-accent            // Accent backgrounds (highlights, pricing)
text-accent          // Accent text
border-accent        // Accent borders
ring-accent          // Accent focus ring

// Usage
<span className="text-accent font-bold">${price}</span>
```

#### Success (Green)
```tsx
bg-success           // Success states (confirmations, paid badges)
text-success         // Success text
border-success       // Success borders

// Usage
<div className="bg-success/5 text-success border border-success/30">Order confirmed!</div>
```

#### Destructive (Red)
```tsx
bg-destructive       // Error/delete states
text-destructive     // Error text
border-destructive   // Error borders

// Usage
<div className="bg-destructive/5 text-destructive border border-destructive/30">Error</div>
```

#### Background & Foreground
```tsx
bg-background        // Page background
text-foreground      // Primary text color
bg-card             // Card backgrounds
text-card-foreground // Card text

// Usage
<div className="bg-card text-foreground">Content</div>
```

#### Borders & Inputs
```tsx
border-border        // Default border color
bg-input            // Input background
focus:ring-ring     // Focus ring

// Usage
<input className="border border-border/50 focus:ring-2 focus:ring-primary/20" />
```

### Opacity Modifiers

Use `/` syntax for opacity:

```tsx
border-border/50     // 50% opacity
bg-primary/5         // 5% opacity
text-foreground/70   // 70% opacity
```

---

## Typography

### Font Families

```tsx
// Headings (Sora)
<h1 className="font-bold text-4xl">Main Heading</h1>
<h2 className="font-bold text-3xl">Subheading</h2>

// Body (Manrope)
<p className="text-base leading-relaxed">Body text</p>
```

### Font Weights
- **400**: Regular (body text)
- **500**: Medium (labels)
- **600**: Semibold (strong text)
- **700**: Bold (headings, strong emphasis)
- **800**: Extrabold (display text)

### Typography Hierarchy
```tsx
// Heading
<h1 className="text-4xl md:text-5xl font-bold tracking-tight">
  Page Title
</h1>

// Subheading
<h2 className="text-2xl md:text-3xl font-bold tracking-tight">
  Section Title
</h2>

// Body
<p className="text-base leading-relaxed">
  Regular paragraph text with good line height.
</p>

// Small text
<p className="text-sm text-foreground/70">
  Secondary text with reduced opacity.
</p>

// Label
<label className="text-xs uppercase tracking-[0.1em] text-foreground/60 font-medium">
  Form Label
</label>
```

---

## Spacing Scale

### Standard Spacing Values
All spacing is based on 4px base unit:

```
4px   = p-1
8px   = p-2
12px  = p-3
16px  = p-4   ← Most common
20px  = p-5
24px  = p-6
32px  = p-8
40px  = p-10
48px  = p-12
```

### Using Gaps (Preferred Method)

For spacing between elements, use `gap` instead of margin/padding:

```tsx
// ✅ Good - use gap for spacing
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// ❌ Avoid - mixing margins with gap
<div className="flex flex-col gap-4 mb-4">...</div>
```

### Padding vs Margin

```tsx
// Use padding for internal spacing
<div className="bg-card p-6 rounded-2xl">
  <h3 className="text-lg font-bold mb-3">Title</h3>
  <p>Content</p>
</div>

// Use gap for spacing between siblings
<div className="space-y-4">
  {items.map(item => <Item key={item.id} {...item} />)}
</div>

// Use margin only when gap/flex isn't possible
<div className="mt-8">Spaced from above</div>
```

---

## Border Radius Scale

```tsx
// Small buttons/inputs
rounded-lg          // 8px (0.5rem)

// Medium cards/elements
rounded-xl          // 12px (0.75rem)

// Large containers
rounded-2xl         // 16px (1rem)

// Very large
rounded-3xl         // 20px (1.25rem)
```

### When to Use Which

```tsx
// Buttons and small inputs
<button className="rounded-lg">Click me</button>

// Form inputs and small cards
<input className="rounded-lg border border-border/50" />

// Product cards and medium containers
<div className="rounded-2xl bg-card card-shadow">

// Page sections and large containers
<section className="rounded-2xl border border-border/50 bg-card">
```

---

## Shadows

### Shadow Utilities

```tsx
// Base card shadow (subtle)
card-shadow          // shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.08)]

// Elevated shadow (hover state)
card-shadow-lg       // shadow-[0_12px_24px_rgba(0,0,0,0.12),0_20px_40px_rgba(0,0,0,0.08)]
```

### Using Shadows

```tsx
// Regular card
<div className="bg-card border border-border/50 rounded-2xl p-6 card-shadow">
  Content
</div>

// Hovering card (lifted effect)
<div className="bg-card border border-border/50 rounded-2xl p-6 
               hover:card-shadow-lg transition-all duration-300">
  Hover me
</div>
```

---

## Component Patterns

### Buttons

```tsx
// Primary button (call-to-action)
<button className="h-10 px-6 rounded-lg bg-primary text-primary-foreground 
                   font-medium hover:bg-primary/90 
                   transition-all duration-200">
  Submit
</button>

// Secondary button
<button className="h-10 px-6 rounded-lg border border-border/50 
                   text-foreground hover:bg-background/80
                   transition-all duration-200">
  Cancel
</button>

// Destructive button
<button className="h-10 px-6 rounded-lg bg-destructive/10 text-destructive
                   border border-destructive/30
                   hover:bg-destructive/20
                   transition-all duration-200">
  Delete
</button>
```

### Form Inputs

```tsx
// Text input
<input
  type="text"
  placeholder="Enter text..."
  className="h-10 rounded-lg border border-border/50 bg-background 
             px-3 text-sm text-foreground 
             placeholder:text-foreground/50
             focus:ring-2 focus:ring-primary/20 focus:border-primary/40
             transition-all duration-200"
/>

// Input with icon
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
  <input
    placeholder="..."
    className="h-10 w-full rounded-lg border border-border/50 bg-background 
               pl-10 pr-3 text-sm
               focus:ring-2 focus:ring-primary/20 focus:border-primary/40
               transition-all duration-200"
  />
</div>

// Textarea
<textarea
  placeholder="Enter message..."
  className="min-h-24 rounded-lg border border-border/50 bg-background 
             p-3 text-sm text-foreground
             placeholder:text-foreground/50
             focus:ring-2 focus:ring-primary/20 focus:border-primary/40
             transition-all duration-200"
/>
```

### Cards

```tsx
// Basic card
<div className="rounded-2xl border border-border/50 bg-card p-6 card-shadow">
  <h3 className="text-lg font-bold text-foreground mb-3">Title</h3>
  <p className="text-sm text-foreground/70">Content</p>
</div>

// Interactive card (hover lift)
<div className="group rounded-2xl border border-border/50 bg-card p-6 
               card-shadow hover:card-shadow-lg hover:-translate-y-1
               transition-all duration-300 cursor-pointer">
  <h3 className="text-lg font-bold text-foreground mb-3">Title</h3>
  <p className="text-sm text-foreground/70">Content</p>
</div>
```

### Status Messages

```tsx
// Success message
<div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 
               text-sm font-medium text-success">
  ✓ Operation successful
</div>

// Error message
<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 
               text-sm font-medium text-destructive">
  ✗ Something went wrong
</div>

// Info message
<div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 
               text-sm font-medium text-primary">
  ℹ Important information
</div>
```

---

## Animations

### Transition Pattern

```tsx
// Standard smooth transition
className="transition-all duration-200"

// Specific property transition
className="transition-colors duration-200"

// Multiple properties
className="hover:bg-primary/90 hover:shadow-lg transition-all duration-200"
```

### Common Animations

```tsx
// Fade in
className="opacity-0 animate-fade-in"

// Slide in
className="animate-slide-in-bottom"

// Scale in
className="animate-scale-in"

// With Framer Motion
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## Responsive Design

### Breakpoints
- **sm**: 640px
- **md**: 768px  
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Mobile-First Approach

```tsx
// Mobile first, then enhance
<div className="
  grid grid-cols-1    // Mobile: 1 column
  md:grid-cols-2      // Tablet: 2 columns
  lg:grid-cols-4      // Desktop: 4 columns
  gap-4
">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Text sizing
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
  Responsive Heading
</h1>
```

---

## Accessibility Checklist

### Every Interactive Element Should Have:
- ✅ Keyboard navigation support
- ✅ Focus state (visible outline or ring)
- ✅ Semantic HTML elements
- ✅ ARIA labels where needed
- ✅ Proper color contrast (WCAG AA)

### Implementation

```tsx
// Good button
<button
  onClick={handleClick}
  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground
             hover:bg-primary/90 focus:ring-2 focus:ring-primary/40
             transition-all duration-200"
  aria-label="Save changes"
>
  Save
</button>

// Good form
<form className="space-y-4">
  <div>
    <label htmlFor="email" className="block text-sm font-medium mb-1">
      Email Address
    </label>
    <input
      id="email"
      type="email"
      required
      aria-label="Email address"
      className="w-full h-10 rounded-lg border border-border/50
                 focus:ring-2 focus:ring-primary/20"
    />
  </div>
</form>
```

---

## Best Practices

### ✅ DO

- Use semantic design tokens for all colors
- Use gap for spacing between elements
- Keep consistent spacing scale
- Use flex/grid for layouts
- Use transition utilities for smooth interactions
- Include focus states on interactive elements
- Use semantic HTML elements
- Write mobile-first responsive designs

### ❌ DON'T

- Hardcode color values
- Mix margin and gap on same element
- Use arbitrary spacing values (`mb-[17px]`)
- Use floats for layout
- Forget hover/focus states
- Use divs for interactive elements (use button/a)
- Skip ARIA labels
- Forget responsive considerations

---

## Common Patterns

### Page Header
```tsx
<section className="rounded-2xl border border-border/50 bg-card card-shadow p-6 md:p-8">
  <p className="text-xs uppercase tracking-[0.1em] text-primary font-bold">Section</p>
  <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">
    Page Title
  </h1>
  <p className="mt-3 text-sm text-foreground/70 max-w-2xl">
    Description or tagline.
  </p>
</section>
```

### Card Grid
```tsx
<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {items.map((item) => (
    <div key={item.id} className="rounded-2xl border border-border/50 bg-card p-6 card-shadow">
      <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
      <p className="text-sm text-foreground/70">{item.description}</p>
    </div>
  ))}
</section>
```

### Form
```tsx
<form className="space-y-4">
  <div>
    <label className="text-xs uppercase tracking-[0.08em] text-foreground/60 font-medium">
      Label
    </label>
    <div className="relative mt-2">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
      <input
        placeholder="..."
        className="h-10 w-full rounded-lg border border-border/50 bg-background pl-10 pr-3
                   focus:ring-2 focus:ring-primary/20"
      />
    </div>
  </div>
  
  <button type="submit" className="w-full h-10 rounded-lg bg-primary text-primary-foreground
                                    font-medium hover:bg-primary/90 transition-all duration-200">
    Submit
  </button>
</form>
```

---

## Migration Guide

### From Old System to New

Old → New:
```tsx
bg-slate-900        → bg-primary
bg-white            → bg-card
text-slate-900      → text-foreground
text-slate-600      → text-foreground/70
border-slate-200    → border-border/50
orange-500          → accent
emerald-600         → success
rose-600            → destructive
rounded-xl          → rounded-xl (unchanged)
shadow-lg           → card-shadow
```

---

## Support & Updates

For questions or updates to the design system:
1. Update color tokens in `src/index.css`
2. Add new components to this guide
3. Ensure all components follow the patterns
4. Test in light and dark modes
5. Verify accessibility compliance

---

**Last Updated**: 2026-04-01
**Design System Version**: 1.0
**Status**: Production Ready

