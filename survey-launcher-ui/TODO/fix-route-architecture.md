# SurveyLauncher UI - Route Architecture Restructure Plan

**Status:** Proposed
**Created:** 2025-11-16
**Priority:** High
**Target:** SvelteKit 5 with Modern Runes

## Executive Summary

The current SurveyLauncher UI route structure lacks logical organization and scalability. This document outlines a comprehensive restructure plan that groups routes by functional domains, separates development tools from production features, and establishes a scalable foundation for future growth.

## Current Route Problems

### 1. **Poor Logical Grouping**
```bash
src/routes/
├── +page.svelte               # Landing page
├── auth/login/+page.svelte    # Auth ✅
├── dashboard/+page.svelte     # Main dashboard ✅
├── users/                     # User management ✅
├── projects/                  # Project management ✅
├── project-components/        # Components library ❌
├── test/                      # Testing ❌
├── test-projects/             # Testing ❌
└── role-test/                 # Testing ❌
```

**Issues:**
- Testing routes (`test`, `test-projects`, `role-test`) mixed with production routes
- No clear separation between core functionality and development tools
- Inconsistent naming (`project-components` vs `projects`)
- Missing critical sections referenced in landing page

### 2. **Missing Core Sections**
Based on the landing page, these sections are referenced but don't exist:
- Device Management (`/devices`)
- Team Management (`/teams`)
- Policy Editor (`/policies`)
- Telemetry Dashboard (`/dashboard/analytics`)
- System Settings (`/settings`)

### 3. **Development vs Production Routes**
- Development tools clutter main navigation
- No environment-based route visibility
- Testing pages exposed in production navbar

## Proposed Route Architecture

### New Route Structure

```bash
src/routes/
├── (+layout.svelte)           # Global layout with navbar
├── +page.svelte               # Landing page (/)
│
├── auth/                      # Authentication Domain
│   ├── +page.svelte           # Auth selection (/auth)
│   ├── login/+page.svelte     # Login (/auth/login) ✅ EXISTING
│   ├── logout/+page.svelte    # Logout handler (/auth/logout)
│   └── +layout.svelte         # Auth section layout
│
├── dashboard/                 # Dashboard Domain
│   ├── +page.svelte           # Overview (/dashboard) ✅ EXISTING
│   ├── +layout.svelte         # Dashboard sub-layout
│   ├── analytics/+page.svelte # Analytics (/dashboard/analytics)
│   ├── monitoring/+page.svelte # Real-time monitoring (/dashboard/monitoring)
│   └── reports/+page.svelte   # Reports (/dashboard/reports)
│
├── users/                     # User Management Domain ✅ EXISTING
│   ├── +page.svelte           # Users list (/users)
│   ├── create/+page.svelte    # Create user (/users/create)
│   ├── [id]/+page.svelte      # User details (/users/:id)
│   ├── [id]/edit/+page.svelte # Edit user (/users/:id/edit)
│   └── +layout.svelte         # Users section layout
│
├── projects/                  # Project Management Domain ✅ EXISTING
│   ├── +page.svelte           # Projects list (/projects)
│   ├── create/+page.svelte    # Create project (/projects/create)
│   ├── [id]/+page.svelte      # Project details (/projects/:id)
│   ├── [id]/edit/+page.svelte # Edit project (/projects/:id/edit)
│   └── +layout.svelte         # Projects section layout
│
├── devices/                   # Device Management Domain 🆕 MISSING
│   ├── +page.svelte           # Devices list (/devices)
│   ├── create/+page.svelte    # Provision device (/devices/create)
│   ├── [id]/+page.svelte      # Device details (/devices/:id)
│   ├── [id]/configure/+page.svelte # Device config (/devices/:id/configure)
│   ├── [id]/telemetry/+page.svelte # Device telemetry (/devices/:id/telemetry)
│   ├── [id]/policies/+page.svelte # Device policies (/devices/:id/policies)
│   └── +layout.svelte         # Devices section layout
│
├── teams/                     # Team Management Domain 🆕 MISSING
│   ├── +page.svelte           # Teams list (/teams)
│   ├── create/+page.svelte    # Create team (/teams/create)
│   ├── [id]/+page.svelte      # Team details (/teams/:id)
│   ├── [id]/members/+page.svelte # Team members (/teams/:id/members)
│   ├── [id]/policies/+page.svelte # Team policies (/teams/:id/policies)
│   └── +layout.svelte         # Teams section layout
│
├── policies/                  # Policy Management Domain 🆕 MISSING
│   ├── +page.svelte           # Policies list (/policies)
│   ├── create/+page.svelte    # Create policy (/policies/create)
│   ├── [id]/+page.svelte      # Policy details (/policies/:id)
│   ├── [id]/edit/+page.svelte # Edit policy (/policies/:id/edit)
│   ├── templates/+page.svelte # Policy templates (/policies/templates)
│   ├── builder/+page.svelte   # Visual policy builder (/policies/builder)
│   └── +layout.svelte         # Policies section layout
│
├── settings/                  # System Settings Domain 🆕 MISSING
│   ├── +page.svelte           # General settings (/settings)
│   ├── system/+page.svelte    # System config (/settings/system)
│   ├── security/+page.svelte  # Security settings (/settings/security)
│   ├── notifications/+page.svelte # Notification settings (/settings/notifications)
│   └── +layout.svelte         # Settings section layout
│
├── dev/                       # Development Domain 🆕 MOVED
│   ├── +layout.svelte         # Dev-only layout with dev navbar
│   ├── +page.svelte           # Dev tools index (/dev)
│   ├── test/+page.svelte      # General testing (/dev/test) 🔄 MOVED
│   ├── test-projects/+page.svelte # Project testing (/dev/test-projects) 🔄 MOVED
│   ├── role-test/+page.svelte # Role testing (/dev/role-test) 🔄 MOVED
│   ├── components/+page.svelte # Component library (/dev/components) 🔄 MOVED
│   ├── api-explorer/+page.svelte # API explorer (/dev/api-explorer)
│   ├── logs/+page.svelte      # App logs (/dev/logs)
│   └── playground/+page.svelte # Svelte playground (/dev/playground)
│
└── (public)/                  # Public Routes (Optional)
    ├── about/+page.svelte     # About page (/about)
    ├── privacy/+page.svelte   # Privacy policy (/privacy)
    └── terms/+page.svelte     # Terms of service (/terms)
```

