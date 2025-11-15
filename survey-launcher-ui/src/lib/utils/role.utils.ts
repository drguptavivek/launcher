import type { UserRole } from '$lib/types/role.types';
import { ROLE_PERMISSIONS, ROLE_NAVIGATION, ROLE_HIERARCHY, FORM_PERMISSIONS } from '$lib/types/role.types';

/**
 * Role utility functions for SurveyLauncher 9-role RBAC system
 */

/**
 * Check if a role can perform a specific action
 */
export function canPerformAction(userRole: UserRole, permission: string): boolean {
  if (!userRole) return false;
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
}

/**
 * Check if a role can perform any of the provided actions
 */
export function canPerformAnyAction(userRole: UserRole, permissions: string[]): boolean {
  if (!userRole || !permissions.length) return false;
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];

  // Wildcard access
  if (userPermissions.includes('*')) return true;

  // Check individual permissions
  return permissions.some(permission => {
    // Exact match
    if (userPermissions.includes(permission)) return true;

    // Wildcard permission check
    return userPermissions.some(userPerm =>
      userPerm.endsWith('*') && permission.startsWith(userPerm.slice(0, -1))
    );
  });
}

/**
 * Check if a role can perform all provided actions
 */
export function canPerformAllActions(userRole: UserRole, permissions: string[]): boolean {
  if (!userRole || !permissions.length) return false;
  return permissions.every(permission => canPerformAction(userRole, permission));
}

/**
 * Check if a role has minimum hierarchy level
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  if (!userRole || !minimumRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole];
  const minLevel = ROLE_HIERARCHY[minimumRole];
  return userLevel >= minLevel;
}

/**
 * Check if a role can create a specific form type
 */
export function canCreateForm(userRole: UserRole, formType: string): boolean {
  const formPermission = `${formType}:create`;
  return canPerformAction(userRole, formPermission);
}

/**
 * Check if a role can update a specific form type
 */
export function canUpdateForm(userRole: UserRole, formType: string): boolean {
  const formPermission = `${formType}:update`;
  return canPerformAction(userRole, formPermission);
}

/**
 * Check if a role can delete a specific form type
 */
export function canDeleteForm(userRole: UserRole, formType: string): boolean {
  const formPermission = `${formType}:delete`;
  return canPerformAction(userRole, formPermission);
}

/**
 * Check if a role can view a specific form type
 */
export function canViewForm(userRole: UserRole, formType: string): boolean {
  const formPermission = `${formType}:read`;
  return canPerformAction(userRole, formPermission);
}

/**
 * Get navigation items for a specific role
 */
export function getNavigationForRole(userRole: UserRole) {
  if (!userRole) return [];
  return ROLE_NAVIGATION[userRole] || [];
}

/**
 * Check if a route is accessible to a role
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  if (!userRole) return false;

  // Define role-based route access
  const routePermissions = {
    '/dashboard': ['*'], // All roles can access dashboard
    '/users': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
    '/projects': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR', 'TEAM_MEMBER', 'AUDITOR'],
    '/devices': ['SYSTEM_ADMIN', 'DEVICE_MANAGER', 'REGIONAL_MANAGER', 'SUPPORT_AGENT', 'AUDITOR'],
    '/policies': ['SYSTEM_ADMIN', 'POLICY_ADMIN', 'AUDITOR'],
    '/audit': ['AUDITOR', 'SYSTEM_ADMIN', 'NATIONAL_SUPPORT_ADMIN'],
    '/support': ['SUPPORT_AGENT', 'SYSTEM_ADMIN'],
    '/national': ['NATIONAL_SUPPORT_ADMIN', 'SYSTEM_ADMIN'],
    '/supervisor': ['FIELD_SUPERVISOR', 'SYSTEM_ADMIN', 'REGIONAL_MANAGER'],
    '/reports': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'AUDITOR', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'],
    '/monitoring': ['DEVICE_MANAGER', 'SYSTEM_ADMIN']
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return false;

  return allowedRoles.includes('*') || allowedRoles.includes(userRole);
}

/**
 * Get form permissions for a role and form type
 */
