# SurveyLauncher RBAC Roles Strategy & Implementation Plan

**Created**: 2025-11-14
**Priority**: HIGH
**Status**: PLANNING
**Target**: Backend Role-Based Access Control Enhancement

## 🎯 Executive Summary

The SurveyLauncher backend has implemented a foundational RBAC system with three user roles (TEAM_MEMBER, SUPERVISOR, ADMIN) but needs strategic refinement to support enterprise-scale security, compliance, and operational requirements. This plan addresses role evolution, permission refinement, and advanced access control patterns.

## 📊 Current RBAC State Analysis

### ✅ What's Implemented
- **Database Schema**: Complete user role enumeration (`userRoleEnum`)
- **Authentication Middleware**: JWT-based authentication with role extraction
- **RBAC Matrix**: Basic permission mapping for 7 resources
- **Access Control**: Role-based and team-based authorization middleware
- **Audit Logging**: Basic access attempt logging

### ❌ Strategic Gaps Identified
- **Limited Role Granularity**: No support for cross-functional roles
- **Static Permission Matrix**: Hard-coded permissions without flexibility
- **Missing Role Hierarchies**: No inheritance or delegation capabilities
- **Incomplete Resource Coverage**: Some resources lack proper RBAC integration
- **No Permission Scoping**: Limited team and organization boundary enforcement

## 🔮 Strategic Role Evolution Plan

### Phase 1: Enhanced Role Hierarchy

#### 1.1 Extended Role Structure
```typescript
// Current Roles (3)
enum UserRole {
  TEAM_MEMBER = 'TEAM_MEMBER',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

// Enhanced Roles (7) - Strategic Expansion
enum UserRole {
  // Base Operational Roles
  TEAM_MEMBER = 'TEAM_MEMBER',      // Field survey takers
  FIELD_SUPERVISOR = 'FIELD_SUPERVISOR', // Front-line supervisors
  REGIONAL_MANAGER = 'REGIONAL_MANAGER', // Multi-team oversight

  // Technical Roles
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',    // Full system access
  SUPPORT_AGENT = 'SUPPORT_AGENT',  // Customer support access
  AUDITOR = 'AUDITOR',              // Read-only audit access

  // Specialized Roles
  DEVICE_MANAGER = 'DEVICE_MANAGER', // Device lifecycle management
  POLICY_ADMIN = 'POLICY_ADMIN',      // Policy configuration only
  NATIONAL_SUPPORT_ADMIN = 'NATIONAL_SUPPORT_ADMIN' // Cross-team support without system settings
}
```

#### 1.2 Role Inheritance Hierarchy
```
SYSTEM_ADMIN (Full Access)
├── REGIONAL_MANAGER (Multi-team management)
│   ├── FIELD_SUPERVISOR (Team oversight)
│   │   └── TEAM_MEMBER (Basic operations)
│   ├── DEVICE_MANAGER (Device operations)
│   └── POLICY_ADMIN (Policy operations)
├── SUPPORT_AGENT (Customer support)
├── NATIONAL_SUPPORT_ADMIN (Cross-team assistance without system settings)
└── AUDITOR (Read-only audit)
```

#### 1.3 Role-Permission Matrix Evolution
| Role | Teams | Users | Devices | Policies | Telemetry | Support | Audit |
|------|-------|-------|---------|----------|-----------|---------|-------|
| **SYSTEM_ADMIN** | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| **REGIONAL_MANAGER** | READ/CREATE | FULL | FULL | READ | FULL | LIMITED | READ |
| **FIELD_SUPERVISOR** | READ (own team) | FULL (own team) | FULL (own team) | READ | FULL (own team) | LIMITED | READ |
| **TEAM_MEMBER** | READ (own team) | READ (own team) | READ (own team) | READ | READ (own team) | LIMITED | READ |
| **DEVICE_MANAGER** | READ | READ | FULL | READ | READ | FULL | READ |
| **POLICY_ADMIN** | READ | READ | READ | FULL | READ | LIMITED | READ |
| **SUPPORT_AGENT** | READ | READ | READ | READ | FULL | FULL | READ |
| **NATIONAL_SUPPORT_ADMIN** | FULL | FULL | FULL | FULL | FULL | FULL | READ |
| **AUDITOR** | READ | READ | READ | READ | READ | READ | FULL |