**Legend:**
- ✅ **EXISTS** - Already implemented
- 🆕 **MISSING** - Needs to be created
- 🔄 **MOVED** - Needs to be moved from current location

## Implementation Phases

### Phase 1: **Reorganize Existing Routes** (Priority: High)

**Timeline:** 1-2 days
**Effort:** Medium

1. **Move Development Routes**
   ```bash
   # Move existing test routes to /dev/
   mv src/routes/test src/routes/dev/test
   mv src/routes/test-projects src/routes/dev/test-projects
   mv src/routes/role-test src/routes/dev/role-test
   mv src/routes/project-components src/routes/dev/components
   ```

2. **Create Development Layout**
   ```typescript
   // src/routes/dev/+layout.svelte
   <script lang="ts">
     import DevNavbar from '$lib/components/DevNavbar.svelte';
     let { children } = $props();
   </script>

   <div class="dev-layout">
     <DevNavbar />
     <main>{@render children()}</main>
   </div>
   ```

3. **Update Global Navbar**
   - Remove development links from main navigation
   - Add "Dev Tools" link (only visible in development)
   - Update route references

4. **Add Section Layouts**
   - Create `+layout.svelte` for users, projects, dashboard
   - Add section-specific navigation
   - Implement role guards per section

**Files to Create/Modify:**
- `src/routes/dev/+layout.svelte`
- `src/routes/dev/+page.svelte`
- `src/routes/users/+layout.svelte`
- `src/routes/projects/+layout.svelte`
- `src/routes/dashboard/+layout.svelte`
- `src/lib/components/Navbar.svelte` (update)
- `src/lib/components/DevNavbar.svelte` (new)

### Phase 2: **Add Missing Core Sections** (Priority: High)

**Timeline:** 3-5 days
**Effort:** High

1. **Device Management Section**
   ```typescript
   // src/routes/devices/+page.svelte
   // src/routes/devices/create/+page.svelte
   // src/routes/devices/[id]/+page.svelte
   // src/routes/devices/[id]/configure/+page.svelte
   // src/routes/devices/[id]/telemetry/+page.svelte
   ```

