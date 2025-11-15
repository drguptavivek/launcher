# Svelte 5 Design Patterns for SurveyLauncher Admin

## Overview

This document outlines the modern Svelte 5 design patterns and best practices used throughout the SurveyLauncher Admin Frontend. It leverages Svelte's new runes system for reactive state management and modern component architecture.

## Table of Contents

1. [Svelte 5 Runes](#svelte-5-runes)
2. [Component Architecture](#component-architecture)
3. [State Management Patterns](#state-management-patterns)
4. [Data Fetching Patterns](#data-fetching-patterns)
5. [Form Handling](#form-handling)
6. [Remote Functions](#remote-functions)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Performance Optimizations](#performance-optimizations)
9. [Testing Patterns](#testing-patterns)
10. [TypeScript Integration](#typescript-integration)

---

## Svelte 5 Runes

### **$state - Reactive State**

The `$state` rune creates reactive state that automatically triggers UI updates.

```typescript
// Basic reactive state
let count = $state(0);

// Reactive object (deeply reactive)
let user = $state({
  name: 'John Doe',
  email: 'john@example.com',
  profile: {
    avatar: null,
    preferences: {}
  }
});

// Updating state
count++; // Triggers reactivity
user.name = 'Jane Doe'; // Triggers reactivity
user.profile.avatar = 'new-avatar.jpg'; // Triggers reactivity
```

### **✅ SurveyLauncher Implementation Status: COMPLETE**

All Project Management components have been successfully migrated to Svelte 5:

- **ProjectTable.svelte** - `$props()` + modern event handlers
- **ProjectCard.svelte** - `$props()` + modern event handlers
- **ProjectForm.svelte** - `$props()` + `$state()` + `$effect()` + form handling
- **UserAssignment.svelte** - `$props()` + `$state()` for reactive UI state
- **ProjectActions.svelte** - `$props()` + modern event handlers
- **Login page** - Modern form event handling with `event.preventDefault()`

**Key Migration Patterns Applied:**
```typescript
// BEFORE (Svelte 4):
export let project: Project;
export let size = 'normal';
$: if (project) { /* reactive logic */ }
on:click={handleClick}

// AFTER (Svelte 5):
let { project, size = 'normal' } = $props<{
  project: Project;
  size?: 'normal' | 'small';
}>();
$effect(() => { if (project) { /* reactive logic */ } });
onclick={handleClick}
```

### **$derived - Computed State**

The `$derived` rune creates computed values that update automatically when dependencies change.

```typescript
// Simple derived value
let count = $state(0);
let doubled = $derived(count * 2);

// Complex derived value
let user = $state({ firstName: 'John', lastName: 'Doe' });
let fullName = $derived(() => {
  return `${user.firstName} ${user.lastName}`;
});

// Derived from API data
let devices = $state([]);
let onlineDevices = $derived(() => {
  return devices.filter(device => device.isOnline);
});
```

### **$props - Component Properties**

The `$props` rune handles component input props with type safety.

```typescript
// Basic props destructuring
let {
  title = 'Default Title',
  variant = 'primary',
  onClick
} = $props<{
  title?: string;
  variant?: 'primary' | 'secondary';
  onClick?: (event: MouseEvent) => void;
}>();

// Props with validation
let {
  deviceId,
  required
} = $props<{
  deviceId: string;
  required?: boolean;
}>();

// Using props in template
<button onclick={onClick} class="btn-{variant}">
  {title}
</button>
```

### **✅ SurveyLauncher Component Props Migration**

All components now use `$props()` with full TypeScript typing:

**ProjectTable.svelte:**
```typescript
let {
  projects = [],
  loading = false,
  error = null
} = $props<{
  projects: Project[];
  loading?: boolean;
  error?: string | null;
}>();
```

**ProjectCard.svelte:**
```typescript
let {
  project,
  showActions = true
} = $props<{
  project: Project;
  showActions?: boolean;
}>();
```

**ProjectForm.svelte:**
```typescript
let {
  project = null,
  loading = false,
  error = null
} = $props<{
  project?: Project | null;
  loading?: boolean;
  error?: string | null;
}>();
```

### **$effect - Side Effects**

The `$effect` rune handles side effects that run when dependencies change.

```typescript
let userId = $state<string | null>(null);
let userData = $state<any>(null);

// Effect runs when userId changes
$effect(() => {
  if (userId) {
    fetchUserData(userId).then(data => {
      userData = data;
    });
  }
});

// Cleanup effect
$effect(() => {
  const interval = setInterval(() => {
    // Poll for updates
  }, 5000);

  return () => {
    // Cleanup
    clearInterval(interval);
  };
});
```

---

## Component Architecture

### **Modern Component Structure**

```svelte
<!-- ComponentName.svelte -->
<script lang="ts">
  // Props definition
  let {
    title,
    data,
    onUpdate
  } = $props<{
    title: string;
    data: any[];
    onUpdate: (data: any[]) => void;
  }>();

  // Internal state
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Computed values
  let itemCount = $derived(data.length);
  let hasData = $derived(itemCount > 0);

  // Effects
  $effect(() => {
    // Auto-save when data changes
    if (data.length > 0) {
      onSave(data);
    }
  });

  // Methods
  async function handleRefresh() {
    isLoading = true;
    error = null;
    try {
      const newData = await fetchData();
      onUpdate(newData);
    } catch (err) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="component">
  <h2>{title}</h2>

  {#if isLoading}
    <LoadingSpinner />
  {:else if error}
    <ErrorMessage message={error} />
  {:else if hasData}
    <div class="content">
      {#each data as item, i}
        <ItemCard item={item} />
      {/each}
    </div>
  {:else}
    <EmptyState />
  {/if}

  <button onclick={handleRefresh} disabled={isLoading}>
    Refresh
  </button>
</div>

<style>
  /* Scoped styles */
  .component {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
</style>
```

### **Component Composition with Snippets**

```svelte
<!-- DataTable.svelte -->
<script lang="ts">
  let {
    columns,
    data,
    actions
  } = $props<{
    columns: Column[];
    data: any[];
    actions?: Action[];
  }>();

  function createRowSnippet(item: any, index: number) {
    return () => `
      <tr>
        ${columns.map(col => `
          <td>${item[col.key]}</td>
        `).join('')}
        ${actions ? `
          <td>
            ${actions.map(action => `
              <button onclick={() => action.handler(item)}>
                ${action.label}
              </button>
            `).join('')}
          </td>
        ` : ''}
      </tr>
    `;
  }
</script>

<table>
  <thead>
    <tr>
      {#each columns as column}
        <th>{column.header}</th>
      {/each}
      {#if actions}
        <th>Actions</th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each data as item, index}
      {@render createRowSnippet(item, index)}
    {/each}
  </tbody>
</table>
```

---

## State Management Patterns

### **Global State with Context**

```typescript
// src/lib/stores/app.ts
import { getContext, setContext } from 'svelte';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

let appState = $state<AppState>({
  user: null,
  theme: 'light',
  notifications: []
});

export const app = {
  get state() {
    return appState;
  },

  setTheme(theme: 'light' | 'dark') {
    appState.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  addNotification(notification: Notification) {
    appState.notifications = [...appState.notifications, notification];
  },

  removeNotification(id: string) {
    appState.notifications = appState.notifications.filter(n => n.id !== id);
  }
};

const APP_KEY = Symbol('app');

export function setAppContext() {
  setContext(APP_KEY, app);
}

export function useApp() {
  const app = getContext(APP_KEY);
  if (!app) throw new Error('useApp must be used within AppProvider');
  return app;
}
```

### **Local Component State**

```svelte
<script lang="ts">
  // Local state for component-specific data
  let formData = $state({
    name: '',
    email: '',
    password: ''
  });

  let formErrors = $state<Record<string, string>>({});

  // Validation derived state
  let isFormValid = $derived(() => {
    return formData.name &&
           formData.email.includes('@') &&
           formData.password.length >= 8;
  });
</script>

<!-- Use local state in template -->
<form>
  <input bind:value={formData.name} />
  {#if formErrors.name}
    <span class="error">{formErrors.name}</span>
  {/if}

  <button disabled={!isFormValid}>Submit</button>
</form>
```

### **Store Patterns for Complex State**

```typescript
// src/lib/stores/devices.ts
import { authenticatedFetch } from '$lib/api';

class DeviceStore {
  private devices = $state<Device[]>([]);
  private selectedDevice = $state<Device | null>(null);
  private loading = $state(false);

  constructor() {
    // Auto-refresh when authenticated
    $effect(async () => {
      if (isAuthenticated()) {
        await this.fetchDevices();
      }
    });
  }

  get devices() {
    return this.devices;
  }

  get selectedDevice() {
    return this.selectedDevice;
  }

  get loading() {
    return this.loading;
  }

  get onlineDevices() {
    return $derived(() =>
      this.devices.filter(device => device.isOnline)
    );
  }

  async fetchDevices() {
    this.loading = true;
    try {
      const response = await authenticatedFetch('/api/devices');
      this.devices = await response.json();
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      this.loading = false;
    }
  }

  selectDevice(device: Device) {
    this.selectedDevice = device;
  }

  async updateDevice(id: string, updates: Partial<Device>) {
    try {
      const response = await authenticatedFetch(`/api/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      const updatedDevice = await response.json();
      this.devices = this.devices.map(device =>
        device.id === id ? updatedDevice : device
      );
    } catch (error) {
      console.error('Failed to update device:', error);
    }
  }
}

export const deviceStore = new DeviceStore();
```

---

## Data Fetching Patterns

### **Remote Functions for Type-Safe API Calls**

```typescript
// src/lib/api/remote/devices.remote.ts
import { query, command } from '$app/server';
import { API_BASE_URL } from '../client';

// Query for fetching devices
export const getDevices = query(async () => {
  const response = await fetch(`${API_BASE_URL}/api/devices`, {
    headers: getAuthHeaders()
  });
  return response.json();
});

// Command for updating device
export const updateDevice = command(
  z.object({
    id: z.string(),
    updates: z.record(z.any())
  }),
  async ({ id, updates }) => {
    const response = await fetch(`${API_BASE_URL}/api/devices/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  }
);
```

### **Using Remote Functions in Components**

```svelte
<!-- DeviceList.svelte -->
<script lang="ts">
  import { getDevices, updateDevice } from '$lib/api/remote/devices.remote';

  // Query automatically handles loading and error states
  const devicesQuery = getDevices();

  // Command for updates
  const updateDeviceCommand = updateDevice();

  // Handle device update
  async function handleDeviceUpdate(deviceId: string, updates: any) {
    try {
      await updateDeviceCommand.submit({ id: deviceId, updates });
      devicesQuery.refresh(); // Refresh data
    } catch (error) {
      console.error('Update failed:', error);
    }
  }
</script>

<!-- Query handles loading states automatically -->
{#if devicesQuery.loading}
  <LoadingSpinner />
{:else if devicesQuery.error}
  <ErrorMessage error={devicesQuery.error} />
{:else}
  <DeviceList devices={$devicesQuery.current} onUpdate={handleDeviceUpdate} />
{/if}
```

### **Progressive Enhancement with Form Actions**

```svelte
<!-- DeviceForm.svelte -->
<script lang="ts">
  import { updateDevice } from '$lib/api/remote/devices.remote';

  const updateForm = updateDevice();

  // Enhanced form with client-side validation
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    try {
      await updateForm.enhance(async ({ form, data, submit }) => {
        // Client-side validation
        if (!data.name.trim()) {
          updateForm.fields.name.issues([{
            message: 'Device name is required'
          }]);
          return;
        }

        await submit();
        form.reset();
        showSuccess('Device updated successfully');
      });
    } catch (error) {
      showError('Failed to update device');
    }
  }
</script>

<form {...updateForm} on:submit={handleSubmit}>
  <label>
    Device Name
    <input {...updateForm.fields.name.as('text')} />
    {#each updateForm.fields.name.issues() as issue}
      <span class="error">{issue.message}</span>
    {/each}
  </label>

  <button type="submit" disabled={$updateForm.pending}>
    {$updateForm.pending ? 'Updating...' : 'Update Device'}
  </button>
</form>
```

---

## Form Handling

### **✅ SurveyLauncher Form Implementation Status: COMPLETE**

### **Form State Management**

```svelte
<!-- UserForm.svelte -->
<script lang="ts">
  import { z } from 'zod';
  import { createUser } from '$lib/api/remote/users.remote';

  // Form validation schema
  const userSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email required'),
    role: z.enum(['admin', 'user', 'readonly'])
  });

  type UserFormData = z.infer<typeof userSchema>;

  // Form state with Svelte 5 $state()
  let formData = $state<UserFormData>({
    name: '',
    email: '',
    role: 'user'
  });

  let errors = $state<Record<string, string>>({});
  let isSubmitting = $state(false);

  // Validation
  let isValid = $derived(() => {
    try {
      userSchema.parse(formData);
      return true;
    } catch (err) {
      return false;
    }
  });

  // Field validation
  function validateField(field: keyof UserFormData, value: string) {
    try {
      userSchema.parse({ ...formData, [field]: value });
      errors[field] = '';
    } catch (err: any) {
      errors[field] = err.errors?.find((e: any) => e.path?.includes(field))?.message || '';
    }
  }

  // Form submission with modern event handling
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!isValid) return;

    isSubmitting = true;
    errors = {};

    try {
      await createUser().submit(formData);
      // Reset form on success
      formData = {
        name: '',
        email: '',
        role: 'user'
      };
    } catch (error: any) {
      errors.general = error.message || 'Failed to create user';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <div class="form-group">
    <label for="name">Name</label>
    <input
      id="name"
      bind:value={formData.name}
      oninput={(e) => validateField('name', e.target.value)}
      class={errors.name ? 'error' : ''}
    />
    {#if errors.name}
      <span class="error-message">{errors.name}</span>
    {/if}
  </div>

  <div class="form-group">
    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      bind:value={formData.email}
      oninput={(e) => validateField('email', e.target.value)}
      class={errors.email ? 'error' : ''}
    />
    {#if errors.email}
      <span class="error-message">{errors.email}</span>
    {/if}
  </div>

  <div class="form-group">
    <label for="role">Role</label>
    <select bind:value={formData.role}>
      <option value="user">User</option>
      <option value="admin">Admin</option>
      <option value="readonly">Read Only</option>
    </select>
  </div>

  {#if errors.general}
    <div class="error-message">{errors.general}</div>
  {/if}

  <button type="submit" disabled={!isValid || isSubmitting}>
    {isSubmitting ? 'Creating...' : 'Create User'}
  </button>
</form>
```

### **✅ SurveyLauncher Project Form Implementation**

**ProjectForm.svelte - Fully Svelte 5 Compatible:**

```typescript
// Form state with $state()
let formData = $state({
  title: '',
  abbreviation: '',
  description: '',
  geographicScope: 'NATIONAL' as 'NATIONAL' | 'REGIONAL',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
});

let validationErrors = $state({
  title: [] as string[],
  abbreviation: [] as string[],
  geographicScope: [] as string[]
});

// Reactive effect for form data
$effect(() => {
  if (project) {
    formData = {
      title: project.title,
      abbreviation: project.abbreviation,
      description: project.description || '',
      geographicScope: project.geographicScope,
      status: project.status
    };
  } else {
    formData = {
      title: '',
      abbreviation: '',
      description: '',
      geographicScope: 'NATIONAL',
      status: 'ACTIVE'
    };
  }
});

// Modern event handling
function handleSubmit(event: Event) {
  event.preventDefault();
  // Form logic...
}
```

**Key Form Migration Changes:**
- ✅ **`export let` → `$state()`** for form state
- ✅ **`on:submit|preventDefault` → `onsubmit`** with `event.preventDefault()`
- ✅ **`on:input` → `oninput`** for field events
- ✅ **`$:` reactive statements → `$effect()`** for side effects

<style>
  .form-group {
    margin-bottom: 1rem;
  }

  .error {
    border-color: var(--destructive);
  }

  .error-message {
    color: var(--destructive);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
</style>
```

### **Multi-Step Forms**

```svelte
<!-- MultiStepForm.svelte -->
<script lang="ts">
  interface Step {
    id: string;
    title: string;
    component: ComponentType;
    validate: () => boolean;
  }

  let { steps, onComplete } = $props<{
    steps: Step[];
    onComplete: (data: any) => void;
  }>();

  let currentStepIndex = $state(0);
  let formData = $state<any>({});

  let currentStep = $derived(steps[currentStepIndex]);
  let isLastStep = $derived(currentStepIndex === steps.length - 1);
  let isFirstStep = $derived(currentStepIndex === 0);

  function nextStep() {
    if (currentStep.validate()) {
      if (isLastStep) {
        onComplete(formData);
      } else {
        currentStepIndex++;
      }
    }
  }

  function previousStep() {
    if (!isFirstStep) {
      currentStepIndex--;
    }
  }

  function updateStepData(data: any) {
    formData = { ...formData, ...data };
  }
</script>

<div class="multi-step-form">
  <!-- Progress indicator -->
  <div class="progress">
    {#each steps as step, i}
      <div
        class="progress-step"
        class:active={i === currentStepIndex}
        class:completed={i < currentStepIndex}
      >
        <div class="step-number">{i + 1}</div>
        <div class="step-title">{step.title}</div>
      </div>
    {/each}
  </div>

  <!-- Current step component -->
  <div class="step-content">
    {@render currentStep.component({
      data: formData,
      updateData: updateStepData
    })}
  </div>

  <!-- Navigation -->
  <div class="navigation">
    <button
      onclick={previousStep}
      disabled={isFirstStep}
      variant="outline"
    >
      Previous
    </button>

    <button onclick={nextStep}>
      {isLastStep ? 'Complete' : 'Next'}
    </button>
  </div>
</div>
```

---

## Error Handling Patterns

### **Error Boundaries**

```svelte
<!-- ErrorBoundary.svelte -->
<script lang="ts">
  let {
    onError,
    fallback = ErrorFallback
  } = $props<{
    onError?: (error: Error) => void;
    fallback?: ComponentType<{ error: Error; reset: () => void }>;
  }>();

  let hasError = $state(false);
  let error = $state<Error | null>(null);

  function handleError(err: Error) {
    hasError = true;
    error = err;
    onError?.(err);
  }

  function reset() {
    hasError = false;
    error = null;
  }
</script>

{#if hasError}
  {@render fallback({ error: error!, reset })}
{:else}
  <svelte:boundary on:client:error={handleError}>
    {@render children()}
  </svelte:boundary>
{/if}
```

### **API Error Handling**

```typescript
// src/lib/api/client.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiResponse<T>(response: Response, data: any): T {
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || `HTTP ${response.status}`,
      data?.error?.code || `HTTP_${response.status}`,
      response.status,
      data?.error?.request_id
    );
  }

  if (data?.ok === false) {
    throw new ApiError(
      data.error?.message || 'API error',
      data.error?.code || 'API_ERROR',
      response.status,
      data.error?.request_id
    );
  }

  return data;
}

// Usage in API calls
try {
  const response = await fetch('/api/users');
  const data = await response.json();
  return handleApiResponse(response, data);
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API-specific errors
    switch (error.code) {
      case 'UNAUTHORIZED':
        // Redirect to login
        break;
      case 'RATE_LIMITED':
        // Show rate limit message
        break;
      default:
        // Show generic error
        break;
    }
  }
  throw error;
}
```

### **Global Error Handling**

```typescript
// src/lib/stores/error.ts
let errorStore = $state<{
  errors: Array<{
    id: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    timestamp: Date;
  }>;
}>({
  errors: []
});

export const errorManager = {
  addError(message: string, type: 'error' | 'warning' | 'info' = 'error') {
    errorStore.errors = [
      ...errorStore.errors,
      {
        id: crypto.randomUUID(),
        message,
        type,
        timestamp: new Date()
      }
    ];
  },

  removeError(id: string) {
    errorStore.errors = errorStore.errors.filter(error => error.id !== id);
  },

  clearErrors() {
    errorStore.errors = [];
  },

  get errors() {
    return errorStore.errors;
  },

  get hasErrors() {
    return $derived(() => errorStore.errors.some(e => e.type === 'error'));
  }
};

// Usage in components
import { errorManager } from '$lib/stores/error';

function handleApiError(error: any) {
  errorManager.addError(error.message, 'error');
}
```

---

## Performance Optimizations

### **Lazy Loading with Derived State**

```svelte
<script lang="ts">
  // Heavy computation only runs when needed
  let data = $state([]);

  // Memoized expensive computation
  let expensiveCalculation = $derived(() => {
    console.log('Running expensive calculation...');
    return data.reduce((sum, item) => sum + item.value, 0);
  });

  // Only recompute when data actually changes
  let filteredData = $derived(() => {
    return data.filter(item => item.active);
  });
</script>

<div>
  <p>Total: {expensiveCalculation}</p>
  <p>Active items: {filteredData.length}</p>
</div>
```

### **Component Lazy Loading**

```svelte
<!-- LazyComponentLoader.svelte -->
<script lang="ts">
  let {
    componentLoader,
    fallback = LoadingFallback
  } = $props<{
    componentLoader: () => Promise<ComponentType>;
    fallback?: ComponentType;
  }>();

  let Component = $state<ComponentType | null>(null);
  let isLoading = $state(true);

  async function loadComponent() {
    try {
      Component = await componentLoader();
    } catch (error) {
      console.error('Failed to load component:', error);
    } finally {
      isLoading = false;
    }
  }

  // Load component on mount
  $effect(() => {
    loadComponent();
  });
</script>

{#if isLoading}
  {@render fallback()}
{:else if Component}
  <Component />
{/if}
```

### **Debounced Search**

```svelte
<script lang="ts">
  import { debounce } from '$lib/utils';

  let searchQuery = $state('');
  let searchResults = $state<any[]>([]);

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim()) {
      const results = await performSearch(query);
      searchResults = results;
    } else {
      searchResults = [];
    }
  }, 300);

  // Debounce the search query changes
  $effect(() => {
    debouncedSearch(searchQuery);
  });
</script>

<input
  bind:value={searchQuery}
  placeholder="Search..."
  class="search-input"
/>

<!-- Results update automatically with debouncing -->
{#each searchResults as result}
  <div class="search-result">{result.title}</div>
{/each}
```

### **Virtual Scrolling for Large Lists**

```svelte
<!-- VirtualList.svelte -->
<script lang="ts">
  let {
    items,
    itemHeight = 50,
    visibleCount = 20
  } = $props<{
    items: any[];
    itemHeight?: number;
    visibleCount?: number;
  }>();

  let scrollTop = $state(0);
  let containerHeight = itemHeight * visibleCount;

  let startIndex = $derived(() => Math.floor(scrollTop / itemHeight));
  let endIndex = $derived(() => Math.min(startIndex + visibleCount, items.length));
  let visibleItems = $derived(() =>
    items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i
    }))
  );

  let offsetY = $derived(() => startIndex * itemHeight);
</script>

<div
  class="virtual-list-container"
  style="height: {containerHeight}px; overflow-y: auto;"
  bind:scrollTop
>
  <div
    class="virtual-list-spacer"
    style="height: {items.length * itemHeight}px; position: relative;"
  >
    <div
      class="virtual-list-items"
      style="transform: translateY({offsetY}px); position: absolute; top: 0; left: 0; right: 0;"
    >
      {#each visibleItems as { item, index }}
        <div
          class="virtual-list-item"
          style="height: {itemHeight}px;"
        >
          <Slot item={item} index={index} />
        </div>
      {/each}
    </div>
  </div>
</div>
```

---

## Testing Patterns

### **Component Testing with Runes**

```typescript
// ComponentName.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ComponentName from './ComponentName.svelte';

describe('ComponentName', () => {
  it('should render with default props', () => {
    const { getByRole } = render(ComponentName);

    expect(getByRole('button')).toBeInTheDocument();
  });

  it('should react to state changes', async () => {
    const { getByRole, getByText } = render(ComponentName, {
      props: { initialCount: 5 }
    });

    const button = getByRole('button');
    await fireEvent.click(button);

    await waitFor(() => {
      expect(getByText('6')).toBeInTheDocument();
    });
  });

  it('should handle derived state correctly', () => {
    const { getByText } = render(ComponentName, {
      props: { items: [1, 2, 3, 4, 5] }
    });

    expect(getByText('Total: 5')).toBeInTheDocument();
    expect(getByText('Average: 3')).toBeInTheDocument();
  });
});
```

### **Testing Effects and Side Effects**

```typescript
// useEffect.test.ts
import { render, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import ComponentWithEffect from './ComponentWithEffect.svelte';

describe('ComponentWithEffect', () => {
  it('should call API when userId changes', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'John Doe' })
    });

    const { rerender } = render(ComponentWithEffect, {
      props: { userId: '123' }
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/123');
    });

    // Change userId
    rerender({ userId: '456' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/456');
    });
  });
});
```

### **Form Testing**

```typescript
// FormComponent.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import UserForm from './UserForm.svelte';

