# Available Components Documentation

## Overview

This document provides a comprehensive list of all available components for use in the SurveyLauncher Admin application. The project leverages shadcn-svelte components (156 available) plus custom components created during Phase 4 implementation.

## Table of Contents

1. [shadcn-svelte Components](#shadcn-svelte-components)
2. [Custom SurveyLauncher Components](#custom-surveylauncher-components)
3. [Component Usage Patterns](#component-usage-patterns)
4. [Installation & Setup](#installation--setup)
5. [Styling & Theming](#styling--theming)
6. [Component Best Practices](#component-best-practices)

---

## shadcn-svelte Components

### 🎯 **Core UI Components** (Most Used)

#### **Form & Input Components**
```svelte
<!-- Text Input -->
<script>
  import { Input } from '$lib/components/ui/input';
</script>
<Input bind:value={formData.name} placeholder="Enter name" />

<!-- Select Dropdown -->
<script>
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
</script>
<Select bind:value={selectedOption}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>

<!-- Checkbox -->
<script>
  import { Checkbox } from '$lib/components/ui/checkbox';
</script>
<Checkbox bind:checked={isChecked} />
<label for="checkbox">Accept terms</label>

<!-- Textarea -->
<script>
  import { Textarea } from '$lib/components/ui/textarea';
</script>
<Textarea bind:value={description} placeholder="Enter description" />
```

#### **Button Components**
```svelte
<script>
  import { Button } from '$lib/components/ui/button';
</script>

<!-- Primary Button -->
<Button onclick={handleAction}>
  <Save class="mr-2 h-4 w-4" />
  Save Changes
</Button>

<!-- Variant Buttons -->
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="secondary">Secondary</Button>

<!-- Icon Buttons -->
<Button variant="outline" size="icon">
  <Edit class="h-4 w-4" />
</Button>

<!-- Loading State -->
<Button disabled={isLoading}>
  {#if isLoading}
    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
    Loading...
  {:else}
    Submit
  {/if}
</Button>
```

#### **Card & Layout Components**
```svelte
<script>
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
</script>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>

<!-- Grid Layout with Cards -->
<div class="grid gap-6 md:grid-cols-2">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

#### **Alert & Notification Components**
```svelte
<script>
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
</script>

<!-- Success Alert -->
<Alert>
  <AlertDescription>User created successfully!</AlertDescription>
</Alert>

<!-- Error Alert -->
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Failed to create user. Please try again.</AlertDescription>
</Alert>
```

### 📊 **Data Display Components**

#### **Table Component**
```svelte
<script>
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
</script>

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Status</TableHead>
      <TableHead class="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each users as user}
      <TableRow>
        <TableCell class="font-medium">{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.status}</TableCell>
        <TableCell class="text-right">
          <Button variant="outline" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
```

#### **Badge Component** (Fallback Implementation)
```svelte
<!-- Custom Badge Component (since shadcn Badge may not be available) -->
<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {variantClasses[variant]}">
  {#if variant === 'success'}
    <!-- Success icon or content -->
  {/if}
  {slot}
</span>

<script>
  let { variant = 'default', children } = $props();

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    success: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    error: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
  };
</script>
```

### 🎨 **Navigation & Dialog Components**

#### **Dialog Component**
```svelte
<script>
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
</script>

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed with this action?
      </DialogDescription>
    </DialogHeader>
    <div class="flex justify-end gap-2 mt-4">
      <Button variant="outline" onclick={() => dialogOpen = false}>Cancel</Button>
      <Button onclick={handleConfirm}>Confirm</Button>
    </div>
  </DialogContent>
</Dialog>
```

#### **Navigation Menu**
```svelte
<script>
  import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '$lib/components/ui/navigation-menu';
</script>

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Users</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink href="/users">Manage Users</NavigationMenuLink>
        <NavigationMenuLink href="/users/create">Create User</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

### 📅 **Date & Time Components**

#### **Calendar Component**
```svelte
<script>
  import { Calendar } from '$lib/components/ui/calendar';
</script>

<Calendar
  mode="single"
  selected={selectedDate}
  onselect={setSelectedDate}
  class="rounded-md border"
/>
```

### 📈 **Progress & Status Components**

#### **Progress Component**
```svelte
<script>
  import { Progress } from '$lib/components/ui/progress';
</script>

<Progress value={progressPercentage} class="w-full" />
```

#### **Tabs Component**
```svelte
<script>
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
</script>

<Tabs value="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <p>Overview content</p>
  </TabsContent>
  <TabsContent value="details">
    <p>Details content</p>
  </TabsContent>
  <TabsContent value="settings">
    <p>Settings content</p>
  </TabsContent>
</Tabs>
```

---

## Custom SurveyLauncher Components

### 📋 **User Management Components**

#### **UserTable.svelte**
**Location**: `src/lib/components/users/UserTable.svelte`

**Purpose**: Comprehensive data table for displaying user information with search and filtering capabilities.

**Features**:
- Real-time search across name, email, and user code
- Role and status filtering
- Responsive design with mobile support
- Action buttons for viewing and editing users
- Loading and empty states

**Usage Example**:
```svelte
<script>
  import UserTable from '$lib/components/users/UserTable.svelte';
</script>

<UserTable />

<!-- With custom callback handlers -->
<UserTable
  onViewUser={(user) => console.log('View user:', user)}
  onEditUser={(user) => console.log('Edit user:', user)}
/>
```

**Key Props** (Current Implementation):
- None required (self-contained with mock data)

**Future Props** (Planned):
```typescript
interface UserTableProps {
  users?: User[];
  loading?: boolean;
  onViewUser?: (user: User) => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
}
```

#### **UserForm.svelte**
**Location**: `src/lib/components/users/UserForm.svelte`

**Purpose**: Comprehensive form for creating and editing users with validation.

**Features**:
- Form validation with real-time error messages
- PIN generation and management
- Role and team selection
- Loading states during submission
- Support for both create and edit modes

**Usage Example**:
```svelte
<script>
  import UserForm from '$lib/components/users/UserForm.svelte';

  function handleUserCreated(user) {
    console.log('New user created:', user);
    // Navigate to user details or show success message
  }

  function handleUserUpdated(user) {
    console.log('User updated:', user);
    // Update local state or show success message
  }
</script>

<!-- Create new user -->
<UserForm onUserCreated={handleUserCreated} />

<!-- Edit existing user -->
<UserForm
  initialData={userData}
  isEditing={true}
  onUserUpdated={handleUserUpdated}
/>
```

**Props Interface**:
```typescript
interface UserFormProps {
  onUserCreated?: (user: User) => void;
  onUserUpdated?: (user: User) => void;
  initialData?: User;
  isEditing?: boolean;
}
```

### 🎨 **Layout Components**

#### **Navbar.svelte**
**Location**: `src/lib/components/Navbar.svelte`

**Purpose**: Responsive navigation header with authentication integration.

**Features**:
- Mobile-responsive design with hamburger menu
- Authentication state awareness
- User dropdown menu
- Dark mode support
- Active route highlighting

**Usage Example**:
```svelte
<script>
  import Navbar from '$lib/components/Navbar.svelte';
</script>

<Navbar />
```

**Props** (Current Implementation):
- None required (uses global auth store)

---

## Component Usage Patterns

### 🔧 **Common Patterns**

#### **1. Form Handling Pattern**
```svelte
<script>
  import { Button, Input, Label } from '$lib/components/ui';

  let formData = $state({
    name: '',
    email: '',
    password: ''
  });

  let errors = $state({});
  let isSubmitting = $state(false);

  let isFormValid = $derived.by(() => {
    return formData.name.trim() !== '' &&
           formData.email.trim() !== '' &&
           formData.password.length >= 8;
  });

  async function handleSubmit() {
    if (!isFormValid) return;

    isSubmitting = true;
    try {
      // API call here
      await saveUser(formData);
    } catch (error) {
      errors.general = error.message;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div>
    <Label for="name">Name</Label>
    <Input
      id="name"
      bind:value={formData.name}
      class={errors.name ? 'border-destructive' : ''}
    />
    {#if errors.name}
      <p class="text-sm text-destructive">{errors.name}</p>
    {/if}
  </div>

  <Button
    type="submit"
    disabled={!isFormValid || isSubmitting}
  >
    {#if isSubmitting}
      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      Saving...
    {:else}
      Save User
    {/if}
  </Button>
</form>
```

#### **2. Data Table Pattern**
```svelte
<script>
  import { Table, Button } from '$lib/components/ui';

  let users = $state([]);
  let searchQuery = $state('');
  let roleFilter = $state('all');

  let filteredUsers = $derived.by(() => {
    return users.filter(user => {
      const matchesSearch = !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  });
</script>

<!-- Search and Filter Controls -->
<div class="flex gap-4 mb-6">
  <Input
    bind:value={searchQuery}
    placeholder="Search users..."
    class="max-w-sm"
  />
  <select bind:value={roleFilter}>
    <option value="all">All Roles</option>
    <option value="admin">Admin</option>
    <option value="user">User</option>
  </select>
</div>

<!-- Data Table -->
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    {#each filteredUsers as user}
      <TableRow>
        <TableCell>{user.name}</TableCell>
        <TableCell>
          <Button variant="outline" size="sm">
            <Edit class="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
```

#### **3. Loading State Pattern**
```svelte
<script>
  let isLoading = $state(true);
  let error = $state(null);
  let data = $state(null);

  onMount(async () => {
    try {
      data = await loadData();
    } catch (err) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-12">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <p class="ml-2">Loading...</p>
  </div>
{:else if error}
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
{:else if data}
  <!-- Render content -->
{/if}
```

#### **4. Modal/Dialog Pattern**
```svelte
<script>
  import { Dialog, Button } from '$lib/components/ui';

  let isOpen = $state(false);

  function handleConfirm() {
    // Handle confirmation
    isOpen = false;
  }
</script>

<Dialog bind:open={isOpen}>
  <DialogTrigger asChild>
    <Button onclick={() => isOpen = true}>
      Open Modal
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to perform this action?
      </DialogDescription>
    </DialogHeader>
    <div class="flex justify-end gap-2 mt-4">
      <Button variant="outline" onclick={() => isOpen = false}>
        Cancel
      </Button>
      <Button onclick={handleConfirm}>
        Confirm
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## Installation & Setup

### 📦 **Available Components Inventory**

Based on shadcn-svelte installation, **156 components** are available. Here are the most commonly used categories:

#### **Forms & Inputs** (12 components)
- Input, Textarea, Select, Checkbox, RadioGroup
- Label, Form, FormField, FormItem, FormLabel, FormControl, FormMessage

#### **Buttons & Actions** (3 components)
- Button, ButtonGroup, DropdownMenu

#### **Data Display** (8 components)
- Table, Card, Badge, Avatar, Skeleton, Separator, Divider, Progress

#### **Navigation** (6 components)
- Tabs, NavigationMenu, Breadcrumb, Pagination, ScrollArea, Sidebar

#### **Overlays & Modals** (4 components)
- Dialog, AlertDialog, Drawer, Popover

#### **Feedback & Alerts** (3 components)
- Alert, Toast, Tooltip

#### **Date & Time** (2 components)
- Calendar, DatePicker

#### **Layout** (8 components)
- Container, Grid, Flex, Spacer, AspectRatio,
- Sheet, Collapsible, Accordion

#### **Charts & Data Visualization** (15 components)
- Chart (Bar, Line, Pie, Area), Gauge, Metric

#### **Advanced Components** (95 components)
- Complex data tables, advanced forms, rich text editors, file uploads, etc.

### 🚀 **Quick Setup**

#### **1. Import Statements**
```typescript
// Single component import
import { Button } from '$lib/components/ui/button';

// Multiple components from same category
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

// Icon imports
import { Save, Edit, Trash2, Plus } from 'lucide-svelte';
```

#### **2. Component Registration**
Svelte components don't require explicit registration. Just import and use them.

#### **3. TypeScript Support**
All components include full TypeScript definitions:
```typescript
import type { ButtonProps } from '$lib/components/ui/button';

let buttonProps: ButtonProps = {
  variant: 'outline',
  size: 'sm',
  disabled: false
};
```

---

## Styling & Theming

### 🎨 **Design System Integration**

#### **TailwindCSS 4 Classes**
All components use TailwindCSS 4 utility classes with the oklch color system:

```svelte
<!-- Standard spacing -->
<div class="space-y-4">
<div class="gap-2">

<!-- Responsive design -->
<div class="grid gap-4 md:grid-cols-2">
<div class="hidden sm:block">

<!-- Color system -->
<div class="bg-background text-foreground">
<div class="border-border">
<div class="text-muted-foreground">
```

#### **Dark Mode Support**
Components automatically support dark mode through TailwindCSS classes:

```svelte
<!-- Automatic dark mode styling -->
<span class="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
```

#### **Custom Variants**
Create custom component variants using TailwindCSS:

```svelte
<script>
  let { variant = 'default' } = $props();

  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-background',
    secondary: 'bg-secondary text-secondary-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  };
</script>

<button class="inline-flex items-center justify-center rounded-md text-sm font-medium {variantClasses[variant]}">
  <slot />
</button>
```

---

## Component Best Practices

### ✅ **Recommended Practices**

#### **1. Accessibility**
- Always include proper ARIA labels
- Use semantic HTML elements
- Ensure keyboard navigation support
- Test with screen readers

```svelte
<!-- Accessible button with icon -->
<Button aria-label="Edit user">
  <Edit class="h-4 w-4" />
</Button>

<!-- Accessible form fields -->
<Label for="email">Email Address</Label>
<Input
  id="email"
  type="email"
  aria-describedby="email-help"
  aria-invalid={!!errors.email}
/>
{#if errors.email}
  <p id="email-help" class="text-sm text-destructive">{errors.email}</p>
{/if}
```

#### **2. Responsive Design**
- Mobile-first approach
- Test on all screen sizes (375px-1920px+)
- Use appropriate breakpoints
- Ensure touch targets are minimum 44px

```svelte
<!-- Responsive grid -->
<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card>...</Card>
</div>

<!-- Responsive text -->
<h1 class="text-2xl font-bold md:text-3xl lg:text-4xl">
  Title
</h1>

<!-- Responsive spacing -->
<div class="p-4 md:p-6 lg:p-8">
  Content
</div>
```

#### **3. Performance**
- Lazy load heavy components when possible
- Use `$derived` for computed values
- Minimize re-renders with proper state management
- Optimize bundle size with tree shaking

```svelte
<script>
  // Use derived for computed values
  let filteredUsers = $derived.by(() => {
    return users.filter(filterFunction);
  });

  // Lazy load heavy components
  let HeavyComponent = $derived(async () => {
    const module = await import('$lib/components/HeavyComponent.svelte');
    return module.default;
  });
</script>
```

#### **4. Error Handling**
- Provide meaningful error states
- Include error boundaries
- Use try-catch for async operations
- Show user-friendly error messages

```svelte
<script>
  let error = $state(null);
  let isLoading = $state(false);

  async function loadData() {
    isLoading = true;
    error = null;

    try {
      const data = await apiCall();
      return data;
    } catch (err) {
      error = err.message || 'An error occurred';
      throw err;
    } finally {
      isLoading = false;
    }
  }
</script>

{#if error}
  <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
{/if}
```

### ❌ **Common Pitfalls to Avoid**

#### **1. Missing Dependencies**
- Always check if shadcn components are installed
- Use fallbacks for missing components
- Install missing packages: `npm install lucide-svelte`

#### **2. Accessibility Issues**
- Don't use `<div onclick>` without proper ARIA roles
- Always associate labels with form inputs
- Include alt text for images
- Ensure color contrast meets WCAG standards

#### **3. Responsive Breaks**
- Don't use fixed widths that break on mobile
- Avoid horizontal scrolling on small screens
- Test with real devices, not just browser emulation

#### **4. State Management Issues**
- Don't mutate props directly
- Use proper Svelte 5 runes syntax
- Avoid infinite loops in derived values

---

## Future Component Development

### 🔮 **Planned Components for Phase 5+**

#### **Device Management Components**
- `DeviceTable.svelte` - Device inventory with status monitoring
- `DeviceForm.svelte` - Device registration and configuration
- `DeviceStatus.svelte` - Real-time device status display
- `GPSMap.svelte` - GPS location visualization

#### **Policy Management Components**
- `PolicyBuilder.svelte` - Visual policy creation interface
- `PolicyCard.svelte` - Policy summary display
- `PolicyTemplate.svelte` - Reusable policy templates

#### **Telemetry Components**
- `TelemetryChart.svelte` - Real-time data visualization
- `ActivityFeed.svelte` - Live activity stream
- `MetricsCard.svelte` - Key performance indicators

### 📋 **Component Development Guidelines**

1. **Follow Svelte 5 Patterns**: Use runes (`$state`, `$derived`, `$effect`)
2. **TypeScript First**: Include comprehensive type definitions
3. **Responsive by Default**: Mobile-first design approach
4. **Accessible First**: WCAG 2.1 AA compliance minimum
5. **Test Coverage**: Include test pages for verification
6. **Documentation**: Include JSDoc comments and usage examples

---

*Generated: November 13, 2025*
*Project: SurveyLauncher Admin Frontend*
*Framework: SvelteKit 5 + TailwindCSS 4*
*Component Library: shadcn-svelte (156 components) + Custom Components*