import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/lib/db/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '../src/lib/config';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-long';
process.env.POLICY_SIGN_PRIVATE_BASE64 = '4KY3pJ2+f4iL9qFGmMZT1WdgQnNKlQXBQpPx46N+Q3k=';

// Test database setup
let testDb: Database.Database;
let testDbInstance: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Create in-memory test database
  testDb = new Database(':memory:');
  testDbInstance = drizzle(testDb, { schema });

  // Create tables manually for now (since we don't have migration files)
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_seen_at INTEGER,
      last_gps_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      team_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS user_pins (
      user_id TEXT PRIMARY KEY,
      pin_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      override_until INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );
  `);
});

afterAll(async () => {
  // Clean up test database
  testDb.close();
});

beforeEach(async () => {
  // Reset database state before each test if needed
});

afterEach(async () => {
  // Clean up after each test if needed
});

export { testDb, testDbInstance };