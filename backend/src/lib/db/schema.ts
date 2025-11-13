import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  pgEnum
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['TEAM_MEMBER', 'SUPERVISOR', 'ADMIN']);

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