The `NATIONAL_SUPPORT_ADMIN` role grants cross-team write access to teams, users, devices, policies, telemetry, and support records but explicitly cannot mutate JWT/Ed25519 secrets, feature flags, global rate limits, or deployment-time configuration—those remain in `SYSTEM_ADMIN` territory. This role exists so nationwide helpdesk staff can resolve issues across every team/site while leaving configuration-level controls untouched.

### Phase 2: Advanced Access Control Patterns

#### 2.1 Contextual Permissions
```typescript
interface PermissionContext {
  userId: string;
  userRole: UserRole;
  teamId?: string;
  regionId?: string;
  organizationId?: string;
  timeRestrictions?: TimeRestriction;
  geoRestrictions?: GeoRestriction;
  deviceRestrictions?: DeviceRestriction;
}

interface TimeRestriction {
  allowedHours: { start: string; end: string };
  allowedDays: string[];
  timezone: string;
}

interface GeoRestriction {
  allowedStates: string[];
  allowedIPRanges: string[];
}

interface DeviceRestriction {
  allowedDeviceTypes: string[];
  requireDeviceApproval: boolean;
}
```

#### 2.2 Dynamic Permission Resolution
```typescript
class PermissionService {
  static async checkPermission(
    context: PermissionContext,
    resource: Resource,
    action: Action
  ): Promise<PermissionResult> {
    // 1. Base role permission check
    const basePermissions = RBAC_MATRIX[context.userRole]?.[resource] || [];

    // 2. Contextual overrides
    const contextualPermissions = await this.getContextualPermissions(context);

    // 3. Time-based restrictions
    if (!this.checkTimeRestrictions(context)) {
      return { allowed: false, reason: 'TIME_RESTRICTION' };
    }

    // 4. Geographic restrictions
    if (!this.checkGeoRestrictions(context)) {
      return { allowed: false, reason: 'GEO_RESTRICTION' };
    }

    // 5. Device-based restrictions
    if (!this.checkDeviceRestrictions(context)) {
      return { allowed: false, reason: 'DEVICE_RESTRICTION' };
    }

    return {
      allowed: basePermissions.includes(action) || contextualPermissions.includes(action),
      context: this.buildPermissionContext(context)
    };
  }
}
```

### Phase 3: Resource Scoping & Boundaries

#### 3.1 Multi-Tenant Architecture Support
```typescript
interface OrganizationScope {
  organizationId: string;
  regionIds: string[];
  teamIds: string[];
  inheritedPermissions: Permission[];
}

interface ResourceScope {
  resourceType: Resource;
  resourceId: string;
  organizationId: string;
  teamId?: string;
  regionId?: string;
  accessLevel: 'ORGANIZATION' | 'REGION' | 'TEAM' | 'USER';
}
```

#### 3.2 Team Boundary Enforcement
```typescript
class TeamBoundaryService {
  static async enforceTeamBoundary(
    userId: string,
    targetTeamId: string,
    action: Action
  ): Promise<BoundaryResult> {
    const user = await UserService.getUser(userId);
    const userPermissions = await this.getUserPermissions(user.user);

    // System admins bypass all scopes
    if (userPermissions.includes('CROSS_TEAM_ACCESS')) {
      return { allowed: true, scope: 'ORGANIZATION' };
    }

    // National support admins have cross-team operational access (no system-settings)
    if (user.user.roles?.includes('NATIONAL_SUPPORT_ADMIN')) {
      return { allowed: true, scope: 'ORGANIZATION', reason: 'CROSS_TEAM_SUPPORT' };
    }

    // Regional managers can access teams in their region
    if (user.user.role === 'REGIONAL_MANAGER') {
      const isInRegion = await this.checkRegionalAccess(
        user.user.teamId,
        targetTeamId
      );
      return { allowed: isInRegion, scope: 'REGION' };
    }

    // Standard team-based access
    return {
      allowed: user.user.teamId === targetTeamId,
      scope: 'TEAM'
    };
  }
}
```

## 🛠 Implementation Roadmap

### Phase 1: Database Schema Evolution (Week 1)