2. **Team Management Section**
   ```typescript
   // src/routes/teams/+page.svelte
   // src/routes/teams/create/+page.svelte
   // src/routes/teams/[id]/+page.svelte
   // src/routes/teams/[id]/members/+page.svelte
   ```

3. **Policy Management Section**
   ```typescript
   // src/routes/policies/+page.svelte
   // src/routes/policies/create/+page.svelte
   // src/routes/policies/[id]/+page.svelte
   // src/routes/policies/templates/+page.svelte
   // src/routes/policies/builder/+page.svelte
   ```

4. **Settings Section**
   ```typescript
   // src/routes/settings/+page.svelte
   // src/routes/settings/system/+page.svelte
   // src/routes/settings/security/+page.svelte
   ```

### Phase 3: **Enhanced Features** (Priority: Medium)

**Timeline:** 2-3 days
**Effort:** Medium

1. **Section-Specific Navigation**
   ```typescript
   // Example: src/routes/devices/+layout.svelte
   <script lang="ts">
     import DeviceNav from '$lib/components/navigation/DeviceNav.svelte';
     import { roleStore } from '$lib/stores/role.svelte.js';

     let showDevicesNav = $derived(roleStore.hasPermission('devices:read'));
   </script>

   {#if showDevicesNav}
     <DeviceNav />
   {/if}
   ```

2. **Role-Based Layout Guards**
   ```typescript
   // Example: src/routes/settings/+layout.svelte
   <script lang="ts">
     import { roleStore } from '$lib/stores/role.svelte.js';
     import { redirect } from '@sveltejs/kit';

     if (!roleStore.hasMinimumRole('SYSTEM_ADMIN')) {
       throw redirect(302, '/dashboard');
     }
   </script>
   ```

3. **Enhanced Dashboard**
   - Add analytics pages
   - Add monitoring pages
   - Add reports pages

## Navigation Structure Updates

### New Main Navigation

```typescript
// src/lib/components/Navbar.svelte - Updated Navigation
const mainNavigation = [
  { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/users', label: 'Users', icon: 'users', requiredPermission: 'users:read' },
  { href: '/projects', label: 'Projects', icon: 'folder', requiredPermission: 'projects:read' },
  { href: '/devices', label: 'Devices', icon: 'smartphone', requiredPermission: 'devices:read' },
  { href: '/teams', label: 'Teams', icon: 'users', requiredPermission: 'teams:read' },
  { href: '/policies', label: 'Policies', icon: 'shield', requiredPermission: 'policies:read' },
  { href: '/settings', label: 'Settings', icon: 'settings', requiredPermission: 'system:admin' },
];
```

### Development Navigation

```typescript
// src/lib/components/DevNavbar.svelte - Development Tools
const devNavigation = [
  { href: '/dev', label: 'Dev Home', icon: 'home' },
  { href: '/dev/test', label: 'Test Suite', icon: 'test-tube' },
  { href: '/dev/components', label: 'Components', icon: 'component' },
  { href: '/dev/api-explorer', label: 'API Explorer', icon: 'api' },
  { href: '/dev/logs', label: 'Logs', icon: 'log' },
  { href: '/dev/playground', label: 'Playground', icon: 'play' },
];
```

## Benefits of New Architecture

### 1. **Clear Functional Domains**
- **Authentication Domain**: `/auth/*`
- **Core Business Domains**: `/dashboard`, `/users`, `/projects`, `/devices`, `/teams`, `/policies`
- **Administrative Domain**: `/settings`
- **Development Domain**: `/dev/*`

### 2. **Enhanced Scalability**
- Easy to add new routes within logical groups
- Section-specific layouts and state management
- Clear separation of concerns
- Consistent navigation patterns

### 3. **Better Role-Based Access Control**
- Section-level permissions
- Granular route access control
- Consistent guard patterns
- Role-based navigation visibility

### 4. **Development vs Production Separation**
- Development tools isolated in `/dev` routes
- Easy to disable in production builds
- No clutter in main navigation
- Dedicated development environment

