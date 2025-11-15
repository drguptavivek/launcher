import { superForm } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import * as v from 'valibot';
import type { UserRole } from '$lib/types/role.types';
import { roleBasedSchemas } from '$lib/forms/schemas/role-based-schemas';

/**
 * RoleFormFactory - Master form factory for SurveyLauncher's 9-role RBAC system
 *
 * This factory provides role-based form creation with built-in validation,
 * permission checking, and error handling for all form types in the system.
 */
export class RoleFormFactory {
  /**
   * Create a role-based form with proper schema and validation
   * Supports all 9 roles in the SurveyLauncher system
   */
  static createForm(config: {
    formType: 'project' | 'user' | 'device' | 'assignment' | 'audit' | 'policy' | 'support';
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
      validators: valibot(schema),
      initialValues: initialData,
      onResult: ({ result }: { result: any }) => {
        this.handleRoleBasedResult(result, userRole, formType);
      },
      onError: ({ result }: { result: any }) => {
        this.handleRoleBasedError(result, userRole, formType);
      },
      ...options
    });
  }

  /**
   * Get the appropriate schema based on form type, user role, and mode
   */
  static getSchemaForRole(formType: string, userRole: UserRole, _mode: string): v.GenericSchema {
    switch (formType) {
      case 'project':
        return roleBasedSchemas.project.create(userRole);

      case 'user':
        return roleBasedSchemas.user.create(userRole);

      case 'device':
        return roleBasedSchemas.device.create(userRole);

      case 'assignment':
        return roleBasedSchemas.assignment.create(userRole);

      case 'audit':
        return roleBasedSchemas.audit.create(userRole);

      case 'policy':
        return roleBasedSchemas.policy.create(userRole);

      case 'support':
        return roleBasedSchemas.support.create(userRole);

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
      'assignment': {
        'create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
        'edit': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
        'view': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR', 'TEAM_MEMBER']
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

    const allowedRoles = (permissions as any)[formType]?.[mode] || [];
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
          console.log('Team member form submitted successfully');
          break;
        case 'FIELD_SUPERVISOR':
          // Redirect to supervisor dashboard with team data
          console.log('Field supervisor form submitted successfully');
          break;
        case 'SYSTEM_ADMIN':
          // Redirect to admin panel with full system data
          console.log('System admin form submitted successfully');
          break;
        case 'REGIONAL_MANAGER':
          // Redirect to regional manager dashboard
          console.log('Regional manager form submitted successfully');
          break;
        case 'SUPPORT_AGENT':
          // Redirect to support dashboard
          console.log('Support agent form submitted successfully');
          break;
        case 'AUDITOR':
          // Redirect to audit dashboard
          console.log('Auditor form submitted successfully');
          break;
        case 'DEVICE_MANAGER':
          // Redirect to device management dashboard
          console.log('Device manager form submitted successfully');
          break;
        case 'POLICY_ADMIN':
          // Redirect to policy management dashboard
          console.log('Policy admin form submitted successfully');
          break;
        case 'NATIONAL_SUPPORT_ADMIN':
          // Redirect to national support dashboard
          console.log('National support admin form submitted successfully');
          break;
        default:
          console.log('Form submitted successfully for role:', userRole);
      }

      // Additional form type specific handling
      switch (formType) {
        case 'project':
          console.log('Project operation completed');
          break;
        case 'user':
          console.log('User management operation completed');
          break;
        case 'device':
          console.log('Device management operation completed');
          break;
        case 'audit':
          console.log('Audit report created');
          break;
        case 'policy':
          console.log('Policy operation completed');
          break;
        case 'support':
          console.log('Support ticket operation completed');
          break;
      }
    }
  }

  /**
   * Handle form errors based on role and form type
   */
  static handleRoleBasedError(result: any, userRole: UserRole, formType: string): void {
    // Role-specific error messaging and handling
    console.error(`Form error for role ${userRole} in ${formType}:`, result);

    // Role-specific error handling
    switch (userRole) {
      case 'TEAM_MEMBER':
        // Simple error messages for team members
        console.error('Operation failed. Please contact your supervisor.');
        break;
      case 'SYSTEM_ADMIN':
        // Detailed error messages for system admins
        console.error('System operation failed:', result);
        break;
      default:
        // Standard error messaging
        console.error('Operation failed. Please try again or contact support.');
    }
  }

  /**
   * Create specialized schemas for different form types
   */
  private static createUpdateProjectSchema(userRole: UserRole): v.GenericSchema {
    // Similar to create schema but with different validation rules
    return roleBasedSchemas.project.create(userRole);
  }

  /**
   * Get available actions for a user role and form type
   */
  static getAvailableActions(formType: string, userRole: UserRole): string[] {
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

    const formActions = (formSpecificActions as any)[formType] || [];

    // Return intersection of role actions and form-specific actions
    return roleActions.filter(action => formActions.includes(action));
  }

  /**
   * Check if a user can perform a specific action on a form type
   */
  static canPerformAction(formType: string, action: string, userRole: UserRole): boolean {
    const availableActions = this.getAvailableActions(formType, userRole);
    return availableActions.includes(action);
  }
}

/**
 * Helper function for quick form creation in components
 */
export function createRoleForm(formType: string, userRole: UserRole, mode: string = 'create') {
  return RoleFormFactory.createForm({
    formType: formType as any,
    userRole,
    mode: mode as any,
    options: {
      // Default options for all role-based forms
      resetForm: false,
      onError: ({ result }: { result: any }) => {
        console.error('Form error:', result);
      },
      onResult: ({ result }: { result: any }) => {
        if (result.type === 'success') {
          console.log('Form submitted successfully:', result.data);
        }
      }
    }
  });
}