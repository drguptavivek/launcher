import { getContext, setContext } from 'svelte';
import { writable } from 'svelte/store';
import type { UserRole } from '$lib/types/role.types';
import { ROLE_PERMISSIONS, ROLE_NAVIGATION, ROLE_HIERARCHY, FORM_PERMISSIONS } from '$lib/types/role.types';

// Context key for role store
const ROLE_CONTEXT_KEY = Symbol('role');

/**
 * Role state interface
 */
export class RoleState {
  userRole = $state<UserRole | null>(null);
  permissions = $state<string[]>([]);
  isLoading = $state(false);
  user = $state<any>(null);
  sessionId = $state(null);

  constructor(userRole = null, user = null, sessionId = null) {
    this.userRole = userRole;
    this.user = user;
    this.sessionId = sessionId;
    this.updatePermissions();
  }

  /**
   * Update permissions based on current role
   */
  updatePermissions() {
    if (this.userRole && ROLE_PERMISSIONS[this.userRole]) {
      this.permissions = [...ROLE_PERMISSIONS[this.userRole]];
    } else {
      this.permissions = [];
    }
  }

  /**
   * Set user role and update permissions
   */
  setRole(userRole: UserRole | null) {
    this.userRole = userRole;
    this.updatePermissions();
  }

  /**
   * Set user information
   */
  setUser(user: any) {
    this.user = user;
    if (user?.role) {
      this.setRole(user.role);
    }
  }

  /**
   * Set session information
   */
  setSession(sessionId: any) {
    this.sessionId = sessionId;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string) {
    if (!this.userRole) return false;
    if (this.permissions.includes('*')) return true;
    return this.permissions.some(p => p === permission || p.endsWith('*') && permission.startsWith(p.slice(0, -1)));
  }

  /**
   * Check if user has any of the provided permissions
   */
  hasAnyPermission(permissions: string | string[]) {
    if (!Array.isArray(permissions)) {
      return this.hasPermission(permissions);
    }
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all provided permissions
   */
  hasAllPermissions(permissions: string[]) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if user can perform specific form action
   */
  canPerformFormAction(formAction: string) {
    const requiredRoles = FORM_PERMISSIONS[formAction as keyof typeof FORM_PERMISSIONS];
    if (!requiredRoles || !this.userRole) return false;
    return [...(requiredRoles as readonly UserRole[])].includes(this.userRole);
  }

  /**
   * Get navigation items for current role
   */
  getNavigationItems() {
    if (!this.userRole) return [];
    return ROLE_NAVIGATION[this.userRole] || [];
  }

  /**
   * Check if user role has higher or equal hierarchy level
   */
  hasMinimumRole(minRole: UserRole) {
    if (!this.userRole || !minRole) return false;
    const userLevel = ROLE_HIERARCHY[this.userRole];
    const minLevel = ROLE_HIERARCHY[minRole];
    return userLevel >= minLevel;
  }

  /**
   * Check if user can access route based on role
   */
  canAccessRoute(route: string) {
    if (!this.userRole) return false;

    // Define role-based route access
    const routePermissions: Record<string, string[]> = {
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

    return allowedRoles.includes('*') || allowedRoles.includes(this.userRole);
  }

  /**
   * Clear role state (for logout)
   */
  clear() {
    this.userRole = null;
    this.permissions = [];
    this.user = null;
    this.sessionId = null;
    this.isLoading = false;
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  /**
   * Get role category (Hybrid vs Web-only)
   */
  getRoleCategory() {
    if (!this.userRole) return null;

    const hybridRoles = ['TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER'];
    return hybridRoles.includes(this.userRole) ? 'HYBRID' : 'WEB_ONLY';
  }

  /**
   * Check if role is hybrid (can use both app and web)
   */
  isHybridRole() {
    return this.getRoleCategory() === 'HYBRID';
  }

  /**
   * Get role display name
   */
  getRoleDisplayName() {
    if (!this.userRole) return null;

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

    return displayNames[this.userRole] || this.userRole;
  }
}

/**
 * Create role context
 */
export function setRoleContext(roleState: any) {
  setContext(ROLE_CONTEXT_KEY, roleState);
}

/**
 * Get role context
 */
export function getRoleContext() {
  return getContext(ROLE_CONTEXT_KEY);
}

/**
 * Create reactive role store
 */
export function createRoleStore(initialData: any = {}) {
  const roleState = new RoleState(initialData.userRole, initialData.user, initialData.sessionId);

  // Create writable store for external subscription
  const store = writable(roleState);

  return {
    subscribe: store.subscribe,
    setRole: (userRole: UserRole | null) => {
      roleState.setRole(userRole);
      store.set(roleState);
    },
    setUser: (user: any) => {
      roleState.setUser(user);
      store.set(roleState);
    },
    setSession: (sessionId: any) => {
      roleState.setSession(sessionId);
      store.set(roleState);
    },
    setLoading: (loading: boolean) => {
      roleState.setLoading(loading);
      store.set(roleState);
    },
    clear: () => {
      roleState.clear();
      store.set(roleState);
    },
    hasPermission: (permission: string) => roleState.hasPermission(permission),
    hasAnyPermission: (permissions: string[]) => roleState.hasAnyPermission(permissions),
    hasAllPermissions: (permissions: string[]) => roleState.hasAllPermissions(permissions),
    canPerformFormAction: (formAction: string) => roleState.canPerformFormAction(formAction),
    getNavigationItems: () => roleState.getNavigationItems(),
    canAccessRoute: (route: string) => roleState.canAccessRoute(route),
    isHybridRole: () => roleState.isHybridRole(),
    getRoleDisplayName: () => roleState.getRoleDisplayName(),
    getRoleCategory: () => roleState.getRoleCategory(),
    hasMinimumRole: (minRole: UserRole) => roleState.hasMinimumRole(minRole),
    state: roleState
  };
}

/**
 * Derived stores for common role checks
 */
// TODO: Update derived stores for Svelte 5 - currently disabled
// export function createRoleDerivedStores(roleStore) {
//   return {
//     isAdmin: derived(roleStore, $role => $role.userRole === 'SYSTEM_ADMIN'),
//     isSupervisor: derived(roleStore, $role => $role.userRole === 'FIELD_SUPERVISOR'),
//     isManager: derived(roleStore, $role => $role.userRole === 'REGIONAL_MANAGER'),
//     isTeamMember: derived(roleStore, $role => $role.userRole === 'TEAM_MEMBER'),
//     isHybrid: derived(roleStore, $role => $role.isHybridRole()),
//     canManageUsers: derived(roleStore, $role => $role.hasAnyPermission(['users:create', 'users:update'])),
//     canManageProjects: derived(roleStore, $role => $role.hasAnyPermission(['projects:create', 'projects:update'])),
//     canManageDevices: derived(roleStore, $role => $role.hasAnyPermission(['devices:create', 'devices:configure'])),
//     navigationItems: derived(roleStore, $role => $role.getNavigationItems())
//   };
// }

/**
 * Default role store instance
 */
export const roleStore = createRoleStore();