import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '../config';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

// Create the drizzle instance
export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === 'development'
});

// Export the pool for direct PostgreSQL access if needed
export { pool };

// Export schema types and helpers
export * from './schema';
export { schema };