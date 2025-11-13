#!/usr/bin/env tsx

/**
 * Seed Database Before Running Tests
 *
 * This script seeds the database with comprehensive test data
 * before running test suites. It can be used as a pre-test hook.
 */

import { seedEnhancedTestDatabase } from '../src/lib/seed-test-enhanced';

// Configuration for different test environments
const TEST_CONFIGS = {
  'unit': {
    teamsCount: 5,
    devicesPerTeam: 10,
    usersPerTeam: 20,
    supervisorPinsPerTeam: 2,
    activeSessionsCount: 10,
    telemetryEventsCount: 100,
    policyIssuesPerDevice: 2,
    pinAttemptsCount: 50,
  },
  'integration': {
    teamsCount: 10,
    devicesPerTeam: 20,
    usersPerTeam: 50,
    supervisorPinsPerTeam: 3,
    activeSessionsCount: 25,
    telemetryEventsCount: 500,
    policyIssuesPerDevice: 3,
    pinAttemptsCount: 200,
  },
  'load': {
    teamsCount: 20,
    devicesPerTeam: 50,
    usersPerTeam: 100,
    supervisorPinsPerTeam: 5,
    activeSessionsCount: 100,
    telemetryEventsCount: 2000,
    policyIssuesPerDevice: 5,
    pinAttemptsCount: 500,
  },
  'minimal': {
    teamsCount: 2,
    devicesPerTeam: 3,
    usersPerTeam: 5,
    supervisorPinsPerTeam: 1,
    activeSessionsCount: 3,
    telemetryEventsCount: 20,
    policyIssuesPerDevice: 1,
    pinAttemptsCount: 10,
  }
};

async function main() {
  const env = process.argv[2] || 'unit';
  const config = TEST_CONFIGS[env as keyof typeof TEST_CONFIGS] || TEST_CONFIGS['unit'];

  console.log(`🌱 Seeding database for ${env} tests with config:`, JSON.stringify(config, null, 2));

  try {
    await seedEnhancedTestDatabase(config);
    console.log(`✅ Database successfully seeded for ${env} tests`);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to seed database for ${env} tests:`, error);
    process.exit(1);
  }
}

// Handle different run modes
if (import.meta.main) {
  const command = process.argv[2];

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log('Usage: tsx scripts/seed-before-tests.ts [environment]');
    console.log('Available environments:');
    console.log('  unit       - Lightweight data for unit tests (default)');
    console.log('  integration - Comprehensive data for integration tests');
    console.log('  load       - Heavy data for load testing');
    console.log('  minimal    - Minimal data for quick tests');
    console.log('');
    console.log('Examples:');
    console.log('  tsx scripts/seed-before-tests.ts unit');
    console.log('  tsx scripts/seed-before-tests.ts integration');
    console.log('  tsx scripts/seed-before-tests.ts load');
    process.exit(0);
  }

  main();
}