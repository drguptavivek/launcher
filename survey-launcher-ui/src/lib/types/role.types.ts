// Role definitions for SurveyLauncher 9-role RBAC system
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

// Role categories for UI organization
export const ROLE_CATEGORIES = {
  HYBRID: ['TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER'] as const,
  WEB_ONLY: ['SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR', 'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'] as const
} as const;

// Permission matrix for CRUD operations
export const ROLE_PERMISSIONS = {
  TEAM_MEMBER: [
    'app:login', 'app:gps', 'app:telemetry',
    'project:read_assigned', 'task:complete'
  ],
  FIELD_SUPERVISOR: [
    'app:*', 'web:dashboard', 'web:projects:read', 'web:projects:update_limited',
    'web:users:read_team', 'web:devices:monitor_team', 'supervisor:override'
  ],
  REGIONAL_MANAGER: [
    'web:*', 'projects:create', 'projects:read', 'projects:update', 'users:create_team', 'users:read_team',
    'devices:monitor', 'reports:regional'
  ],
  SYSTEM_ADMIN: [
    '*', // Full system access
  ],
  SUPPORT_AGENT: [
    'web:dashboard', 'web:projects:read', 'web:users:read', 'support:tickets', 'devices:monitor'
  ],
  AUDITOR: [
    'web:dashboard', 'audit:read', 'audit:export', 'projects:read', 'users:read', 'compliance:check'
  ],
  DEVICE_MANAGER: [
    'web:dashboard', 'devices:*', 'devices:configure', 'policies:device', 'projects:read'
  ],
  POLICY_ADMIN: [
    'web:dashboard', 'policies:create', 'policies:update', 'policies:read', 'compliance:check'
  ],
  NATIONAL_SUPPORT_ADMIN: [
    'web:*', 'reports:national', 'projects:read', 'users:read', 'policies:read', 'support:national'
  ]
} as const;

// Navigation structure by role
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
  FIELD_SUPERVISOR: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/projects', label: 'Projects', icon: 'folder' },
    { href: '/users', label: 'Team Members', icon: 'users' },
    { href: '/devices', label: 'Devices', icon: 'smartphone' },
    { href: '/supervisor', label: 'Supervisor Tools', icon: 'shield-check' }
  ],
  REGIONAL_MANAGER: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/projects', label: 'Projects', icon: 'folder' },
    { href: '/users', label: 'User Management', icon: 'users' },
    { href: '/devices', label: 'Devices', icon: 'smartphone' },
    { href: '/reports', label: 'Reports', icon: 'chart-bar' }
  ],
  SUPPORT_AGENT: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/support', label: 'Support Tickets', icon: 'help-circle' },
    { href: '/users', label: 'User Lookup', icon: 'users' },
    { href: '/devices', label: 'Device Status', icon: 'smartphone' }
  ],
  AUDITOR: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/audit', label: 'Audit Tools', icon: 'clipboard-list' },
    { href: '/projects', label: 'Project Audit', icon: 'folder' },
    { href: '/reports', label: 'Compliance Reports', icon: 'file-text' }
  ],
  DEVICE_MANAGER: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/devices', label: 'Device Management', icon: 'smartphone' },
    { href: '/policies', label: 'Device Policies', icon: 'shield' },
    { href: '/monitoring', label: 'Monitoring', icon: 'activity' }
  ],
  POLICY_ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/policies', label: 'Policy Management', icon: 'shield' },
    { href: '/compliance', label: 'Compliance', icon: 'check-circle' },
    { href: '/reports', label: 'Policy Reports', icon: 'file-text' }
  ],
  NATIONAL_SUPPORT_ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/national', label: 'National Overview', icon: 'globe' },
    { href: '/regions', label: 'Regional Reports', icon: 'map' },
    { href: '/support', label: 'National Support', icon: 'help-circle' }
  ]
} as const;

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY = {
  SYSTEM_ADMIN: 8,
  NATIONAL_SUPPORT_ADMIN: 7,
  POLICY_ADMIN: 6,
  DEVICE_MANAGER: 6,
  AUDITOR: 5,
  REGIONAL_MANAGER: 4,
  SUPPORT_AGENT: 3,
  FIELD_SUPERVISOR: 2,
  TEAM_MEMBER: 1
} as const;

// Form permissions for different operations
export const FORM_PERMISSIONS = {
  'user:create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
  'user:update': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
  'project:create': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'],
  'project:update': ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'],
  'device:configure': ['SYSTEM_ADMIN', 'DEVICE_MANAGER'],
  'audit:report': ['AUDITOR', 'SYSTEM_ADMIN'],
  'policy:create': ['POLICY_ADMIN', 'SYSTEM_ADMIN'],
  'support:ticket': ['SUPPORT_AGENT', 'SYSTEM_ADMIN']
} as const;