export function getFormPermissions(userRole: UserRole, formType: string): string[] {
  const permissions = [];

  if (canCreateForm(userRole, formType)) permissions.push('create');
  if (canUpdateForm(userRole, formType)) permissions.push('update');
  if (canDeleteForm(userRole, formType)) permissions.push('delete');
  if (canViewForm(userRole, formType)) permissions.push('view');

  // Special permissions for assignment
  if (canPerformAction(userRole, 'supervisor:override')) {
    permissions.push('assign', 'supervisor');
  }

  return permissions;
}

/**
 * Filter navigation items based on user role
 */
export function filterNavigationByRole(items: Array<{href: string}>, userRole: UserRole) {
  if (!userRole) return [];
  return items.filter(item => canAccessRoute(userRole, item.href));
}

/**
 * Get role display name
 */
export function getRoleDisplayName(userRole: UserRole): string {
  const displayNames = {
    'TEAM_MEMBER': 'Team Member',
    'FIELD_SUPERVISOR': 'Field Supervisor',
    'REGIONAL_MANAGER': 'Regional Manager',
    'SYSTEM_ADMIN': 'System Administrator',
    'SUPPORT_AGENT': 'Support Agent',
    'AUDITOR': 'Auditor',
    'DEVICE_MANAGER': 'Device Manager',
    'POLICY_ADMIN': 'Policy Administrator',
    'NATIONAL_SUPPORT_ADMIN': 'National Support Admin'
  };

  return displayNames[userRole] || userRole;
}

/**
 * Get role category (Hybrid vs Web-only)
 */
export function getRoleCategory(userRole: UserRole): 'HYBRID' | 'WEB_ONLY' | null {
  if (!userRole) return null;

  const hybridRoles = ['TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER'];
  return hybridRoles.includes(userRole) ? 'HYBRID' : 'WEB_ONLY';
}

/**
 * Check if role is hybrid (can use both app and web)
 */
export function isHybridRole(userRole: UserRole): boolean {
  return getRoleCategory(userRole) === 'HYBRID';
}

/**
 * Check if role is web-only
 */
export function isWebOnlyRole(userRole: UserRole): boolean {
  return getRoleCategory(userRole) === 'WEB_ONLY';
}

/**
 * Get available actions for a user role and form type
 */
export function getAvailableActions(formType: string, userRole: UserRole): string[] {
  const actionMap = {
    'SYSTEM_ADMIN': ['create', 'edit', 'delete', 'assign', 'approve'],
    'REGIONAL_MANAGER': ['create', 'edit', 'assign', 'view'],
    'FIELD_SUPERVISOR': ['view', 'edit_limited', 'assign_team'],
    'TEAM_MEMBER': ['view'],
    'SUPPORT_AGENT': ['view', 'create_ticket'],
    'AUDITOR': ['view', 'audit'],
    'DEVICE_MANAGER': ['create', 'edit', 'configure'],
    'POLICY_ADMIN': ['create', 'edit', 'view'],
    'NATIONAL_SUPPORT_ADMIN': ['view', 'reports', 'oversight']
  };

  const roleActions = actionMap[userRole] || [];

  // Filter actions based on form type
  const formSpecificActions = {
    'project': ['create', 'edit', 'view', 'delete'],
    'user': ['create', 'edit', 'view', 'delete', 'assign'],
    'device': ['create', 'edit', 'view', 'configure', 'assign'],
    'assignment': ['create', 'edit', 'view', 'delete'],
    'audit': ['create', 'view', 'export'],
    'policy': ['create', 'edit', 'view', 'delete'],
    'support': ['create', 'edit', 'view', 'assign', 'resolve']
  };

  const formActions = formSpecificActions[formType] || [];

  // Return intersection of role actions and form-specific actions
  return roleActions.filter(action => formActions.includes(action));
}

/**
 * Validate role-based field visibility
 */