#### 1.1 Enhanced User Role Schema
**File**: `src/lib/db/schema.ts`
**Changes Required**:
```typescript
// Enhanced user role enum
// Prefer data-driven roles via the roles table; keep the enum only if existing
// code still expects it. If dynamic roles are required later, plan to drop the
// enum and load roles entirely from DB records to avoid schema churn.
export const userRoleEnum = pgEnum('user_role', [
  'TEAM_MEMBER',
  'FIELD_SUPERVISOR',
  'REGIONAL_MANAGER',
  'DEVICE_MANAGER',
  'POLICY_ADMIN',
  'SUPPORT_AGENT',
  'AUDITOR',
  'SYSTEM_ADMIN',
  'NATIONAL_SUPPORT_ADMIN'
]);

// Role assignments table (for multiple roles per user)
export const userRoleAssignments = pgTable('user_role_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true)
});

// Role definitions table
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').notNull(), // Array of permission objects
  isSystemRole: boolean('is_system_role').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
```

#### 1.2 Permission Granularity Schema
```typescript
// Permissions table
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  scope: varchar('scope', { length: 20 }).notNull().default('TEAM'), // ORG, REGION, TEAM, USER
  conditions: jsonb('conditions'), // Additional permission conditions
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Role permissions mapping
export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow()
});
```

### Phase 2: Service Layer Enhancement (Week 2)

#### 2.1 Enhanced Authorization Service
**File**: `src/services/authorization-service.ts`
**New Implementation**:
```typescript
export class AuthorizationService {
  // Dynamic permission checking
  static async checkPermission(
    userId: string,
    resource: Resource,
    action: Action,
    context?: PermissionContext
  ): Promise<PermissionResult>

  // Role assignment management
  static async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    options?: RoleAssignmentOptions
  ): Promise<RoleAssignmentResult>

  // Permission inheritance
  static async getInheritedPermissions(
    userId: string,
    resource?: Resource
  ): Promise<Permission[]>

  // Context-aware access control
  static async checkContextualAccess(
    userId: string,
    targetResource: ResourceScope,
    action: Action
  ): Promise<ContextualAccessResult>
}
```

Add guidance: cache effective permissions per request (or via Redis/memory TTL) so repeated checks stay under the <100 ms target. Document whether permission snapshots should be memoized on `req.user` or stored centrally, and include perf testing benchmarks before rollout.

#### 2.2 Role Management Service
**File**: `src/services/role-service.ts`
**New Implementation**:
```typescript
export class RoleService {
  // Role lifecycle management
  static async createRole(roleData: CreateRoleRequest): Promise<RoleResult>
  static async updateRole(roleId: string, updates: UpdateRoleRequest): Promise<RoleResult>
  static async deleteRole(roleId: string): Promise<DeletionResult>

  // Role assignment operations
  static async assignRoleToUser(userId: string, roleId: string, context: AssignmentContext): Promise<AssignmentResult>
  static async removeRoleFromUser(userId: string, roleId: string): Promise<RemovalResult>
  static async getUserRoles(userId: string, includeInactive?: boolean): Promise<Role[]>

  // Permission management
  static async addPermissionToRole(roleId: string, permissionId: string): Promise<PermissionResult>
  static async removePermissionFromRole(roleId: string, permissionId: string): Promise<PermissionResult>
  static async getRolePermissions(roleId: string): Promise<Permission[]>
}
```

### Phase 3: Middleware Enhancement (Week 3)

#### 3.1 Enhanced Authentication Middleware
**File**: `src/middleware/auth.ts`
**Enhancements Required**:
```typescript
// Multi-role support
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    code: string;
    teamId: string;
    organizationId: string;
    displayName: string;
    email: string | null;
    roles: UserRole[]; // Multiple roles support
    permissions: Permission[]; // Computed permissions
    isActive: boolean;
    sessionContext?: SessionContext;
  };
  session?: {
    sessionId: string;
    userId: string;
    teamId: string;
    organizationId: string;
    deviceId: string;
    startedAt: Date;
    expiresAt: Date;
    overrideUntil: Date | null;
    status: string;
    securityContext: SecurityContext;
  };
}

// Enhanced authentication with multi-role support
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // ... existing JWT verification ...

  // Enhanced user loading with multiple roles
  const userWithRoles = await UserService.getUserWithRoles(userId);

  // Compute effective permissions
  const permissions = await AuthorizationService.computeEffectivePermissions(
    userWithRoles.user,
    userWithRoles.roles
  );

  // Load session context
  const sessionContext = await SessionService.getSessionContext(sessionId);

  req.user = {
    ...userWithRoles.user,
    roles: userWithRoles.roles,
    permissions,
    organizationId: userWithRoles.user.organizationId,
    sessionContext
  };

  next();
};
```

