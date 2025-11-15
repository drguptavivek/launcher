import * as v from 'valibot';
import type { UserRole } from '$lib/types/role.types';

// Role definitions for type safety - using the imported type
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
];

// Create enum types for Valibot using picklist (modern approach)
const StatusEnum = v.picklist(['ACTIVE', 'INACTIVE']);
const GeographicScopeEnum = v.picklist(['LOCAL', 'REGIONAL', 'NATIONAL']);
const PriorityEnum = v.picklist(['LOW', 'MEDIUM', 'HIGH']);
const UserRoleEnum = v.picklist(USER_ROLES);

// Project schema with full role-based validation
export const createProjectSchema = (userRole: UserRole) => {
  // Base fields for all roles
  const baseFields = {
    title: v.pipe(
      v.string(),
      v.minLength(1, 'Title is required'),
      v.maxLength(200, 'Title must be 200 characters or less')
    ),
    abbreviation: v.pipe(
      v.string(),
      v.minLength(2, 'Abbreviation must be at least 2 characters'),
      v.maxLength(10, 'Abbreviation must be 10 characters or less')
    ),
    description: v.optional(v.string())
  };

  let schema: v.GenericSchema;

  if (['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole)) {
    // Admin/Manager schema with all fields
    schema = v.object({
      title: baseFields.title,
      abbreviation: baseFields.abbreviation,
      description: baseFields.description,
      status: StatusEnum,
      geographicScope: GeographicScopeEnum,
      teamIds: v.pipe(
        v.array(v.string()),
        v.minLength(1, 'Select at least one team')
      ),
      budget: v.optional(v.pipe(
        v.number(),
        v.minValue(0, 'Budget must be a positive number')
      )),
      priority: v.optional(PriorityEnum)
    });
  } else if (userRole === 'FIELD_SUPERVISOR') {
    // Field Supervisor schema with limited fields
    schema = v.object({
      title: baseFields.title,
      abbreviation: baseFields.abbreviation,
      description: baseFields.description,
      status: StatusEnum,
      geographicScope: v.literal('LOCAL'),
      teamIds: v.pipe(
        v.array(v.string()),
        v.minLength(1, 'Select your team')
      ),
      assignedUsers: v.optional(v.array(v.string()))
    });
  } else {
    // Other roles with basic fields only
    schema = v.object({
      title: baseFields.title,
      abbreviation: baseFields.abbreviation,
      description: baseFields.description,
      status: StatusEnum
    });
  }

  // Role-based validation rules
  return v.pipe(
    schema,
    v.check(() => ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole),
      'Only administrators can create projects'),
    v.check((data: any) => {
      if (userRole === 'FIELD_SUPERVISOR' && data.status === 'INACTIVE') {
        return false;
      }
      return true;
    }, 'Field supervisors cannot create inactive projects'),
    v.check((data: any) => {
      if (userRole === 'FIELD_SUPERVISOR' && data.geographicScope === 'NATIONAL') {
        return false;
      }
      return true;
    }, 'Field supervisors cannot create national projects')
  );
};

// User management schema with role-based field restrictions
export const createUserSchema = (creatorRole: UserRole) => {
  const baseSchema = v.object({
    name: v.pipe(
      v.string(),
      v.minLength(1, 'Name is required'),
      v.maxLength(100, 'Name must be 100 characters or less')
    ),
    email: v.pipe(
      v.string(),
      v.email('Valid email required')
    ),
    teamId: v.pipe(
      v.string(),
      v.minLength(1, 'Team assignment required')
    ),
    isActive: v.optional(v.boolean(), true)
  });

  let schema = baseSchema;

  // Role assignment based on creator permissions
  if (creatorRole === 'SYSTEM_ADMIN') {
    schema = v.object({
      name: v.pipe(
        v.string(),
        v.minLength(1, 'Name is required'),
        v.maxLength(100, 'Name must be 100 characters or less')
      ),
      email: v.pipe(
        v.string(),
        v.email('Valid email required')
      ),
      teamId: v.pipe(
        v.string(),
        v.minLength(1, 'Team assignment required')
      ),
      isActive: v.optional(v.boolean(), true),
      role: UserRoleEnum,
      stateId: v.pipe(
        v.string(),
        v.minLength(1, 'State ID is required')
      )
    }) as any;
  } else if (creatorRole === 'REGIONAL_MANAGER') {
    schema = v.object({
      name: v.pipe(
        v.string(),
        v.minLength(1, 'Name is required'),
        v.maxLength(100, 'Name must be 100 characters or less')
      ),
      email: v.pipe(
        v.string(),
        v.email('Valid email required')
      ),
      teamId: v.pipe(
        v.string(),
        v.minLength(1, 'Team assignment required')
      ),
      isActive: v.optional(v.boolean(), true),
      role: v.picklist(['TEAM_MEMBER', 'FIELD_SUPERVISOR']),
      stateId: v.pipe(
        v.string(),
        v.minLength(1, 'State ID is required')
      )
    }) as any;
  } else if (creatorRole === 'FIELD_SUPERVISOR') {
    schema = v.object({
      name: v.pipe(
        v.string(),
        v.minLength(1, 'Name is required'),
        v.maxLength(100, 'Name must be 100 characters or less')
      ),
      email: v.pipe(
        v.string(),
        v.email('Valid email required')
      ),
      teamId: v.pipe(
        v.string(),
        v.minLength(1, 'Team assignment required')
      ),
      isActive: v.optional(v.boolean(), true),
      role: v.literal('TEAM_MEMBER')
    }) as any;
  }

  return v.pipe(
    schema,
    v.check(() => ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'].includes(creatorRole),
      'Insufficient permissions to create users')
  );
};

