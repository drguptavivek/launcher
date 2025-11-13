# Database Seeding for Testing

**Production-Ready Database Seeding System for Android MDM Testing**
Last Updated: November 13, 2025

## Overview

The SurveyLauncher backend includes a comprehensive database seeding system that generates realistic test data for Android MDM functionality:

- **Enhanced Seeding**: Large volumes of realistic data using Faker.js v10.1.0
- **Configurable**: Different data volumes for unit, integration, and load testing
- **Realistic Simulation**: Indian geographic data, Android device simulation
- **Foreign Key Safe**: Proper relationship handling to prevent constraint violations
- **Production Ready**: Scalable test data generation for any test environment

## Recent Major Updates

### ✅ **November 13, 2025 - Production Release**

- **Fixed Faker.js Compatibility**: Updated all deprecated `faker.datatype` methods to `faker.number.int`
- **Foreign Key Resolution**: Fixed constraint violations in `pin_attempts` table
- **Enhanced Error Handling**: Graceful policy signer initialization for testing environments
- **Realistic Indian Data**: Added authentic GPS coordinates and state codes
- **Documentation**: Comprehensive seeding guide with troubleshooting section

## Available Scripts

### 1. Enhanced Test Seeding (Recommended)
`npm run db:seed-test`

Creates comprehensive test data with:
- 10 teams with Indian state identification
- 200 Android devices (20 per team)
- 500 users (50 per team) with realistic Indian names
- 25 active user sessions
- 500 telemetry events (GPS, heartbeat, app usage)
- 30 supervisor PINs
- 200 PIN attempts for security testing

**Use Case**: Unit testing, integration testing, development environment

### 3. Heavy Load Seed Script
`npm run db:seed-test-heavy`

Creates large volume data:
- 20 teams
- 50 devices per team (1000 total)
- 100 users per team (2000 total)
- 1000 telemetry events
- 100 active sessions
- 5 policy issues per device
- 500 PIN attempts

**Use Case**: Load testing, performance testing

### 4. Pre-Test Seeding Utility
`tsx scripts/seed-before-tests.ts [environment]`

Automated seeding utility with predefined configurations:

#### Environments:

- **unit** (default): Lightweight data for unit tests
  - 5 teams, 10 devices/team, 20 users/team
  - 100 telemetry events, 10 sessions

- **integration**: Comprehensive data for integration tests
  - 10 teams, 20 devices/team, 50 users/team
  - 500 telemetry events, 25 sessions

- **load**: Heavy data for load testing
  - 20 teams, 50 devices/team, 100 users/team
  - 2000 telemetry events, 100 sessions

- **minimal**: Minimal data for quick tests
  - 2 teams, 3 devices/team, 5 users/team
  - 20 telemetry events, 3 sessions

**Usage Examples**:
```bash
# Unit test data (default)
tsx scripts/seed-before-tests.ts unit

# Integration test data
tsx scripts/seed-before-tests.ts integration

# Load test data
tsx scripts/seed-before-tests.ts load

# Minimal test data
tsx scripts/seed-before-tests.ts minimal
```

## Custom Configuration

You can customize the data volume using JSON configuration:

```bash
# Custom configuration example
tsx src/lib/seed-test-enhanced.ts seed '{
  "teamsCount": 15,
  "usersPerTeam": 75,
  "devicesPerTeam": 25,
  "telemetryEventsCount": 1500
}'
```

### Configuration Options

```typescript
interface SeedConfig {
  teamsCount: number;           // Number of teams to create
  devicesPerTeam: number;       // Devices per team
  usersPerTeam: number;         // Users per team
  supervisorPinsPerTeam: number; // Supervisor PINs per team
  activeSessionsCount: number;  // Active sessions
  telemetryEventsCount: number; // Telemetry events total
  policyIssuesPerDevice: number;// Policy issues per device
  pinAttemptsCount: number;    // PIN attempts total
}
```

## Data Generated

### Teams
- Realistic company names + "Survey Team"
- Indian state IDs
- Indian timezones
- Randomly marked as active/inactive

