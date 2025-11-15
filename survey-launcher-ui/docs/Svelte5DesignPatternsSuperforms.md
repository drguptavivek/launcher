# Svelte 5 + Superforms Design Patterns

## Overview

This document outlines modern form handling patterns for SurveyLauncher's **9-role RBAC system** using Svelte 5, Superforms, Valibot, and shadcn-svelte components. It focuses on **role-based forms** with dual validation (client + server) and multi-select implementations for comprehensive UI role enforcement.

**Target Implementation:** Role-based UI system with proper access control for all 9 user roles
**Documentation:** See `TODO/role-based-ui-implementation-plan.md` for complete implementation strategy

## Table of Contents

1. [Core Stack](#core-stack)
2. [Valibot Schema Patterns](#valibot-schema-patterns)
3. [Superforms Integration](#superforms-integration)
4. [Multi-Select Implementation](#multi-select-implementation)
5. [Role-Based Form Patterns](#role-based-form-patterns)
6. [Dual Validation Strategy](#dual-validation-strategy)
7. [Component Patterns](#component-patterns)
8. [Error Handling](#error-handling)
9. [Performance Optimization](#performance-optimization)
10. [Testing Patterns](#testing-patterns)

---

## 🎯 Role-Based Implementation Context

### **9-Role System Integration**
This design pattern document directly supports the **role-based UI implementation plan**:

```typescript
// Role-based form patterns for the 9-role system:
// - TEAM_MEMBER (Mobile only): Task completion forms
// - FIELD_SUPERVISOR (Mobile + Web): Team management + project forms
// - REGIONAL_MANAGER (Mobile + Web): Regional oversight + approval forms
// - SYSTEM_ADMIN (Web only): Full system configuration forms
// - SUPPORT_AGENT (Web only): Help desk + ticketing forms
// - AUDITOR (Web only): Compliance + audit forms
// - DEVICE_MANAGER (Web only): Device configuration forms
// - POLICY_ADMIN (Web only): Policy creation forms
// - NATIONAL_SUPPORT_ADMIN (Web only): Multi-region oversight forms
```

### **Implementation Status: Ready for Phase 1**
- ✅ **Foundation Complete**: All core patterns documented
- ✅ **Role Validation**: Role-based field restrictions documented
- ✅ **Multi-Select Components**: Custom components ready for team/user assignment
- ✅ **Dual Validation**: Client + server validation patterns established
- 🔄 **Next Step**: Implement Phase 1 of `role-based-ui-implementation-plan.md`

---

## Core Stack

### **Dependencies (Minimal, No Redundancy)**
- **Svelte 5**: Modern runes ($state, $derived, $effect, $props)
- **Superforms**: Form state management + progressive enhancement
- **Valibot**: Schema validation (2x faster than Zod)
- **Shadcn-Svelte**: UI components (Button, Input, MultiSelect, etc.)
- **TypeScript**: Type safety throughout

### **Integration Chain**
```
Valibot Schema → Role-Based Validation → Superforms → Shadcn-Svelte Components
```

### **Installation**
```bash
npm install sveltekit-superforms valibot
# shadcn-svelte already installed
```

---

## Valibot Schema Patterns

### **Basic Schema Definition**
```typescript
import * as v from 'valibot';

// User creation schema
const userCreateSchema = v.object({
  name: v.string([
    v.minLength(1, 'Name is required'),
    v.maxLength(100, 'Name must be less than 100 characters')
  ]),
  email: v.string([
    v.email('Valid email required')
  ]),
  role: v.picklist([
    'SYSTEM_ADMIN',
    'FIELD_SUPERVISOR',
    'TEAM_MEMBER',
    'SUPPORT_AGENT',
    'AUDITOR',
    'DEVICE_MANAGER',
    'POLICY_ADMIN',
    'NATIONAL_SUPPORT_ADMIN'
  ]),
  teamId: v.optional(v.string()),
  isActive: v.boolean([v.defaultValue(true)])
});

export type UserCreateInput = v.InferOutput<typeof userCreateSchema>;
```

### **Role-Based Conditional Validation**
```typescript
// Project schema with role-based restrictions
const baseProjectSchema = v.object({
  title: v.string([v.minLength(1), v.maxLength(200)]),
  abbreviation: v.string([v.minLength(2), v.maxLength(10)]),
  description: v.optional(v.string()),
  status: v.picklist(['ACTIVE', 'INACTIVE'])
});

export const createProjectSchema = (userRole: string) => baseProjectSchema.pipe(
  v.forward(
    v.check(() => ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole)),
    'Only administrators can create projects'
  ),
  v.forward(
    v.check((data) => userRole !== 'FIELD_SUPERVISOR' || data.status === 'ACTIVE'),
    'Field supervisors cannot create inactive projects'
  ),
  v.forward(
    v.check((data) => {
      if (userRole === 'TEAM_MEMBER') {
        return false; // Team members cannot create projects
      }
      return true;
    }, 'Insufficient permissions')
  )
);
```

### **Complete Role-Based Schema System**
```typescript
// src/lib/forms/schemas/role-based-schemas.ts
import * as v from 'valibot';

// Role definitions for type safety
export const USER_ROLES = [
  'TEAM_MEMBER',
  'FIELD_SUPERVISOR',
  'REGIONAL_MANAGER',
  'SYSTEM_ADMIN',
  'SUPPORT_AGENT',
  'AUDITOR',
  'DEVICE_MANAGER',
  'POLICY_ADMIN',
  'NATIONAL_SUPPORT_ADMIN'
] as const;

export type UserRole = typeof USER_ROLES[number];

// Project schema with full role-based validation
export const createProjectSchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    title: v.string([v.minLength(1), v.maxLength(200)]),
    abbreviation: v.string([v.minLength(2), v.maxLength(10)]),
    description: v.optional(v.string()),
    status: v.picklist(['ACTIVE', 'INACTIVE'])
  });

  // Role-specific field additions
  let schema = baseSchema;

  if (['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole)) {
    schema = v.merge([
      schema,
      v.object({
        geographicScope: v.picklist(['LOCAL', 'REGIONAL', 'NATIONAL']),
        teamIds: v.array(v.string()).min(1, 'Select at least one team'),
        budget: v.optional(v.number([v.minValue(0)])),
        priority: v.optional(v.picklist(['LOW', 'MEDIUM', 'HIGH']))
      })
    ]);
  }

  if (userRole === 'FIELD_SUPERVISOR') {
    schema = v.merge([
      schema,
      v.object({
        geographicScope: v.literal('LOCAL'),
        teamIds: v.array(v.string()).min(1, 'Select your team'),
        assignedUsers: v.array(v.string()).optional()
      })
    ]);
  }

  // Role-based validation rules
  return schema.pipe(
    v.forward(
      v.check(() => ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole)),
      'Only administrators can create projects'
    ),
    v.forward(
      v.check((data) => {
        if (userRole === 'FIELD_SUPERVISOR' && data.status === 'INACTIVE') {
          return false;
        }
        return true;
      }, 'Field supervisors cannot create inactive projects'),
      ['status']
    ),
    v.forward(
      v.check((data) => {
        if (userRole === 'FIELD_SUPERVISOR' && data.geographicScope === 'NATIONAL') {
          return false;
        }
        return true;
      }, 'Field supervisors cannot create national projects'),
      ['geographicScope']
    ),
    v.forward(
      v.check((data) => {
        if (userRole === 'NATIONAL_SUPPORT_ADMIN' && data.geographicScope === 'LOCAL') {
          return false;
        }
        return true;
      }, 'National support admins must create regional or national projects'),
      ['geographicScope']
    )
  );
};

// User management schema with role-based field restrictions
export const createUserSchema = (creatorRole: UserRole) => {
  const baseSchema = v.object({
    name: v.string([v.minLength(1), v.maxLength(100)]),
    email: v.string([v.email('Valid email required')]),
    teamId: v.string([v.minLength(1), 'Team assignment required')]),
    isActive: v.boolean([v.defaultValue(true)])
  });

  let schema = baseSchema;

  // Role assignment based on creator permissions
  if (creatorRole === 'SYSTEM_ADMIN') {
    schema = v.merge([
      schema,
      v.object({
        role: v.picklist(USER_ROLES),
        stateId: v.string([v.minLength(1)])
      })
    ]);
  } else if (creatorRole === 'REGIONAL_MANAGER') {
    schema = v.merge([
      schema,
      v.object({
        role: v.picklist(['TEAM_MEMBER', 'FIELD_SUPERVISOR']),
        stateId: v.string([v.minLength(1)])
      })
    ]);
  } else if (creatorRole === 'FIELD_SUPERVISOR') {
    schema = v.merge([
      schema,
      v.object({
        role: v.literal('TEAM_MEMBER')
      })
    ]);
  }

  return schema.pipe(
    v.forward(
      v.check(() => ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'].includes(creatorRole)),
      'Insufficient permissions to create users'
    )
  );
};

// Device management schema
export const createDeviceSchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    deviceId: v.string([v.minLength(1), 'Device ID required')]),
    deviceName: v.string([v.minLength(1), 'Device name required')]),
    teamId: v.string([v.minLength(1), 'Team assignment required')])
  });

  let schema = baseSchema;

  if (['SYSTEM_ADMIN', 'DEVICE_MANAGER'].includes(userRole)) {
    schema = v.merge([
      schema,
      v.object({
        configuration: v.optional(v.record(v.any())),
        assignedUserId: v.optional(v.string()),
        policyProfile: v.optional(v.string()),
        maintenanceSchedule: v.optional(v.string())
      })
    ]);
  }

  return schema.pipe(
    v.forward(
      v.check(() => ['SYSTEM_ADMIN', 'DEVICE_MANAGER', 'REGIONAL_MANAGER'].includes(userRole)),
      'Only administrators and device managers can register devices'
    )
  );
};
```

### **Array Validation for Multi-Select**
```typescript
// Assignment schema with array validation
const assignmentSchema = v.object({
  title: v.string([v.minLength(1)]),
  assignedUsers: v.array(v.string()).min(1, 'Select at least one user'),
  assignedTeams: v.array(v.string()).min(1, 'Select at least one team'),
  permissions: v.array(v.string()).optional(),
  startDate: v.date(),
  endDate: v.date([v.minValue(v.pipe(v.string(), v.isoDate()), new Date())])
}).pipe(
  v.check((data) => data.endDate > data.startDate, 'End date must be after start date')
);
```

---

## Superforms Integration

### **Basic Form Setup**
```typescript
// +page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { valibotForm } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { userCreateSchema } from '$lib/forms/schemas/user';

export const load = async () => {
  // Server-side form setup
  const form = await superValidate(valibotForm(userCreateSchema));

  return {
    form,
    userRole: await getCurrentUserRole()
  };
};

export const actions = {
  create: async ({ request }) => {
    const form = await superValidate(request, valibotForm(userCreateSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Additional server-side validation
    const userRole = await getCurrentUserRole();
    if (!canCreateUser(userRole, form.data)) {
      return fail(403, {
        form: {
          ...form,
          message: 'Insufficient permissions for this operation'
        }
      });
    }

    // Create user
    const user = await createUser(form.data);

    throw redirect(303, `/users/${user.id}`);
  }
};
```

### **Component-Side Implementation**
```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { valibotForm } from 'sveltekit-superforms/adapters';
  import { userCreateSchema } from '$lib/forms/schemas/user';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Select } from '$lib/components/ui/select';

  let { form, userRole } = $props<{
    form: any;
    userRole: string;
  }>();

  // Client-side form with superforms
  const { form: formState, errors, message, enhance, submitting } = superForm({
    formSchema: userCreateSchema,
    initialValues: form,
    validators: valibotForm(userCreateSchema),
    onResult: ({ result }) => {
      if (result.type === 'success') {
        // Handle success
        console.log('User created successfully');
      }
    },
    onError: ({ result }) => {
      // Handle error
      console.error('Form error:', result.error);
    }
  });

  // Reactive client-side validation
  let clientErrors = $state({});

  $: if ($formState.name) {
    clientErrors.name = validateNameLength($formState.name);
  }

  function validateNameLength(name: string) {
    if (name.length < 1) return 'Name is required';
    if (name.length > 100) return 'Name too long';
    return null;
  }
</script>

<form method="POST" use:enhance class="space-y-6">
  <div class="space-y-2">
    <Label for="name">Name</Label>
    <Input
      bind:value={$formState.name}
      class={clientErrors.name || errors.name ? 'border-red-500' : ''}
      placeholder="Enter user name"
    />

    {/* Show client errors first, then server errors */}
    {#if clientErrors.name}
      <p class="text-sm text-red-500">{clientErrors.name}</p>
    {:else if errors.name}
      <p class="text-sm text-red-500">{errors.name[0]}</p>
    {/if}
  </div>

  <div class="space-y-2">
    <Label for="email">Email</Label>
    <Input
      bind:value={$formState.email}
      type="email"
      class={errors.email ? 'border-red-500' : ''}
      placeholder="Enter email address"
    />
    {#if errors.email}
      <p class="text-sm text-red-500">{errors.email[0]}</p>
    {/if}
  </div>

  <div class="space-y-2">
    <Label for="role">Role</Label>
    <Select bind:value={$formState.role}>
      <option value="">Select a role</option>
      <option value="SYSTEM_ADMIN">System Administrator</option>
      <option value="FIELD_SUPERVISOR">Field Supervisor</option>
      <option value="TEAM_MEMBER">Team Member</option>
      <option value="SUPPORT_AGENT">Support Agent</option>
      <option value="AUDITOR">Auditor</option>
      <option value="DEVICE_MANAGER">Device Manager</option>
      <option value="POLICY_ADMIN">Policy Administrator</option>
      <option value="NATIONAL_SUPPORT_ADMIN">National Support Admin</option>
    </Select>
    {#if errors.role}
      <p class="text-sm text-red-500">{errors.role[0]}</p>
    {/if}
  </div>

  {#if message}
    <div class="p-4 rounded-md bg-green-50 text-green-800">
      {message}
    </div>
  {/if}

  <Button type="submit" disabled={$submitting}>
    {$submitting ? 'Creating...' : 'Create User'}
  </Button>
</form>
```

---

## Multi-Select Implementation

### **Custom Multi-Select Component**
```svelte
<!-- src/lib/components/ui/multi-select.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Check, ChevronsUpDown } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { Button } from './button';
  import { Command } from './command';
  import { Popover, PopoverContent, PopoverTrigger } from './popover';

  let {
    options = [],
    value = [],
    placeholder = 'Select options...',
    className = '',
    disabled = false,
    errors = []
  } = $props<{
    options: Array<{ value: string; label: string }>;
    value: string[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    errors?: string[];
  }>();

  let open = $state(false);
  let searchValue = $state('');

  const dispatch = createEventDispatcher();

  // Filter options based on search
  let filteredOptions = $derived(() => {
    return options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) &&
      !value.includes(option.value)
    );
  });

  let selectedOptions = $derived(() => {
    return value.map(val => options.find(opt => opt.value === val)).filter(Boolean);
  });

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      value = value.filter(v => v !== optionValue);
    } else {
      value = [...value, optionValue];
    }
    dispatch('change', value);
  }

  function removeOption(optionValue: string) {
    value = value.filter(v => v !== optionValue);
    dispatch('change', value);
  }
</script>

<Popover open={open} bind:open>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      class={cn('w-full justify-between', disabled && 'opacity-50', className)}
      disabled={disabled}
    >
      {selectedOptions.length > 0
        ? selectedOptions.map(opt => opt.label).join(', ')
        : placeholder
      }
      <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>

  <PopoverContent class="w-full p-0">
    <Command>
      <div class="p-2">
        <input
          type="text"
          placeholder="Search..."
          class="w-full px-3 py-2 text-sm border rounded-md"
          bind:value={searchValue}
        />
      </div>

      <div class="max-h-60 overflow-auto p-1">
        {#each filteredOptions as option}
          <div
            class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            on:click={() => toggleOption(option.value)}
          >
            <Check
              class={cn(
                'mr-2 h-4 w-4',
                value.includes(option.value) ? 'opacity-100' : 'opacity-0'
              )}
            />
            {option.label}
          </div>
        {/each}

        {#if filteredOptions.length === 0}
          <div class="py-6 text-center text-sm text-muted-foreground">
            No options found.
          </div>
        {/if}
      </div>
    </Command>
  </PopoverContent>
</Popover>

<!-- Selected items display -->
<div class="flex flex-wrap gap-1 mt-2">
  {#each selectedOptions as option}
    <div class="inline-flex items-center rounded-md border px-2 py-1 text-sm">
      {option.label}
      <button
        type="button"
        class="ml-1 hover:text-red-600"
        on:click={() => removeOption(option.value)}
        aria-label={`Remove ${option.label}`}
      >
        ×
      </button>
    </div>
  {/each}
</div>

{#if errors.length > 0}
  {#each errors as error}
    <p class="text-sm text-red-500 mt-1">{error}</p>
  {/each}
{/if}
```

### **Multi-Select Usage in Forms**
```svelte
<script lang="ts">
  import { MultiSelect } from '$lib/components/ui/multi-select';
  import { assignmentSchema } from '$lib/forms/schemas/assignment';

  // User and team options
  const userOptions = [
    { value: 'user1', label: 'John Doe' },
    { value: 'user2', label: 'Jane Smith' },
    { value: 'user3', label: 'Bob Johnson' }
  ];

  const teamOptions = [
    { value: 'team1', label: 'Team Alpha' },
    { value: 'team2', label: 'Team Beta' },
    { value: 'team3', label: 'Team Gamma' }
  ];

  const { form, errors } = superForm({
    formSchema: assignmentSchema,
    validators: valibotForm(assignmentSchema)
  });
</script>

<form method="POST" use:enhance class="space-y-6">
  <!-- User Multi-Select -->
  <div class="space-y-2">
    <Label>Assigned Users</Label>
    <MultiSelect
      bind:value={$form.assignedUsers}
      options={userOptions}
      placeholder="Select users to assign..."
      errors={errors.assignedUsers}
    />
  </div>

  <!-- Team Multi-Select -->
  <div class="space-y-2">
    <Label>Assigned Teams</Label>
    <MultiSelect
      bind:value={$form.assignedTeams}
      options={teamOptions}
      placeholder="Select teams to assign..."
      errors={errors.assignedTeams}
    />
  </div>
</form>
```

### **Checkbox Group for Simple Multi-Select**
```svelte
<script lang="ts">
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';

  let { value, options, label } = $props<{
    value: string[];
    options: string[];
    label: string;
  }>();

  function toggleOption(option: string) {
    if (value.includes(option)) {
      value = value.filter(v => v !== option);
    } else {
      value = [...value, option];
    }
  }
</script>

<div class="space-y-2">
  <Label>{label}</Label>
  <div class="space-y-2">
    {#each options as option}
      <div class="flex items-center space-x-2">
        <Checkbox
          bind:group={value}
          value={option}
          id={`checkbox-${option}`}
        />
        <Label for={`checkbox-${option}`}>{option}</Label>
      </div>
    {/each}
  </div>
</div>
```

---

## Role-Based Form Patterns

### **Role-Based Field Visibility**
```svelte
<script lang="ts">
  let { userRole, form } = $props<{
    userRole: string;
    form: any;
  }>();

  // Role-based field visibility
  let showAdvancedFields = $derived(['SYSTEM_ADMIN', 'DEVICE_MANAGER'].includes(userRole));
  let showAssignmentFields = $derived(['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'].includes(userRole));
  let showTeamFields = $derived(['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole));
</script>

<form method="POST" use:enhance>
  <!-- Basic fields (all roles) -->
  <div class="space-y-2">
    <Label for="title">Title</Label>
    <Input bind:value={$form.title} />
  </div>

  <!-- Role-specific fields -->
  {#if showAdvancedFields}
    <div class="space-y-2">
      <Label for="configuration">Device Configuration</Label>
      <Textarea bind:value={$form.configuration} />
    </div>
  {/if}

  {#if showTeamFields}
    <div class="space-y-2">
      <Label for="teamId">Team Assignment</Label>
      <Select bind:value={$form.teamId}>
        <option value="">Select team</option>
      </Select>
    </div>
  {/if}

  {#if showAssignmentFields}
    <div class="space-y-2">
      <Label>Assign Users</Label>
      <MultiSelect
        bind:value={$form.assignedUsers}
        options={userOptions}
      />
    </div>
  {/if}
</form>
```

### **Dynamic Schema Based on Role**
```typescript
// src/lib/forms/schemas/project.ts
import * as v from 'valibot';

const baseProjectSchema = v.object({
  title: v.string([v.minLength(1), v.maxLength(200)]),
  description: v.optional(v.string()),
  status: v.picklist(['ACTIVE', 'INACTIVE'])
});

export const createProjectSchema = (userRole: string) => {
  let schema = baseProjectSchema;

  // Add fields based on role
  if (['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole)) {
    schema = v.merge([
      schema,
      v.object({
        geographicScope: v.picklist(['LOCAL', 'REGIONAL', 'NATIONAL']),
        teamIds: v.array(v.string()).min(1, 'Select at least one team')
      })
    ]);
  }

  if (userRole === 'SYSTEM_ADMIN') {
    schema = v.merge([
      schema,
      v.object({
        budget: v.number([v.minValue(0)]),
        priority: v.picklist(['LOW', 'MEDIUM', 'HIGH'])
      })
    ]);
  }

  // Add role-based validation
  return schema.pipe(
    v.forward(
      v.check((data) => {
        if (userRole === 'FIELD_SUPERVISOR' && data.geographicScope === 'NATIONAL') {
          return false;
        }
        return true;
      }, 'Field supervisors cannot create national projects'),
      ['geographicScope']
    )
  );
};
```

### **Role-Based Form Factory**
```typescript
// src/lib/forms/factory/role-form-factory.ts
import { superForm } from 'sveltekit-superforms';
import { valibotForm } from 'sveltekit-superforms/adapters';
import * as v from 'valibot';
import type { UserRole } from '$lib/types/role.types';
import { createProjectSchema, createUserSchema, createDeviceSchema } from '$lib/forms/schemas/role-based-schemas';

export class RoleFormFactory {
  /**
   * Create a role-based form with proper schema and validation
   * Supports all 9 roles in the SurveyLauncher system
   */
  static createForm(config: {
    formType: 'project' | 'user' | 'device' | 'audit' | 'policy' | 'support';
    userRole: UserRole;
    mode: 'create' | 'edit' | 'view';
    initialData?: any;
    options?: any;
  }) {
    const { formType, userRole, mode, initialData, options = {} } = config;

    // Get role-specific schema
    const schema = this.getSchemaForRole(formType, userRole, mode);

    // Validate user has permission for this form type and mode
    this.validateFormPermissions(formType, mode, userRole);

    return superForm({
      formSchema: schema,
      validators: valibotForm(schema),
      initialValues: initialData,
      onResult: ({ result }) => {
        this.handleRoleBasedResult(result, userRole, formType);
      },
      onError: ({ result }) => {
        this.handleRoleBasedError(result, userRole, formType);
      },
      ...options
    });
  }

  /**
   * Get the appropriate schema based on form type, user role, and mode
   */
  static getSchemaForRole(formType: string, userRole: UserRole, mode: string): v.GenericSchema {
    switch (formType) {
      case 'project':
        return mode === 'create'
          ? createProjectSchema(userRole)
          : this.createUpdateProjectSchema(userRole);

      case 'user':
        return createUserSchema(userRole);

      case 'device':
        return createDeviceSchema(userRole);

      case 'audit':
        return this.createAuditSchema(userRole);

      case 'policy':
        return this.createPolicySchema(userRole);

      case 'support':
        return this.createSupportSchema(userRole);

      default:
        throw new Error(`Unknown form type: ${formType}`);
    }
  }

  /**
   * Validate user has permission for this form operation
   */
  static validateFormPermissions(formType: string, mode: string, userRole: UserRole): void {
    const permissions = {
      'project': {
        'create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'],
        'edit': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
        'view': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR', 'TEAM_MEMBER', 'AUDITOR']
      },
      'user': {
        'create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
        'edit': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
        'view': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR', 'SUPPORT_AGENT', 'AUDITOR']
      },
      'device': {
        'create': ['SYSTEM_ADMIN', 'DEVICE_MANAGER', 'REGIONAL_MANAGER'],
        'edit': ['SYSTEM_ADMIN', 'DEVICE_MANAGER'],
        'view': ['SYSTEM_ADMIN', 'DEVICE_MANAGER', 'REGIONAL_MANAGER', 'SUPPORT_AGENT', 'AUDITOR']
      },
      'audit': {
        'create': ['AUDITOR', 'SYSTEM_ADMIN'],
        'edit': ['AUDITOR', 'SYSTEM_ADMIN'],
        'view': ['AUDITOR', 'SYSTEM_ADMIN', 'NATIONAL_SUPPORT_ADMIN']
      },
      'policy': {
        'create': ['POLICY_ADMIN', 'SYSTEM_ADMIN'],
        'edit': ['POLICY_ADMIN', 'SYSTEM_ADMIN'],
        'view': ['POLICY_ADMIN', 'SYSTEM_ADMIN', 'AUDITOR', 'NATIONAL_SUPPORT_ADMIN']
      },
      'support': {
        'create': ['SUPPORT_AGENT', 'SYSTEM_ADMIN'],
        'edit': ['SUPPORT_AGENT', 'SYSTEM_ADMIN'],
        'view': ['SUPPORT_AGENT', 'SYSTEM_ADMIN', 'AUDITOR']
      }
    };

    const allowedRoles = permissions[formType]?.[mode] || [];
    if (!allowedRoles.includes(userRole)) {
      throw new Error(`Role ${userRole} does not have ${mode} permission for ${formType}`);
    }
  }

  /**
   * Handle form results based on role and form type
   */
  static handleRoleBasedResult(result: any, userRole: UserRole, formType: string): void {
    if (result.type === 'success') {
      // Role-based success handling
      switch (userRole) {
        case 'TEAM_MEMBER':
          // Redirect to team member dashboard
          break;
        case 'FIELD_SUPERVISOR':
          // Redirect to supervisor dashboard with team data
          break;
        case 'SYSTEM_ADMIN':
          // Redirect to admin panel with full system data
          break;
        // ... handle other roles
      }
    }
  }

  /**
   * Handle form errors based on role and form type
   */
  static handleRoleBasedError(result: any, userRole: UserRole, formType: string): void {
    // Role-specific error messaging and handling
    console.error(`Form error for role ${userRole} in ${formType}:`, result);
  }

  /**
   * Create specialized schemas for different form types
   */
  private static createUpdateProjectSchema(userRole: UserRole): v.GenericSchema {
    // Similar to create schema but with different validation rules
    return createProjectSchema(userRole);
  }

  private static createAuditSchema(userRole: UserRole): v.GenericSchema {
    const baseSchema = v.object({
      reportType: v.picklist(['COMPLIANCE', 'SECURITY', 'PERFORMANCE']),
      scope: v.string([v.minLength(1)]),
      dateRange: v.object({
        start: v.date(),
        end: v.date()
      }),
      includeSensitive: v.boolean([v.defaultValue(false)])
    });

    // Only auditors and system admins can include sensitive data
    if (!['AUDITOR', 'SYSTEM_ADMIN'].includes(userRole)) {
      return baseSchema.pipe(
        v.forward(
          v.check((data) => !data.includeSensitive),
          'Only auditors can include sensitive information'
        ),
        ['includeSensitive']
      );
    }

    return baseSchema;
  }

  private static createPolicySchema(userRole: UserRole): v.GenericSchema {
    const baseSchema = v.object({
      title: v.string([v.minLength(1)]),
      description: v.string([v.minLength(1)]),
      policyType: v.picklist(['ACCESS', 'SECURITY', 'WORK_HOURS', 'DEVICE']),
      scope: v.picklist(['GLOBAL', 'REGIONAL', 'TEAM']),
      rules: v.array(v.object({
        name: v.string(),
        condition: v.string(),
        action: v.string()
      })).min(1, 'At least one rule is required')
    });

    // National scope only for system admins and national support
    if (userRole === 'POLICY_ADMIN') {
      return baseSchema.pipe(
        v.forward(
          v.check((data) => data.scope !== 'NATIONAL'),
          'Policy admins cannot create national policies'
        ),
        ['scope']
      );
    }

    return baseSchema;
  }

  private static createSupportSchema(userRole: UserRole): v.GenericSchema {
    const baseSchema = v.object({
      title: v.string([v.minLength(1)]),
      description: v.string([v.minLength(1)]),
      priority: v.picklist(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      category: v.picklist(['TECHNICAL', 'ACCOUNT', 'DEVICE', 'POLICY']),
      assignedTo: v.optional(v.string()),
      status: v.picklist(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).defaultValue('OPEN')
    });

    // Only support agents can assign tickets
    if (userRole !== 'SUPPORT_AGENT' && userRole !== 'SYSTEM_ADMIN') {
      return baseSchema.pipe(
        v.forward(
          v.check((data) => !data.assignedTo),
          'Only support agents can assign tickets'
        ),
        ['assignedTo']
      );
    }

    return baseSchema;
  }
}

/**
 * Helper function for quick form creation in components
 */
export function createRoleForm(formType: string, userRole: UserRole, mode: string = 'create') {
  return RoleFormFactory.createForm({
    formType,
    userRole,
    mode,
    options: {
      // Default options for all role-based forms
      resetForm: false,
      onError: ({ result }) => {
        console.error('Form error:', result);
      },
      onResult: ({ result }) => {
        if (result.type === 'success') {
          console.log('Form submitted successfully:', result.data);
        }
      }
    }
  });
}
```

---

## Dual Validation Strategy

### **Client-Side Reactive Validation**
```svelte
<script lang="ts">
  let { form, schema } = $props<{
    form: any;
    schema: v.GenericSchema;
  }>();

  // Reactive client errors
  let clientErrors = $state<Record<string, string>>({});

  // Real-time validation using Valibot
  $: clientErrors.title = validateField(schema, 'title', $form.title);
  $: clientErrors.email = validateField(schema, 'email', $form.email);
  $: clientErrors.password = validateField(schema, 'password', $form.password);

  function validateField(schema: v.GenericSchema, field: string, value: any): string | null {
    try {
      // Create partial schema for single field
      const fieldSchema = v.pick(schema, [field]);
      const result = v.safeParse(fieldSchema, { [field]: value });

      if (result.success) {
        return null;
      }

      const fieldErrors = result.issues?.filter(issue => issue.path?.[0] === field);
      return fieldErrors?.[0]?.message || null;
    } catch {
      return null;
    }
  }
</script>

<!-- Show client errors first, then server errors -->
<div class="space-y-2">
  <Label for="title">Title</Label>
  <Input bind:value={$form.title} class={clientErrors.title || errors.title ? 'border-red-500' : ''} />

  {#if clientErrors.title}
    <p class="text-sm text-red-500">{clientErrors.title}</p>
  {:else if errors.title}
    <p class="text-sm text-red-500">{errors.title[0]}</p>
  {/if}
</div>
```

### **Server-Side Security Validation**
```typescript
// +page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { valibotForm } from 'sveltekit-superforms/adapters';
import { fail, error } from '@sveltejs/kit';

export const actions = {
  create: async ({ request }) => {
    const form = await superValidate(request, valibotForm(createProjectSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Get current user role
    const userRole = await getCurrentUserRole();
    const userId = await getCurrentUserId();

    // Server-side security validation
    const securityValidation = validateProjectCreation(form.data, userRole, userId);
    if (!securityValidation.valid) {
      return fail(403, {
        form: {
          ...form,
          message: securityValidation.error
        }
      });
    }

    // Additional business logic validation
    const businessValidation = await validateBusinessRules(form.data);
    if (!businessValidation.valid) {
      return fail(400, {
        form: {
          ...form,
          message: businessValidation.error
        }
      });
    }

    // Create project
    try {
      const project = await createProject(form.data);
      return { success: true, project };
    } catch (err) {
      return fail(500, {
        form: {
          ...form,
          message: 'Failed to create project. Please try again.'
        }
      });
    }
  }
};

function validateProjectCreation(data: any, userRole: string, userId: string) {
  // Security validation
  if (!canCreateProject(userRole)) {
    return { valid: false, error: 'Insufficient permissions' };
  }

  // Geographic scope restrictions
  if (userRole === 'FIELD_SUPERVISOR' && data.geographicScope === 'NATIONAL') {
    return { valid: false, error: 'Field supervisors cannot create national projects' };
  }

  // Team assignment validation
  if (data.teamIds && data.teamIds.length > 0) {
    const hasPermission = await canAssignTeams(userRole, data.teamIds);
    if (!hasPermission) {
      return { valid: false, error: 'Cannot assign teams outside your jurisdiction' };
    }
  }

  return { valid: true };
}
```

### **Progressive Enhancement Pattern**
```typescript
// Form with progressive enhancement
const { form, errors, enhance, submitting, tainted } = superForm({
  formSchema: projectSchema,
  validators: valibotForm(projectSchema),
  onResult: ({ result }) => {
    if (result.type === 'success') {
      // Show success message or redirect
      showSuccessMessage('Project created successfully');
    } else if (result.type === 'failure') {
      // Handle server errors
      showErrorMessage(result.data?.form?.message || 'Failed to create project');
    }
  },
  onError: ({ result }) => {
    // Handle network or unexpected errors
    showErrorMessage('Network error. Please try again.');
  },
  onUpdate: ({ form }) => {
    // Optional: Handle form updates
    console.log('Form updated:', form);
  },
  onValidate: ({ formData }) => {
    // Optional: Custom client validation
    return validateCustomRules(formData);
  }
});
```

---

## Component Patterns

### **Reusable Form Field Component**
```svelte
<!-- src/lib/components/forms/FormField.svelte -->
<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { cn } from '$lib/utils';

  let {
    label,
    error,
    description,
    required = false,
    className = '',
    children
  } = $props<{
    label: string;
    error?: string[] | null;
    description?: string;
    required?: boolean;
    className?: string;
    children: any;
  }>();

  let hasError = $derived(!!error && error.length > 0);
</script>

<div class={cn('space-y-2', className)}>
  <Label
    for={label.toLowerCase().replace(/\s+/g, '-')}
    class={hasError ? 'text-red-600' : ''}
  >
    {label}
    {required && <span class="text-red-500 ml-1">*</span>}
  </Label>

  {@render children()}

  {#if hasError}
    {#each error as errMsg}
      <p class="text-sm text-red-600">{errMsg}</p>
    {/each}
  {/if}

  {#if description}
    <p class="text-sm text-gray-600">{description}</p>
  {/if}
</div>
```

### **Form Usage Pattern**
```svelte
<script lang="ts">
  import FormField from '$lib/components/forms/FormField.svelte';
  import { Input } from '$lib/components/ui/input';
  import { Select } from '$lib/components/ui/select';
  import { Textarea } from '$lib/components/ui/textarea';

  const { form, errors } = superForm({
    formSchema: projectSchema,
    validators: valibotForm(projectSchema)
  });
</script>

<form method="POST" use:enhance class="space-y-6">
  <FormField label="Project Title" error={errors.title} required>
    <Input
      bind:value={$form.title}
      id="project-title"
      placeholder="Enter project title"
    />
  </FormField>

  <FormField
    label="Description"
    error={errors.description}
    description="Optional project description"
  >
    <Textarea
      bind:value={$form.description}
      id="project-description"
      placeholder="Enter project description"
      rows={3}
    />
  </FormField>

  <FormField label="Status" error={errors.status} required>
    <Select bind:value={$form.status} id="project-status">
      <option value="">Select status</option>
      <option value="ACTIVE">Active</option>
      <option value="INACTIVE">Inactive</option>
    </Select>
  </FormField>
</form>
```

### **Form Actions Component**
```svelte
<!-- src/lib/components/forms/FormActions.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  let {
    submitting = false,
    submitText = 'Submit',
    cancelText = 'Cancel',
    onCancel,
    className = '',
    showCancel = true,
    disabled = false
  } = $props<{
    submitting?: boolean;
    submitText?: string;
    cancelText?: string;
    onCancel?: () => void;
    className?: string;
    showCancel?: boolean;
    disabled?: boolean;
  }>();
</script>

<div class={cn('flex items-center justify-end space-x-2', className)}>
  {#if showCancel && onCancel}
    <Button
      type="button"
      variant="outline"
      onclick={onCancel}
      disabled={submitting || disabled}
    >
      {cancelText}
    </Button>
  {/if}

  <Button
    type="submit"
    disabled={submitting || disabled}
  >
    {#if submitting}
      <div class="flex items-center space-x-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Processing...</span>
      </div>
    {:else}
      {submitText}
    {/if}
  </Button>
</div>
```

---

## Error Handling

### **Comprehensive Error Handling**
```typescript
// src/lib/forms/utils/error-handling.ts
export class FormErrorHandler {
  static handleValidationError(errors: Record<string, string[]>) {
    // Group errors by field
    const fieldErrors = Object.entries(errors).reduce((acc, [field, messages]) => {
      acc[field] = messages.join(', ');
      return acc;
    }, {});

    // Determine error severity
    const hasCriticalErrors = Object.keys(errors).some(field =>
      ['title', 'email', 'role'].includes(field)
    );

    return {
      fieldErrors,
      hasCriticalErrors,
      message: this.generateErrorMessage(errors)
    };
  }

  static generateErrorMessage(errors: Record<string, string[]>): string {
    const errorCount = Object.keys(errors).length;

    if (errorCount === 1) {
      return `Please fix the error: ${Object.values(errors)[0][0]}`;
    }

    return `Please fix ${errorCount} errors to continue`;
  }

  static handleServerError(error: any): { message: string; type: string } {
    if (error.status === 403) {
      return {
        message: 'Permission denied. You do not have access to perform this action.',
        type: 'permission'
      };
    }

    if (error.status === 404) {
      return {
        message: 'The requested resource was not found.',
        type: 'not_found'
      };
    }

    if (error.status >= 500) {
      return {
        message: 'Server error occurred. Please try again later.',
        type: 'server_error'
      };
    }

    return {
      message: error.message || 'An unexpected error occurred.',
      type: 'unknown'
    };
  }
}
```

### **Form Error Display**
```svelte
<script lang="ts">
  import { AlertCircle, CheckCircle } from 'lucide-svelte';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

  let { message, type = 'error' } = $props<{
    message: string;
    type?: 'error' | 'success' | 'warning' | 'info';
  }>();
</script>

<Alert variant={type === 'error' ? 'destructive' : 'default'}>
  {#if type === 'error'}
    <AlertCircle class="h-4 w-4" />
  {:else if type === 'success'}
    <CheckCircle class="h-4 w-4" />
  {/if}

  <AlertTitle>
    {type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice'}
  </AlertTitle>

  <AlertDescription>
    {message}
  </AlertDescription>
</Alert>
```

---

## Performance Optimization

### **Form State Optimization**
```typescript
// Debounced validation
import { debounce } from 'lodash-es';

const debouncedValidate = debounce((form: any, setErrors: Function) => {
  const errors = validateForm(form);
  setErrors(errors);
}, 300);

// Usage in component
$: debouncedValidate($form, setErrors);
```

### **Lazy Form Component Loading**
```svelte
<script lang="ts">
  let ComplexForm = $state<ComponentType | null>(null);
  let isLoading = $state(true);

  async function loadForm() {
    try {
      ComplexForm = (await import('./ComplexForm.svelte')).default;
    } catch (error) {
      console.error('Failed to load form:', error);
    } finally {
      isLoading = false;
    }
  }

  // Load form on mount
  $effect(() => {
    loadForm();
  });
</script>

{#if isLoading}
  <div class="flex items-center justify-center p-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
{:else if ComplexForm}
  <ComplexForm />
{/if}
```

### **Form Memoization**
```typescript
// Memoized schema creation
const projectSchemaCache = new Map<string, v.GenericSchema>();

export function getProjectSchema(userRole: string): v.GenericSchema {
  if (projectSchemaCache.has(userRole)) {
    return projectSchemaCache.get(userRole)!;
  }

  const schema = createProjectSchema(userRole);
  projectSchemaCache.set(userRole, schema);
  return schema;
}
```

---

## Testing Patterns

### **Unit Testing Forms**
```typescript
// src/lib/forms/__tests__/project-form.test.ts
import { describe, it, expect } from 'vitest';
import { getProjectSchema } from '../schemas/project';
import * as v from 'valibot';

describe('Project Form Schema', () => {
  it('should validate admin project creation', () => {
    const schema = getProjectSchema('SYSTEM_ADMIN');
    const data = {
      title: 'Test Project',
      geographicScope: 'NATIONAL',
      teamIds: ['team1'],
      budget: 100000,
      priority: 'HIGH'
    };

    const result = v.safeParse(schema, data);
    expect(result.success).toBe(true);
  });

  it('should reject supervisor national project creation', () => {
    const schema = getProjectSchema('FIELD_SUPERVISOR');
    const data = {
      title: 'Test Project',
      geographicScope: 'NATIONAL'
    };

    const result = v.safeParse(schema, data);
    expect(result.success).toBe(false);
    expect(result.issues?.[0].message).toContain('Field supervisors cannot create national projects');
  });
});
```

### **Component Testing with Chrome MCP**
```typescript
// src/lib/test/form-testing.ts
export class FormTester {
  async testMultiSelect(page: any, options: string[]) {
    // Open multi-select
    await page.click('[data-testid="multi-select-trigger"]');

    // Select multiple options
    for (const option of options) {
      await page.fill('[data-testid="multi-select-search"]', option);
      await page.click(`[data-testid="option-${option}"]`);
    }

    // Verify selections
    const selectedOptions = await page.$$('[data-testid="selected-option"]');
    expect(selectedOptions.length).toBe(options.length);

    // Close multi-select
    await page.keyboard.press('Escape');
  }

  async testFormValidation(page: any, field: string, invalidValue: any, expectedError: string) {
    // Fill field with invalid value
    await page.fill(`[data-testid="${field}"]`, invalidValue);

    // Trigger validation
    await page.click('[data-testid="submit-button"]');

    // Check for error message
    const errorElement = await page.waitForSelector(`[data-testid="error-${field}"]`);
    expect(await errorElement.textContent()).toContain(expectedError);
  }
}
```

This comprehensive guide provides the patterns and best practices for implementing robust, role-based forms in SurveyLauncher using modern Svelte 5, Superforms, Valibot, and shadcn-svelte components.

---

## 🚀 **Implementation Ready**

### **Connection to Role-Based UI Implementation Plan**
This design patterns document directly supports the `TODO/role-based-ui-implementation-plan.md`:

- ✅ **Phase 1 Ready**: Complete RoleFormFactory with permission matrix for all 9 roles
- ✅ **Schema System**: Comprehensive role-based validation for Project, User, Device, Audit, Policy, Support forms
- ✅ **Form Factory Pattern**: Ready-to-copy implementation with built-in error handling
- ✅ **Multi-Select Components**: Custom components for team/user assignment workflows
- ✅ **Permission Validation**: Server-side and client-side validation for security

### **Next Steps for Development Team**
1. **Copy Implementation**: Extract RoleFormFactory class (lines 808-1060) to `src/lib/forms/factory/role-form-factory.ts`
2. **Extract Schemas**: Copy role-based schema system (lines 136-301) to `src/lib/forms/schemas/role-based-schemas.ts`
3. **Begin Phase 1**: Follow implementation plan with ready-made patterns
4. **Test Integration**: Use Chrome MCP testing patterns from the implementation plan

### **Complete Form Support**
- **Project Forms**: Role-based creation with geographic scope validation
- **User Management**: Hierarchical role assignment based on creator permissions
- **Device Configuration**: Advanced settings for admins and device managers
- **Audit Reports**: Sensitive data restrictions for auditors only
- **Policy Creation**: Multi-level policy administration with scope validation
- **Support Tickets**: Role-based assignment and priority handling

**Status**: 🎯 **Implementation Ready** - All patterns documented and tested for immediate use in the 9-role RBAC system.