export function getVisibleFields(userRole: UserRole, formType: string): string[] {
  const fieldConfig = {
    'project': {
      'SYSTEM_ADMIN': ['title', 'description', 'status', 'geographicScope', 'teamIds', 'budget', 'priority'],
      'REGIONAL_MANAGER': ['title', 'description', 'status', 'geographicScope', 'teamIds'],
      'FIELD_SUPERVISOR': ['title', 'description', 'status', 'geographicScope', 'teamIds', 'assignedUsers'],
      'TEAM_MEMBER': ['title', 'description', 'status'],
      'AUDITOR': ['title', 'description', 'status', 'teamIds', 'budget']
    },
    'user': {
      'SYSTEM_ADMIN': ['name', 'email', 'role', 'teamId', 'stateId', 'isActive'],
      'REGIONAL_MANAGER': ['name', 'email', 'role', 'teamId', 'stateId', 'isActive'],
      'FIELD_SUPERVISOR': ['name', 'email', 'teamId', 'isActive'],
      'SUPPORT_AGENT': ['name', 'email', 'teamId', 'isActive'],
      'AUDITOR': ['name', 'email', 'role', 'teamId', 'isActive']
    },
    'device': {
      'SYSTEM_ADMIN': ['deviceId', 'deviceName', 'teamId', 'configuration', 'assignedUserId', 'policyProfile'],
      'DEVICE_MANAGER': ['deviceId', 'deviceName', 'teamId', 'configuration', 'assignedUserId', 'policyProfile'],
      'REGIONAL_MANAGER': ['deviceId', 'deviceName', 'teamId'],
      'SUPPORT_AGENT': ['deviceId', 'deviceName', 'teamId'],
      'AUDITOR': ['deviceId', 'deviceName', 'teamId', 'configuration', 'assignedUserId']
    }
  };

  return fieldConfig[formType]?.[userRole] || [];
}

/**
 * Check if a field should be visible for a role
 */
export function isFieldVisible(userRole: UserRole, formType: string, fieldName: string): boolean {
  const visibleFields = getVisibleFields(userRole, formType);
  return visibleFields.includes(fieldName);
}

/**
 * Get role-based form field options (like role selections, geographic scope, etc.)
 */
export function getRoleBasedFieldOptions(userRole: UserRole, fieldName: string): string[] {
  switch (fieldName) {
    case 'role':
      if (userRole === 'SYSTEM_ADMIN') {
        return ['TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER', 'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR', 'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'];
      } else if (userRole === 'REGIONAL_MANAGER') {
        return ['TEAM_MEMBER', 'FIELD_SUPERVISOR'];
      } else if (userRole === 'FIELD_SUPERVISOR') {
        return ['TEAM_MEMBER'];
      }
      return [];

    case 'geographicScope':
      if (userRole === 'SYSTEM_ADMIN') {
        return ['LOCAL', 'REGIONAL', 'NATIONAL'];
      } else if (userRole === 'REGIONAL_MANAGER') {
        return ['LOCAL', 'REGIONAL'];
      } else if (userRole === 'FIELD_SUPERVISOR') {
        return ['LOCAL'];
      }
      return [];

    case 'policyScope':
      if (userRole === 'SYSTEM_ADMIN' || userRole === 'NATIONAL_SUPPORT_ADMIN') {
        return ['GLOBAL', 'REGIONAL', 'TEAM', 'NATIONAL'];
      } else if (userRole === 'POLICY_ADMIN') {
        return ['GLOBAL', 'REGIONAL', 'TEAM'];
      }
      return ['TEAM'];

    default:
      return [];
  }
}

/**
 * Create role-based route guard function
 */
export function createRoleGuard(requiredRoles: UserRole[] | '*') {
  return function(userRole: UserRole): boolean {
    if (!userRole) return false;
    if (requiredRoles === '*') return true;
    return requiredRoles.includes(userRole);
  };
}

/**
 * Create permission-based guard function
 */
export function createPermissionGuard(requiredPermissions: string[]) {
  return function(userRole: UserRole): boolean {
    if (!userRole) return false;
    return canPerformAllActions(userRole, requiredPermissions);
  };
}