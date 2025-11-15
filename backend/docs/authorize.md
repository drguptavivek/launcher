# SurveyLauncher Authorization Middleware

This document provides comprehensive details about the SurveyLauncher authorization middleware, including RBAC implementation, permission checking, role-based access control, and security enforcement mechanisms.

## 🏗️ Authorization Architecture Overview

The SurveyLauncher system implements a **multi-layered authorization architecture** that provides fine-grained access control across mobile devices and web admin interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                  Authorization Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Authentication Layer                     │   │
│  │  • JWT Token Validation                              │   │
│  │  • User Identity Verification                        │   │
│  │  • Session Management                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                             ↓                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Authorization Middleware                  │   │
│  │  • Role Resolution                                   │   │
│  │  • Permission Checking                               │   │
│  │  • Context Validation                                 │   │
│  │  • Access Decision Engine                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                             ↓                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Resource Access Layer                     │   │
│  │  • Route Protection                                  │   │
│  │  • Data Filtering                                    │   │
│  │  • Field-level Security                               │   │
│  │  • Audit Logging                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Core Authorization Components

### 1. Authentication Middleware (`src/middleware/auth.ts`)

The primary authentication middleware that validates JWT tokens and establishes user identity.

```typescript
import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../lib/crypto';
import { AuthorizationService } from '../services/authorization-service';
import { logger } from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    code: string;
    teamId: string;
    role: string;
    displayName: string;
  };
  session?: {
    sessionId: string;
    deviceId: string;
    expiresAt: Date;
    overrideUntil: Date | null;
  };
  requestId?: string;
}

export function authenticateToken(type: 'mobile' | 'web-admin' = 'mobile') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.requestId = requestId;

    try {
      // 1. Extract and validate JWT token
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authentication token required',
            request_id: requestId
          }
        });
      }

      // 2. Verify JWT signature and claims
      const decoded = JWTUtils.verifyAccessToken(token);
      if (!decoded.success) {
        logger.warn('Invalid token attempt', {
          requestId,
          error: decoded.error,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });

        return res.status(401).json({
          ok: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token',
            request_id: requestId
          }
        });
      }

      // 3. Check token revocation status
      const isRevoked = await JWTService.isTokenRevoked(decoded.payload.jti);
      if (isRevoked) {
        logger.warn('Revoked token access attempt', {
          requestId,
          jti: decoded.payload.jti,
          userId: decoded.payload.sub
        });

        return res.status(401).json({
          ok: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Authentication token has been revoked',
            request_id: requestId
          }
        });
      }

      // 4. Attach user context to request
      req.user = {
        id: decoded.payload.sub,
        code: decoded.payload.userCode,
        teamId: decoded.payload.teamId,
        role: decoded.payload.role,
        displayName: decoded.payload.displayName
      };

      req.session = {
        sessionId: decoded.payload.sessionId,
        deviceId: decoded.payload.deviceId,
        expiresAt: new Date(decoded.payload.exp * 1000),
        overrideUntil: decoded.payload.overrideUntil ?
          new Date(decoded.payload.overrideUntil) : null
      };

      logger.info('Authentication successful', {
        requestId,
        userId: req.user.id,
        role: req.user.role,
        teamId: req.user.teamId
      });

      next();

    } catch (error) {
      logger.error('Authentication middleware error', {
        requestId,
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication process failed',
          request_id: requestId
        }
      });
    }
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 2. Enhanced Authorization Middleware (`src/middleware/enhanced-auth.ts`)

Advanced authorization middleware with role-based access control and context validation.

```typescript
import { AuthenticatedRequest, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization-service';
import { logger } from '../lib/logger';

export interface PermissionCheck {
  resource: string;
  action: string;
  context?: {
    teamId?: string;
    deviceId?: string;
    projectId?: string;
    organizationId?: string;
  };
}

export function hasPermission(resource: string, action: string, context?: any) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = req.requestId || generateRequestId();

    try {
      // 1. Validate user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
            request_id: requestId
          }
        });
      }

      // 2. Build permission check context
      const permissionContext: any = {
        teamId: req.user.teamId,
        deviceId: req.session?.deviceId,
        requestId,
        clientIp: req.ip,
        userAgent: req.headers['user-agent']
      };

      // Add context from parameters
      if (context) {
        Object.assign(permissionContext, context);
      }

      // Extract IDs from request parameters
      if (req.params.teamId) permissionContext.targetTeamId = req.params.teamId;
      if (req.params.deviceId) permissionContext.targetDeviceId = req.params.deviceId;
      if (req.params.projectId) permissionContext.targetProjectId = req.params.projectId;
      if (req.params.userId) permissionContext.targetUserId = req.params.userId;

      // 3. Perform permission check
      const permissionResult = await AuthorizationService.checkPermission(
        req.user.id,
        resource,
        action,
        permissionContext
      );

      // 4. Handle authorization decision
      if (!permissionResult.allowed) {
        logger.warn('Access denied', {
          requestId,
          userId: req.user.id,
          role: req.user.role,
          resource,
          action,
          reason: permissionResult.reason,
          context: permissionContext
        });

        return res.status(403).json({
          ok: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: permissionResult.reason || 'Insufficient permissions to perform this action',
            request_id: requestId
          }
        });
      }

      // 5. Success - attach permissions to request
      req.userPermissions = permissionResult.context?.permissions || [];
      req.userRoles = permissionResult.context?.roles || [];

      logger.info('Access granted', {
        requestId,
        userId: req.user.id,
        role: req.user.role,
        resource,
        action,
        evaluationTime: permissionResult.evaluationTime,
        grantedBy: permissionResult.grantedBy
      });

      next();

    } catch (error) {
      logger.error('Authorization middleware error', {
        requestId,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization process failed',
          request_id: requestId
        }
      });
    }
  };
}

