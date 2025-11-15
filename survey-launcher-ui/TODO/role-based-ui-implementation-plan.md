# Role-Based UI Implementation Plan

**🎯 MISSION: Implement comprehensive role-based UI interfaces for all 9 user roles with proper access control, navigation, and testing**

**📅 Start Date:** November 15, 2025
**🏗️ Status:** Planning Phase
**🎯 Target:** Complete role-based UI system with Chrome MCP testing

---

## 📊 **Overall Implementation Status: 0%**

### ✅ **Existing Foundation (100% Complete)**
- **SvelteKit 5** with modern runes and TypeScript
- **shadcn-svelte** - 156 production-ready components
- **superforms + valibot** - Modern form validation and state management
- **Authentication system** - JWT token management with role awareness
- **API Integration Layer** - All backend endpoints with RBAC
- **Project Management UI** - Complete CRUD with role permissions
- **User Management UI** - Full admin interface
- **Navigation System** - Responsive layout with routing

### 🔄 **Role-Based UI Integration (0% Complete)**
- [ ] **Frontend Role-Based Access Control** - Critical missing component
- [ ] **Role-Specific Navigation** - Menu items filtered by user role
- [ ] **Role-Based Dashboard Content** - Different widgets per role category
- [ ] **Route Protection** - Guard routes based on user roles
- [ ] **Permission-Based Component Visibility** - Show/hide UI elements

---

## 🎯 **9-Role System Overview**

### **Role Categories:**
1. **Hybrid Roles (App + Web):** `TEAM_MEMBER`, `FIELD_SUPERVISOR`, `REGIONAL_MANAGER`
2. **Web-Only Roles:** `SYSTEM_ADMIN`, `SUPPORT_AGENT`, `AUDITOR`, `DEVICE_MANAGER`, `POLICY_ADMIN`, `NATIONAL_SUPPORT_ADMIN`

### **User Guide Foundation:** ✅ **COMPLETE**
All 9 role-specific user guides created and documented:
- `/docs/user-guide/field-worker-guide.md` - TEAM_MEMBER (Mobile only)
- `/docs/user-guide/supervisor-guide.md` - FIELD_SUPERVISOR (Mobile + Web)
- `/docs/user-guide/manager-guide.md` - REGIONAL_MANAGER (Mobile + Web)
- `/docs/user-guide/system-admin-guide.md` - SYSTEM_ADMIN (Web only)
- `/docs/user-guide/support-agent-guide.md` - SUPPORT_AGENT (Web only)
- `/docs/user-guide/auditor-guide.md` - AUDITOR (Web only)
- `/docs/user-guide/device-manager-guide.md` - DEVICE_MANAGER (Web only)
- `/docs/user-guide/policy-admin-guide.md` - POLICY_ADMIN (Web only)
- `/docs/user-guide/national-support-guide.md` - NATIONAL_SUPPORT_ADMIN (Web only)

---

## 🏗️ **Implementation Plan: 4 Phases (4 days total)**

### **Phase 1: Role-Based Authentication Integration (CRITICAL - 1 day)**
**Priority: CRITICAL** - Foundation for all role-based features

#### **Design Patterns Reference:** `docs/Svelte5DesignPatterns.md`, `docs/Svelte5DesignPatternsSuperforms.md`
- **Global State with Context** - Role store implementation using `$state()` and context API
- **Component Props Typing** - Strong TypeScript typing for role-based components
- **Error Handling Patterns** - Graceful fallbacks for unauthorized access
- **Form Handling with superforms + valibot** - Modern form validation and state management
- **Multi-Select Implementation** - Custom components with shadcn-svelte styling

#### **Superforms + Valibot Integration Strategy:**
```typescript
// superforms + valibot integration for role-based forms
import { superForm } from 'sveltekit-superforms';
import { valibotForm } from 'sveltekit-superforms/adapters';
import * as v from 'valibot';

// Role-based form schemas
const userFormSchema = v.object({
  name: v.string([v.minLength(1, 'Name is required')]),
  email: v.string([v.email('Valid email required')]),
  role: v.picklist(['SYSTEM_ADMIN', 'FIELD_SUPERVISOR', 'TEAM_MEMBER']) // Role-specific validation
});

// superforms form with role-based fields
const { form, errors, message, enhance } = superForm({
  formSchema: userFormSchema,
  validators: valibotForm(userFormSchema),
  onResult: ({ result }) => {
    // Handle role-based form submission
    if (result.type === 'success') {
      handleRoleBasedFormSubmit(result.data);
    }
  }
});
```

#### **Files to Create:**
```
src/lib/
├── stores/
│   └── role.svelte.js              # Global role state with context
├── utils/
│   └── role.utils.ts               # Role utility functions and permissions matrix
└── types/
    └── role.types.ts               # TypeScript role definitions
```

