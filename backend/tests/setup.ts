import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://laucnher_db_user:ieru7Eikfaef1Liueo9ix4Gi@127.0.0.1:5434/launcher';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-long';
process.env.POLICY_SIGN_PRIVATE_BASE64 = '4KY3pJ2+f4iL9qFGmMZT1WdgQnNKlQXBQpPx46N+Q3k=';

// Test database setup
let testDb: ReturnType<typeof postgres>;
let testDbInstance: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Connect to test database
  testDb = postgres(process.env.DATABASE_URL!);
  testDbInstance = drizzle(testDb, { schema });
});

afterAll(async () => {
  // Clean up test database connection
  await testDb.end();
});

// Export test database for use in tests
export { testDbInstance as testDb };

beforeEach(async () => {
  // Reset database state before each test if needed
});

afterEach(async () => {
  // Clean up after each test if needed
});