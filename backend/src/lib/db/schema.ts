import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Teams table
export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Devices table
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
  lastGpsAt: integer('last_gps_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// User PINs table (for server-verified PIN mode)
export const userPins = sqliteTable('user_pins', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  pinHash: text('pin_hash').notNull(),
  salt: text('salt').notNull(),
  retryCount: integer('retry_count').notNull().default(0),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Supervisor PINs table
export const supervisorPins = sqliteTable('supervisor_pins', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pinHash: text('pin_hash').notNull(),
  salt: text('salt').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  overrideUntil: integer('override_until', { mode: 'timestamp' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Telemetry events table
export const telemetryEvents = sqliteTable('telemetry_events', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'heartbeat', 'gps', 'app_usage', etc.
  eventData: text('event_data'), // JSON string with event-specific data
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  receivedAt: integer('received_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Policy issues table (tracks when policies are delivered to devices)
export const policyIssues = sqliteTable('policy_issues', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  policyVersion: integer('policy_version').notNull(),
  jws: text('jws').notNull(), // The signed policy
  issuedAt: integer('issued_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// JWT revocation list
export const jwtRevocation = sqliteTable('jwt_revocation', {
  id: text('id').primaryKey(),
  jti: text('jti').notNull().unique(), // JWT ID
  revokedAt: integer('revoked_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  reason: text('reason'), // Optional reason for revocation
  revokedBy: text('revoked_by'), // User or system that revoked the token
});

// PIN validation attempts (for rate limiting and lockout)
export const pinAttempts = sqliteTable('pin_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  attemptType: text('attempt_type').notNull(), // 'user_pin', 'supervisor_pin'
  success: integer('success', { mode: 'boolean' }).notNull(),
  ipAddress: text('ip_address'),
  attemptedAt: integer('attempted_at', { mode: 'timestamp' }).notNull(),
});

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

export type JwtRevocation = typeof jwtRevocation.$inferSelect;
export type NewJwtRevocation = typeof jwtRevocation.$inferInsert;

export type PinAttempt = typeof pinAttempts.$inferSelect;
export type NewPinAttempt = typeof pinAttempts.$inferInsert;