#### **Files to Update:**
```
src/
├── lib/components/Navbar.svelte   # Role-based navigation menu
├── routes/+layout.svelte          # Route protection logic
└── lib/stores/auth.svelte.js       # Enhanced auth with role integration
```

#### **Tasks:**
- [ ] **Create Role Store** - Global reactive state for user role and permissions
- [ ] **Integrate Web Admin Auth** - Replace current auth with role-aware authentication
- [ ] **Update Navigation** - Role-based menu visibility per user role
- [ ] **Add Route Guards** - Protect routes based on user roles with proper redirects
- [ ] **Permission Matrix** - Implement granular permissions system

**Svelte 5 Patterns to Use:**
```typescript
// Role store with $state() and context
let roleState = $state<RoleState>({
  userRole: null,
  permissions: [],
  isLoading: false
});

// Context provider pattern
export function setRoleContext() {
  setContext(ROLE_KEY, roleService);
}

// Permission-based component visibility
let hasPermission = $derived(() =>
  requiredPermissions.every(perm =>
    roleState.permissions.includes(perm)
  )
);
```

#### **Chrome MCP Testing:**
- [ ] Test login flow for each role type
- [ ] Verify role-based navigation visibility
- [ ] Test route protection with unauthorized access attempts
- [ ] Validate permission-based component rendering

---

### **Phase 2: Role-Based Dashboard Enhancement (HIGH - 1 day)**
**Priority: HIGH** - Different dashboard content for each role category

#### **Design Patterns Reference:** `docs/Svelte5DesignPatterns.md`
- **Component Composition with Snippets** - Role-specific dashboard widgets
- **Derived State** - Computed values based on user role
- **Lazy Loading** - Load role-specific components only when needed
- **Formsnap Form Integration** - Modern form validation with role-based schemas

#### **Formsnap Dashboard Forms:**
```typescript
// Role-specific dashboard form configurations
const dashboardFormSchemas = {
  SYSTEM_ADMIN: v.object({
    systemSetting: v.string(),
    globalPolicy: v.string(),
    emergencyOverride: v.boolean([v.defaultValue(false)])
  }),
  FIELD_SUPERVISOR: v.object({
    teamAssignment: v.string(),
    taskPriority: v.picklist(['LOW', 'MEDIUM', 'HIGH']),
    supervisorNote: v.optional(v.string())
  }),
  AUDITOR: v.object({
    auditScope: v.string(),
    complianceCheck: v.boolean(),
    reportType: v.picklist(['WEEKLY', 'MONTHLY', 'QUARTERLY'])
  })
};
```

#### **Components to Create:**
```
src/lib/components/dashboard/
├── widgets/
│   ├── SystemAdminWidget.svelte    # Full system overview
│   ├── SupervisorWidget.svelte      # Team performance tools
│   ├── AuditorWidget.svelte         # Compliance and audit tools
│   ├── DeviceManagerWidget.svelte   # Device inventory and monitoring
│   ├── PolicyAdminWidget.svelte     # Policy management tools
│   └── SupportAgentWidget.svelte    # Help desk and ticketing
├── RoleBasedDashboard.svelte        # Main dashboard container
└── PermissionGuard.svelte           # Permission-based wrapper
```

#### **Tasks:**
- [ ] **Role-Specific Widgets** - Different dashboard content per role:
  - **System Admin**: Full system statistics, user management, system health
  - **Field Supervisor**: Team performance, active devices, project oversight
  - **Auditor**: Compliance reports, audit logs, security alerts
  - **Device Manager**: Device inventory, status monitoring
  - **Policy Admin**: Policy compliance, violation reports
- [ ] **Permission-Based Actions** - Show/hide dashboard actions based on role
- [ ] **Widget Lazy Loading** - Load only relevant components for user role
- [ ] **Responsive Role Layout** - Optimize dashboard layout per role needs

**Svelte 5 Patterns to Use:**
```typescript
// Role-based widget loading
let dashboardWidgets = $derived(() => {
  const widgetMap = {
    'SYSTEM_ADMIN': [SystemAdminWidget, UserManagementWidget],
    'FIELD_SUPERVISOR': [SupervisorWidget, TeamPerformanceWidget],
    'AUDITOR': [AuditorWidget, ComplianceWidget],
    // ... other roles
  };

  return widgetMap[userRole] || [DefaultWidget];
});

// Permission wrapper component
let {
  permissions = [],
  children,
  fallback = AccessDenied
} = $props<{
  permissions: string[];
  children: Snippet;
  fallback?: Snippet;
}>();

let hasAccess = $derived(() =>
  permissions.every(perm => userPermissions.includes(perm))
);
```

#### **Chrome MCP Testing:**
- [ ] Test dashboard content for each role category
- [ ] Verify permission-based widget visibility
- [ ] Test responsive layout across different screen sizes
- [ ] Validate dashboard performance with role-specific data

---

