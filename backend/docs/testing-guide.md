# SurveyLauncher Backend Testing Guide

**Comprehensive Guide to Testing the SurveyLauncher Backend System**
Last Updated: January 14, 2025

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Environment Setup](#environment-setup)
3. [Testing Architecture](#testing-architecture)
4. [Running Tests](#running-tests)
5. [Test Development](#test-development)
6. [Database Testing Strategy](#database-testing-strategy)
7. [Mocking Strategy](#mocking-strategy)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Testing Philosophy

The SurveyLauncher backend follows a comprehensive testing strategy that prioritizes:

### 🎯 **Testing Priorities**

1. **Security First**: All authentication and authorization flows must be thoroughly tested
2. **Real Database Usage**: Tests use actual PostgreSQL for authentic validation
3. **Critical Path Coverage**: Core MDM workflows (login → policy → telemetry) have complete coverage
4. **Performance Awareness**: Tests should execute efficiently and scale appropriately

### 📊 **Current Testing Status**

- **Unit Tests**: 44/44 passing (100% ✅)
- **Coverage**: 74.04% overall coverage
- **Critical Security Functions**: 95%+ coverage
- **Performance**: All tests execute in <3 seconds

---

## Environment Setup

### Prerequisites

Ensure your development environment is properly configured:

```bash
# Install dependencies
npm install

# PostgreSQL Database Setup (Required for Tests)
# Option 1: Docker-based PostgreSQL (Recommended)
docker run --name pg_android_launcher \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=surveylauncher \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -v pg_android_launcher_data:/var/lib/postgresql/data \
  -d postgres:15

# Verify database is ready
docker exec pg_android_launcher pg_isready -U postgres

# Option 2: Local PostgreSQL
# Ensure database 'surveylauncher' exists with user 'postgres'
```

### Environment Configuration

Create `.env.test` file:

```env
NODE_ENV=test
DATABASE_URL=postgres://postgres:password@localhost:5432/surveylauncher
JWT_ACCESS_SECRET=test-access-secret-key-32-chars
JWT_REFRESH_SECRET=test-refresh-secret-key-32-chars
POLICY_SIGN_PRIVATE_BASE64=dGVzdC1wcml2YXRlLWVkMjU1MTlrZXkzMmJ5dGVzYW5kYmFzZTY0
POLICY_SIGN_PUBLIC_BASE64=dGVzdC1wdWJsaWMtZWQyNTUxOWtleTMyYnl0ZXNhbmRiYXNlNjQ=
```

### Database Initialization

```bash
# Run database migrations (creates tables and indexes)
npm run db:migrate

# Seed test data (optional - tests create their own data)
npm run db:seed
```

---

## Testing Architecture

### Test Structure

```
tests/
├── unit/                          # Individual function/service tests
│   ├── crypto.test.ts            # Cryptographic functions
│   └── auth-service.test.ts      # Authentication service logic
├── integration/                   # Full API endpoint tests
│   ├── auth.test.ts              # Authentication workflows
│   ├── teams.test.ts             # Team management API
│   ├── users.test.ts             # User management API
│   ├── devices.test.ts           # Device management API
│   ├── supervisor-pins.test.ts    # Supervisor PIN management
│   ├── user-logout.test.ts       # User logout scenarios
│   ├── supervisor-override.test.ts # Supervisor override workflows
│   ├── security-rate-limiting.test.ts # Rate limiting security
│   └── api.test.ts               # General API functionality
└── e2e/                          # End-to-end workflow tests (planned)
    └── android-app-flow.test.ts   # Complete Android app integration
```

### Test Categories

| Category | Purpose | Tools | Coverage Target |
|----------|---------|-------|----------------|
| **Unit Tests** | Individual function/service validation | Vitest | 90%+ |
| **Integration Tests** | API endpoint and workflow testing | Vitest + Supertest | 85%+ |
| **Security Tests** | Authentication and authorization validation | Custom test harness | 100% |
| **Performance Tests** | Load and response time testing | Artillery (planned) | Baseline |

---

## Running Tests

### Quick Start Commands

```bash
# Run all unit tests (100% success rate)
npx vitest run tests/unit/ --reporter=verbose

# Run all integration tests
npm run test:integration

# Run complete test suite
npm run test

# Run tests with coverage
npx vitest run tests/unit/ --coverage

# Run tests in watch mode (development)
npx vitest tests/unit/ --watch
```

### Specific Test Categories

#### Unit Tests (2.7 seconds execution)

```bash
# All unit tests (44 tests - 100% pass rate)
npx vitest run tests/unit/ --reporter=verbose

# Crypto utilities only (19 tests)
npx vitest run tests/unit/crypto.test.ts --reporter=verbose

# Authentication service only (25 tests)
npx vitest run tests/unit/auth-service.test.ts --reporter=verbose

# Quick development check
npx vitest run tests/unit/ --reporter=dot
```

#### Integration Tests

```bash
# All integration tests
npm run test:integration

# Authentication workflows
npx vitest run tests/integration/auth.test.ts

# Team management API
npx vitest run tests/integration/teams.test.ts

# User management API
npx vitest run tests/integration/users.test.ts

# Device management API
npx vitest run tests/integration/devices.test.ts

# Security rate limiting
npx vitest run tests/integration/security-rate-limiting.test.ts
```

### Coverage Reports

```bash
# Generate HTML coverage report (interactive)
npx vitest run tests/unit/ --coverage --reporter=html

# Generate coverage with thresholds
npx vitest run tests/unit/ --coverage --threshold.lines=80 --threshold.functions=90

# View coverage in browser
open coverage/index.html
```

### Coverage Analysis (Current Status)

| File | % Statements | % Branches | % Functions | % Lines |
|------|-------------|-----------|-------------|---------|
| **All files** | **74.04%** | **69.07%** | **71.66%** | **74.82%** |
| `services/auth-service.ts` | 82.88% | 88.63% | 100.00% | 82.88% |
| `lib/crypto.ts` | 73.01% | 57.44% | 88.46% | 75.00% |
| `lib/db/index.ts` | 100.00% | 50.00% | 100.00% | 100.00% |
| `lib/db/schema.ts` | 62.50% | 100.00% | 42.85% | 62.50% |

---

## Test Development

### Writing Unit Tests

#### Structure Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceToTest } from '../../src/services/service-to-test';
import { db } from '../../src/lib/db';

// Mock external dependencies
vi.mock('../../src/services/external-service', () => ({
  ExternalService: {
    method: vi.fn().mockResolvedValue(expectedResult),
  },
}));

describe('ServiceToTest', () => {
  let testData: any;

  beforeEach(async () => {
    // Setup test data
    testData = await createTestData();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testData);
    vi.clearAllMocks();
  });

  describe('methodBeingTested', () => {
    it('should handle happy path', async () => {
      // Arrange
      const input = createValidInput();

      // Act
      const result = await ServiceToTest.methodBeingTested(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle error cases', async () => {
      // Arrange
      const input = createInvalidInput();

      // Act & Assert
      await expect(
        ServiceToTest.methodBeingTested(input)
      ).rejects.toThrow('Expected error');
    });
  });
});
```

#### Real Database Pattern

```typescript
describe('Database-Dependent Service', () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    // Generate test UUIDs
    teamId = uuidv4();
    userId = uuidv4();

    // Create test data in real database
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'MH01',
      isActive: true,
    });

    await db.insert(users).values({
      id: userId,
      teamId,
      code: 'test001',
      displayName: 'Test User',
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up in correct order (respect foreign keys)
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(teams).where(eq(teams.id, teamId));
  });
});
```

### Writing Integration Tests

#### API Endpoint Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('API Endpoint Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup: Create test user and get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: 'test-device-id',
        userCode: 'test-user',
        pin: '123456'
      });

    authToken = loginResponse.body.access_token;
    testUserId = loginResponse.body.session.userId;
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/v1/protected-endpoint');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return data for authenticated user', async () => {
    const response = await request(app)
      .get('/api/v1/protected-endpoint')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });

  it('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/v1/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ invalid: 'data' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Security Testing Patterns

#### Authentication Flow Testing

```typescript
describe('Security Authentication Flow', () => {
  it('should prevent authentication with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: 'invalid-device',
        userCode: 'nonexistent-user',
        pin: 'wrong-pin'
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');

    // Verify rate limiting is applied
    const secondResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: 'invalid-device',
        userCode: 'nonexistent-user',
        pin: 'wrong-pin'
      });

    expect(secondResponse.status).toBe(429);
    expect(secondResponse.body.error.code).toBe('RATE_LIMITED');
  });
});
```

---

## Database Testing Strategy

### Why Real Database?

The SurveyLauncher tests use **real PostgreSQL** instead of mocks for several critical reasons:

1. **Authentic Query Validation**: Tests actual SQL queries and Drizzle ORM behavior
2. **Schema Validation**: Ensures compatibility with real database schema
3. **Transaction Behavior**: Tests actual database transaction handling
4. **Constraint Validation**: Validates foreign key constraints and data integrity
5. **Performance Realism**: More accurate performance characteristics

### Database Setup for Tests

#### Test Data Management

```typescript
// Data creation pattern
beforeEach(async () => {
  // Generate unique test data
  teamId = uuidv4();
  deviceId = uuidv4();
  userId = uuidv4();

  // Create test team
  await db.insert(teams).values({
    id: teamId,
    name: 'Test Team',
    timezone: 'UTC',
    stateId: 'MH01',
    isActive: true,
  });

  // Create test user with hashed PIN
  const pinHash = await hashPassword('123456');
  await db.insert(userPins).values({
    userId,
    pinHash: pinHash.hash,
    salt: pinHash.salt,
  });
});
```

#### Cleanup Strategy

```typescript
// Proper cleanup respecting foreign key constraints
afterEach(async () => {
  // Clean up in reverse order of creation
  await db.delete(sessions).where(eq(sessions.teamId, teamId));
  await db.delete(userPins).where(eq(userPins.userId, userId));
  await db.delete(supervisorPins).where(eq(supervisorPins.teamId, teamId));
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(devices).where(eq(devices.id, deviceId));
  await db.delete(teams).where(eq(teams.id, teamId));
});
```

### Database Debugging

```bash
# Connect to test database for debugging
docker exec -it pg_android_launcher psql -U postgres -d surveylauncher