// Device management schema
export const createDeviceSchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    deviceId: v.pipe(
      v.string(),
      v.minLength(1, 'Device ID required')
    ),
    deviceName: v.pipe(
      v.string(),
      v.minLength(1, 'Device name required')
    ),
    teamId: v.pipe(
      v.string(),
      v.minLength(1, 'Team assignment required')
    )
  });

  let schema = baseSchema;

  if (['SYSTEM_ADMIN', 'DEVICE_MANAGER'].includes(userRole)) {
    schema = v.object({
      deviceId: v.pipe(
        v.string(),
        v.minLength(1, 'Device ID required')
      ),
      deviceName: v.pipe(
        v.string(),
        v.minLength(1, 'Device name required')
      ),
      teamId: v.pipe(
        v.string(),
        v.minLength(1, 'Team assignment required')
      ),
      configuration: v.optional(v.record(v.string(), v.any())),
      assignedUserId: v.optional(v.string()),
      policyProfile: v.optional(v.string()),
      maintenanceSchedule: v.optional(v.string())
    }) as any;
  }

  return v.pipe(
    schema,
    v.check(() => ['SYSTEM_ADMIN', 'DEVICE_MANAGER', 'REGIONAL_MANAGER'].includes(userRole),
      'Only administrators and device managers can register devices')
  );
};

// Assignment schema with array validation
export const createAssignmentSchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    title: v.pipe(
      v.string(),
      v.minLength(1, 'Title is required')
    ),
    assignedUsers: v.pipe(
      v.array(v.string()),
      v.minLength(1, 'Select at least one user')
    ),
    assignedTeams: v.pipe(
      v.array(v.string()),
      v.minLength(1, 'Select at least one team')
    ),
    permissions: v.optional(v.array(v.string())),
    startDate: v.date(),
    endDate: v.pipe(
      v.date(),
      v.minValue(new Date(), 'End date must be in the future')
    )
  });

  let schema = baseSchema;

  // Only supervisors and admins can assign permissions
  if (['SYSTEM_ADMIN', 'FIELD_SUPERVISOR'].includes(userRole)) {
    schema = v.object({
      title: v.pipe(
        v.string(),
        v.minLength(1, 'Title is required')
      ),
      assignedUsers: v.pipe(
        v.array(v.string()),
        v.minLength(1, 'Select at least one user')
      ),
      assignedTeams: v.pipe(
        v.array(v.string()),
        v.minLength(1, 'Select at least one team')
      ),
      permissions: v.pipe(
        v.array(v.string()),
        v.minLength(1, 'Select at least one permission')
      )
    }) as any;
  }

  return v.pipe(
    schema,
    v.check((data) => data.endDate > data.startDate, 'End date must be after start date')
  );
};

// Audit report schema
export const createAuditReportSchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    reportType: v.picklist(['COMPLIANCE', 'SECURITY', 'PERFORMANCE']),
    scope: v.pipe(
      v.string(),
      v.minLength(1, 'Scope is required')
    ),
    dateRange: v.object({
      start: v.date(),
      end: v.date()
    }),
    includeSensitive: v.optional(v.boolean(), false)
  });

  // Only auditors and system admins can include sensitive data
  if (!['AUDITOR', 'SYSTEM_ADMIN'].includes(userRole)) {
    return v.pipe(
      baseSchema,
      v.check((data) => !data.includeSensitive, 'Only auditors can include sensitive information')
    );
  }

  return baseSchema;
};

// Policy creation schema
export const createPolicySchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    title: v.pipe(
      v.string(),
      v.minLength(1, 'Title is required')
    ),
    description: v.pipe(
      v.string(),
      v.minLength(1, 'Description is required')
    ),
    policyType: v.picklist(['ACCESS', 'SECURITY', 'WORK_HOURS', 'DEVICE']),
    scope: v.picklist(['GLOBAL', 'REGIONAL', 'TEAM']),
    rules: v.pipe(
      v.array(v.object({
        name: v.string(),
        condition: v.string(),
        action: v.string()
      })),
      v.minLength(1, 'At least one rule is required')
    )
  });

  // National scope only for system admins and national support
  if (userRole === 'POLICY_ADMIN') {
    return v.pipe(
      baseSchema,
      v.check((data) => data.scope !== 'GLOBAL', 'Policy admins cannot create global policies')
    );
  }

  return baseSchema;
};

// Support ticket schema
export const createSupportTicketSchema = (userRole: UserRole) => {
  const baseSchema = v.object({
    title: v.pipe(
      v.string(),
      v.minLength(1, 'Title is required')
    ),
    description: v.pipe(
      v.string(),
      v.minLength(1, 'Description is required')
    ),
    priority: v.picklist(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    category: v.picklist(['TECHNICAL', 'ACCOUNT', 'DEVICE', 'POLICY']),
    assignedTo: v.optional(v.string()),
    status: v.optional(v.picklist(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']), 'OPEN')
  });

  // Only support agents can assign tickets
  if (userRole !== 'SUPPORT_AGENT' && userRole !== 'SYSTEM_ADMIN') {
    return v.pipe(
      baseSchema,
      v.check((data) => !data.assignedTo, 'Only support agents can assign tickets')
    );
  }

  return baseSchema;
};

// Export all schemas for easy access
export const roleBasedSchemas = {
  project: {
    create: createProjectSchema,
  },
  user: {
    create: createUserSchema,
  },
  device: {
    create: createDeviceSchema,
  },
  assignment: {
    create: createAssignmentSchema,
  },
  audit: {
    create: createAuditReportSchema,
  },
  policy: {
    create: createPolicySchema,
  },
  support: {
    create: createSupportTicketSchema,
  }
} as const;