### Devices
- Real Android manufacturer models
- App versions
- Android IDs
- Activity status
- Last seen timestamps

### Users
- Real Indian names
- Unique employee codes
- Email addresses
- Roles (TEAM_MEMBER, SUPERVISOR, ADMIN)
- Secure PINs (6-digit) with Argon2 hashing

### Supervisor PINs
- Role-based names (Lead, Manager, Supervisor, etc.)
- 6-digit PINs
- Active/inactive status

### Telemetry Events
- Heartbeat events with battery, signal strength
- GPS events with realistic Indian locations
- App usage events with durations
- Battery events with charging status
- Error events with realistic error messages
- Network events with connection details
- Screen time events

### Policy Issues
- Multiple versions per device
- Realistic policy configurations
- Session time windows
- GPS requirements
- Security restrictions
- App whitelists/blacklists

### Sessions
- Different statuses (open, expired, ended)
- Supervisor overrides
- Token JTI tracking
- Activity timestamps

### PIN Attempts
- Success/failure tracking
- Rate limiting data
- IP address tracking
- User and device correlation

## Sample Login Credentials

After running the enhanced seed script, you'll have numerous test users:

```
Sample User Credentials:
  1. emp1000 / [PIN] - [User Name] (TEAM_MEMBER)
  2. emp1001 / [PIN] - [User Name] (SUPERVISOR)
  3. emp1002 / [PIN] - [User Name] (ADMIN)
  ...

Supervisor Override PINs:
  1. [11] - [Supervisor Name]
  2. [22] - [Supervisor Name]
  3. [33] - [Supervisor Name]
  ...
```

## Cleaning Database

To clear all test data:
```bash
npm run db:clean
```

## Integration with Test Runners

### Vitest Setup

Add to `vitest.config.ts` or test setup:

```typescript
// Before all tests
import { exec } from 'child_process';

async function setupTestDatabase() {
  return new Promise((resolve, reject) => {
    exec('tsx scripts/seed-before-tests.ts unit', (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
}

// Run before all test suites
beforeAll(async () => {
  await setupTestDatabase();
}, 30000); // 30 second timeout
```

### Jest Setup

Add to `jest.config.js` or test setup:

```javascript
const { exec } = require('child_process');

// Global setup
exports.globalSetup = async () => {
  await new Promise((resolve, reject) => {
    exec('tsx scripts/seed-before-tests.ts integration', (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};
```

## Performance Considerations

- **Unit Tests**: Use `minimal` environment for fastest execution
- **Integration Tests**: Use `unit` or `integration` environment
- **Load Testing**: Use `load` environment with high volumes
- **CI/CD**: Use appropriate environment based on test type

## Troubleshooting

### Connection Issues
- Ensure Docker PostgreSQL container is running
- Verify DATABASE_URL environment variable
- Check database credentials

### Memory Issues
- Reduce data volume for memory-constrained environments
- Use `minimal` configuration
- Consider running with increased memory limits

### Timeout Issues
- Increase timeout values in test runners
- Use smaller data volumes
- Ensure adequate system resources

## Best Practices

1. **Isolate Test Data**: Always clean and reseed before test runs
2. **Use Appropriate Volumes**: Match data volume to test requirements
3. **Document Test Data**: Record which credentials work for each test
4. **Version Control**: Don't commit actual PINs or sensitive data
5. **CI/CD Integration**: Configure automated seeding in pipelines

## Examples

### Seed for Unit Tests
```bash
# Clean and seed minimal data
npm run db:clean
tsx scripts/seed-before-tests.ts minimal

# Run tests
npm test
```

### Seed for Integration Tests
```bash
# Clean and seed comprehensive data
npm run db:clean
tsx scripts/seed-before-tests.ts integration

# Run integration tests
npm run test:api
```

### Custom Configuration
```bash
# Seed with custom configuration
tsx src/lib/seed-test-enhanced.ts seed '{
  "teamsCount": 5,
  "usersPerTeam": 15,
  "devicesPerTeam": 8,
  "telemetryEventsCount": 200
}'
```

This comprehensive seeding system provides realistic test data for all testing scenarios while remaining configurable and performant.