### **Phase 3: Role-Based Project Management (HIGH - 1 day)**
**Priority: HIGH** - Implement role-based project CRUD permissions and workflows

#### **Design Patterns Reference:** `docs/Svelte5DesignPatterns.md`
- **Form Handling** - Role-specific form validation with formsnap integration
- **Component Props Typing** - Strong typing for project management components
- **Error Handling Patterns** - Permission-specific error messages
- **Formsnap + Valibot Validation** - Type-safe form schemas for role-based CRUD
- **shadcn-svelte Form Components** - Integrated form components with formsnap (https://www.shadcn-svelte.com/docs/components/form)

#### **Project Management Forms Implementation:**
```typescript
// Project schema with role-based validation
import * as v from 'valibot';

const baseProjectSchema = v.object({
  title: v.string([v.minLength(1, 'Project title is required'), v.maxLength(200)]),
  abbreviation: v.string([v.minLength(2, 'Abbreviation required'), v.maxLength(10)]),
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
    v.check((data) => userRole !== 'TEAM_MEMBER'),
    'Team members cannot create projects'
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
      if (['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole)) {
        return data.teamIds && data.teamIds.length > 0;
      }
      return true;
    }, 'At least one team must be selected'),
    ['teamIds']
  )
);
```

##### **Project Form Component Implementation:**
```svelte
<!-- src/lib/components/projects/ProjectForm.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { valibotForm } from 'sveltekit-superforms/adapters';
  import { createProjectSchema } from '$lib/forms/schemas/project';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Select } from '$lib/components/ui/select';
  import { MultiSelect } from '$lib/components/ui/multi-select';
  import { Label } from '$lib/components/ui/label';

  let { userRole, initialData = null, project = null } = $props<{
    userRole: string;
    initialData?: any;
    project?: any;
  }>();

  // Role-based schema
  const schema = project
    ? updateProjectSchema(userRole, project.id)
    : createProjectSchema(userRole);

  const { form, errors, message, enhance, submitting } = superForm({
    formSchema: schema,
    validators: valibotForm(schema),
    initialValues: initialData || project,
    onResult: ({ result }) => {
      if (result.type === 'success') {
        handleProjectOperation(result.data);
      }
    }
  });

  // Role-based field visibility
  let showAdvancedFields = $derived(['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole));
  let showTeamFields = $derived(['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole));
  let showUserAssignment = $derived(['SYSTEM_ADMIN', 'FIELD_SUPERVISOR'].includes(userRole));

  // Dynamic options based on role
  let availableTeams = $derived(() => getTeamsForRole(userRole));
  let availableUsers = $derived(() => getUsersForRole(userRole));
</script>

<form method="POST" use:enhance class="space-y-6">
  <!-- Basic fields (all roles) -->
  <div class="space-y-2">
    <Label for="title">Project Title</Label>
    <Input
      bind:value={$form.title}
      class={errors.title ? 'border-red-500' : ''}
      placeholder="Enter project title"
    />
    {#if errors.title}
      <p class="text-sm text-red-500">{errors.title[0]}</p>
    {/if}
  </div>

  <div class="space-y-2">
    <Label for="abbreviation">Abbreviation</Label>
    <Input
      bind:value={$form.abbreviation}
      class={errors.abbreviation ? 'border-red-500' : ''}
      placeholder="Enter abbreviation"
      maxlength={10}
    />
    {#if errors.abbreviation}
      <p class="text-sm text-red-500">{errors.abbreviation[0]}</p>
    {/if}
  </div>

  <div class="space-y-2">
    <Label for="description">Description</Label>
    <Textarea
      bind:value={$form.description}
      placeholder="Enter project description"
      rows={3}
    />
  </div>

  <!-- Role-specific fields -->
  {#if showTeamFields}
    <div class="space-y-2">
      <Label for="geographicScope">Geographic Scope</Label>
      <Select bind:value={$form.geographicScope} id="geographicScope">
        <option value="">Select scope</option>
        <option value="LOCAL">Local</option>
        <option value="REGIONAL">Regional</option>
        {#if userRole === 'SYSTEM_ADMIN'}
          <option value="NATIONAL">National</option>
        {/if}
      </Select>
      {#if errors.geographicScope}
        <p class="text-sm text-red-500">{errors.geographicScope[0]}</p>
      {/if}
    </div>

    <div class="space-y-2">
      <Label>Assign Teams</Label>
      <MultiSelect
        bind:value={$form.teamIds}
        options={$availableTeams}
        placeholder="Select teams to assign..."
        errors={errors.teamIds}
      />
    </div>
  {/if}

  {#if showUserAssignment}
    <div class="space-y-2">
      <Label>Assign Users</Label>
      <MultiSelect
        bind:value={$form.assignedUsers}
        options={$availableUsers}
        placeholder="Select users to assign..."
        errors={errors.assignedUsers}
      />
    </div>
  {/if}

  <!-- Advanced fields (System Admin only) -->
  {#if showAdvancedFields}
    <div class="space-y-2">
      <Label for="budget">Budget</Label>
      <Input
        type="number"
        bind:value={$form.budget}
        id="budget"
        placeholder="Enter budget amount"
      />
    </div>

    <div class="space-y-2">
      <Label for="priority">Priority</Label>
      <Select bind:value={$form.priority} id="priority">
        <option value="">Select priority</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </Select>
    </div>
  {/if}

  <!-- Status field (all roles) -->
  <div class="space-y-2">
    <Label for="status">Status</Label>
    <Select bind:value={$form.status} id="status">
      <option value="ACTIVE">Active</option>
      <option value="INACTIVE">Inactive</option>
    </Select>
    {#if errors.status}
      <p class="text-sm text-red-500">{errors.status[0]}</p>
    {/if}
  </div>

  {#if message}
    <div class="p-4 rounded-md bg-green-50 text-green-800">
      {message}
    </div>
  {/if}

  <Button type="submit" disabled={$submitting}>
    {$submitting ? 'Processing...' : (project ? 'Update Project' : 'Create Project')}
  </Button>
</form>
```

##### **Server-Side Project Actions:**
```typescript
// src/routes/api/v1/projects/+server.ts
import { superValidate } from 'sveltekit-superforms';
import { valibotForm } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { createProjectSchema, updateProjectSchema } from '$lib/forms/schemas/project';

export const actions = {
  create: async ({ request }) => {
    const form = await superValidate(request, valibotForm(
      createProjectSchema('SYSTEM_ADMIN') // Will be overridden by role validation
    ));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Get actual user role
    const userRole = await getCurrentUserRole();

    // Re-validate with actual user role
    const roleSchema = createProjectSchema(userRole);
    const roleValidation = v.safeParse(roleSchema, form.data);

    if (!roleValidation.success) {
      return fail(400, {
        form: {
          ...form,
          message: roleValidation.issues?.[0]?.message || 'Validation failed'
        }
      });
    }

    // Create project
    try {
      const project = await createProject({
        ...form.data,
        createdBy: await getCurrentUserId(),
        createdAt: new Date()
      });

      return {
        success: true,
        project
      };
    } catch (error) {
      return fail(500, {
        form: {
          ...form,
          message: 'Failed to create project'
        }
      });
    }
  },

  update: async ({ request, params }) => {
    const { id } = params;
    const form = await superValidate(request, valibotForm(
      updateProjectSchema('SYSTEM_ADMIN', id) // Will be overridden by role validation
    ));

    if (!form.valid) {
      return fail(400, { form });
    }

    const userRole = await getCurrentUserRole();

    // Re-validate with actual user role
    const roleSchema = updateProjectSchema(userRole, id);
    const roleValidation = v.safeParse(roleSchema, form.data);

    if (!roleValidation.success) {
      return fail(400, {
        form: {
          ...form,
          message: roleValidation.issues?.[0]?.message || 'Validation failed'
        }
      });
    }

    // Update project
    try {
      const project = await updateProject(id, {
        ...form.data,
        updatedAt: new Date(),
        updatedBy: await getCurrentUserId()
      });

      return {
        success: true,
        project
      };
    } catch (error) {
      return fail(500, {
        form: {
          ...form,
          message: 'Failed to update project'
        }
      });
    }
  }
};
```

#### **Components to Create:**
```
src/lib/components/projects/
├── RoleBasedActions.svelte         # Permission-based action buttons
├── AssignmentManager.svelte        # Role-aware user/team assignment
├── ProjectForm.svelte              # formsnap-powered project creation/editing
├── ApprovalWorkflow.svelte         # Multi-level approval for projects
├── ScopeSelector.svelte            # Geographic scope based on role权限
└── forms/
    ├── ProjectFormSchema.ts        # Zod schemas for project forms
    ├── UserAssignmentForm.svelte    # formsnap user assignment form
    └── TeamAssignmentForm.svelte    # formsnap team assignment form
```

#### **Formsnap Form Tasks:**
- [ ] **Project Creation Form** - Role-based fields and validation:
  - **System Admin**: All fields available, national scope allowed
  - **Regional Manager**: Regional scope limit, team assignment required
  - **Field Supervisor**: Local scope only, team members only
  - **Team Member**: Read-only view, no creation permissions
- [ ] **Assignment Forms** - Role-aware user/team assignment with formsnap
- [ ] **Approval Workflows** - Multi-step forms with role-based validation
- [ ] **Field Visibility** - Show/hide form fields based on user role

#### **Tasks:**
- [ ] **Project CRUD Permissions** - Limit operations by role:
  - **System Admin/Regional Manager**: Full project CRUD
  - **Field Supervisor**: Read-only + limited updates for assigned projects
  - **Team Member**: View-only assigned projects
  - **Auditor**: Read access to all projects for compliance
- [ ] **Assignment Management** - Role-based user/team assignment interfaces
- [ ] **Approval Workflows** - Multi-level approval based on role hierarchy
- [ ] **Geographic Scope Limits** - Enforce regional boundaries in project creation

**Svelte 5 Patterns to Use:**
```typescript
// Permission-based project actions
let availableActions = $derived(() => {
  const actionMap = {
    'SYSTEM_ADMIN': ['create', 'edit', 'delete', 'assign', 'approve'],
    'FIELD_SUPERVISOR': ['view', 'edit_limited', 'assign_team'],
    'TEAM_MEMBER': ['view'],
    'AUDITOR': ['view', 'audit']
  };

  return actionMap[userRole] || [];
});

// Form field visibility based on role
let formFields = $derived(() => {
  const baseFields = ['title', 'description', 'status'];
  const roleSpecificFields = {
    'SYSTEM_ADMIN': ['geographicScope', 'approvalRequired'],
    'REGIONAL_MANAGER': ['geographicScope'],
    'FIELD_SUPERVISOR': ['teamAssignment']
  };

  return [...baseFields, ...(roleSpecificFields[userRole] || [])];
});
```

#### **Chrome MCP Testing:**
- [ ] Test project CRUD operations for each role
- [ ] Verify assignment permissions and restrictions
- [ ] Test approval workflows with different role combinations
- [ ] Validate geographic scope enforcement

---

### **Phase 4: Specialized Role Interfaces (MEDIUM - 1 day)**
**Priority: MEDIUM** - Create specialized interfaces for web-only roles

#### **Design Patterns Reference:** `docs/Svelte5DesignPatterns.md`
- **Component Lazy Loading** - Load specialized interfaces on demand
- **Virtual Scrolling** - For large data sets in audit/device management
- **State Management Patterns** - Complex state for specialized tools
- **Formsnap Advanced Forms** - Complex role-based forms with conditional validation

#### **Formsnap Specialized Interface Forms:**
```typescript
// Device Manager form with conditional validation
const deviceFormSchema = v.object({
  deviceId: v.string([v.minLength(1, 'Device ID required')]),
  deviceName: v.string([v.minLength(1, 'Device name required')]),
  teamId: v.string(),
  assignedUserId: v.optional(v.string()),
  configuration: v.optional(v.record(v.any()))
}).pipe(
  v.forward(
    v.check((data) => {
      const userRole = getCurrentUserRole();
      return !(userRole === 'DEVICE_MANAGER' && !data.configuration);
    }, 'Device configuration is required for device managers'),
    ['configuration']
  ),
  v.forward(
    v.check((data) => {
      const userRole = getCurrentUserRole();
      return !(userRole === 'FIELD_SUPERVISOR' && data.configuration);
    }, 'Field supervisors cannot modify device configuration'),
    ['configuration']
  )
);

// Auditor report form with role-specific validation
const auditReportSchema = v.object({
  reportType: v.picklist(['COMPLIANCE', 'SECURITY', 'PERFORMANCE']),
  scope: v.string(),
  dateRange: v.object({
    start: v.date(),
    end: v.date()
  }),
  includeSensitive: v.boolean([v.defaultValue(false)])
}).pipe(
  v.forward(
    v.check((data) => {
      const userRole = getCurrentUserRole();
      return !(userRole !== 'AUDITOR' && data.includeSensitive);
    }, 'Only auditors can include sensitive information in reports'),
    ['includeSensitive']
  )
);
```

#### **Routes and Components to Create:**
```
src/routes/
├── audit/
│   └── +page.svelte                 # Auditor dashboard and tools
├── devices/
│   └── management/
│       └── +page.svelte             # Advanced device management
├── policies/
│   └── +page.svelte                 # Policy administration interface
├── support/
│   └── +page.svelte                 # Support ticket system
└── national/
    └── +page.svelte                 # Cross-regional oversight

src/lib/components/specialized/
├── AuditTools.svelte               # Auditor-specific components
├── DeviceController.svelte         # Device management tools
├── PolicyEditor.svelte             # Policy creation/editing
├── TicketSystem.svelte             # Support ticketing
└── NationalOversight.svelte        # Cross-regional reporting
```

#### **Tasks:**
- [ ] **Audit Interface** - Specialized tools for `AUDITOR` role
- [ ] **Device Management Dashboard** - Comprehensive tools for `DEVICE_MANAGER`
- [ ] **Policy Administration** - Policy creation and management for `POLICY_ADMIN`
- [ ] **Support Tools** - Help desk interface for `SUPPORT_AGENT`
- [ ] **National Oversight** - Cross-regional reporting for `NATIONAL_SUPPORT_ADMIN`

**Svelte 5 Patterns to Use:**
```typescript
// Specialized interface lazy loading
let SpecializedInterface = $state<ComponentType | null>(null);

$effect(async () => {
  if (userRole && requiresSpecializedInterface(userRole)) {
    const interfaceMap = {
      'AUDITOR': () => import('./AuditTools.svelte'),
      'DEVICE_MANAGER': () => import('./DeviceController.svelte'),
      'POLICY_ADMIN': () => import('./PolicyEditor.svelte')
    };

    const loader = interfaceMap[userRole];
    if (loader) {
      SpecializedInterface = (await loader()).default;
    }
  }
});

// Virtual scrolling for large datasets
let virtualizedAuditLogs = $derived(() =>
  createVirtualizedData(auditLogs, { itemHeight: 60, visibleCount: 20 })
);
```

#### **Chrome MCP Testing:**
- [ ] Test each specialized interface functionality
- [ ] Verify large dataset performance with virtual scrolling
- [ ] Test role-specific workflows and permissions
- [ ] Validate data export and reporting features

---

## 🔧 **Technical Implementation Strategy**

### **Formsnap Integration Architecture:**

#### **Form Schema Organization:**
```typescript
// src/lib/forms/schemas/
export const formSchemas = {
  // User management forms
  user: {
    create: userCreateSchema,
    update: userUpdateSchema,
    assign: userAssignmentSchema
  },

  // Project management forms
  project: {
    create: projectCreateSchema,
    update: projectUpdateSchema,
    assign: projectAssignmentSchema
  },

  // Device management forms
  device: {
    register: deviceRegistrationSchema,
    configure: deviceConfigurationSchema,
    assign: deviceAssignmentSchema
  },

  // Specialized role forms
  specialized: {
    audit: auditReportSchema,
    policy: policyCreationSchema,
    support: supportTicketSchema
  }
};
```

#### **Role-Based Form Factory:**
```typescript
// src/lib/forms/role-form-factory.ts
import { superForm } from 'sveltekit-superforms';
import { valibotForm } from 'formsnap';
import * as v from 'valibot';

export class RoleFormFactory {
  static createForm(formKey: string, userRole: string, options = {}) {
    const schema = this.getSchemaForRole(formKey, userRole);
    const validators = valibotForm(schema);

    return superForm({
      formSchema: schema,
      validators,
      onResult: ({ result }) => {
        this.handleRoleBasedResult(result, userRole);
      },
      ...options
    });
  }

  static getSchemaForRole(formKey: string, userRole: string) {
    const baseSchema = formSchemas[this.getFormCategory(formKey)][formKey];
    return this.applyRoleRestrictions(baseSchema, userRole);
  }

  static applyRoleRestrictions(schema: v.GenericSchema, userRole: string) {
    return schema.pipe(
      v.check((data) => {
        // Apply role-specific validation rules
        return this.validateRolePermissions(data, userRole);
      }, `Access denied for role: ${userRole}`)
    );
  }
}
```

#### **Permission Matrix Implementation:**
```typescript
// src/lib/types/role.types.ts
export const ROLE_PERMISSIONS = {
  SYSTEM_ADMIN: [
    'user:create', 'user:read', 'user:update', 'user:delete',
    'project:create', 'project:read', 'project:update', 'project:delete',
    'device:create', 'device:read', 'device:update', 'device:delete',
    'policy:create', 'policy:read', 'policy:update', 'policy:delete',
    'audit:read', 'audit:export', 'system:configure', '*'
  ],
  TEAM_MEMBER: [
    'app:login', 'app:gps', 'app:telemetry',
    'project:read_assigned', 'task:complete'
  ],
  FIELD_SUPERVISOR: [
    'app:*', 'web:dashboard', 'web:projects:read', 'web:projects:update_limited',
    'web:users:read_team', 'web:devices:monitor_team', 'supervisor:override'
  ],
  // ... other roles
} as const;

// Form-specific permissions
export const FORM_PERMISSIONS = {
  'user:create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
  'project:create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'],
  'device:configure': ['SYSTEM_ADMIN', 'DEVICE_MANAGER'],
  'audit:report': ['AUDITOR', 'SYSTEM_ADMIN'],
  'policy:create': ['POLICY_ADMIN', 'SYSTEM_ADMIN']
} as const;
```

### **Navigation Structure by Role:**
```typescript
// src/lib/utils/navigation.utils.ts
export const ROLE_NAVIGATION = {
  SYSTEM_ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/users', label: 'User Management', icon: 'users' },
    { href: '/projects', label: 'Projects', icon: 'folder' },
    { href: '/devices', label: 'Devices', icon: 'smartphone' },
    { href: '/policies', label: 'Policies', icon: 'shield' },
    { href: '/audit', label: 'Audit', icon: 'clipboard-list' },
    { href: '/support', label: 'Support', icon: 'help-circle' },
    { href: '/national', label: 'National', icon: 'globe' }
  ],
  TEAM_MEMBER: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/projects/assigned', label: 'My Projects', icon: 'folder' },
    { href: '/tasks', label: 'Tasks', icon: 'check-square' }
  ],
  // ... other roles
};
```

### **Route Protection Implementation:**
```typescript
// src/lib/utils/route-guards.ts
export function createRoleGuard(requiredPermissions: string[]) {
  return function guard() {
    const userRole = getCurrentUserRole();
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    const hasAccess = requiredPermissions.every(perm =>
      userPermissions.includes(perm) || userPermissions.includes('*')
    );

    if (!hasAccess) {
      throw redirect(302, '/unauthorized');
    }
  };
}
```

---

## 🧪 **Chrome MCP Testing Strategy**

### **Testing Framework Setup:**
```typescript
// src/lib/test/chrome-mcp-utils.ts
export class ChromeMCPTester {
  async testRoleBasedNavigation(userRole: string) {
    // Login as specific role
    await this.loginAsRole(userRole);

    // Test navigation visibility
    const visibleItems = await this.getVisibleNavigationItems();
    const expectedItems = ROLE_NAVIGATION[userRole];

    return this.validateNavigation(visibleItems, expectedItems);
  }

  async testRouteProtection(route: string, userRole: string) {
    await this.loginAsRole(userRole);
    const response = await this.navigate(route);

    return {
      allowed: response.status < 400,
      redirected: response.redirected,
      destination: response.redirected ? response.url : null
    };
  }

  async testComponentPermissions(component: string, userRole: string) {
    await this.loginAsRole(userRole);
    const componentState = await this.getComponentState(component);

    return this.validateComponentPermissions(componentState, userRole);
  }
}
```

### **Comprehensive Testing Plan:**

#### **Phase 1 Testing:**
- [ ] Login flow for each of the 9 roles
- [ ] Navigation menu visibility per role
- [ ] Route protection with unauthorized access
- [ ] Role-based component rendering
- [ ] Permission validation in UI

#### **Phase 2 Testing:**
- [ ] Dashboard content per role category
- [ ] Widget functionality and data accuracy
- [ ] Role-specific quick actions
- [ ] Responsive design for each role layout
- [ ] Performance metrics per role

#### **Phase 3 Testing:**
- [ ] Project CRUD permissions per role
- [ ] Assignment workflow testing
- [ ] Approval process validation
- [ ] Geographic scope enforcement
- [ ] Data integrity across role boundaries

#### **Phase 4 Testing:**
- [ ] Specialized interface functionality
- [ ] Large dataset performance
- [ ] Export and reporting features
- [ ] Cross-role collaboration workflows
- [ ] Error handling and edge cases

### **Automated Test Scripts:**
```typescript
// src/lib/test/role-based-tests.ts
export const roleTests = {
  async runAllRoleTests() {
    const roles = Object.keys(ROLE_PERMISSIONS);
    const results = {};

    for (const role of roles) {
      results[role] = {
        navigation: await testRoleNavigation(role),
        dashboard: await testRoleDashboard(role),
        projects: await testRoleProjects(role),
        permissions: await testRolePermissions(role)
      };
    }

    return results;
  }
};
```

---

## ✅ **Success Criteria**

### **Functional Requirements:**
- ✅ All 9 roles properly differentiated in UI
- ✅ Role-based navigation and route protection
- ✅ Permission-based component visibility
- ✅ Role-specific dashboard content
- ✅ Proper integration with existing authentication
- ✅ Security enforcement (no UI privilege escalation)

### **Technical Requirements:**
- ✅ Svelte 5 runes patterns (`$state`, `$derived`, `$effect`, `$props`)
- ✅ TypeScript type safety for all role-based components
- ✅ Consistent shadcn-svelte component usage
- ✅ Performance optimization with lazy loading
- ✅ Chrome MCP comprehensive testing coverage

### **User Experience:**
- ✅ Intuitive role-based interfaces
- ✅ Clear permission boundaries
- ✅ Efficient workflows per role category
- ✅ Mobile-responsive design for hybrid roles
- ✅ Accessible design with proper ARIA support

### **Security Requirements:**
- ✅ Frontend access control reinforces backend permissions
- ✅ No privilege escalation possible through UI manipulation
- ✅ Proper session management for different role types
- ✅ Audit logging for role-based actions
- ✅ Secure data handling for sensitive role information

---

## ⏱️ **Time Estimates**

| Phase | Estimated Time | Priority | Chrome MCP Tests |
|-------|----------------|----------|------------------|
| Role Authentication Integration | 1 day | CRITICAL | 9 role login tests |
| Role-Based Dashboard Enhancement | 1 day | HIGH | 5 category dashboard tests |
| Role-Based Project Management | 1 day | HIGH | Project CRUD permission tests |
| Specialized Role Interfaces | 1 day | MEDIUM | Specialized interface tests |
| **Total** | **4 days** | **-** | **50+ comprehensive tests** |

---

## 🔄 **Integration Workflow**

### **Development Process:**
1. **Authentication First** - Implement role-based auth integration
2. **Navigation Second** - Create role-based menu systems
3. **Dashboard Third** - Build role-specific dashboard content
4. **Projects Fourth** - Implement role-based project management
5. **Specialized Fifth** - Create role-specific advanced interfaces

### **Testing Integration:**
1. **Unit Tests** - Role utility functions and permissions
2. **Integration Tests** - Role-based API access and component interaction
3. **E2E Tests** - Complete user workflows per role using Chrome MCP
4. **Security Tests** - Permission validation and access control verification
5. **Performance Tests** - Role-specific interface performance

---

## 📝 **Notes & Considerations**

### **Svelte 5 Design Patterns Integration:**
- Follow documented patterns from `docs/Svelte5DesignPatterns.md`
- Use `$state()` for reactive role management
- Implement `$derived()` for permission-based visibility
- Leverage `$effect()` for role-based side effects
- Apply `$props()` typing for role-aware components

### **Chrome MCP Testing Best Practices:**
- Test each route after creation
- Validate role-based UI changes
- Test cross-role compatibility
- Verify mobile responsiveness for hybrid roles
- Performance test with realistic data loads

### **Security Considerations:**
- Frontend role validation reinforces backend permissions
- Never trust client-side role data alone
- Implement proper session timeout handling
- Log all role-based access attempts
- Validate permissions on every sensitive action

---

## 📋 **Additional TODO Items**

### **Phase 1.5: Web Admin Authentication Integration (CRITICAL - 1 day)**

#### **Authentication System Enhancement:**
- [ ] **Integrate Web Admin Auth** - Connect existing `web-admin-auth.remote.ts` with UI
- [ ] **Create Role Store** - Global reactive state with `$state()` and context API
- [ ] **Role-Based Session Management** - Handle dual authentication (mobile app + web admin)
- [ ] **Session Persistence** - Proper JWT token storage and refresh
- [ ] **Role Detection** - Automatic role identification on login

#### **Role-Based Access Control:**
- [ ] **Permission Matrix Implementation** - Granular permissions for all 9 roles
- [ ] **Navigation Menu Filtering** - Dynamic menu items based on user role
- [ ] **Route Protection** - Guard routes based on user permissions
- [ ] **Component Visibility Guards** - Show/hide UI elements per role
- [ ] **Role Context Provider** - Global role context for all components

### **Phase 2.5: Enhanced Project Management with Role-Based CRUD**

#### **Project Management Features:**
- [ ] **Role-Based Project Creation** - Different forms per role with field restrictions
- [ ] **Geographic Scope Enforcement** - LOCAL/REGIONAL/NATIONAL based on user role
- [ ] **Multi-Select Team Assignment** - Custom multi-select with role filtering
- [ ] **User Assignment Management** - Role-aware user selection and permissions
- [ ] **Project Approval Workflows** - Multi-level approval for different roles

#### **Multi-Select Implementation:**
- [ ] **Custom Multi-Select Component** - Built with shadcn-svelte styling
- [ ] **Search and Filter Functionality** - Real-time filtering of large datasets
- [ ] **Tag-Based Selection Display** - Visual representation of selected items
- [ ] **Accessibility Compliance** - Full ARIA support and keyboard navigation
- [ ] **Chrome MCP Testing** - Automated testing for multi-select functionality

#### **Form Implementation Guidelines:**
- [ ] **Superforms + Valibot Patterns** - Consistent validation across all forms
- [ ] **Dual Validation Strategy** - Client-side reactivity + server-side security
- [ ] **Role-Based Field Visibility** - Dynamic form fields based on user permissions
- [ ] **Progressive Enhancement** - Forms work without JavaScript
- [ ] **Error Handling Patterns** - Comprehensive error states and user feedback

### **Phase 3.5: Specialized Role Interfaces**

#### **Role-Specific Dashboards:**
- [ ] **System Admin Dashboard** - Full system oversight and configuration
- [ ] **Field Supervisor Dashboard** - Team performance and device monitoring
- [ ] **Auditor Dashboard** - Compliance reports and audit logs
- [ ] **Device Manager Dashboard** - Device inventory and configuration
- [ ] **Policy Admin Dashboard** - Policy management and compliance

#### **Advanced Features:**
- [ ] **Real-Time Updates** - WebSocket integration for live data
- [ ] **Data Visualization** - Charts and graphs for role-specific metrics
- [ ] **Export Functionality** - Role-based data export capabilities
- [ ] **Bulk Operations** - Multi-select actions for efficiency
- [ ] **Mobile Responsiveness** - Optimized for different screen sizes

---

**Last Updated:** November 15, 2025
**Next Milestone:** Complete Phase 1 - Role-Based Authentication Integration + Web Admin Auth
**Current Status:** Ready to begin implementation with simplified stack (Superforms + Valibot + shadcn-svelte)