#### 3.2 Advanced Authorization Middleware
**File**: `src/middleware/authorization.ts`
**New Implementation**:
```typescript
// Resource-level authorization with context awareness
export const requirePermission = (resource: Resource, action: Action, scope?: AccessScope) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED' }});
    }

    // Build permission context
    const context: PermissionContext = {
      userId: req.user.id,
      userRole: req.user.roles[0], // Primary role
      organizationId: req.user.organizationId,
      teamId: req.user.teamId,
      sessionId: req.session?.sessionId,
      requestTime: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Check permission with enhanced logic
    const result = await AuthorizationService.checkPermission(
      req.user.id,
      resource,
      action,
      context
    );

    if (!result.allowed) {
      logger.warn('Access denied', {
        userId: req.user.id,
        resource,
        action,
        reason: result.reason,
        context
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: result.reason || 'Access denied'
        }
      });
    }

    // Add permission context to request
    req.permissionContext = result.context;
    next();
  };
};

// Team boundary enforcement with hierarchy support
export const requireTeamAccess = (teamIdParam: string = 'teamId', requiredScope: AccessScope = 'TEAM') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED' }});
    }

    const targetTeamId = req.params[teamIdParam] || req.body[teamIdParam] || req.query[teamIdParam];

    if (!targetTeamId) {
      return res.status(400).json({ error: { code: 'MISSING_TEAM_ID' }});
    }

    // Enhanced boundary checking with hierarchy
    const boundaryResult = await TeamBoundaryService.enforceTeamBoundary(
      req.user.id,
      targetTeamId,
      requiredScope as any
    );

    if (!boundaryResult.allowed) {
      return res.status(403).json({
        error: {
          code: 'TEAM_ACCESS_DENIED',
          message: `Access denied to team ${targetTeamId}`,
          scope: boundaryResult.scope
        }
      });
    }

    // Add scope context to request
    req.accessScope = boundaryResult.scope;
    next();
  };
};
```

### Phase 4: API Integration (Week 4)

#### 4.1 Role Management API Endpoints
**File**: `src/routes/api.ts`
**New Endpoints Required**:

```typescript
// POST /api/v1/roles - Create new role
async function createRole(req: Request, res: Response) {
  const { name, description, permissions, isSystemRole } = req.body;
  const result = await RoleService.createRole({
    name,
    description,
    permissions,
    isSystemRole: isSystemRole || false,
    createdBy: req.user?.id
  });

  return res.status(201).json({ success: true, role: result.role });
}

// GET /api/v1/roles - List roles with pagination
async function listRoles(req: Request, res: Response) {
  const { page, limit, search, includeSystemRoles } = req.query;
  const result = await RoleService.listRoles({
    page: parseInt(page as string) || 1,
    limit: Math.min(parseInt(limit as string) || 50, 100),
    search: search as string,
    includeSystemRoles: includeSystemRoles === 'true'
  });

  return res.json({ success: true, roles: result.roles, pagination: result.pagination });
}

// POST /api/v1/users/:userId/roles - Assign role to user
async function assignRoleToUser(req: Request, res: Response) {
  const { userId } = req.params;
  const { roleId, teamId, expiresAt } = req.body;

  const result = await RoleService.assignRoleToUser(userId, roleId, {
    assignedBy: req.user?.id,
    teamId,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });

  return res.status(201).json({ success: true, assignment: result.assignment });
}

// GET /api/v1/users/:userId/permissions - Get user's effective permissions
async function getUserPermissions(req: Request, res: Response) {
  const { userId } = req.params;
  const { resource } = req.query;

  const permissions = await AuthorizationService.getInheritedPermissions(
    userId,
    resource as Resource
  );

  return res.json({ success: true, permissions });
}
```

#### 4.2 Enhanced Team Management with RBAC
**File**: `src/routes/api.ts`
**Existing Endpoint Updates Required**:

