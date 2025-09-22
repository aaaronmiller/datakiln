# Component Library

## Overview

This document outlines the component usage guidelines for the DataKiln platform, built on the shadcn/ui foundation. All components follow the established design system and accessibility standards.

## Core Components

### Button Variants

#### Primary Button
```tsx
import { Button } from "@/components/ui/button"

<Button>Primary Action</Button>
```
- **Usage**: Main actions, form submissions, primary CTAs
- **Styling**: Blue background (#3b82f6), white text, semibold weight
- **States**: Hover (#2563eb), active (#1d4ed8), disabled (50% opacity)

#### Secondary Button
```tsx
<Button variant="secondary">Secondary Action</Button>
```
- **Usage**: Secondary actions, cancel operations
- **Styling**: Outlined with blue border, blue text on white background
- **States**: Hover (light blue background), active (medium blue background)

#### Ghost Button
```tsx
<Button variant="ghost">Subtle Action</Button>
```
- **Usage**: Subtle actions, dropdown triggers, less prominent actions
- **Styling**: Transparent background, blue text, no border
- **States**: Hover (very light blue background)

#### Destructive Button
```tsx
<Button variant="destructive">Delete</Button>
```
- **Usage**: Dangerous actions like delete, remove, cancel
- **Styling**: Red background (#ef4444), white text
- **States**: Hover (#dc2626), active (#b91c1c)

### Form Components

#### Input Field
```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter your email" />
</div>
```
- **Height**: 40px (medium), 48px (large)
- **Border**: 1px solid gray-300, 2px blue on focus
- **Padding**: 12px horizontal, 8px vertical
- **Border radius**: 6px

#### Textarea
```tsx
import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="Enter your message" rows={4} />
```
- **Minimum height**: 80px
- **Auto-resize**: Optional based on content
- **Same styling**: As input fields

#### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```
- **Height**: 40px
- **Dropdown**: Full width, max height with scrolling
- **Keyboard navigation**: Arrow keys, enter to select

### Layout Components

#### Card
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```
- **Background**: White (#ffffff)
- **Border**: 1px solid gray-200
- **Border radius**: 8px
- **Shadow**: Subtle shadow-sm
- **Padding**: 24px all sides

#### Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content for tab 1</TabsContent>
  <TabsContent value="tab2">Content for tab 2</TabsContent>
</Tabs>
```
- **Active tab**: Blue background, white text
- **Inactive tabs**: Gray text, transparent background
- **Border**: Bottom border for active tab
- **Animation**: Smooth transition between tabs

### Feedback Components

#### Alert
```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

<Alert>
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>Your action was completed successfully.</AlertDescription>
</Alert>
```
- **Variants**: default, destructive (red)
- **Icon**: Optional checkmark or warning icon
- **Border**: Left border in theme color
- **Background**: Light background color

#### Progress
```tsx
import { Progress } from "@/components/ui/progress"

<Progress value={75} />
```
- **Height**: 8px
- **Background**: Light gray
- **Fill**: Blue gradient
- **Animation**: Smooth fill animation

#### Badge
```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Status</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
```
- **Variants**: default (blue), secondary (gray), destructive (red)
- **Size**: Small, compact text
- **Border radius**: 12px (pill shape)

### Navigation Components

#### Breadcrumb
```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/workflows">Workflows</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current Workflow</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```
- **Separator**: "/" character
- **Active page**: Non-link text
- **Hover states**: Underline for links

### Data Display Components

#### Table
```tsx
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

<Table>
  <TableCaption>Workflow execution history</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Duration</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Research Query</TableCell>
      <TableCell><Badge>Completed</Badge></TableCell>
      <TableCell>2m 30s</TableCell>
    </TableRow>
  </TableBody>
</Table>
```
- **Striped rows**: Alternating background colors
- **Hover states**: Light background on row hover
- **Sorting**: Optional column sorting indicators
- **Pagination**: For large datasets

#### Dialog/Modal
```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
  </DialogContent>
</Dialog>
```
- **Overlay**: Semi-transparent black background
- **Animation**: Scale and fade in/out
- **Focus management**: Focus trapped within dialog
- **ESC key**: Closes dialog

## Workflow-Specific Components

### QueryNode
```tsx
import { QueryNode } from "@/components/core/QueryNode"

// Used in ReactFlow canvas for query operations
<QueryNode
  id="query-1"
  data={{ label: "Research Query", query: "..." }}
  selected={false}
/>
```
- **Shape**: Rounded rectangle with icon
- **Colors**: Blue for query nodes, green for data sources
- **Handles**: Connection points for ReactFlow edges
- **Context menu**: Edit, delete, duplicate options

### QueryEditor
```tsx
import { QueryEditor } from "@/components/core/QueryEditor"

// Modal for editing query graphs
<QueryEditor
  isOpen={true}
  onClose={() => {}}
  initialData={{ nodes: [], edges: [] }}
/>
```
- **Layout**: Full-screen modal with toolbar
- **Canvas**: ReactFlow instance with custom nodes
- **Toolbar**: Add node, save, export buttons
- **Sidebar**: Node palette and properties panel

### ResultsDisplay
```tsx
import { ResultsDisplay } from "@/components/core/ResultsDisplay"

// Shows query execution results
<ResultsDisplay
  results={resultsData}
  isLoading={false}
  error={null}
/>
```
- **Formats**: Table, JSON, markdown views
- **Export**: Download options (CSV, JSON, PDF)
- **Pagination**: For large result sets
- **Search**: Filter and search within results

## Usage Guidelines

### Component Composition
- **Compound components**: Use when multiple related elements are needed
- **Consistent APIs**: Follow established prop patterns
- **Default props**: Provide sensible defaults for optional props
- **TypeScript**: Full type safety for all component props

### Accessibility
- **Semantic HTML**: Use correct element types
- **ARIA labels**: Add when context is not clear
- **Keyboard navigation**: All interactive elements keyboard accessible
- **Screen readers**: Test with screen reader software
- **Color contrast**: Meet WCAG AA standards

### Performance
- **Lazy loading**: For heavy components
- **Memoization**: Use React.memo for expensive renders
- **Bundle splitting**: Separate heavy components
- **Image optimization**: Compress and lazy load images

### Responsive Design
- **Mobile-first**: Design for small screens first
- **Breakpoint system**: Use established breakpoints
- **Fluid layouts**: Use relative units and flexbox/grid
- **Touch targets**: Minimum 44px touch targets

## Implementation Notes

### Styling Approach
- **Tailwind CSS**: Primary styling method
- **CSS variables**: For design tokens
- **Component classes**: For complex component styles
- **Dark mode**: Built-in theme support

### State Management
- **Zustand**: For global application state
- **React hooks**: For local component state
- **Context**: For theme and configuration
- **Server state**: React Query for API data

### Testing
- **Unit tests**: Component behavior testing
- **Integration tests**: Component interaction testing
- **Visual regression**: Chromatic for UI consistency
- **Accessibility**: Automated a11y testing

## Maintenance

### Adding New Components
1. Check existing component library first
2. Follow established patterns and APIs
3. Add TypeScript types and prop validation
4. Include accessibility features
5. Add documentation and usage examples
6. Test across all supported browsers

### Updating Components
1. Maintain backward compatibility
2. Update documentation simultaneously
3. Test for regressions
4. Update visual regression baselines
5. Communicate changes to team

This component library provides the foundation for consistent, accessible, and maintainable UI across the DataKiln platform.