---
Type: Reference | Status: Active | Completion: 85%
---

# DataKiln UX Style Guide

## Overview

This style guide establishes the visual design system for the DataKiln platform, ensuring consistency across all user interfaces. The system is built on a foundation of accessibility, usability, and modern design principles.

## Design Principles

### Core Values
- **Clarity**: Information should be presented in a clear, unambiguous manner
- **Efficiency**: Users should accomplish tasks with minimal friction
- **Scalability**: The system should work across different screen sizes and use cases
- **Accessibility**: All users should be able to use the platform effectively

### Key Principles
- **Progressive Disclosure**: Show essential information first, reveal complexity as needed
- **Visual Hierarchy**: Use typography, spacing, and color to guide user attention
- **Consistent Patterns**: Reuse established patterns to reduce cognitive load
- **Responsive Design**: Adapt seamlessly to different devices and screen sizes

## Typography

### Type Scale (1.25 Ratio)

The typographic scale uses a 1.25 ratio for harmonious proportions. All sizes are calculated from a 16px base.

| Scale | Size | Line Height | Usage |
|-------|------|-------------|-------|
| xs | 12.8px (0.8rem) | 1.2 | Small labels, captions |
| sm | 16px (1rem) | 1.4 | Body text, form inputs |
| base | 20px (1.25rem) | 1.5 | Primary body text |
| lg | 25px (1.5625rem) | 1.5 | Large body text, secondary headings |
| xl | 31.25px (1.953125rem) | 1.4 | Primary headings (h2) |
| 2xl | 39.0625px (2.44140625rem) | 1.3 | Page titles (h1) |
| 3xl | 48.828125px (3.0517578125rem) | 1.2 | Hero titles |

### Font Families

```css
/* Primary Font - System Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;

/* Monospace for Code */
font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
```

### Font Weights

- **Regular (400)**: Body text, general content
- **Medium (500)**: Emphasized text, labels
- **Semibold (600)**: Headings, important labels
- **Bold (700)**: Strong emphasis, primary actions

### Usage Guidelines

- Use sentence case for all UI text
- Maintain minimum 4.5:1 contrast ratio for accessibility
- Limit line length to 70-80 characters for optimal readability
- Use consistent heading hierarchy (h1 → h2 → h3, etc.)

## Color System

### Primary Colors

The color system is based on a blue primary palette with comprehensive variants for different states and contexts.

#### Blue (Primary)
- **50**: #eff6ff (Very light blue, backgrounds)
- **100**: #dbeafe (Light blue, subtle backgrounds)
- **200**: #bfdbfe (Light blue, hover states)
- **300**: #93c5fd (Medium light blue, borders)
- **400**: #60a5fa (Medium blue, secondary elements)
- **500**: #3b82f6 (Primary blue, default state)
- **600**: #2563eb (Dark blue, active/hover states)
- **700**: #1d4ed8 (Darker blue, pressed states)
- **800**: #1e40af (Very dark blue, text on light backgrounds)
- **900**: #1e3a8a (Darkest blue, headings)

#### Usage
- **500**: Primary buttons, links, active states
- **600**: Hover states, focused elements
- **700**: Pressed/active states
- **800**: Text on light backgrounds
- **900**: Headings, strong emphasis

### Neutral Colors (Gray)

A comprehensive gray scale for text, backgrounds, and borders.

- **50**: #f9fafb (Very light gray, page backgrounds)
- **100**: #f3f4f6 (Light gray, card backgrounds)
- **200**: #e5e7eb (Light gray, subtle borders)
- **300**: #d1d5db (Medium light gray, inactive elements)
- **400**: #9ca3af (Medium gray, secondary text)
- **500**: #6b7280 (Medium gray, placeholder text)
- **600**: #4b5563 (Dark gray, body text)
- **700**: #374151 (Darker gray, headings)
- **800**: #1f2937 (Very dark gray, strong text)
- **900**: #111827 (Darkest gray, high contrast text)

### Semantic Colors

#### Success (Green)
- **50**: #f0fdf4
- **500**: #22c55e (Default)
- **600**: #16a34a (Hover)
- **700**: #15803d (Active)

#### Warning (Yellow/Amber)
- **50**: #fffbeb
- **500**: #f59e0b (Default)
- **600**: #d97706 (Hover)
- **700**: #b45309 (Active)

#### Error (Red)
- **50**: #fef2f2
- **500**: #ef4444 (Default)
- **600**: #dc2626 (Hover)
- **700**: #b91c1c (Active)

### Color Usage Guidelines

- Maintain WCAG AA compliance (4.5:1 contrast ratio minimum)
- Use semantic colors only for their intended purpose
- Limit primary colors to key interactive elements
- Use neutral colors for most text and backgrounds
- Test color combinations in both light and dark modes

## Spacing System

### Base Units (4px/8px)

The spacing system uses 4px as the base unit, with 8px increments for larger spaces. All spacing values are multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| 1 | 4px | Minimal spacing, borders |
| 2 | 8px | Small padding, gaps |
| 3 | 12px | Component padding |
| 4 | 16px | Standard padding |
| 5 | 20px | Medium spacing |
| 6 | 24px | Large padding |
| 8 | 32px | Section spacing |
| 10 | 40px | Large sections |
| 12 | 48px | Page sections |
| 16 | 64px | Major sections |
| 20 | 80px | Hero spacing |
| 24 | 96px | Maximum spacing |

### Spacing Scale Examples

