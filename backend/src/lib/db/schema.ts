import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  index
} from 'drizzle-orm/pg-core';

// Enums - Enhanced RBAC with 9 roles for enterprise-scale access control
export const userRoleEnum = pgEnum('user_role', [
  // Field Operations Roles
  'TEAM_MEMBER',
  'FIELD_SUPERVISOR',
  'REGIONAL_MANAGER',

  // Technical Operations Roles
  'SYSTEM_ADMIN',
  'SUPPORT_AGENT',
  'AUDITOR',

  // Specialized Roles
  'DEVICE_MANAGER',
  'POLICY_ADMIN',
  'NATIONAL_SUPPORT_ADMIN'
]);

// Permission scopes for fine-grained access control
export const permissionScopeEnum = pgEnum('permission_scope', [
  'ORGANIZATION', // Full organizational access
  'REGION',      // Multi-team regional access
  'TEAM',        // Single team access
  'USER',        // Personal access only
  'SYSTEM'       // System-level configuration access
]);

// Permission action types
export const permissionActionEnum = pgEnum('permission_action', [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LIST',
  'MANAGE',     // Full control including permissions
  'EXECUTE',    // Execute operations (e.g., overrides)
  'AUDIT'       // Read-only audit access
]);

// Resource types for permission management
export const resourceTypeEnum = pgEnum('resource_type', [
  'TEAMS',
  'USERS',
  'DEVICES',
  'SUPERVISOR_PINS',
  'TELEMETRY',
  'POLICY',
  'AUTH',
  'SYSTEM_SETTINGS',
  'AUDIT_LOGS',
  'SUPPORT_TICKETS',
  'ORGANIZATION',
  'PROJECTS' // NEW: Project resource type
]);

// Project status enumeration
export const projectStatusEnum = pgEnum('project_status', [
  'ACTIVE',
  'INACTIVE'
]);

// Project geographic scope enumeration
export const projectGeographicScopeEnum = pgEnum('project_geographic_scope', [
  'NATIONAL',
  'REGIONAL'
]);

// Teams table
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  stateId: varchar('state_id', { length: 16 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: table.name,
}));

// Devices table
export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  androidId: varchar('android_id', { length: 64 }), // Optional unique Android device ID
  appVersion: varchar('app_version', { length: 32 }), // Optional app version
  isActive: boolean('is_active').notNull().default(true),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  lastGpsAt: timestamp('last_gps_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  androidIdIdx: table.androidId,
  teamIdIdx: table.teamId,
}));

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  role: userRoleEnum('role').notNull().default('TEAM_MEMBER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userCodeIdx: table.code,
  teamIdIdx: table.teamId,
}));

// User PINs table
export const userPins = pgTable('user_pins', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  pinHash: varchar('pin_hash', { length: 255 }).notNull(), // Argon2id hash
  salt: varchar('salt', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Supervisor PINs table
export const supervisorPins = pgTable('supervisor_pins', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  pinHash: varchar('pin_hash', { length: 255 }).notNull(), // Argon2id hash
  salt: varchar('salt', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  teamIdIdx: table.teamId,
}));

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  status: varchar('status', { length: 16 }).notNull().default('open'), // open, expired, ended
  overrideUntil: timestamp('override_until', { withTimezone: true }),
  tokenJti: varchar('token_jti', { length: 64 }),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: table.userId,
  deviceIdIdx: table.deviceId,
  tokenJtiIdx: table.tokenJti,
}));

// Telemetry events table
export const telemetryEvents = pgTable('telemetry_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 32 }).notNull(), // gps, heartbeat, gate.blocked, pin.verify
  eventData: jsonb('event_data').notNull(), // JSON payload for the event
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  deviceIdIdx: table.deviceId,
  sessionIdIdx: table.sessionId,
  eventTypeIdx: table.eventType,
  timestampIdx: table.timestamp,
}));

// Policy issues table
export const policyIssues = pgTable('policy_issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 16 }).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  jwsKid: varchar('jws_kid', { length: 64 }).notNull(),
  policyData: jsonb('policy_data').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
}, (table) => ({
  deviceIdIdx: table.deviceId,
  expiresAtIdx: table.expiresAt,
}));

// JWT revocation table
export const jwtRevocations = pgTable('jwt_revocations', {
  jti: varchar('jti', { length: 64 }).primaryKey(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  reason: varchar('reason', { length: 64 }),
  revokedBy: varchar('revoked_by', { length: 255 }), // User or system that revoked the token
}, (table) => ({
  jtiIdx: table.jti,
  expiresAtIdx: table.expiresAt,
}));

// PIN validation attempts (for rate limiting and lockout)
export const pinAttempts = pgTable('pin_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  attemptType: varchar('attempt_type', { length: 16 }).notNull(), // 'user_pin', 'supervisor_pin'
  success: boolean('success').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: table.userId,
  deviceIdIdx: table.deviceId,
  attemptTypeIdx: table.attemptType,
}));

// ===== ENHANCED RBAC SYSTEM =====

