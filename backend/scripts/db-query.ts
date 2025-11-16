#!/usr/bin/env tsx

/**
 * Database Query Script
 *
 * A utility script to run SQL queries against the database.
 * Usage: npm run db:query <query-file-or-inline-query>
 * Examples:
 *   npm run db:query "SELECT COUNT(*) FROM users"
 *   npm run db:query scripts/queries/check-permissions.sql
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import { logger } from '../src/lib/logger';

// Get query from command line arguments
const queryInput = process.argv[2];

if (!queryInput) {
  console.error('❌ Error: Please provide a query');
  console.log('\nUsage:');
  console.log('  npm run db:query "SELECT COUNT(*) FROM users"');
  console.log('  npm run db:query scripts/queries/check-permissions.sql');
  process.exit(1);
}

async function runQuery(query: string) {
  try {
    console.log('🔍 Executing query:');
    console.log(query);
    console.log('─'.repeat(80));

    const result = await db.execute(sql.raw(query));

    console.log('✅ Query executed successfully');
    console.log('─'.repeat(80));

    // Display results - handle different Drizzle result formats
    console.log('\n📊 Query Results:');
    console.log('Raw result type:', typeof result);
    console.log('Is array:', Array.isArray(result));
    console.log('Result length:', Array.isArray(result) ? result.length : 'N/A');

    if (Array.isArray(result)) {
      if (result.length > 0) {
        const columns = Object.keys(result[0]);
        console.log('\n📋 Columns:', columns.join(', '));
        console.log('─'.repeat(Math.max(50, columns.join(', ').length)));

        result.forEach((row, index) => {
          console.log(`Row ${index + 1}:`, row);
        });
        console.log('\n📈 Total rows:', result.length);
      } else {
        console.log('📊 Empty result array returned');
      }
    } else if (result && typeof result === 'object') {
      console.log('📊 Single object result:', result);
    } else {
      console.log('📊 Result:', result);
    }

  } catch (error: any) {
    console.error('❌ Query failed:');
    console.error(error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }
}

// Check if input is a file path or inline query
async function main() {
  try {
    let query: string;

    if (queryInput.includes(' ') || queryInput.includes(';')) {
      // Likely an inline query
      query = queryInput;
    } else {
      // Try to read as a file
      try {
        const fs = await import('fs/promises');
        query = await fs.readFile(queryInput, 'utf-8');
        console.log(`📁 Read query from file: ${queryInput}`);
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          // File doesn't exist, treat as inline query
          query = queryInput;
        } else {
          throw fileError;
        }
      }
    }

    // Clean up the query
    query = query.trim();
    if (!query.endsWith(';')) {
      query += ';';
    }

    await runQuery(query);

  } catch (error: any) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  }
}

main();