```css
/* Micro spacing */
padding: 4px;     /* space-1 */
margin: 8px;      /* space-2 */

/* Component spacing */
padding: 16px;    /* space-4 */
gap: 12px;        /* space-3 */

/* Layout spacing */
margin-bottom: 32px;  /* space-8 */
padding-top: 48px;    /* space-12 */
```

### Layout Grid

- **Container max-width**: 1200px
- **Grid columns**: 12-column system
- **Gutter**: 24px between columns
- **Margin**: 16px on mobile, 24px on desktop

## Components

### Buttons

#### Variants
- **Primary**: Blue background, white text, used for main actions
- **Secondary**: Outlined, blue border/text, used for secondary actions
- **Ghost**: Transparent background, blue text, used for subtle actions

#### States
- **Default**: Normal appearance
- **Hover**: Slightly darker/lighter background
- **Active/Pressed**: Darker background, subtle shadow
- **Disabled**: Reduced opacity (50%), no pointer events
- **Loading**: Show spinner, disable interaction

#### Sizing
- **Small**: 32px height, 12px horizontal padding
- **Medium**: 40px height, 16px horizontal padding
- **Large**: 48px height, 24px horizontal padding

### Form Elements

#### Input Fields
- **Height**: 40px (medium), 48px (large)
- **Border**: 1px solid gray-300
- **Border radius**: 6px
- **Padding**: 12px horizontal, 8px vertical
- **Focus**: Blue border (2px), subtle shadow

#### Labels
- **Size**: 14px (sm scale)
- **Weight**: Medium (500)
- **Color**: gray-700
- **Spacing**: 8px above input

#### Validation States
- **Error**: Red border, red text below input
- **Success**: Green border, green check icon
- **Warning**: Yellow border, warning icon

### Cards

#### Structure
- **Background**: White (#ffffff)
- **Border**: 1px solid gray-200
- **Border radius**: 8px
- **Shadow**: Subtle shadow-sm (0 1px 2px rgba(0,0,0,0.05))
- **Padding**: 24px all sides

#### Header
- **Padding**: 0 0 16px 0
- **Title**: 18px semibold, gray-900
- **Subtitle**: 14px regular, gray-600

#### Content
- **Padding**: 16px 0 0 0
- **Text**: 16px regular, gray-700

### Navigation

#### Sidebar
- **Width**: 280px (collapsed: 64px)
- **Background**: White
- **Border**: Right border gray-200
- **Item height**: 48px
- **Active state**: Blue background, blue text
- **Hover state**: Light blue background

#### Top Navigation
- **Height**: 64px
- **Background**: White
- **Border**: Bottom border gray-200
- **Logo**: 32px height, left aligned
- **Actions**: Right aligned, 40px height buttons

## Interactions

### Hover States

- **Buttons**: Background color changes (lighter/darker)
- **Links**: Underline appears, color changes
- **Cards**: Subtle shadow increase, slight scale (1.02x)
- **Navigation items**: Background color change

### Focus States

- **Keyboard focus**: Blue outline (2px), 2px offset
- **High contrast**: Ensure 3:1 contrast ratio
- **Visible indicators**: Clear focus rings on all interactive elements

### Loading States

- **Buttons**: Show spinner, disable interaction
- **Forms**: Disable submit, show loading text
- **Pages**: Skeleton screens or loading spinners
- **Progressive loading**: Load content as it becomes available

### Transitions

- **Duration**: 150ms (fast), 300ms (normal), 500ms (slow)
- **Easing**: ease-out for most transitions
- **Properties**: opacity, transform, background-color
- **Avoid**: Transitions on layout-changing properties

## Responsive Design

### Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| mobile | 0px | Small phones |
| tablet | 768px | Tablets, large phones |
| desktop | 1024px | Desktops, laptops |
| wide | 1280px | Large screens |

### Mobile-First Approach

- Design for mobile first, enhance for larger screens
- Use fluid typography and spacing
- Stack elements vertically on mobile
- Use horizontal scrolling sparingly

### Grid System

- **Mobile**: Single column, full width
- **Tablet**: 2-4 columns, centered content
- **Desktop**: 12-column grid, max-width container
- **Wide**: Maintain desktop layout, increase spacing

### Touch Targets

- **Minimum size**: 44px × 44px
- **Spacing**: 8px minimum between targets
- **Visual feedback**: Clear hover/press states

## Implementation Guidelines

### CSS Architecture

- Use Tailwind CSS for utility classes
- Create component-specific classes for complex patterns
- Maintain design tokens in CSS custom properties
- Use CSS Grid and Flexbox for layouts

### Component Library

- Build on shadcn/ui foundation
- Create compound components for complex UI patterns
- Maintain consistent API patterns
- Document component usage and props

### Accessibility

- Use semantic HTML elements
- Provide ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios
- Support reduced motion preferences

### Performance

- Optimize images and assets
- Use CSS containment where appropriate
- Minimize layout shifts
- Lazy load non-critical content
- Monitor Core Web Vitals

## Maintenance

### Version Control

- Update this guide when design changes occur
- Review annually for consistency
- Document exceptions and their rationale
- Maintain changelog of significant updates

### Tools and Resources

- **Figma**: Design system library
- **Storybook**: Component documentation
- **Chromatic**: Visual regression testing
- **Lighthouse**: Performance and accessibility auditing

---

This style guide should be treated as a living document. As the platform evolves, update this guide to reflect new patterns and ensure consistency across all interfaces.