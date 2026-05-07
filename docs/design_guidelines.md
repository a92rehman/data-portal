# DataHub Signup Form - Design Guidelines

## Design Approach

**Selected Framework**: Custom Design System (Enterprise Utility-Focused)
**Rationale**: As a data request management system, DataHub prioritizes efficiency, clarity, and professional credibility over visual flair. The design draws from enterprise design patterns (Fluent/Carbon) while incorporating your established indigo/purple brand identity.

**Core Principles**:
- Function-first clarity with strategic brand moments
- Trust-building through professionalism and structure
- Efficient information capture with minimal friction

---

## Color Palette

**Primary Brand Colors**:
- Primary Indigo: `250 70% 55%` - Main interactive elements, headers
- Deep Purple: `270 65% 45%` - Gradient partner, depth accents
- Brand Gradient: `linear-gradient(135deg, indigo → purple)` - Header treatment only

**Neutrals (Dark Mode)**:
- Background: `240 10% 8%` - Main canvas
- Surface: `240 8% 12%` - Form container, cards
- Border: `240 6% 20%` - Subtle divisions
- Text Primary: `0 0% 95%` - Headings, labels
- Text Secondary: `240 5% 65%` - Helper text, descriptions

**Semantic**:
- Success: `142 70% 45%` - Validation feedback
- Error: `0 70% 55%` - Error states
- Warning: `38 90% 50%` - Caution indicators

---

## Typography

**Font Stack**: 
- Primary: 'Inter' (Google Fonts) - UI, forms, body
- Display: 'Outfit' (Google Fonts) - Page headers

**Scale**:
- Page Header: text-3xl/4xl, font-bold (Outfit)
- Section Headers: text-xl, font-semibold (Inter)
- Form Labels: text-sm, font-medium, uppercase tracking-wide
- Input Text: text-base, font-normal
- Helper Text: text-sm, text-secondary
- Button Text: text-sm, font-semibold

---

## Layout System

**Container Structure**:
- Centered layout: `max-w-md` (448px) for form focus
- Outer padding: `px-6 py-12` mobile, `py-20` desktop
- Spacing primitives: Use tailwind units of **4, 6, and 8** consistently
  - Component gaps: `space-y-6`
  - Section spacing: `mb-8`
  - Input groups: `space-y-4`

**Form Layout**:
```
[Gradient Header Bar - full width, h-2]
[Centered Container - max-w-md]
  [Logo/Brand - mb-8]
  [Page Header + Subtitle - mb-8]
  [Form Card - bg-surface, rounded-xl, p-8]
    [Form Fields - space-y-6]
    [Submit Button - w-full, mt-8]
  [Footer Links - mt-6, text-center]
```

---

## Component Library

### Form Container
- Background: Surface color with subtle border
- Border radius: `rounded-xl` (12px)
- Padding: `p-8` desktop, `p-6` mobile
- Shadow: `shadow-2xl` with purple tint

### Input Fields
**Structure**: Label + Input + Helper/Error text
- Labels: Uppercase, tracking-wide, mb-2, text-sm, text-primary
- Inputs: 
  - Background: Slightly lighter than surface `240 8% 16%`
  - Border: `1px solid border-color`, focus: `2px solid primary`
  - Height: `h-12`, padding: `px-4`
  - Rounded: `rounded-lg`
  - Font: text-base
  - Transition: `transition-all duration-200`

**States**:
- Default: Border subtle, text-secondary placeholder
- Focus: Border primary-indigo, slight glow ring
- Error: Border error-red, helper text in red
- Success: Border success-green (optional validation)

### Select/Dropdown (Team/Department)
- Match input styling exactly
- Custom arrow icon (chevron-down) in primary color
- Dropdown menu: bg-surface, border, rounded-lg, shadow-xl
- Options: py-3 px-4, hover:bg-indigo/10

### Primary Button (Submit)
- Full width: `w-full`
- Height: `h-12`
- Background: Primary indigo with subtle gradient
- Text: White, font-semibold, text-sm
- Rounded: `rounded-lg`
- Hover: Slightly lighter, subtle scale-up (scale-105)
- Disabled: Opacity 50%, cursor-not-allowed
- Loading state: Spinner icon + "Creating account..."

### Header Treatment
- Thin gradient bar at top: `h-2 w-full` with indigo→purple gradient
- Brand logo/name: Indigo color, below gradient bar
- Page title: Large, bold (Outfit font)
- Subtitle: Text-secondary, regular weight, explains purpose

### Footer Elements
- Links: Text-sm, text-secondary, hover:text-primary
- Spacing: Inline links with `·` separator
- Include: "Already have account? Sign in" + "Terms" + "Privacy"

---

## Page Structure

**Header Section**:
1. Gradient bar (full-width, h-2, fixed to top)
2. Logo/brand mark (centered, mt-8)
3. "Create Your Account" (text-3xl, font-bold, Outfit)
4. "Join DataHub to submit and track data requests" (text-secondary, mt-2)

**Form Section** (Surface card, max-w-md, centered):
1. Full Name input (required)
2. Email Address input (required, type="email")
3. Team/Department dropdown (required, searchable select)
4. Role indicator (read-only badge: "Data Requester")
5. Terms acceptance checkbox + text
6. Submit button "Create Account"

**Footer Section**:
- "Already have an account? Sign in" link
- Secondary links: Terms · Privacy · Support

---

## Accessibility & Interactions

- All inputs have associated labels (aria-labelledby)
- Error messages: aria-live="polite" regions
- Focus indicators: 2px offset ring in primary color
- Keyboard navigation: Tab order follows visual hierarchy
- Required fields: Asterisk in label + aria-required
- Form validation: Real-time on blur, clear error messaging

**Micro-interactions** (minimal):
- Input focus: Smooth border color transition (200ms)
- Button hover: Subtle lift effect (2px translate-y)
- Success: Checkmark animation on submit
- No distracting animations

---

## Images

**No hero image required** - This is a utility form, not a marketing page. Visual focus remains on the form itself.

**Supporting Visuals** (optional):
- Background: Subtle indigo/purple gradient mesh (very low opacity 5%) at bottom-right corner
- Logo/Icon: DataHub brand mark at top center (if available)

---

## Quality Standards

- Every input has clear labels, helper text, and error states defined
- Spacing follows 4/6/8 unit system religiously
- Color contrast meets WCAG AA (4.5:1 minimum)
- Mobile-first responsive breakpoints
- Form validation provides specific, helpful error messages
- Loading states prevent double-submission
- Success redirect or confirmation message after submission