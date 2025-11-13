import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { env } from '../config';

// Create database instance
const sqlite = new Database(env.DATABASE_URL.replace('sqlite:', ''));

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Configure WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Create the drizzle instance
export const db = drizzle(sqlite, { schema });

// Export the database instance for migrations
export { sqlite };

// Export schema types and helpers
export * from './schema';
export { schema };