export function hasAnyRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = req.requestId || generateRequestId();

    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
            request_id: requestId
          }
        });
      }

      const hasRole = await AuthorizationService.hasAnyRole(req.user.id, allowedRoles);

      if (!hasRole) {
        logger.warn('Role-based access denied', {
          requestId,
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });

        return res.status(403).json({
          ok: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            request_id: requestId
          }
        });
      }

      next();

    } catch (error) {
      logger.error('Role-based authorization error', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'ROLE_AUTHORIZATION_ERROR',
          message: 'Role authorization process failed',
          request_id: requestId
        }
      });
    }
  };
}

// Contextual access control for team boundaries
export function requireTeamAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = req.requestId || generateRequestId();

    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
            request_id: requestId
          }
        });
      }

      const targetTeamId = req.params.teamId || req.body.teamId || req.query.teamId;

      if (!targetTeamId) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'MISSING_TEAM_ID',
            message: 'Team ID is required for this operation',
            request_id: requestId
          }
        });
      }

      // Check if user has access to the specified team
      const accessResult = await AuthorizationService.checkContextualAccess(
        req.user.id,
        {
          type: 'TEAMS',
          teamId: targetTeamId
        },
        'READ'
      );

      if (!accessResult.allowed) {
        logger.warn('Team boundary violation', {
          requestId,
          userId: req.user.id,
          userTeamId: req.user.teamId,
          targetTeamId,
          reason: accessResult.reason
        });

        return res.status(403).json({
          ok: false,
          error: {
            code: 'TEAM_BOUNDARY_VIOLATION',
            message: 'Access denied: Cannot access resources outside your team',
            request_id: requestId
          }
        });
      }

      next();

    } catch (error) {
      logger.error('Team access authorization error', {
        requestId,
        userId: req.user?.id,
        error: error.message
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'TEAM_ACCESS_ERROR',
          message: 'Team access verification failed',
          request_id: requestId
        }
      });
    }
  };
}
```

## 🔑 Permission Checking Implementation

### Authorization Service (`src/services/authorization-service.ts`)

Core service that implements the RBAC logic and permission evaluation engine.

```typescript
import { db, roles, permissions, rolePermissions, userRoleAssignments, permissionCache } from '../lib/db';
import { logger } from '../lib/logger';