describe('UserForm', () => {
  it('should validate form fields', async () => {
    const mockSubmit = vi.fn();

    const { getByLabelText, getByRole } = render(UserForm, {
      props: { onSubmit: mockSubmit }
    });

    // Submit empty form
    const submitButton = getByRole('button', { name: 'Submit' });
    await fireEvent.click(submitButton);

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(await screen.findByText('Valid email required')).toBeInTheDocument();

    // Fill form partially
    await fireEvent.change(getByLabelText('Name'), {
      target: { value: 'John' }
    });

    await fireEvent.click(submitButton);

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(screen.getByText('Valid email required')).toBeInTheDocument();

    // Fill complete form
    await fireEvent.change(getByLabelText('Email'), {
      target: { value: 'john@example.com' }
    });

    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'John',
        email: 'john@example.com'
      });
    });
  });
});
```

---

## TypeScript Integration

### **Component Props Typing**

```typescript
// Component with strongly typed props
<script lang="ts">
  interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: (event: MouseEvent) => void | Promise<void>;
    children?: any;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    children
  } = $props<ButtonProps>();

  // Type-safe event handling
  function handleClick(event: MouseEvent) {
    if (disabled || loading) return;
    onClick?.(event);
  }

  // Type-safe derived state
  let buttonClasses = $derived(() => {
    const baseClasses = ['btn'];

    baseClasses.push(`btn-${variant}`);
    baseClasses.push(`btn-${size}`);

    if (disabled) baseClasses.push('btn-disabled');
    if (loading) baseClasses.push('btn-loading');

    return baseClasses.join(' ');
  });