```typescript
// Enhanced POST /api/v1/teams with organization context
async function createTeam(req: Request, res: Response) {
  const { name, stateId, timezone, regionId, organizationId } = req.body;

  // Check if user has organization-level team creation permissions
  const hasPermission = await AuthorizationService.checkPermission(
    req.user?.id,
    Resource.TEAMS,
    Action.CREATE,
    {
      userId: req.user?.id,
      organizationId: organizationId || req.user?.organizationId,
      regionId
    }
  );

  if (!hasPermission.allowed) {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Cannot create teams at this scope'
      }
    });
  }

  const result = await TeamService.createTeam({
    name,
    stateId,
    timezone,
    regionId,
    organizationId: organizationId || req.user?.organizationId,
    createdBy: req.user?.id
  });

  return res.status(201).json({ success: true, team: result.team });
}

#### 4.2 NATIONAL_SUPPORT_ADMIN enforcement
Add middleware coverage and API expectations so `NATIONAL_SUPPORT_ADMIN` retains cross-team visibility without touching system settings:
1. Core resources (telemetry, policy, support logs, etc.) should expose read/write APIs guarded by `requirePermission(Resource.TELEMETRY, Action.READ, 'ORGANIZATION')`/`requirePermission(..., Action.WRITE, 'ORGANIZATION')` as needed, with a `TeamBoundaryService` check that explicitly bypasses per-team restrictions for this role.
2. System-level configuration endpoints (key rotation, env settings, deployment toggles) must return `INSUFFICIENT_PERMISSIONS` for the role—add a `Resource.SYSTEM_SETTINGS` entitlement and ensure the role never receives it in `roles.permissions`.
3. Document these requirements beside the API snippets so engineers know to wire the role into `AuthorizationService.getContextualPermissions`, treat it like a support agent for visibility, and keep configuration mutation paths secured.
```

#### 4.3 Middleware/API rollout plan
1. **Permission surfaces**: Update `AuthorizationService.computeEffectivePermissions` to include `NATIONAL_SUPPORT_ADMIN` context with `ORGANIZATION`-level `READ`/`WRITE` rights for telemetry, policy, support, and other operational data while still flagging `Resource.SYSTEM_SETTINGS` as explicitly denied.
2. **Middleware adjustments**: Extend `requirePermission`/`requireTeamAccess` so they inspect `req.user.roles` (not just the first entry) and treat the new role as `CROSS_TEAM_SUPPORT`, skipping `TeamBoundaryService` blocking for permissible resources while enforcing `SYSTEM_SETTINGS` denials.
3. **API gating**: Wrap system-setting routes (key rotation, env toggles, feature switches) with a new `requireSystemSettingPermission` middleware tied to `Resource.SYSTEM_SETTINGS` so the support role can’t call them; meanwhile reuse the existing `requirePermission` guard for telemetry/policy read endpoints but allow organization scope when the role is present.
4. **Documentation & verification**: Update admin/API docs with the new middleware requirements, then add regression tests that exercise telemetry/policy read APIs as `NATIONAL_SUPPORT_ADMIN` and assert the denial path for system-setting endpoints.

#### 4.4 System settings perimeter
Enumerate and label the API/config surfaces that only `SYSTEM_ADMIN` controls:
- **Key rotation**: JWT, refresh, override, and Ed25519 signer rotation endpoints (`/api/v1/admin/keys/*`).
- **Feature flags**: Any toggle endpoint or config document that flips feature availability (e.g., `/api/v1/admin/feature-flags`).
- **Rate limiting**: Routes that mutate global/device/IP rate limits or PIN lockout thresholds.
- **Deployment/runtime configuration**: Environment variable updates, maintenance-mode switches, or build/deploy orchestration hooks.
Tag these routes with `Resource.SYSTEM_SETTINGS` in `role_permissions` and keep them absent from `NATIONAL_SUPPORT_ADMIN` assignments so it’s impossible to escalate beyond operational data writes.

## 🧪 Testing Strategy

### Unit Tests (25 scenarios)
| Test Category | Test Cases | Focus |
|---------------|------------|-------|
| **Role Service** | 10 | Role CRUD, assignments, permissions |
| **Authorization Service** | 8 | Permission checking, inheritance, context |
| **Team Boundary Service** | 7 | Boundary enforcement, hierarchy access |

### Integration Tests (30 scenarios)
| Test Category | Test Cases | Focus |
|---------------|------------|-------|
| **Multi-role Authentication** | 8 | JWT with multiple roles, permission computation |
| **Role Management API** | 10 | CRUD operations, assignments, permissions |
| **Cross-team Access** | 7 | Regional manager, device manager scenarios |
| **System Settings Denials** | 5 | Ensure `NATIONAL_SUPPORT_ADMIN` cannot hit system-setting endpoints |
| **Permission Inheritance** | 5 | Hierarchical permission resolution |