export class AuthorizationService {
  private static cache = new Map<string, PermissionCacheEntry>();
  private static readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  /**
   * Main permission checking method
   */
  static async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context: any = {}
  ): Promise<PermissionResult> {
    const startTime = Date.now();
    const requestId = context.requestId || 'unknown';

    try {
      // 1. Check cache first
      const cacheKey = `${userId}:${resource}:${action}:${this.getContextHash(context)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached && !this.isCacheExpired(cached)) {
        logger.debug('Permission cache hit', {
          requestId,
          userId,
          resource,
          action,
          evaluationTime: 0
        });

        return {
          allowed: cached.allowed,
          reason: cached.reason,
          grantedBy: cached.grantedBy,
          context: cached.context,
          evaluationTime: 0
        };
      }

      // 2. Compute effective permissions
      const effectivePerms = await this.computeEffectivePermissions(userId, requestId);

      // 3. Check specific permission
      const permissionKey = `${resource}_${action}`;
      const hasPermission = effectivePerms.permissions.some(p => p.name === permissionKey);

      // 4. Check system settings access restrictions
      if (resource === 'SYSTEM_SETTINGS') {
        const systemSettingsAccess = await this.checkSystemSettingsAccess(userId, effectivePerms.roles);
        if (!systemSettingsAccess.allowed) {
          const result = {
            allowed: false,
            reason: systemSettingsAccess.reason,
            grantedBy: [],
            context: effectivePerms,
            evaluationTime: Date.now() - startTime
          };

          this.setCache(cacheKey, result);
          return result;
        }
      }

      // 5. Check contextual constraints
      const contextualCheck = await this.checkContextualConstraints(
        userId,
        resource,
        action,
        effectivePerms,
        context
      );

      const result = {
        allowed: hasPermission && contextualCheck.allowed,
        reason: contextualCheck.reason || (hasPermission ? null : 'NO_PERMISSION'),
        grantedBy: effectivePerms.permissions
          .filter(p => p.name === permissionKey)
          .map(p => ({
            roleId: p.roleId,
            roleName: p.roleName,
            permissionId: p.permissionId
          })),
        context: effectivePerms,
        evaluationTime: Date.now() - startTime
      };

      // 6. Cache the result
      this.setCache(cacheKey, result);

      // 7. Log the decision
      logger.info('Permission evaluated', {
        requestId,
        auditAction: 'permission.check',
        userId,
        resource,
        action,
        allowed: result.allowed,
        reason: result.reason,
        evaluationTime: result.evaluationTime,
        grantedBy: result.grantedBy
      });

      return result;

    } catch (error) {
      logger.error('Permission check failed', {
        requestId,
        userId,
        resource,
        action,
        error: error.message,
        stack: error.stack
      });

      return {
        allowed: false,
        reason: 'PERMISSION_CHECK_ERROR',
        grantedBy: [],
        context: null,
        evaluationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Compute effective permissions for a user
   */
  static async computeEffectivePermissions(userId: string, requestId: string = 'unknown'): Promise<EffectivePermissions> {
    const startTime = Date.now();

    try {
      // 1. Get user's active role assignments
      const assignments = await db
        .select({
          roleId: userRoleAssignments.roleId,
          roleName: roles.name,
          expiresAt: userRoleAssignments.expiresAt
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(
          and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.isActive, true),
            eq(roles.isActive, true)
          )
        );

      // 2. Filter out expired assignments
      const activeAssignments = assignments.filter(a =>
        !a.expiresAt || a.expiresAt > new Date()
      );

      if (activeAssignments.length === 0) {
        logger.debug('No active role assignments found', { userId, requestId });
        return {
          userId,
          permissions: [],
          roles: [],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
          computationTime: Date.now() - startTime
        };
      }

      // 3. Get permissions for all assigned roles
      const roleIds = activeAssignments.map(a => a.roleId);
      const permissions = await db
        .select({
          permissionId: permissions.id,
          permissionName: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          roleId: rolePermissions.roleId,
          roleName: roles.name
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
        .where(
          and(
            eq(rolePermissions.roleId, roleIds.length === 1 ? roleIds[0] : inArray(rolePermissions.roleId, roleIds)),
            eq(rolePermissions.isActive, true),
            eq(permissions.isActive, true)
          )
        );

      // 4. Calculate earliest expiry time
      const earliestExpiry = activeAssignments
        .map(a => a.expiresAt)
        .filter(date => date !== null)
        .sort((a, b) => a!.getTime() - b!.getTime())[0] ||
        new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = {
        userId,
        permissions,
        roles: activeAssignments.map(a => ({
          roleId: a.roleId,
          roleName: a.roleName
        })),
        expiresAt: earliestExpiry,
        computationTime: Date.now() - startTime
      };

      logger.debug('Effective permissions computed', {
        requestId,
        userId,
        permissionCount: permissions.length,
        roleCount: activeAssignments.length,
        computationTime: result.computationTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to compute effective permissions', {
        requestId,
        userId,
        error: error.message
      });

      return {
        userId,
        permissions: [],
        roles: [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        computationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check contextual access constraints
   */
  static async checkContextualConstraints(
    userId: string,
    resource: string,
    action: string,
    effectivePerms: EffectivePermissions,
    context: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check team boundary constraints
    if (context.targetTeamId && context.teamId) {
      const hasTeamAccess = await this.checkTeamAccess(
        userId,
        effectivePerms.roles,
        context.teamId,
        context.targetTeamId
      );

      if (!hasTeamAccess) {
        return {
          allowed: false,
          reason: 'TEAM_BOUNDARY_VIOLATION'
        };
      }
    }

    // Check organizational boundaries
    if (context.targetOrganizationId && context.organizationId) {
      if (context.targetOrganizationId !== context.organizationId) {
        const hasOrgAccess = await this.checkOrganizationAccess(
          userId,
          effectivePerms.roles,
          context.organizationId,
          context.targetOrganizationId
        );

        if (!hasOrgAccess) {
          return {
            allowed: false,
            reason: 'ORGANIZATION_BOUNDARY_VIOLATION'
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check team access permissions
   */
  private static async checkTeamAccess(
    userId: string,
    userRoles: Array<{ roleId: string; roleName: string }>,
    userTeamId: string,
    targetTeamId: string
  ): Promise<boolean> {
    // Users can always access their own team
    if (userTeamId === targetTeamId) {
      return true;
    }

    // NATIONAL_SUPPORT_ADMIN has cross-team operational access
    const hasNationalSupport = userRoles.some(r => r.roleName === 'NATIONAL_SUPPORT_ADMIN');
    if (hasNationalSupport) {
      return true;
    }

    // REGIONAL_MANAGER can access teams within their region
    const hasRegionalManager = userRoles.some(r => r.roleName === 'REGIONAL_MANAGER');
    if (hasRegionalManager) {
      // TODO: Implement region-based team access logic
      // For now, allow cross-team access for regional managers
      return true;
    }

    return false;
  }

  /**
   * Check system settings access
   */
  private static async checkSystemSettingsAccess(
    userId: string,
    userRoles: Array<{ roleId: string; roleName: string }>
  ): Promise<{ allowed: boolean; reason: string }> {
    const hasSystemAdmin = userRoles.some(r => r.roleName === 'SYSTEM_ADMIN');

    if (hasSystemAdmin) {
      return { allowed: true };
    }

    const hasNationalSupport = userRoles.some(r => r.roleName === 'NATIONAL_SUPPORT_ADMIN');

    if (hasNationalSupport) {
      return {
        allowed: false,
        reason: 'SYSTEM_SETTINGS_ACCESS_DENIED_NATIONAL_SUPPORT'
      };
    }

    return {
      allowed: false,
      reason: 'SYSTEM_SETTINGS_ACCESS_DENIED'
    };
  }

  /**
   * Check if user has any of the specified roles
   */
  static async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const userRoles = await db
        .select({ roleName: roles.name })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(
          and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.isActive, true),
            eq(roles.isActive, true),
            inArray(roles.name, roleNames)
          )
        );

      return userRoles.length > 0;

    } catch (error) {
      logger.error('Failed to check user roles', {
        userId,
        roleNames,
        error: error.message
      });

      return false;
    }
  }

  /**
   * Invalidate permission cache for a user
   */
  static async invalidatePermissionCache(userId: string): Promise<void> {
    // Clear cache entries for this user
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }

    // Also clear database cache entries
    await db.delete(permissionCache).where(eq(permissionCache.userId, userId));

    logger.info('Permission cache invalidated', { userId });
  }

  /**
   * Cache management methods
   */
  private static getFromCache(key: string): PermissionCacheEntry | null {
    return this.cache.get(key) || null;
  }

  private static setCache(key: string, result: PermissionResult): void {
    const entry: PermissionCacheEntry = {
      allowed: result.allowed,
      reason: result.reason,
      grantedBy: result.grantedBy,
      context: result.context,
      expiresAt: Date.now() + this.CACHE_TTL
    };

    this.cache.set(key, entry);
  }

  private static isCacheExpired(entry: PermissionCacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private static getContextHash(context: any): string {
    // Create a hash of relevant context fields for cache key
    const relevantFields = {
      teamId: context.teamId,
      deviceId: context.deviceId,
      projectId: context.projectId,
      organizationId: context.organizationId
    };

    return JSON.stringify(relevantFields);
  }
}

// Type definitions
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  grantedBy: Array<{
    roleId: string;
    roleName: string;
    permissionId: string;
  }>;
  context: EffectivePermissions | null;
  evaluationTime: number;
}

export interface EffectivePermissions {
  userId: string;
  permissions: Array<{
    permissionId: string;
    permissionName: string;
    resource: string;
    action: string;
    roleId: string;
    roleName: string;
  }>;
  roles: Array<{
    roleId: string;
    roleName: string;
  }>;
  expiresAt: Date;
  computationTime: number;
}

interface PermissionCacheEntry {
  allowed: boolean;
  reason?: string;
  grantedBy: Array<{
    roleId: string;
    roleName: string;
    permissionId: string;
  }>;
  context: EffectivePermissions | null;
  expiresAt: number;
}
```

## 🚀 Route Protection Examples

### Mobile API Routes (`src/routes/api/auth.ts`)

```typescript
import { Router } from 'express';
import { authenticateToken, hasPermission } from '../../middleware/auth';
import { requireTeamAccess } from '../../middleware/enhanced-auth';

const router = Router();

// All routes below require authentication
router.use(authenticateToken('mobile'));

// Get current user info
router.get('/whoami', async (req, res) => {
  // req.user is guaranteed to exist due to authentication middleware
  res.json({
    ok: true,
    user: req.user,
    session: req.session
  });
});

// Get user's devices (requires team access)
router.get('/devices',
  requireTeamAccess(),
  async (req, res) => {
    // User can only access devices from their team
    // Team access middleware ensures req.params.teamId === req.user.teamId
    // or user has cross-team access permissions
  }
);

// Submit telemetry (basic auth check)
router.post('/telemetry', async (req, res) => {
  // Only authentication required - all authenticated users can submit telemetry
});

// Update user profile (requires permission)
router.put('/profile',
  hasPermission('USERS', 'UPDATE'),
  async (req, res) => {
    // Only users with USERS.UPDATE permission can update profiles
  }
);
```

### Web Admin API Routes (`src/routes/api/web-admin/auth.ts`)

```typescript
import { Router } from 'express';
import { authenticateToken, hasPermission, hasAnyRole } from '../../middleware/auth';

const router = Router();

// All routes below require web admin authentication
router.use(authenticateToken('web-admin'));

// Get current admin user
router.get('/whoami', async (req, res) => {
  res.json({
    ok: true,
    user: req.user
  });
});

// System administration (SYSTEM_ADMIN only)
router.get('/system/settings',
  hasPermission('SYSTEM_SETTINGS', 'READ'),
  async (req, res) => {
    // Only users with SYSTEM_SETTINGS.READ permission can access system settings
  }
);

// User management (multiple roles allowed)
router.get('/users',
  hasAnyRole(['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'DEVICE_MANAGER']),
  async (req, res) => {
    // Users with any of the specified roles can access user management
  }
);

// Device management
router.post('/devices',
  hasPermission('DEVICES', 'CREATE'),
  async (req, res) => {
    // Only users with DEVICES.CREATE permission can register new devices
  }
);

// Project management with team boundary checking
router.post('/projects',
  hasPermission('PROJECTS', 'CREATE'),
  requireTeamAccess(),
  async (req, res) => {
    // Create project only if user has PROJECTS.CREATE permission
    // AND has access to the specified team
  }
);
```

### Express App Integration (`src/app.ts`)

```typescript
import express from 'express';
import { authenticateToken, hasPermission, hasAnyRole } from './middleware/auth';

const app = express();

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    requestId: (req as any).requestId,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      request_id: (req as any).requestId
    }
  });
});

// API routes
app.use('/api/v1', apiRoutes);
app.use('/api/v1/web-admin', webAdminRoutes);

export default app;
```

## 🛡️ Security Enforcement Mechanisms

### 1. Token Validation

```typescript
// JWT token structure validation
interface JWTPayload {
  sub: string;           // User ID
  type: string;         // 'mobile' | 'web-admin'
  iat: number;          // Issued at
  exp: number;          // Expires at
  jti: string;          // JWT ID for revocation
  iss: string;          // Issuer
  // Mobile-specific claims
  deviceId?: string;
  sessionId?: string;
  teamId?: string;
  // Web admin-specific claims
  email?: string;
  roles?: string[];
}
```

### 2. Permission Caching

```typescript
// Permission cache for performance optimization
class PermissionCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 15 * 60 * 1000; // 15 minutes

  async get(userId: string, resource: string, action: string, context: any): Promise<PermissionResult | null> {
    const key = this.generateKey(userId, resource, action, context);
    const entry = this.cache.get(key);

    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.result;
  }

  async set(userId: string, resource: string, action: string, context: any, result: PermissionResult): Promise<void> {
    const key = this.generateKey(userId, resource, action, context);
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.TTL
    });
  }

  private generateKey(userId: string, resource: string, action: string, context: any): string {
    const contextHash = JSON.stringify({
      teamId: context.teamId,
      deviceId: context.deviceId,
      projectId: context.projectId
    });

    return `${userId}:${resource}:${action}:${btoa(contextHash)}`;
  }
}
```

### 3. Audit Logging

```typescript
// Comprehensive audit logging for all authorization decisions
export class AuditLogger {
  static logAccessDecision(decision: AccessDecision): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: decision.requestId,
      userId: decision.userId,
      resource: decision.resource,
      action: decision.action,
      allowed: decision.allowed,
      reason: decision.reason,
      grantedBy: decision.grantedBy,
      evaluationTime: decision.evaluationTime,
      context: decision.context,
      clientIp: decision.clientIp,
      userAgent: decision.userAgent
    };

    if (decision.allowed) {
      logger.info('Access granted', logEntry);
    } else {
      logger.warn('Access denied', logEntry);
    }

    // Store in database for compliance reporting
    this.storeAuditEntry(logEntry);
  }

  private static async storeAuditEntry(entry: any): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        id: generateUUID(),
        timestamp: new Date(entry.timestamp),
        userId: entry.userId,
        resource: entry.resource,
        action: entry.action,
        allowed: entry.allowed,
        reason: entry.reason,
        grantedBy: JSON.stringify(entry.grantedBy),
        evaluationTime: entry.evaluationTime,
        context: JSON.stringify(entry.context),
        clientIp: entry.clientIp,
        userAgent: entry.userAgent,
        requestId: entry.requestId
      });
    } catch (error) {
      logger.error('Failed to store audit entry', { error: error.message });
    }
  }
}
```

### 4. Rate Limiting Integration

```typescript
// Rate limiting that considers user role and permissions
export class AuthorizationRateLimiter {
  private static limiters = new Map<string, RateLimiter>();

  static async checkLimit(
    userId: string,
    userRole: string,
    resource: string,
    action: string,
    clientIp: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    // Different limits based on user role
    const limits = this.getRoleBasedLimits(userRole);

    // Check per-user limits
    const userLimiter = this.getLimiter(`user:${userId}`, limits.user);
    if (!userLimiter.allow()) {
      return {
        allowed: false,
        retryAfter: userLimiter.getRemainingMs()
      };
    }

    // Check per-IP limits
    const ipLimiter = this.getLimiter(`ip:${clientIp}`, limits.ip);
    if (!ipLimiter.allow()) {
      return {
        allowed: false,
        retryAfter: ipLimiter.getRemainingMs()
      };
    }

    return { allowed: true };
  }

  private static getRoleBasedLimits(role: string): { user: number; ip: number } {
    switch (role) {
      case 'SYSTEM_ADMIN':
        return { user: 1000, ip: 500 };  // Higher limits for admins
      case 'REGIONAL_MANAGER':
        return { user: 500, ip: 200 };
      case 'FIELD_SUPERVISOR':
        return { user: 200, ip: 100 };
      default:
        return { user: 100, ip: 50 };   // Standard limits
    }
  }
}
```

## 📊 Performance Considerations

### 1. Permission Caching Strategy

```typescript
// Multi-level caching for optimal performance
class MultiLevelCache {
  private memoryCache = new Map<string, CacheEntry>();
  private redisCache: RedisCache;

  async get(key: string): Promise<PermissionResult | null> {
    // Level 1: Memory cache (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.result;
    }

    // Level 2: Redis cache (medium speed)
    const redisEntry = await this.redisCache.get(key);
    if (redisEntry) {
      // Promote to memory cache
      this.memoryCache.set(key, redisEntry);
      return redisEntry.result;
    }

    return null;
  }

  async set(key: string, result: PermissionResult): Promise<void> {
    const entry: CacheEntry = {
      result,
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
    };

    // Set in both caches
    this.memoryCache.set(key, entry);
    await this.redisCache.set(key, entry);
  }
}
```

### 2. Database Query Optimization

```typescript
// Optimized permission queries with proper indexing
class OptimizedAuthorizationQueries {
  // Use database indexes effectively
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    // This query uses the following indexes:
    // - idx_user_role_assignments_user_active
    // - idx_role_permissions_role_active
    // - idx_permissions_resource_action

    const query = `
      WITH active_roles AS (
        SELECT ra.role_id, r.name as role_name
        FROM user_role_assignments ra
        JOIN roles r ON ra.role_id = r.id
        WHERE ra.user_id = $1
          AND ra.is_active = true
          AND r.is_active = true
          AND (ra.expires_at IS NULL OR ra.expires_at > NOW())
      ),
      user_permissions AS (
        SELECT
          p.id as permission_id,
          p.name as permission_name,
          p.resource,
          p.action,
          rp.role_id,
          r.name as role_name
        FROM active_roles ar
        JOIN role_permissions rp ON ar.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN roles r ON rp.role_id = r.id
        WHERE rp.is_active = true
          AND p.is_active = true
      )
      SELECT * FROM user_permissions
    `;

    return db.execute(query, [userId]);
  }
}
```

## 🧪 Testing Authorization Middleware

### Unit Tests (`tests/unit/auth-middleware.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { authenticateToken, hasPermission } from '../../src/middleware/auth';
import { JWTService } from '../../src/services/jwt-service';

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it('should reject requests without token', async () => {
    await authenticateToken('mobile')(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication token required'
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should accept requests with valid token', async () => {
    const validToken = await JWTService.generateAccessToken({
      sub: 'user-123',
      type: 'mobile',
      userCode: 'emp001',
      teamId: 'team-456',
      role: 'TEAM_MEMBER'
    });

    mockReq.headers = { authorization: `Bearer ${validToken}` };

    await authenticateToken('mobile')(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user?.id).toBe('user-123');
  });

  it('should reject requests with expired token', async () => {
    const expiredToken = await JWTService.generateAccessToken({
      sub: 'user-123',
      type: 'mobile',
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    });

    mockReq.headers = { authorization: `Bearer ${expiredToken}` };

    await authenticateToken('mobile')(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: 'INVALID_TOKEN'
      }
    });
  });
});