# Common debugging queries
SELECT * FROM teams WHERE name LIKE 'Test%';
SELECT * FROM users WHERE code LIKE 'test%';
SELECT * FROM sessions WHERE status = 'open';

# Clean up failed test data
docker exec pg_android_launcher psql -U postgres -d surveylauncher -c "
  TRUNCATE TABLE sessions, user_pins, supervisor_pins, users, devices, teams RESTART IDENTITY CASCADE;
"
```

---

## Mocking Strategy

### What to Mock vs What to Test Real

#### **Mock These External Dependencies:**

```typescript
// JWT Service (external authentication)
vi.mock('../../src/services/jwt-service', () => ({
  JWTService: {
    createToken: vi.fn().mockResolvedValue({
      token: 'test-access-token',
      expiresAt: new Date('2025-01-02T00:00:00Z'),
    }),
    verifyToken: vi.fn().mockResolvedValue({
      valid: true,
      payload: { sub: 'user-001', 'x-session-id': 'session-001' },
    }),
  },
}));

// Rate Limiter (external security service)
vi.mock('../../src/services/rate-limiter', () => ({
  RateLimiter: {
    checkLoginLimit: vi.fn().mockResolvedValue({ allowed: true }),
  },
  PinLockoutService: {
    isLockedOut: vi.fn().mockReturnValue(false),
    recordFailedAttempt: vi.fn(),
    clearFailedAttempts: vi.fn(),
  },
}));