### 5. **Improved User Experience**
- Hierarchical navigation structure
- Consistent breadcrumb patterns
- Section-specific side navigation
- Better mental model for users

## Migration Strategy

### Safe Migration Approach

1. **Create New Routes Alongside Existing**
   ```bash
   # Keep existing routes, create new structure
   mkdir src/routes/dev
   # Move development routes gradually
   ```

2. **Update Links Incrementally**
   - Start with development routes
   - Update navbar references
   - Add redirects for moved routes

3. **Add New Sections Incrementally**
   - Start with device management
   - Add team management
   - Add policy management
   - Add settings

4. **Gradual Cleanup**
   - Remove old routes after migration
   - Clean up unused components
   - Update documentation

### Backward Compatibility

```typescript
// src/routes/test-projects/+page.svelte -> Temporary redirect
import { redirect } from '@sveltejs/kit';

// Temporary redirect during migration
throw redirect(301, '/dev/test-projects');
```

## Environment-Based Route Control

### Development-Only Routes

```typescript
// src/routes/dev/+layout.svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import { redirect } from '@sveltejs/kit';

  // Only allow access in development
  if (browser && import.meta.env.PROD) {
    throw redirect(302, '/dashboard');
  }
</script>
```

### Feature Flags

```typescript
// src/lib/config/feature-flags.ts
export const FEATURES = {
  DEVICE_MANAGEMENT: import.meta.env.VITE_ENABLE_DEVICE_MANAGEMENT === 'true',
  TEAM_MANAGEMENT: import.meta.env.VITE_ENABLE_TEAM_MANAGEMENT === 'true',
  POLICY_MANAGEMENT: import.meta.env.VITE_ENABLE_POLICY_MANAGEMENT === 'true',
};
```

## Testing Strategy

### 1. **Route Structure Tests**
```typescript
// tests/routes/structure.test.ts
describe('Route Structure', () => {
  test('should have correct route hierarchy', () => {
    // Test route organization
  });

  test('should handle moved routes with redirects', () => {
    // Test route redirects
  });
});
```

### 2. **Navigation Tests**
```typescript
// tests/components/navigation.test.ts
describe('Navigation', () => {
  test('should show correct navigation items by role', () => {
    // Test role-based navigation
  });

  test('should hide dev routes in production', () => {
    // Test dev route visibility
  });
});
```

### 3. **Accessibility Tests**
```typescript
// tests/accessibility/navigation.test.ts
describe('Navigation Accessibility', () => {
  test('should have proper ARIA labels', () => {
    // Test accessibility compliance
  });
});
```

## Success Metrics

### Technical Metrics
- ✅ Zero duplicate routes
- ✅ Clear route naming conventions
- ✅ Consistent layout patterns
- ✅ Proper role-based access control

### User Experience Metrics
- ✅ Intuitive navigation structure
- ✅ Reduced cognitive load
- ✅ Consistent user flows
- ✅ Better content organization

### Developer Experience Metrics
- ✅ Easy to add new routes
- ✅ Clear code organization
- ✅ Proper separation of concerns
- ✅ Maintainable structure

## Risks and Mitigations

### Risk 1: **Breaking Changes**
- **Mitigation**: Gradual migration with redirects
- **Mitigation**: Comprehensive testing

### Risk 2: **Complexity Increase**
- **Mitigation**: Clear documentation
- **Mitigation**: Consistent patterns

### Risk 3: **Development Time**
- **Mitigation**: Incremental implementation
- **Mitigation**: Prioritize core sections first

## Next Steps

1. **Approve Architecture Plan** - Review and approve this restructure plan
2. **Phase 1 Implementation** - Reorganize existing routes and move development tools
3. **Phase 2 Implementation** - Add missing core sections (devices, teams, policies, settings)
4. **Testing and Validation** - Comprehensive testing of new structure
5. **Documentation Updates** - Update all documentation with new routes

## Conclusion

This route architecture restructure provides a solid foundation for the SurveyLauncher UI's growth and maintainability. The proposed structure addresses current issues while establishing scalable patterns for future development.

The phased implementation approach ensures minimal disruption while delivering immediate improvements in code organization and user experience.

---

**Last Updated:** 2025-11-16
**Status:** Proposed for Implementation
**Next Review:** After Phase 1 Completion