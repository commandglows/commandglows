# CommandGlows Design Specification

## Brand Overview

**CommandGlows** is a productivity ecosystem offering tools and training designed for Windows workflows. The brand targets entrepreneurs, freelancers, and professionals seeking to transform their digital productivity, with a unique perspective from a neurodivergent founder.

---

## Design System Reference

### Brand Colors

**Rainbow Gradient (Primary Brand Colors)**

These are the ONLY colors used in the CommandGlows brand, taken directly from the logo gradient.

| Color Name | Hex Value | RGB | Usage |
|------------|-----------|-----|-------|
| **Red** | `#ff0033` | rgb(255, 0, 51) | Gradient start, accents, CTAs |
| **Magenta** | `#ff00c8` | rgb(255, 0, 200) | Primary accent, links, highlights |
| **Yellow** | `#ffe500` | rgb(255, 229, 0) | Secondary accent, highlights |
| **Green** | `#00ff44` | rgb(0, 255, 68) | Tertiary accent, success states |
| **Cyan** | `#00c8ff` | rgb(0, 200, 255) | Quaternary accent, info states |

**Neutral Colors**

Used only for backgrounds, text, and subtle UI elements:
- Grays (Tailwind gray scale)
- Neutrals (Tailwind neutral scale)
- Zinc (for box-shadow only)

### Brand Gradient

The signature rainbow gradient is used throughout the site:
- Logo text effect
- Link hover animations
- Button backgrounds
- Accent decorations
- Page overlays

```css
/* 45-degree gradient */
linear-gradient(45deg, #ff0033, #ff00c8, #ffe500, #00ff44, #00c8ff, #ff0033)

/* Horizontal gradient (for underlines) */
linear-gradient(90deg, #ff0033, #ff00c8, #ffe500, #00ff44, #00c8ff, #ff0033)
```

### Glass Effect (Glassmorphism)

Used for navbar and card components:
```css
backdrop-blur-md
bg-neutral-800/80 (dark mode)
bg-white/80 (light mode)
```

---

## Typography Scale

### Font Families

- **Logo**: `Audiowide` (custom font)
- **Body**: System fonts (Tailwind default)

### Responsive Typography Scale

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| H1 (Hero) | `text-3xl` (30px) | `text-5xl` (48px) | `text-6xl` (60px) |
| H2 (Section) | `text-2xl` (24px) | `text-3xl` (30px) | `text-4xl` (36px) |
| H3 (Card) | `text-lg` (18px) | `text-xl` (20px) | `text-2xl` (24px) |
| Body | `text-base` (16px) | `text-lg` (18px) | `text-lg` (18px) |
| Small | `text-sm` (14px) | `text-sm` (14px) | `text-base` (16px) |

---

## Spacing System

### Current Issues (Mobile)
- Excessive padding on sections causing wide empty spaces
- Section gaps too large on mobile
- Footer columns too spread out

### Recommended Spacing

| Section | Mobile Padding | Tablet Padding | Desktop Padding |
|---------|----------------|----------------|-----------------|
| Navbar | `px-3 py-2` | `px-4 py-3` | `px-6 py-4` |
| Hero | `px-4 py-8` | `px-6 py-12` | `px-8 py-14` |
| Content Sections | `px-4 py-8` | `px-6 py-10` | `px-8 py-14` |
| Footer | `px-4 py-8` | `px-6 py-10` | `px-16 py-20` |

### Section Gaps

| Breakpoint | Between Sections |
|------------|------------------|
| Mobile | `gap-8` or `py-8` |
| Tablet | `gap-10` or `py-10` |
| Desktop | `gap-14` or `py-14` |

---

## Component Styles

### Buttons

**Primary CTA**
- Background: Rainbow gradient or solid magenta `#ff00c8`
- Hover: Shift gradient or brighten to yellow `#ffe500`
- Text: White or black (depending on contrast)
- Border-radius: `rounded-xl`
- Padding: `px-6 py-3` (mobile) / `px-8 py-3` (desktop)

**Secondary CTA**
- Background: Transparent with rainbow gradient border
- Border: `2px solid` with gradient
- Hover: Fill with subtle gradient
- Border-radius: `rounded-xl`
- Padding: `px-6 py-3`

### Cards

**Pricing Cards**
- Free tier: Dark background with subtle rainbow gradient border
- Pro tier: Rainbow gradient background with shadow

### Navbar
- Glass effect with blur
- Sticky positioning
- Rounded corners: `rounded-[36px]`

---

## Visual Effects

### Rainbow Gradient Animation
Applied to links and logo:
```css
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### 3D Text Effect (Logo)
- Multi-layer text with shadows
- Mouse-follow parallax effect
- Glow effect behind text

### Decorative Elements
- Floating SVG icons (cubes, circles)
- Gradient blur decorations
- Subtle shadows and depth

---

## Mobile Optimization Priorities

1. **Reduce section padding** - Switch from `py-14` to `py-8` on mobile
2. **Compact navbar** - Smaller logo, tighter spacing
3. **Responsive grid** - Stack elements vertically with proper spacing
4. **Font size optimization** - Ensure readability without excessive scaling
5. **Button sizing** - Full-width on mobile, inline on desktop
6. **Footer layout** - Single column on mobile, multi-column on tablet+

---

## Accessibility Considerations

- Color contrast ratios meeting WCAG AA standards
- Focus states with visible ring outlines
- Reduced motion preferences respected
- Semantic HTML structure
- Proper heading hierarchy

---

## Implementation Notes

### Files to Update
1. `src/layouts/MainLayout.astro` - Container padding
2. `src/components/sections/landing/HeroSection.astro` - Hero spacing
3. `src/components/sections/navbar&footer/Navbar.astro` - Mobile navbar
4. `src/components/sections/navbar&footer/FooterSection.astro` - Footer layout
5. `src/components/sections/features/*.astro` - Section spacing
6. `src/components/sections/pricing/PricingSection.astro` - Card spacing
7. `src/components/sections/misc/FAQ.astro` - Accordion padding
8. `src/assets/styles/global.css` - Global spacing utilities

### Testing Checklist
- [ ] iPhone SE (375px)
- [ ] iPhone 12/13 (390px)
- [ ] iPad (768px)
- [ ] Desktop (1280px+)
- [ ] Dark mode on all breakpoints