// Logger (external infrastructure)
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
```

#### **Test These Real Dependencies:**

- **Database Operations**: Real PostgreSQL with test data
- **Cryptographic Functions**: Real Argon2id, JWT, Ed25519 operations
- **Business Logic**: Actual service implementations
- **Schema Validation**: Real Zod validation

### Mock Isolation

```typescript
describe('Service with Mocks', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should use mocked dependency correctly', async () => {
    // Arrange: Set up specific mock behavior for this test
    vi.mocked(JWTService.verifyToken).mockResolvedValueOnce({
      valid: true,
      payload: { sub: 'test-user-id', 'x-session-id': 'test-session' },
    });

    // Act
    const result = await AuthService.whoami('Bearer valid-token');

    // Assert
    expect(result.success).toBe(true);
    expect(JWTService.verifyToken).toHaveBeenCalledWith('valid-token', 'access');
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: surveylauncher
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Setup test environment
      run: |
        cp .env.example .env.test
        npm run db:migrate

    - name: Run unit tests
      run: npx vitest run tests/unit/ --coverage --reporter=junit

    - name: Run integration tests
      run: npm run test:integration

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run security tests before commit
npm run test:unit

# Check for security issues
npm run audit
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "npx vitest run tests/unit/ --reporter=verbose",
    "test:integration": "npx vitest run tests/integration/ --reporter=verbose",
    "test:coverage": "npx vitest run tests/unit/ --coverage --reporter=html",
    "test:watch": "npx vitest tests/unit/ --watch",
    "test:security": "npm run test:unit && npm run test:integration",
    "db:migrate": "npm run db:push",
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

---

## Best Practices

### Test Design Principles

1. **Isolation**: Each test should be independent and not depend on other tests
2. **Repeatability**: Tests should produce the same results every time
3. **Fast Execution**: Unit tests should run in milliseconds, integration tests in seconds
4. **Clear Assertions**: Test failures should clearly indicate what went wrong
5. **Realistic Data**: Use test data that mirrors production scenarios

### Test Structure Guidelines

```typescript
describe('Feature Being Tested', () => {
  describe('Specific Method/Endpoint', () => {
    it('should handle happy path', async () => {
      // 1. Arrange: Setup test data and mocks
      // 2. Act: Call the function/endpoint
      // 3. Assert: Verify the results
    });

    it('should handle specific error case', async () => {
      // Clear error case testing
    });
  });
});
```

### Security Testing Guidelines

1. **Authentication**: Always test both valid and invalid authentication
2. **Authorization**: Verify role-based and team-based access controls
3. **Input Validation**: Test for SQL injection, XSS, and other vulnerabilities
4. **Rate Limiting**: Verify protection against brute force attacks
5. **Data Exposure**: Ensure sensitive data (PINs, passwords) is never exposed

### Performance Testing Guidelines

1. **Baseline Measurement**: Establish performance baselines for critical operations
2. **Load Testing**: Test expected production loads
3. **Stress Testing**: Test beyond expected limits
4. **Memory Monitoring**: Check for memory leaks in long-running operations
5. **Database Performance**: Monitor query execution times

---

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker exec pg_android_launcher pg_isready -U postgres

# Restart database if needed
docker restart pg_android_launcher

# Check database logs
docker logs pg_android_launcher
```

#### Test Isolation Issues

```typescript
// Problem: Tests interfere with each other
// Solution: Use unique test data and proper cleanup

beforeEach(async () => {
  // Generate unique UUIDs for each test
  teamId = uuidv4();
  userId = uuidv4();
});

afterEach(async () => {
  // Always clean up test data
  await cleanupTestData();
  vi.clearAllMocks();
});
```

#### Mock Configuration Issues

```typescript
// Problem: Mocks not applied correctly
// Solution: Use proper vi.mock() syntax and top-level declaration

// Top of file, before imports
vi.mock('../../src/services/external-service', () => ({
  ExternalService: {
    method: vi.fn().mockResolvedValue(mockResult),
  },
}));

// Inside test
vi.mocked(ExternalService.method).mockResolvedValueOnce(specificResult);
```

#### Coverage Issues

```bash
# Generate detailed coverage report
npx vitest run tests/unit/ --coverage --reporter=html

# View which lines are missing coverage
open coverage/index.html

# Focus on uncovered files in specific directory
npx vitest run tests/unit/ --coverage --include='src/services/**'
```

### Debugging Test Failures

#### Verbose Test Output

```bash
# Get detailed test output
npx vitest run tests/unit/auth-service.test.ts --reporter=verbose

# Run single failing test with maximum detail
npx vitest run tests/unit/auth-service.test.ts -t "should login successfully" --reporter=verbose
```

#### Database Inspection During Tests

```bash
# Check what data exists during test failure
docker exec -it pg_android_launcher psql -U postgres -d surveylauncher -c "
  SELECT * FROM users WHERE code LIKE 'test%';
  SELECT * FROM sessions WHERE status = 'open';
  SELECT * FROM devices WHERE name LIKE 'Test%';
"
```

#### Test-Specific Debugging

```typescript
// Add debugging to specific test
it('should handle complex scenario', async () => {
  // Debug database state before
  const beforeState = await db.select().from(users).where(eq(users.id, userId));
  console.log('Before:', beforeState);

  // Your test logic
  const result = await Service.complexOperation(input);

  // Debug database state after
  const afterState = await db.select().from(users).where(eq(users.id, userId));
  console.log('After:', afterState);

  expect(result.success).toBe(true);
});
```

---

## Getting Help

### Resources for Test Development

1. **This Documentation**: Primary reference for testing patterns
2. **Existing Tests**: Review `tests/unit/` and `tests/integration/` for examples
3. **Vitest Documentation**: https://vitest.dev/
4. **Supertest Documentation**: https://github.com/visionmedia/supertest
5. **Drizzle ORM Testing**: https://orm.drizzle.team/docs/goodies/testing

### Creating New Tests

When adding new features:

1. **Unit Tests First**: Create service-level tests in `tests/unit/`
2. **Integration Tests Second**: Create API endpoint tests in `tests/integration/`
3. **Security Tests**: Always include authentication and authorization tests
4. **Edge Cases**: Test error conditions and boundary conditions
5. **Performance**: Add performance tests for critical paths

### Code Review Checklist

- [ ] Tests follow the established patterns and structure
- [ ] Database cleanup is implemented in `afterEach`
- [ ] Mocks are properly isolated and cleaned up
- [ ] Authentication scenarios are tested
- [ ] Error conditions are covered
- [ ] Coverage thresholds are met
- [ ] Tests execute efficiently (<3 seconds for unit tests)

---

**This testing guide provides comprehensive instructions for developing, running, and maintaining tests for the SurveyLauncher backend system.**