// Role definitions table - stores dynamic role configurations
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false), // Predefined system roles
  isActive: boolean('is_active').notNull().default(true),
  hierarchyLevel: integer('hierarchy_level').notNull().default(0), // For role inheritance
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: table.name,
}));

// Granular permissions table
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  resource: resourceTypeEnum('resource').notNull(),
  action: permissionActionEnum('action').notNull(),
  scope: permissionScopeEnum('scope').notNull().default('TEAM'),
  description: text('description'),
  conditions: jsonb('conditions'), // Additional permission conditions (temporal, geo, etc.)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  resourceActionIdx: table.resource,
  nameIdx: table.name,
}));

// Role-permission mapping table
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => ({
  roleIdIdx: table.roleId,
  permissionIdIdx: table.permissionId,
}));

// User role assignments table - supports multiple roles per user
export const userRoleAssignments = pgTable('user_role_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull(), // For multi-tenant support
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  regionId: varchar('region_id', { length: 32 }), // Geographic/organizational region
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // Temporary role assignments
  isActive: boolean('is_active').notNull().default(true),
  context: jsonb('context'), // Additional context for the role assignment
}, (table) => ({
  userIdIdx: table.userId,
  roleIdIdx: table.roleId,
  teamIdIdx: table.teamId,
  organizationIdIdx: table.organizationId,
}));

// Permission cache table for performance optimization
export const permissionCache = pgTable('permission_cache', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  effectivePermissions: jsonb('effective_permissions').notNull(), // Cached resolved permissions
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  version: integer('version').notNull().default(1), // Cache invalidation version
}, (table) => ({
  userIdIdx: table.userId,
  expiresAtIdx: table.expiresAt,
}));

// Projects table - Core project management
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 50 }).notNull().unique(),
  contactPersonDetails: text('contact_person_details'),
  status: projectStatusEnum('status').notNull().default('ACTIVE'),
  geographicScope: projectGeographicScopeEnum('geographic_scope').notNull().default('NATIONAL'),
  regionId: uuid('region_id').references(() => teams.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').notNull().default('org-default'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }) // Soft delete support
}, (t) => ({
  abbreviationIdx: index('idx_project_abbreviation').on(t.abbreviation),
  statusIdx: index('idx_project_status').on(t.status),
  organizationIdx: index('idx_project_organization').on(t.organizationId),
  createdByIdx: index('idx_project_created_by').on(t.createdBy)
}));

// Individual user project assignments
export const projectAssignments = pgTable('project_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').notNull().references(() => users.id),
  roleInProject: varchar('role_in_project', { length: 100 }), // e.g., 'Project Lead', 'Field Coordinator'
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  assignedUntil: timestamp('assigned_until', { withTimezone: true }) // Temporary assignments
}, (t) => ({
  projectUserIdx: index('idx_project_assignment_unique').on(t.projectId, t.userId),
  projectIdx: index('idx_project_assignment_project').on(t.projectId),
  userIdx: index('idx_project_assignment_user').on(t.userId),
  activeIdx: index('idx_project_assignment_active').on(t.isActive)
}));

// Team-based project assignments (all team members get project access)
export const projectTeamAssignments = pgTable('project_team_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').notNull().references(() => users.id),
  assignedRole: varchar('assigned_role', { length: 100 }), // e.g., 'Implementation Team', 'Support Team'
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  assignedUntil: timestamp('assigned_until', { withTimezone: true })
}, (t) => ({
  projectTeamIdx: index('idx_project_team_assignment_unique').on(t.projectId, t.teamId),
  projectIdx: index('idx_project_team_assignment_project').on(t.projectId),
  teamIdx: index('idx_project_team_assignment_team').on(t.teamId),
  activeIdx: index('idx_project_team_assignment_active').on(t.isActive)
}));

// Export types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserPin = typeof userPins.$inferSelect;
export type NewUserPin = typeof userPins.$inferInsert;

export type SupervisorPin = typeof supervisorPins.$inferSelect;
export type NewSupervisorPin = typeof supervisorPins.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type TelemetryEvent = typeof telemetryEvents.$inferSelect;
export type NewTelemetryEvent = typeof telemetryEvents.$inferInsert;

export type PolicyIssue = typeof policyIssues.$inferSelect;
export type NewPolicyIssue = typeof policyIssues.$inferInsert;

export type JwtRevocation = typeof jwtRevocations.$inferSelect;
export type NewJwtRevocation = typeof jwtRevocations.$inferInsert;

export type PinAttempt = typeof pinAttempts.$inferSelect;
export type NewPinAttempt = typeof pinAttempts.$inferInsert;

// RBAC System Types
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type NewUserRoleAssignment = typeof userRoleAssignments.$inferInsert;

export type PermissionCache = typeof permissionCache.$inferSelect;
export type NewPermissionCache = typeof permissionCache.$inferInsert;

// Project Types
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type NewProjectAssignment = typeof projectAssignments.$inferInsert;

export type ProjectTeamAssignment = typeof projectTeamAssignments.$inferSelect;
export type NewProjectTeamAssignment = typeof projectTeamAssignments.$inferInsert;