</script>
```

### **API Response Typing**

```typescript
// src/lib/types/api.ts
export interface ApiResponse<T> {
  ok: true;
  data: T;
  message?: string;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Type-safe API function
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();

  if (data.ok) {
    return data.data;
  } else {
    throw new Error(data.error.message);
  }
}

// Usage with typed responses
interface User {
  id: string;
  name: string;
  email: string;
}

const user = await apiCall<User>('/api/users/123');
console.log(user.name); // TypeScript knows user.name is string
```

### **Generic Components**

```typescript
// Generic DataTable component
<script lang="ts">
  interface DataTableProps<T extends Record<string, any>> {
    data: T[];
    columns: Array<{
      key: keyof T;
      header: string;
      render?: (value: T[keyof T], row: T) => string;
    }>;
    onSelect?: (row: T) => void;
  }

  let { data, columns, onSelect } = $props<DataTableProps<any>>();

  // Type-safe column rendering
  function renderCell(row: any, column: any) {
    const value = row[column.key];
    return column.render ? column.render(value, row) : String(value);
  }
</script>

<table>
  <thead>
    <tr>
      {#each columns as column}
        <th>{column.header}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each data as row}
      <tr on:click={() => onSelect?.(row)}>
        {#each columns as column}
          <td>{renderCell(row, column)}</td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
```

---

## ✅ SurveyLauncher Svelte 5 Migration Summary

### **Status: COMPLETE**
**All Project Management components successfully migrated to Svelte 5**

### **Components Updated:**
- ✅ **ProjectTable.svelte** - Table display with modern props and event handling
- ✅ **ProjectCard.svelte** - Card layout with reactive state management
- ✅ **ProjectForm.svelte** - Form handling with validation and $state()/$effect()
- ✅ **UserAssignment.svelte** - User management with reactive UI state
- ✅ **ProjectActions.svelte** - Action buttons with modern event handlers
- ✅ **Login page** - Authentication form with modern event handling

### **Migration Patterns Applied:**
```typescript
// ✅ EXPORTS: export let → $props()
export let project: Project;
// BECOMES:
let { project } = $props<{ project: Project; }>();

// ✅ STATE: let → $state()
let formData = { name: '' };
// BECOMES:
let formData = $state({ name: '' });

// ✅ REACTIVE: $: → $effect()
$: if (project) { updateForm(); }
// BECOMES:
$effect(() => { if (project) { updateForm(); } });

// ✅ EVENTS: on:click → onclick
<button on:click={handleClick}>Click</button>
// BECOMES:
<button onclick={handleClick}>Click</button>

// ✅ FORMS: on:submit|preventDefault → onsubmit + event.preventDefault()
<form on:submit|preventDefault={handleSubmit}>
// BECOMES:
<form onsubmit={handleSubmit}>
function handleSubmit(event: Event) {
  event.preventDefault();
  // form logic
}
```

### **Benefits Achieved:**
- 🎯 **Type Safety**: Full TypeScript integration with prop typing
- 🚀 **Performance**: Efficient reactivity with fine-grained updates
- 🔧 **Modern Syntax**: Clean, readable Svelte 5 patterns
- 🛡️ **Error Reduction**: Compile-time type checking prevents runtime errors
- 📱 **Better DX**: Improved developer experience with modern tooling

### **Development Status:**
- ✅ Development server running smoothly
- ✅ Hot module replacement working
- ✅ No compilation errors
- ✅ All components fully functional
- ✅ Ready for Phase 3: Project routes and pages

## Best Practices Summary

### **State Management**
- Use `$state` for component-local state
- Use `$derived` for computed values
- Use context for global state
- Keep state close to where it's used

### **Component Design**
- Keep components focused and single-responsibility
- Use composition over inheritance
- Props down, events up
- Make components reusable and testable

### **Performance**
- Leverage Svelte's reactivity system
- Avoid unnecessary re-renders
- Use lazy loading for heavy components
- Implement virtual scrolling for large lists

### **Type Safety**
- Use TypeScript for all components
- Define interfaces for props and data
- Use generic types for reusable components
- Validate data at API boundaries

### **Error Handling**
- Use error boundaries for graceful degradation
- Implement proper error logging
- Provide user-friendly error messages
- Handle async operations properly

These Svelte 5 patterns provide a modern, efficient foundation for building the SurveyLauncher Admin Frontend with excellent performance, type safety, and developer experience.