### Security Tests (15 scenarios)
| Test Category | Test Cases | Focus |
|---------------|------------|-------|
| **Privilege Escalation** | 5 | Attempt unauthorized role assignments |
| **Cross-boundary Access** | 5 | Try accessing other teams/organizations |
| **Role Bypass Attempts** | 5 | JWT manipulation, middleware bypass |

## 📅 Implementation Timeline

| Phase | Duration | Dependencies | Success Criteria |
|-------|----------|--------------|------------------|
| **Phase 1: Database Schema** | 1 week | Database migration strategy | Enhanced schema deployed |
| **Phase 2: Service Layer** | 1 week | Phase 1 complete | All services functional |
| **Phase 3: Middleware** | 1 week | Phase 2 complete | Authentication enhanced |
| **Phase 4: API Integration** | 1 week | Phase 3 complete | All endpoints functional |
| **Phase 5: Testing** | 1 week | Phase 4 complete | 95%+ test coverage |
| **Phase 6: Migration** | 1 week | Phase 5 complete | Zero-downtime rollout |
| **Total** | **6 weeks** | | Production-ready RBAC |

## 🧩 Implementation Strategy (Atomic Tasks)
1. **Schema & seed**
   - Write Drizzle migrations for `roles`, `permissions`, `role_permissions`, and `user_role_assignments`.
   - Seed default roles (including `NATIONAL_SUPPORT_ADMIN`) and their permission maps via a migration or bootstrap script.
2. **Service foundations**
   - Implement `RoleService` CRUD + assignment helpers.
   - Implement `AuthorizationService.computeEffectivePermissions` with per-request caching and `Resource.SYSTEM_SETTINGS` semantics.
3. **Boundary & middleware**
   - Update `TeamBoundaryService` to honor cross-team roles.
   - Enhance `authenticateToken`, `requirePermission`, `requireTeamAccess`, and add `requireSystemSettingPermission`.
4. **API layer**
   - Add role-management endpoints (list/create/update/delete, assign/revoke).
   - Guard telemetry/policy/support routes with organization-scope checks; shield system-setting routes with the new middleware.
5. **Testing & validation**
   - Create unit tests for the new services/boundaries.
   - Add integration tests proving `NATIONAL_SUPPORT_ADMIN` can write operational data but is denied on system settings.
   - Run performance benchmarks to confirm permission caching keeps checks <100 ms.
6. **Docs & rollout**
   - Update admin/operator docs with the new role behavior.
   - Prepare deployment checklist covering migrations, seed scripts, and rollback steps.

## 🚨 Risk Assessment & Mitigation

### High-Risk Areas
1. **Database Migration Complexity**
   - Risk: Data loss during schema evolution
   - Mitigation: Comprehensive backup strategy, staged migrations

2. **Backward Compatibility**
   - Risk: Existing clients break with role changes
   - Mitigation: Role mapping strategy, gradual transition

3. **Performance Impact**
   - Risk: Permission checking slows API responses
   - Mitigation: Permission caching, optimized queries

### Security Considerations
1. **Privilege Escalation Prevention**
   - Validate role assignment authority
   - Audit all permission changes

2. **Session Security**
   - Enhanced session context validation
   - Device and geographic restrictions

3. **Audit Trail**
   - Complete access logging
   - Permission change tracking

## 📈 Success Metrics

1. **Security Enhancement**
   - Zero privilege escalation incidents
   - Complete audit trail coverage
   - 100% API endpoint protection

2. **Operational Efficiency**
   - <100ms permission check latency
   - <1 second role assignment processing
   - Zero-downtime migration completion

3. **Compliance & Governance**
   - Role-based access control compliance
   - Audit trail completeness
   - Data boundary enforcement

## 🎯 Next Steps

1. **Immediate**: Begin database schema design and migration planning
2. **Week 1**: Implement Phase 1 - Database schema evolution
3. **Parallel**: Develop comprehensive test scenarios
4. **Follow-up**: Create admin UI for role management
5. **Long-term**: Consider implementing attribute-based access control (ABAC)

---

**Author**: Claude Code Analysis
**Review Required**: Security Team Lead, Backend Team Lead
**Security Review**: Information Security Team
**Testing Required**: QA Security Team
