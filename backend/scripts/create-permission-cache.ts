#!/usr/bin/env tsx

/**
 * Create Permission Cache Table Script
 *
 * This script creates the missing permission_cache table for the MobileUserAuthService
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import { logger } from '../src/lib/logger';

async function createPermissionCacheTable() {
  try {
    console.log('🔧 Creating permission_cache table...');

    // Create the permission_cache table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS permission_cache (
        user_id UUID PRIMARY KEY,
        effective_permissions JSONB NOT NULL DEFAULT '[]',
        computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_permission_cache_expires_at
      ON permission_cache(expires_at);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_permission_cache_version
      ON permission_cache(user_id, version);
    `);

    console.log('✅ Permission cache table created successfully!');

    // Verify table exists
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'permission_cache';
    `);

    if (result.length > 0) {
      console.log('✅ Table verification successful - permission_cache table exists');
    } else {
      console.log('❌ Table verification failed - table not found');
    }

    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to create permission_cache table:', error.message);
    logger.error('Permission cache table creation failed', { error: error.message });
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  createPermissionCacheTable()
    .then(() => {
      console.log('\n🎉 Permission cache table creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Permission cache table creation failed:', error);
      process.exit(1);
    });
}

export { createPermissionCacheTable };