describe('Authorization Middleware', () => {
  let mockReq: AuthenticatedRequest;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        code: 'emp001',
        teamId: 'team-456',
        role: 'TEAM_MEMBER'
      },
      headers: { 'x-request-id': 'test-123' },
      ip: '127.0.0.1'
    } as AuthenticatedRequest;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    nextFunction = jest.fn();
  });

  it('should allow access with valid permission', async () => {
    // Mock successful permission check
    jest.spyOn(AuthorizationService, 'checkPermission').mockResolvedValue({
      allowed: true,
      grantedBy: [{ roleId: 'role-123', roleName: 'TEAM_MEMBER', permissionId: 'perm-123' }]
    });

    await hasPermission('TEAMS', 'READ')(mockReq, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.userPermissions).toBeDefined();
  });

  it('should deny access without permission', async () => {
    jest.spyOn(AuthorizationService, 'checkPermission').mockResolvedValue({
      allowed: false,
      reason: 'NO_PERMISSION'
    });

    await hasPermission('DEVICES', 'DELETE')(mockReq, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'NO_PERMISSION'
      }
    });
  });
});
```

### Integration Tests (`tests/integration/authorization.test.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { TestDatabase } from '../src/lib/test-database';

describe('Authorization Integration Tests', () => {
  let testDb: TestDatabase;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();

    // Create test users and get tokens
    adminToken = await testDb.createAdminUser('SYSTEM_ADMIN');
    userToken = await testDb.createMobileUser('TEAM_MEMBER');
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it('should allow admin to access system settings', async () => {
    const response = await request(app)
      .get('/api/v1/web-admin/system/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
  });

  it('should deny regular user access to system settings', async () => {
    const response = await request(app)
      .get('/api/v1/web-admin/system/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('should enforce team boundaries', async () => {
    // Create team that user doesn't belong to
    const otherTeamId = await testDb.createTeam('Other Team');

    const response = await request(app)
      .get(`/api/v1/teams/${otherTeamId}/members`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('TEAM_BOUNDARY_VIOLATION');
  });
});
```

## 🔍 Debugging Authorization Issues

### 1. Permission Debugging Middleware

```typescript
// Development-only debugging middleware
export function debugPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  const originalJson = res.json;
  res.json = function(data) {
    // Add debug information to response in development
    if (req.user && req.userPermissions) {
      data.debug = {
        userId: req.user.id,
        userRole: req.user.role,
        permissions: req.userPermissions.map(p => p.permissionName),
        roles: req.userRoles,
        teamId: req.user.teamId
      };
    }

    return originalJson.call(this, data);
  };

  next();
}
```

### 2. Authorization Debugging Endpoints

```typescript
// Development-only debugging endpoint
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/permissions/:userId',
    authenticateToken('web-admin'),
    hasAnyRole(['SYSTEM_ADMIN']),
    async (req, res) => {
      const targetUserId = req.params.userId;
      const permissions = await AuthorizationService.computeEffectivePermissions(targetUserId);

      res.json({
        userId: targetUserId,
        permissions: permissions.permissions.map(p => ({
          name: p.permissionName,
          resource: p.resource,
          action: p.action,
          grantedBy: p.roleName
        })),
        roles: permissions.roles,
        expiresAt: permissions.expiresAt
      });
    }
  );

  router.get('/debug/role-matrix',
    authenticateToken('web-admin'),
    hasAnyRole(['SYSTEM_ADMIN']),
    async (req, res) => {
      // Return complete role-permission matrix for debugging
      const matrix = await AuthorizationService.getRolePermissionMatrix();
      res.json(matrix);
    }
  );
}
```

This comprehensive authorization middleware documentation provides developers with complete understanding of how access control works across the SurveyLauncher system, including security best practices, performance optimizations, and debugging techniques.