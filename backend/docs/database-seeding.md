# Database Seeding for Testing

**Enterprise-Grade Database Seeding System with 9-Role RBAC for Android MDM Testing**
Last Updated: November 14, 2025

## Overview

The SurveyLauncher backend includes a comprehensive database seeding system that generates realistic test data for Android MDM functionality with enterprise-grade role-based access control:

- **Enhanced RBAC Seeding**: Full 9-role system with granular permissions
- **Configurable**: Different data volumes for unit, integration, and load testing
- **Realistic Simulation**: Indian organizational structure, geographic data, Android device simulation
- **Foreign Key Safe**: Proper relationship handling to prevent constraint violations
- **Multi-Tenant Support**: Organization and team scoped role assignments
- **Production Ready**: Scalable test data generation for any test environment

## 🎯 NEW: 9-Role RBAC System

The seeding system now supports the complete enterprise-grade RBAC implementation:

### Field Operations Roles
- **TEAM_MEMBER**: Frontline survey operators
- **FIELD_SUPERVISOR**: On-site supervisors managing field operations
- **REGIONAL_MANAGER**: Multi-team regional oversight

### Technical Operations Roles
- **SYSTEM_ADMIN**: Full system configuration and maintenance
- **SUPPORT_AGENT**: User support and troubleshooting
- **AUDITOR**: Read-only audit access and compliance monitoring

### Specialized Roles
- **DEVICE_MANAGER**: Android device lifecycle management
- **POLICY_ADMIN**: Policy creation and management
- **NATIONAL_SUPPORT_ADMIN**: Cross-team operational access (no system settings)

## 🏢 Realistic Organizational Structure

The seeding system now creates authentic healthcare survey teams based on Indian institutions:

### Primary Test Organization
- **AIIMS Delhi Survey Team** (DL07)
- Realistic employee codes and role distribution
- Geographic-specific data for accurate testing

## Recent Major Updates

### ✅ **November 14, 2025 - RBAC Integration Release**

- **9-Role RBAC System**: Complete migration from 3-role to enterprise 9-role system
- **Realistic Organizational Structure**: AIIMS Delhi based test organization
- **Enhanced Role Distribution**: Proper mapping of field, technical, and specialized roles
- **Fixed User Seeding**: Deterministic credentials for all 9 roles in testing
- **Cross-Team Access Support**: NATIONAL_SUPPORT_ADMIN cross-team functionality
- **System Settings Protection**: RBAC-aware access control for sensitive operations

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
- **9 Enterprise Roles**: TEAM_MEMBER, FIELD_SUPERVISOR, REGIONAL_MANAGER, SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR, DEVICE_MANAGER, POLICY_ADMIN, NATIONAL_SUPPORT_ADMIN
- Secure PINs (6-digit) with Argon2 hashing
- Role-based team assignments for realistic organizational hierarchy

### Supervisor PINs
- **Role-specific override PINs**: Field Supervisor, Regional Manager, System Admin
- 6-digit PINs with hierarchical access levels
- Active/inactive status
- Organization-scoped assignment

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

After running the fixed seeding script, you'll have deterministic test users for all 9 roles:

### Fixed User Credentials (for Unit Testing)

```
👤 Field Operations Roles:
  test001 / 123456 (TEAM_MEMBER) - Test Team Member
  test002 / 654321 (FIELD_SUPERVISOR) - Test Field Supervisor
  test003 / 789012 (REGIONAL_MANAGER) - Test Regional Manager

🔧 Technical Operations Roles:
  test004 / admin123 (SYSTEM_ADMIN) - Test System Admin
  test005 / support456 (SUPPORT_AGENT) - Test Support Agent
  test006 / audit789 (AUDITOR) - Test Auditor

⚙️ Specialized Roles:
  test007 / device012 (DEVICE_MANAGER) - Test Device Manager
  test008 / policy345 (POLICY_ADMIN) - Test Policy Admin
  test009 / national678 (NATIONAL_SUPPORT_ADMIN) - Test National Support Admin

🔐 Supervisor Override PINs:
  111111 - Field Supervisor Override PIN
  222222 - Regional Manager Override PIN
  333333 - System Administrator Override PIN

📱 Test Device:
  550e8400-e29b-41d4-a716-446655440001 - Test Device 001

🏢 Test Organization:
  550e8400-e29b-41d4-a716-446655440002 - AIIMS Delhi Survey Team (DL07)
```

### Enhanced Seeding Users

For larger test datasets, the enhanced seeding creates realistic users:

```
Enhanced User Credentials:
  1. emp1000 / [PIN] - [Indian Name] (TEAM_MEMBER)
  2. emp1001 / [PIN] - [Indian Name] (FIELD_SUPERVISOR)
  3. emp1002 / [PIN] - [Indian Name] (REGIONAL_MANAGER)
  4. emp1003 / [PIN] - [Indian Name] (SYSTEM_ADMIN)
  ... (and so on for all 9 roles)

Supervisor Override PINs:
  Multiple role-specific PINs for different organizational levels
```

## Cleaning Database

