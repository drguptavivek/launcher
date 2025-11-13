import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '../src/lib/db/schema';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { seedDatabase } from '../src/lib/seed';

// Test database setup
let testDb: Database;
let testDbInstance: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Create in-memory test database
  testDb = new Database(':memory:');
  testDbInstance = drizzle(testDb, { schema });

  // Run migrations (you might need to generate them first)
  // await migrate(testDbInstance, { migrationsFolder: './drizzle' });

  // Seed test data
  await seedDatabase();
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