To clear all test data:
```bash
npm run db:clean
```

## 🎯 Fixed Test Credentials (Complete Reference)

### Quick Reference for All Tests

```bash
# Seed fixed users with all 9 roles
npm run db:seed-fixed

# Fixed credentials that work every time
# Use these for unit tests, integration tests, and API testing
```

### 👤 Field Operations Roles

| User Code | PIN | Role | Display Name | User ID |
|-----------|-----|------|--------------|---------|
| test001 | 123456 | TEAM_MEMBER | Test Team Member | 550e8400-e29b-41d4-a716-446655440003 |
| test002 | 654321 | FIELD_SUPERVISOR | Test Field Supervisor | 550e8400-e29b-41d4-a716-446655440004 |
| test003 | 789012 | REGIONAL_MANAGER | Test Regional Manager | 550e8400-e29b-41d4-a716-446655440005 |

### 🔧 Technical Operations Roles

| User Code | PIN | Role | Display Name | User ID |
|-----------|-----|------|--------------|---------|
| test004 | admin123 | SYSTEM_ADMIN | Test System Admin | 550e8400-e29b-41d4-a716-446655440006 |
| test005 | support456 | SUPPORT_AGENT | Test Support Agent | 550e8400-e29b-41d4-a716-446655440007 |
| test006 | audit789 | AUDITOR | Test Auditor | 550e8400-e29b-41d4-a716-446655440008 |

### ⚙️ Specialized Roles

| User Code | PIN | Role | Display Name | User ID |
|-----------|-----|------|--------------|---------|
| test007 | device012 | DEVICE_MANAGER | Test Device Manager | 550e8400-e29b-41d4-a716-446655440009 |
| test008 | policy345 | POLICY_ADMIN | Test Policy Admin | 550e8400-e29b-41d4-a716-446655440010 |
| test009 | national678 | NATIONAL_SUPPORT_ADMIN | Test National Support Admin | 550e8400-e29b-41d4-a716-446655440011 |

### 🔐 Supervisor Override PINs

| PIN | Name | PIN ID | Team Context |
|-----|------|--------|--------------|
| 111111 | Field Supervisor Override PIN | 550e8400-e29b-41d4-a716-446655440006 | AIIMS Delhi Survey Team |
| 222222 | Regional Manager Override PIN | 550e8400-e29b-41d4-a716-446655440007 | AIIMS Delhi Survey Team |
| 333333 | System Administrator Override PIN | 550e8400-e29b-41d4-a716-446655440008 | AIIMS Delhi Survey Team |

### 📱 Device & Team Information

| Type | ID | Name | Context |
|------|----|------|---------|
| Device | 550e8400-e29b-41d4-a716-446655440001 | Test Device 001 | Android test device |
| Team | 550e8400-e29b-41d4-a716-446655440002 | AIIMS Delhi Survey Team | DL07, Asia/Kolkata |

### 🚀 Usage Examples

```bash
# Test login with different roles
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "550e8400-e29b-41d4-a716-446655440001",
    "team_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_code": "test001",
    "pin": "123456"
  }'

# Test supervisor override
curl -X POST http://localhost:3000/api/v1/supervisor/override/login \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "550e8400-e29b-41d4-a716-446655440001",
    "team_id": "550e8400-e29b-41d4-a716-446655440002",
    "pin": "111111",
    "reason": "Field emergency access"
  }'
```

## 🎯 RBAC Testing Scenarios

The seeding system supports comprehensive RBAC testing scenarios:

### Role-Based Access Testing
```bash
# Seed all 9 roles for permission testing
npm run db:seed-fixed

# Test role-specific access patterns
# - Field Supervisor can manage team devices
# - Regional Manager can access multiple teams
# - National Support Admin has cross-team operational access
# - System Admin has full system configuration access
# - Auditor has read-only audit log access
```

### Cross-Team Boundary Testing
```bash
# NATIONAL_SUPPORT_ADMIN cross-team access validation
# - Can access telemetry across all teams
# - Cannot access system settings
# - Respects organizational boundaries for sensitive operations
```

### Permission Inheritance Testing
```bash
# Test role hierarchy and permission inheritance
# - Regional Manager inherits Field Supervisor permissions
# - System Admin has all technical permissions
# - Policy Admin can manage policies but not system settings
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


  🏢 NEW: 9-Role RBAC Fixed Seeding
  - All 9 enterprise roles with deterministic credentials
  - Realistic AIIMS Delhi organizational structure
  - Cross-team access support for NATIONAL_SUPPORT_ADMIN
  - Role-specific supervisor override PINs
  - Permission-aware test scenarios

  4. Improved Test Reliability ✅

  - ✅ Deterministic testing - Same credentials every time
  - ✅ Idempotent seeding - Can run multiple times without conflicts
  - ✅ Clean test isolation - Fixed data persists between test runs
  - ✅ Easy credential access - Helper constants and utilities

  Key Infrastructure Improvements:

  
This comprehensive seeding system provides realistic test data for all testing scenarios while remaining configurable and performant.